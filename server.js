import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { handleDice } from './dice-game.js';
import { handleNewGame } from './mesa-nova/server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(await readFile(path.join(here, 'public', 'decks', 'catalog.json'), 'utf8'));
const presetEffects = JSON.parse(await readFile(path.join(here, 'public', 'decks', 'effects.json'), 'utf8'));
const energyCatalog = JSON.parse(await readFile(path.join(here, 'public', 'energies.json'), 'utf8'));
const rooms = new Map();
const MAX_BODY = 25 * 1024 * 1024;
const MAX_CARDS = 120;
const code = () => randomBytes(3).toString('hex').toUpperCase();
const token = () => randomBytes(24).toString('hex');

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('Arquivo grande demais (limite de 25 MB).');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('JSON inválido.'); }
}

function playerFor(room, secret) {
  return room.players.find(p => p.token === secret);
}

function viewerFor(room, secret) {
  return playerFor(room, secret) || room.spectators?.find(p => p.token === secret);
}

function tokenEffectFromRules(rules) {
  const text = String(rules || '');
  const match = text.match(/(?:cria|crie|criar)\s+(?:(\d+|uma?|dois|duas|tr[eê]s)\s+)?(?:fichas?\s+(?:de\s+)?)?(?:criaturas?\s+(?:de\s+)?)?([\p{L}][\p{L}\s-]{0,35}?)(?:\s+(\d+)\s*\/\s*(\d+))?(?=[.,;\n]|$)/iu);
  if (!match) return undefined;
  const numbers = { um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3 };
  const count = Math.min(12, Number(match[1]) || numbers[match[1]?.toLowerCase()] || 1);
  const before = text.slice(Math.max(0, match.index - 85), match.index);
  const trigger = /bloquead[ao]|bloqueia/i.test(before) ? 'block' : /atac[ao]|declarar ataque/i.test(before) ? 'attack' : /virad[ao]|revelad[ao]/i.test(before) ? 'reveal' : 'enter';
  return { trigger, count, name: match[2].trim(), power: Number(match[3]) || 1, health: Number(match[4]) || 1 };
}

export function viewFor(room, playerId) {
  return {
    code: room.code,
    phase: room.phase || 'active',
    coinWinner: room.coinWinner || null,
    winner: room.winner || null,
    firstPlayer: room.firstPlayer || null,
    turn: room.turn,
    round: room.round,
    turnNumber: room.turnNumber || 0,
    log: room.log.slice(-25),
    spectator: !room.players.some(p => p.id === playerId),
    spectatorCount: room.spectators?.length || 0,
    spectators: (room.spectators || []).map(p => ({ id: p.id, name: p.name })),
    combatPhase: room.combatPhase || null,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      deckCount: p.deck.length,
      handCount: p.hand.length,
      discardCount: p.discard.length,
      exileCount: (p.exile || []).length,
      ether: p.ether,
      deckColor: p.deckColor,
      deckChoice: p.deckChoice || null,
      life: p.life,
      runePlayed: p.runePlayed,
      deckReady: p.deckReady,
      openingRemaining: p.openingRemaining,
      turnDrawRemaining: p.turnDrawRemaining,
      bonusDraws: p.bonusDraws,
      hand: p.id === playerId ? p.hand : undefined,
      tokens: p.id === playerId ? (p.tokens || []) : undefined,
      discard: p.discard,
      exile: p.exile || []
    })),
    board: room.board.map(c => c.faceUp || c.ownerId === playerId
      ? c
      : { id: c.id, ownerId: c.ownerId, faceUp: false, zone: c.zone, tapped: c.tapped }),
    you: playerId
  };
}

function emit(room) {
  for (const client of room.clients) {
    client.res.write(`data: ${JSON.stringify(viewFor(room, client.playerId))}\n\n`);
  }
}

function log(room, message) {
  room.log.push(message);
  if (room.log.length > 100) room.log.shift();
}

function currentStat(card, stat) {
  return (card[stat] || 0) + (card[`${stat}Modifier`] || 0);
}

function costAdjustment(room, playerId, card) {
  let adjustment = card.costDiscount?.condition === 'agileCreature' && room.board.some(c => c.ownerId === playerId && c.zone === 'creature' && c.faceUp && c.agile)
    ? -card.costDiscount.amount : 0;
  if (card.kind === 'creature' || card.kind === 'spell') {
    for (const source of room.board) {
      if (source.ownerId === playerId && source.zone === 'creature' && source.faceUp && (source.costAura?.target === card.kind || (source.costAura?.target === 'agileCreature' && card.kind === 'creature' && card.agile))) adjustment -= source.costAura.amount;
    }
  }
  return adjustment;
}

function freshPlayer(name) {
  return { id: randomUUID(), token: token(), name, deck: [], hand: [], tokens: [], discard: [], exile: [], ether: 0, deckColor: null, life: 20, runePlayed: false, deckReady: false, openingRemaining: 0, turnDrawRemaining: 0, bonusDraws: 0 };
}

function tapRune(room, player, card) {
  if (card.zone !== 'rune' || card.ownerId !== player.id || card.tapped) throw new Error('Escolha uma Essência sua que ainda não foi virada.');
  card.tapped = true;
  const resource = card.runeEnergy;
  const amount = resource ? Object.values(resource).reduce((sum, value) => sum + value, 0) : 1;
  player.ether += amount;
  return amount;
}

function requireRoomPlayer(req, res, roomCode) {
  const room = rooms.get(roomCode?.toUpperCase());
  const player = room && viewerFor(room, req.headers['x-player-token']);
  if (!room || !player) { send(res, 403, { error: 'Sala ou acesso inválido.' }); return null; }
  return { room, player };
}

function normalizeCards(cards) {
  if (!Array.isArray(cards) || cards.length < 1 || cards.length > MAX_CARDS) throw new Error(`O deck deve ter entre 1 e ${MAX_CARDS} cartas.`);
  return cards.map((card, i) => {
    const name = String(card.name || `Carta ${i + 1}`).trim().slice(0, 80);
    const image = String(card.image || '');
    if (image && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(image)) throw new Error(`Imagem inválida na carta ${i + 1}.`);
    if (image.length > 2_000_000) throw new Error(`Imagem muito grande na carta ${i + 1}.`);
    const kind = ['rune', 'creature', 'spell', 'patron'].includes(card.kind) ? card.kind : 'flex';
    const energies = card.cost?.energies && typeof card.cost.energies === 'object'
      ? Object.fromEntries(['ruptura','forja','fluxo'].map(id => [id, Math.max(0, Math.min(12, Math.trunc(Number(card.cost.energies[id]) || 0)))]))
      : undefined;
    const colored = energies ? Object.values(energies).reduce((sum, amount) => sum + amount, 0) : Math.max(0, Math.min(20, Number(card.cost?.colored) || 0));
    const generic = Math.max(0, Math.min(20, Number(card.cost?.generic) || 0));
    const power = Math.max(0, Math.min(30, Math.trunc(Number(card.power) || 0)));
    const health = Math.max(0, Math.min(30, Math.trunc(Number(card.health) || 0)));
    const rules = String(card.rules || '');
    const agile = card.agile === true || /^(?:Ágil|Agil)\b|^Ataque Rápido e (?:Ágil|Agil)\b/im.test(rules);
    const quickAttack = card.quickAttack === true || /^(?:Ataque Rápido|Ataque Rapido|Ímpeto|Impeto)\b/im.test(rules) || /\besta criatura (?:tem|ganha) (?:Ataque Rápido|Ataque Rapido|Ímpeto|Impeto)\b/i.test(rules) || (/\besta criatura pode atacar no turno em que entra\b/i.test(rules) && !/\bnão pode atacar no turno em que entra\b/i.test(rules));
    const effect = card.drawEffect;
    const drawEffect = effect && ['enter', 'reveal', 'turnStart', 'agileAttack'].includes(effect.trigger)
      ? { trigger: effect.trigger, count: Math.max(1, Math.min(7, Math.trunc(Number(effect.count) || 1))), condition: effect.condition === 'powerAtLeast4' ? 'powerAtLeast4' : undefined }
      : undefined;
    const discount = card.costDiscount;
    const costDiscount = discount?.condition === 'agileCreature'
      ? { condition: 'agileCreature', amount: Math.max(0, Math.min(5, Math.trunc(Number(discount.amount) || 0))) }
      : undefined;
    const costAura = ['agileCreature','creature','spell'].includes(card.costAura?.target)
      ? { target: card.costAura.target, amount: Math.max(-5, Math.min(5, Math.trunc(Number(card.costAura.amount) || 0))) }
      : undefined;
    const attachment = kind === 'spell' && ['aura','artifact'].includes(card.attachment?.type)
      ? { type: card.attachment.type, powerDelta: Math.max(-20, Math.min(20, Math.trunc(Number(card.attachment.powerDelta) || 0))), healthDelta: Math.max(-20, Math.min(20, Math.trunc(Number(card.attachment.healthDelta) || 0))), tapOnEnter: card.attachment.tapOnEnter === true, lockUntap: card.attachment.lockUntap === true, trample: card.attachment.trample === true }
      : undefined;
    const energy = card.energyEffect;
    const energyEffect = kind === 'creature' && energy?.trigger === 'tap'
      ? { trigger: 'tap', amount: Math.max(1, Math.min(5, Math.trunc(Number(energy.amount) || 1))), boostedAmount: energy.condition === 'powerAtLeast4' ? Math.max(1, Math.min(5, Math.trunc(Number(energy.boostedAmount) || 1))) : undefined, condition: energy.condition === 'powerAtLeast4' ? 'powerAtLeast4' : undefined, resource: ['forja','ruptura','fluxo','any'].includes(energy.resource) ? energy.resource : 'any' }
      : undefined;
    const runeEnergy = kind === 'rune' && card.runeEnergy && typeof card.runeEnergy === 'object'
      ? Object.fromEntries(['generic','ruptura','forja','fluxo'].map(id => [id, Math.max(0, Math.min(id === 'generic' ? 20 : 12, Math.trunc(Number(card.runeEnergy[id]) || 0)))]))
      : undefined;
    const patronAbilities = kind === 'patron' && Array.isArray(card.patronAbilities)
      ? card.patronAbilities.slice(0, 3).map(ability => ({ cost: Math.max(0, Math.min(20, Math.trunc(Number(ability?.cost) || 0))), title: String(ability?.title || '').slice(0, 60), effect: String(ability?.effect || '').slice(0, 210) }))
      : undefined;
    const patronStyle = kind === 'patron' && card.patronStyle && typeof card.patronStyle === 'object'
      ? Object.fromEntries(['frame','ornament','accent','font','opacity','flourish'].map(key => [key, String(card.patronStyle[key] ?? '').slice(0, 30)]))
      : undefined;
    const tokenEffect = card.tokenEffect && ['enter','attack','reveal','block'].includes(card.tokenEffect.trigger)
      ? { trigger: card.tokenEffect.trigger, count: Math.max(1, Math.min(12, Math.trunc(Number(card.tokenEffect.count) || 1))), name: String(card.tokenEffect.name || 'Criatura').slice(0, 40), power: Math.max(0, Math.min(30, Math.trunc(Number(card.tokenEffect.power) || 1))), health: Math.max(0, Math.min(30, Math.trunc(Number(card.tokenEffect.health) || 1))), extraPerDiscardName: String(card.tokenEffect.extraPerDiscardName || '').slice(0, 80) || undefined }
      : tokenEffectFromRules(rules);
    return { id: randomUUID(), name, image, kind, subtype: String(card.subtype || '').slice(0, 45), rules: rules.slice(0, 850), cost: { colored, generic, ...(energies ? { energies } : {}) }, power, health, agile, quickAttack, drawEffect, costDiscount, costAura, attachment, energyEffect, runeEnergy, patronAbilities, patronStyle, tokenEffect };
  });
}

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUInt32BE() % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

export function act(room, player, data) {
  if (data.type === 'spectate' || data.type === 'takeSeat' || data.type === 'leave') {
    const seated = room.players.includes(player);
    if (data.type === 'takeSeat') {
      if (seated) throw new Error('Você já está na mesa.');
      if (room.players.length >= 2 || room.phase !== 'lobby') throw new Error('As vagas estão ocupadas ou a partida já começou.');
      room.spectators = room.spectators.filter(p => p !== player);
      Object.assign(player, freshPlayer(player.name), { id: player.id, token: player.token });
      room.players.push(player);
      log(room, `${player.name} ocupou uma vaga de jogador.`);
    } else {
      if (seated) {
        room.players = room.players.filter(p => p !== player);
        if (room.phase !== 'lobby') {
          room.phase = 'lobby'; room.board = []; room.turn = null; room.combatPhase = null;
          room.firstPlayer = null; room.coinWinner = null; room.winner = null;
          for (const remaining of room.players) { remaining.deckReady = false; remaining.deck = []; remaining.hand = []; remaining.tokens = []; }
        }
        if (data.type === 'spectate') room.spectators.push(player);
      } else if (data.type === 'leave') room.spectators = room.spectators.filter(p => p !== player);
      log(room, `${player.name} ${data.type === 'leave' ? 'saiu da sala' : 'foi para a arquibancada'}.`);
    }
    return;
  }
  if (!room.players.includes(player)) throw new Error('Espectadores não podem alterar a partida.');
  const other = room.players.find(p => p.id !== player.id);
  const mine = player.id;
  const phase = room.phase || 'active';
  if (phase === 'lobby' && !['chooseDeck','import','resetMatch','clear'].includes(data.type)) throw new Error('Confirme os dois decks antes de começar.');
  if (phase === 'coin' && !['decideFirst','resetMatch','clear'].includes(data.type)) throw new Error('Aguarde o resultado da moeda e a decisão de quem começa.');
  if (phase === 'finished' && !['resetMatch','clear'].includes(data.type)) throw new Error('A partida terminou. Inicie uma nova para jogar novamente.');
  if (phase === 'active' && ['chooseDeck','import','decideFirst'].includes(data.type)) throw new Error('Para trocar de deck, reinicie a partida.');
  if (room.combatPhase === 'defense' && !['block','endTurn','resetMatch','clear'].includes(data.type)) throw new Error('Aguarde a atribuição dos bloqueadores.');
  const handCard = () => [...player.hand, ...(player.tokens || [])].find(c => c.id === data.cardId);
  const cardOnBoard = () => {
    const card = room.board.find(c => c.id === data.cardId);
    if (!card || card.ownerId !== mine) throw new Error('Você só pode mover suas cartas.');
    return card;
  };
  const unplay = card => ({ id: card.id, name: card.name, image: card.image, kind: card.kind, subtype: card.subtype, rules: card.rules, cost: card.cost, power: card.power, health: card.health, agile: card.agile, quickAttack: card.quickAttack, drawEffect: card.drawEffect, costDiscount: card.costDiscount, costAura: card.costAura, attachment: card.attachment, energyEffect: card.energyEffect, runeEnergy: card.runeEnergy, patronAbilities: card.patronAbilities, patronStyle: card.patronStyle, tokenEffect: card.tokenEffect, isToken: card.isToken });
  const removeFromBoard = (card, destination = 'discard') => {
    for (const attached of room.board.filter(item => item.attachedTo === card.id)) removeFromBoard(attached);
    if (card.attachedTo) {
      const target = room.board.find(item => item.id === card.attachedTo);
      if (target) { target.powerModifier -= card.attachment?.powerDelta || 0; target.healthModifier -= card.attachment?.healthDelta || 0; }
    }
    room.board = room.board.filter(item => item.id !== card.id);
    const owner = room.players.find(p => p.id === card.ownerId);
    if (owner) { owner[destination] ||= []; owner[destination].push(unplay(card)); }
  };
  const grantDraws = (recipient, count, source) => {
    const actual = Math.min(Math.max(0, count), recipient.deck.length);
    for (let index = 0; index < actual; index++) recipient.hand.push(recipient.deck.pop());
    log(room, `${source}: ${recipient.name} comprou ${actual} carta(s) automaticamente.`);
  };
  const createTokens = (recipient, effect, source) => {
    recipient.tokens ||= [];
    const count = Math.min(20, effect.count + (effect.extraPerDiscardName ? recipient.discard.filter(card => card.name === effect.extraPerDiscardName).length : 0));
    for (let index = 0; index < count; index++) recipient.tokens.push({ id: randomUUID(), name: `Ficha de ${effect.name}`, kind: 'creature', rules: `Ficha criada por ${source}.`, image: '', cost: { colored: 0, generic: 0 }, power: effect.power, health: effect.health, isToken: true });
    log(room, `${source}: ${recipient.name} recebeu ${count} ficha(s) de ${effect.name}.`);
  };
  const triggerVisibleEntry = card => {
    if (card.faceUp && card.tokenEffect?.trigger === 'enter' && !card.tokenTriggered) { card.tokenTriggered = true; createTokens(player, card.tokenEffect, card.name); }
    if (card.faceUp && !card.entryTriggered && card.drawEffect?.trigger === 'enter') {
      card.entryTriggered = true;
      grantDraws(player, card.drawEffect.count, card.name);
    }
  };
  const prepareDeck = cards => {
    player.deck = cards;
    player.hand = [];
    player.tokens = [];
    player.discard = [];
    player.exile = [];
    player.ether = 0;
    player.life = 20;
    player.runePlayed = false;
    player.deckReady = true;
    player.openingRemaining = 0;
    player.turnDrawRemaining = 0;
    player.bonusDraws = 0;
    shuffle(player.deck);
  };
  const resetMatch = () => {
    for (const participant of room.players) {
      participant.deck = []; participant.hand = []; participant.tokens = []; participant.discard = []; participant.exile = [];
      participant.ether = 0; participant.life = 20; participant.deckColor = null;
      participant.deckChoice = null; participant.runePlayed = false;
      participant.deckReady = false; participant.openingRemaining = 0;
      participant.turnDrawRemaining = 0; participant.bonusDraws = 0;
    }
    room.board = []; room.phase = 'lobby'; room.turn = null; room.combatPhase = null;
    room.firstPlayer = null; room.coinWinner = null; room.winner = null; room.round = 1; room.turnNumber = 0;
    log(room, `${player.name} reiniciou a partida. Escolham novos decks.`);
  };
  const startCoin = () => {
    if (room.players.length !== 2 || !room.players.every(p => p.deckReady)) return;
    room.phase = 'coin';
    room.coinWinner = room.players[randomBytes(1)[0] % 2].id;
    log(room, 'Os dois decks foram confirmados. A moeda foi lançada!');
  };
  switch (data.type) {
    case 'clear':
    case 'resetMatch':
      resetMatch();
      break;
    case 'import': {
      if (player.deckReady) throw new Error('Seu deck já foi confirmado. Reinicie a partida para trocar.');
      const cards = normalizeCards(data.cards);
      const count = cards.length;
      prepareDeck(cards);
      player.deckColor = null;
      player.deckChoice = 'custom';
      log(room, `${player.name} confirmou um deck próprio com ${count} cartas.`);
      startCoin();
      break;
    }
    case 'chooseDeck': {
      if (player.deckReady) throw new Error('Seu deck já foi confirmado. Reinicie a partida para trocar.');
      const preset = catalog[data.deck];
      if (!preset) throw new Error('Deck desconhecido.');
      const cards = preset.cards.flatMap(entry => {
        const effect = presetEffects[data.deck]?.[path.basename(entry.image, '.png')] || {};
        return Array.from({ length: entry.quantity }, () => ({ id: randomUUID(), name: entry.name, image: entry.image, kind: entry.kind, cost: entry.cost, power: entry.power || 0, health: entry.health || 0, agile: entry.agile || false, quickAttack: entry.quickAttack || effect.quickAttack || false, drawEffect: entry.drawEffect, costDiscount: entry.costDiscount, costAura: entry.costAura, attachment: entry.attachment || effect.attachment, energyEffect: entry.energyEffect, rules: effect.rules || entry.rules || '', tokenEffect: entry.tokenEffect || tokenEffectFromRules(effect.rules || entry.rules) }));
      });
      prepareDeck(cards);
      player.deckColor = preset.color;
      player.deckChoice = data.deck;
      log(room, `${player.name} confirmou o deck ${preset.title}.`);
      startCoin();
      break;
    }
    case 'decideFirst': {
      if (room.coinWinner !== mine) throw new Error('Quem venceu a moeda escolhe o primeiro jogador.');
      if (!['first','second'].includes(data.position)) throw new Error('Escolha começar em primeiro ou em segundo.');
      room.firstPlayer = data.position === 'first' ? mine : other.id;
      room.turn = room.firstPlayer; room.phase = 'active'; room.round = 1; room.turnNumber = 1;
      for (const participant of room.players) grantDraws(participant, 7, 'Mão inicial');
      const starter = room.players.find(p => p.id === room.firstPlayer);
      log(room, `${player.name} venceu a moeda e escolheu ${data.position === 'first' ? 'começar' : 'jogar em segundo'}. ${starter.name} começa.`);
      break;
    }
    case 'draw': {
      throw new Error('As compras de carta agora são automáticas.');
    }
    case 'shuffle':
      shuffle(player.deck);
      log(room, `${player.name} embaralhou o baralho.`);
      break;
    case 'play': {
      const card = handCard();
      if (!card) throw new Error('Carta não encontrada na sua mão.');
      const zone = card.kind === 'flex' ? data.zone : card.kind;
      if (!['rune','creature','spell','patron'].includes(zone)) throw new Error('Escolha uma área para a carta.');
      if (zone !== 'spell' && room.turn !== mine) throw new Error('Aguarde seu turno para jogar essa carta.');
      if (zone === 'rune' && player.runePlayed) throw new Error('Você já jogou uma Essência neste turno.');
      if (zone === 'patron' && room.board.some(c => c.ownerId === mine && c.zone === 'patron')) throw new Error('Você já tem um Patrono em campo.');
      const target = card.attachment && room.board.find(c => c.id === data.targetId && c.zone === 'creature' && c.faceUp);
      if (card.attachment && !target) throw new Error('Escolha uma criatura revelada para anexar esta Aura ou Artefato.');
      let cost = zone === 'rune' ? 0 : (card.cost?.colored || 0) + (card.cost?.generic || 0);
      cost = Math.max(0, cost + costAdjustment(room, mine, card));
      if (player.ether < cost) throw new Error(`Energia insuficiente: precisa de ${cost}, possui ${player.ether}.`);
      let insertion = room.board.length;
      if (zone === 'creature') {
        const creatures = room.board.filter(c => c.ownerId === mine && c.zone === 'creature');
        if (creatures.length) {
          const neighbor = creatures.find(c => c.id === data.neighborId);
          if (!neighbor || !['left','right'].includes(data.side)) throw new Error('Escolha uma adjacência válida para a criatura.');
          insertion = room.board.findIndex(c => c.id === neighbor.id) + (data.side === 'right' ? 1 : 0);
        }
      }
      const played = { ...card, ownerId: mine, zone, faceUp: card.attachment ? true : data.faceUp !== false, tapped: false, attackedThisTurn: false, summonedTurnNumber: room.turnNumber || 1, readyTurnNumber: (room.turnNumber || 1) + 2, entryTriggered: false, powerModifier: 0, healthModifier: 0 };
      player.hand = player.hand.filter(c => c.id !== card.id);
      player.tokens = (player.tokens || []).filter(c => c.id !== card.id);
      player.ether -= cost;
      if (zone === 'rune') player.runePlayed = true;
      room.board.splice(insertion, 0, played);
      if (target) {
        played.attachedTo = target.id;
        target.powerModifier = (target.powerModifier || 0) + (card.attachment.powerDelta || 0);
        target.healthModifier = (target.healthModifier || 0) + (card.attachment.healthDelta || 0);
        if (card.attachment.tapOnEnter) target.tapped = true;
        log(room, `${card.name} foi anexado a ${target.name}.`);
      }
      log(room, `${player.name} colocou ${played.faceUp ? card.name : 'uma carta oculta'} em ${zone === 'rune' ? 'Essências' : zone === 'spell' ? 'Magias' : zone === 'patron' ? 'Patrono' : 'Criaturas'}.`);
      triggerVisibleEntry(played);
      break;
    }
    case 'flip': {
      const card = cardOnBoard();
      if (card.attachedTo) throw new Error('Descarte a Aura ou Artefato para retirar o efeito da criatura.');
      if (room.turnNumber < card.readyTurnNumber) throw new Error('Esta carta ainda está adormecida; aguarde uma rodada para virá-la.');
      card.faceUp = !card.faceUp;
      log(room, `${player.name} ${card.faceUp ? 'revelou' : 'ocultou'} uma carta.`);
      if (card.faceUp) {
        triggerVisibleEntry(card);
        if (card.tokenEffect?.trigger === 'reveal') createTokens(player, card.tokenEffect, card.name);
        if (!card.entryTriggered && card.drawEffect?.trigger === 'reveal') {
          card.entryTriggered = true;
          grantDraws(player, card.drawEffect.count, card.name);
        }
      }
      break;
    }
    case 'attack': {
      const card = cardOnBoard();
      if (room.turn !== mine || card.zone !== 'creature' || !card.faceUp) throw new Error('Escolha uma criatura revelada no seu turno.');
      if (card.attackedThisTurn || card.tapped) throw new Error('Esta criatura já foi usada neste turno.');
      if (!card.quickAttack && card.summonedTurnNumber === room.turnNumber) throw new Error('Esta criatura entrou neste turno e ainda não pode atacar.');
      card.attackedThisTurn = true;
      card.tapped = true;
      card.attacking = true;
      log(room, `${player.name} declarou ataque com ${card.name}.`);
      if (card.tokenEffect?.trigger === 'attack') createTokens(player, card.tokenEffect, card.name);
      if (card.agile) {
        for (const sphinx of room.board) {
          if (!sphinx.faceUp || sphinx.drawEffect?.trigger !== 'agileAttack') continue;
          const recipient = room.players.find(p => p.id === sphinx.ownerId);
          if (recipient) grantDraws(recipient, sphinx.drawEffect.count, sphinx.name);
        }
      }
      break;
    }
    case 'block': {
      if (room.combatPhase !== 'defense' || room.turn !== mine) throw new Error('Aguarde a etapa de defesa.');
      const defender = cardOnBoard();
      const attacker = room.board.find(c => c.id === data.attackerId && c.attacking && c.ownerId !== mine);
      if (!attacker || defender.zone !== 'creature' || !defender.faceUp || defender.tapped) throw new Error('Escolha uma criatura preparada e um atacante válido.');
      if (attacker.agile && !defender.agile && !/\bProntid[aã]o\b/i.test(defender.rules || '')) throw new Error('Uma criatura Ágil só pode ser bloqueada por outra Ágil ou com Prontidão.');
      defender.blockingTarget = defender.blockingTarget === attacker.id ? null : attacker.id;
      log(room, `${player.name} ${defender.blockingTarget ? `posicionou ${defender.name} para defender de ${attacker.name}` : `retirou ${defender.name} da defesa`}.`);
      if (defender.blockingTarget && defender.tokenEffect?.trigger === 'block' && defender.lastBlockTurn !== room.turnNumber) { defender.lastBlockTurn = room.turnNumber; createTokens(player, defender.tokenEffect, defender.name); }
      if (defender.blockingTarget && attacker.tokenEffect?.trigger === 'block' && !attacker.blockTriggered) {
        const attackerOwner = room.players.find(p => p.id === attacker.ownerId);
        if (attackerOwner) createTokens(attackerOwner, attacker.tokenEffect, attacker.name);
        attacker.blockTriggered = true;
      }
      break;
    }
    case 'stat': {
      const card = cardOnBoard();
      if (card.zone !== 'creature') throw new Error('Ajuste os atributos de uma criatura em campo.');
      if (!['power', 'health'].includes(data.stat) || ![1, -1].includes(data.delta)) throw new Error('Ajuste inválido.');
      const next = currentStat(card, data.stat) + data.delta;
      if (next < 0 || next > 99) throw new Error('O atributo deve ficar entre 0 e 99.');
      card[`${data.stat}Modifier`] = (card[`${data.stat}Modifier`] || 0) + data.delta;
      log(room, `${player.name} ajustou ${data.stat === 'power' ? 'o ataque' : 'a vida'} de ${card.faceUp ? card.name : 'uma criatura oculta'} para ${next}.`);
      break;
    }
    case 'tap': {
      const card = cardOnBoard();
      if (card.tapped && room.board.some(aura => aura.attachedTo === card.id && aura.attachment?.lockUntap)) throw new Error('Um encantamento impede esta criatura de desvirar.');
      if (card.zone === 'rune') {
        const amount = tapRune(room, player, card);
        log(room, `${player.name} virou uma Essência e ganhou ${amount} energia${amount === 1 ? '' : 's'}.`);
      } else if (card.zone === 'creature' && card.energyEffect) {
        if (room.turnNumber < card.readyTurnNumber) throw new Error('Esta criatura ainda está adormecida; aguarde uma rodada para gerar energia.');
        if (!card.faceUp || card.tapped || card.attackedThisTurn) throw new Error('Esta criatura não pode gerar energia agora.');
        card.tapped = true;
        const effect = card.energyEffect;
        const boosted = effect.condition === 'powerAtLeast4' && room.board.some(c => c.ownerId === mine && c.zone === 'creature' && c.faceUp && currentStat(c, 'power') >= 4);
        const amount = boosted ? effect.boostedAmount : effect.amount;
        player.ether += amount;
        log(room, `${player.name} girou ${card.name} e ganhou ${amount} energia${effect.resource === 'any' ? ' à escolha' : ` de ${effect.resource}`}.`);
      } else {
        if (room.turnNumber < card.readyTurnNumber && /\b(?:vire|virar|ao ser virad)/i.test(card.rules || '')) throw new Error('Esta carta ainda está adormecida; aguarde uma rodada para ativar o efeito.');
        card.tapped = !card.tapped;
      }
      break;
    }
    case 'tapGroup': {
      const ids = data.cardIds;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length) throw new Error('Escolha de 1 a 3 Essências diferentes.');
      const cards = ids.map(id => room.board.find(c => c.id === id));
      if (cards.some(c => !c || c.ownerId !== mine || c.zone !== 'rune' || c.tapped)) throw new Error('Grupo de Essências inválido.');
      if (cards.some(c => c.name !== cards[0].name || c.image !== cards[0].image || c.faceUp !== cards[0].faceUp)) throw new Error('O grupo deve conter Essências iguais.');
      const amount = cards.reduce((sum, card) => sum + tapRune(room, player, card), 0);
      log(room, `${player.name} virou ${cards.length} Essência(s) e ganhou ${amount} energia${amount === 1 ? '' : 's'}.`);
      break;
    }
    case 'moveCard': {
      const card = cardOnBoard();
      const neighbor = room.board.find(c => c.id === data.neighborId && c.ownerId === mine && c.zone === card.zone && c.id !== card.id && !c.attachedTo);
      if (!neighbor || !['left','right'].includes(data.side) || !['creature','spell','rune'].includes(card.zone) || card.attachedTo) throw new Error('Escolha outra carta sua na mesma área para reposicionar.');
      room.board.splice(room.board.indexOf(card), 1);
      room.board.splice(room.board.indexOf(neighbor) + (data.side === 'right' ? 1 : 0), 0, card);
      break;
    }
    case 'discard': {
      const tokenIndex = (player.tokens || []).findIndex(c => c.id === data.cardId);
      if (tokenIndex >= 0) player.discard.push(player.tokens.splice(tokenIndex, 1)[0]);
      else {
      const index = player.hand.findIndex(c => c.id === data.cardId);
      if (index >= 0) player.discard.push(player.hand.splice(index, 1)[0]);
      else {
        const card = cardOnBoard();
        removeFromBoard(card);
      }
      }
      log(room, `${player.name} descartou uma carta.`);
      break;
    }
    case 'exile': {
      const tokenIndex = (player.tokens || []).findIndex(c => c.id === data.cardId);
      if (tokenIndex >= 0) { player.exile ||= []; player.exile.push(player.tokens.splice(tokenIndex, 1)[0]); }
      else {
        const index = player.hand.findIndex(c => c.id === data.cardId);
        if (index >= 0) { player.exile ||= []; player.exile.push(player.hand.splice(index, 1)[0]); }
        else removeFromBoard(cardOnBoard(), 'exile');
      }
      log(room, `${player.name} exilou uma carta.`);
      break;
    }
    case 'endTurn':
      if (room.turn !== mine) throw new Error('Ainda não é seu turno.');
      if (!other) throw new Error('Aguarde o outro jogador.');
      if (room.players.some(p => !p.deckReady)) throw new Error('Os dois jogadores precisam confirmar os decks.');
      if (room.combatPhase === 'defense') {
        for (const attacker of room.board.filter(c => c.attacking && c.ownerId === other.id)) {
          const blockers = room.board.filter(c => c.blockingTarget === attacker.id);
          if (!blockers.length) {
            player.life = Math.max(0, player.life - Math.max(0, currentStat(attacker, 'power')));
            log(room, `${attacker.name} atingiu o Patrono de ${player.name} por ${Math.max(0, currentStat(attacker, 'power'))}.`);
          } else {
            const attackPower = Math.max(0, currentStat(attacker, 'power'));
            const defensePower = blockers.reduce((sum, blocker) => sum + Math.max(0, currentStat(blocker, 'power')), 0);
            let remaining = attackPower;
            for (const blocker of blockers) {
              const damage = Math.min(remaining, Math.max(0, currentStat(blocker, 'health')));
              blocker.healthModifier = (blocker.healthModifier || 0) - damage;
              remaining -= damage;
            }
            if (remaining > 0 && room.board.some(aura => aura.attachedTo === attacker.id && aura.attachment?.trample)) {
              player.life = Math.max(0, player.life - remaining);
              log(room, `${attacker.name} causou ${remaining} de dano excedente ao Patrono de ${player.name} com Transpassar.`);
            }
            attacker.healthModifier = (attacker.healthModifier || 0) - defensePower;
            log(room, `${blockers.map(c => c.name).join(' + ')} bloquearam ${attacker.name} (${attackPower} × ${defensePower}).`);
          }
        }
        const fallen = room.board.filter(c => c.zone === 'creature' && currentStat(c, 'health') <= 0);
        for (const card of fallen) {
          removeFromBoard(card);
          log(room, `${card.name} foi para o descarte após o combate.`);
        }
        for (const card of room.board) { card.attacking = false; card.blockingTarget = null; card.blockTriggered = false; }
        room.combatPhase = null;
        if (player.life === 0) { room.phase = 'finished'; room.winner = other.id; room.turn = null; log(room, `${other.name} venceu a partida!`); break; }
        log(room, `${player.name} concluiu a defesa. Seu turno começa.`);
      } else {
        const attackers = room.board.filter(card => card.ownerId === mine && card.attacking);
        if (attackers.length) {
          room.combatPhase = 'defense'; room.turn = other.id;
          log(room, `${player.name} passou o ataque. ${other.name} pode escolher bloqueadores antes de iniciar o turno.`);
          break;
        }
        player.turnDrawRemaining = 0;
        player.bonusDraws = 0;
        room.turn = other.id;
      }
      room.turnNumber = (room.turnNumber || 1) + 1;
      if (room.firstPlayer === room.turn || (!room.firstPlayer && room.players[0].id === room.turn)) room.round++;
      const nextPlayer = room.players.find(p => p.id === room.turn);
      nextPlayer.ether = 0;
      nextPlayer.runePlayed = false;
      nextPlayer.turnDrawRemaining = 0;
      for (const card of room.board) if (card.ownerId === nextPlayer.id) { if (!room.board.some(aura => aura.attachedTo === card.id && aura.attachment?.lockUntap)) card.tapped = false; card.attackedThisTurn = false; }
      log(room, `${nextPlayer.name} iniciou o turno.`);
      grantDraws(nextPlayer, 1, 'Início do turno');
      const hasPowerFour = room.board.some(card => card.ownerId === nextPlayer.id && card.zone === 'creature' && card.faceUp && currentStat(card, 'power') >= 4);
      for (const card of room.board) {
        if (card.ownerId !== nextPlayer.id || !card.faceUp || card.drawEffect?.trigger !== 'turnStart') continue;
        if (card.drawEffect.condition === 'powerAtLeast4' && !hasPowerFour) continue;
        grantDraws(nextPlayer, card.drawEffect.count, card.name);
      }
      break;
    case 'life': {
      const delta = Number(data.delta);
      if (!Number.isInteger(delta) || Math.abs(delta) > 20) throw new Error('Valor de vida inválido.');
      player.life = Math.max(0, Math.min(99, player.life + delta));
      log(room, `${player.name} ajustou a vida do Patrono para ${player.life}.`);
      if (player.life === 0) {
        room.phase = 'finished'; room.winner = other?.id || null; room.turn = null;
        log(room, `${other?.name || 'O rival'} venceu a partida!`);
      }
      break;
    }
    default: throw new Error('Ação desconhecida.');
  }
}

const files = {
  '/': ['hub.html', 'text/html; charset=utf-8'],
  '/dados': ['dice.html', 'text/html; charset=utf-8'],
  '/hub.css': ['hub.css', 'text/css; charset=utf-8'],
  '/dice.css': ['dice.css', 'text/css; charset=utf-8'],
  '/dice-theme.css': ['dice-theme.css', 'text/css; charset=utf-8'],
  '/dice.js': ['dice.js', 'text/javascript; charset=utf-8'],
  '/audio/dice-on-wood.flac': ['audio/dice-on-wood.flac', 'audio/flac'],
  '/audio/dice-on-wood-1.flac': ['audio/dice-on-wood-1.flac', 'audio/flac'],
  '/audio/dice-on-wood-2.flac': ['audio/dice-on-wood-2.flac', 'audio/flac'],
  '/audio/dice-on-wood-4.flac': ['audio/dice-on-wood-4.flac', 'audio/flac'],
  '/audio/combo-win.wav': ['audio/combo-win.wav', 'audio/wav'],
  '/editor.html': ['editor.html', 'text/html; charset=utf-8'],
  '/editor.css': ['editor.css', 'text/css; charset=utf-8'],
  '/editor.js': ['editor.js', 'text/javascript; charset=utf-8'],
  '/app-v2.js': ['app-v2.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/zones.css': ['zones.css', 'text/css; charset=utf-8'],
  '/theme.css': ['theme.css', 'text/css; charset=utf-8'],
  '/layout-v3.css': ['layout-v3.css', 'text/css; charset=utf-8'],
  '/card-back.png': ['card-back.png', 'image/png'],
  '/attack-shield.png': ['attack-shield.png', 'image/png'],
  '/energies.png': ['energies.png', 'image/png']
};

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://local');
    if (req.method === 'GET' && url.pathname === '/health') { send(res, 200, { ok: true }); return; }
    if (req.method === 'GET' && url.pathname === '/runamarca') { res.writeHead(308, { location: `/runamarca/${url.search}`, 'cache-control': 'no-store' }); res.end(); return; }
    if (url.pathname.startsWith('/runamarca/')) { await handleNewGame(req, res, url, '/runamarca'); return; }
    if (await handleDice(req, res, url)) return;
    const energyIcon = url.pathname.match(/^\/energy-icons\/(ruptura|forja|fluxo|vazio|veu|eco)\.png$/);
    if (req.method === 'GET' && energyIcon) {
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' });
      res.end(await readFile(path.join(here, 'public', 'energy-icons', energyIcon[1] + '.png')));
      return;
    }
    const insignia = url.pathname.match(/^\/insignias\/([a-z0-9-]+)\.png$/);
    if (req.method === 'GET' && insignia) {
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' });
      res.end(await readFile(path.join(here, 'public', 'insignias', insignia[1] + '.png')));
      return;
    }
    if (req.method === 'GET' && files[url.pathname]) {
      const [file, type] = files[url.pathname];
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(await readFile(path.join(here, 'public', file)));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/decks') {
      send(res, 200, Object.entries(catalog).map(([slug, deck]) => ({ slug, title: deck.title, color: deck.color, energy: energyCatalog.deckEnergy[slug], count: deck.cards.reduce((sum, card) => sum + card.quantity, 0), cover: deck.cards[1].image })));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/energies') {
      send(res, 200, energyCatalog);
      return;
    }
    const asset = url.pathname.match(/^\/decks\/(igni|ventus|glacies)\/(image\d+|runa)\.png$/);
    if (req.method === 'GET' && asset) {
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': asset[2] === 'runa' ? 'no-store' : 'public, max-age=86400', 'x-content-type-options': 'nosniff' });
      res.end(await readFile(path.join(here, 'public', 'decks', asset[1], asset[2] + '.png')));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      const data = await body(req);
      const name = String(data.name || 'Mercenário').trim().slice(0, 30);
      const role = data.role === 'spectator' ? 'spectator' : 'player';
      let roomCode; do { roomCode = code(); } while (rooms.has(roomCode));
      const player = freshPlayer(name);
      const room = { code: roomCode, players: role === 'player' ? [player] : [], spectators: role === 'spectator' ? [player] : [], board: [], phase: 'lobby', turn: null, firstPlayer: null, coinWinner: null, winner: null, round: 1, turnNumber: 0, log: [], clients: new Set() };
      rooms.set(roomCode, room);
      send(res, 200, { code: roomCode, token: player.token });
      return;
    }
    const match = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/(join|state|events|action)$/);
    if (!match) { send(res, 404, { error: 'Não encontrado.' }); return; }
    const [, roomCode, operation] = match;
    if (operation === 'join' && req.method === 'POST') {
      const room = rooms.get(roomCode.toUpperCase());
      if (!room) { send(res, 400, { error: 'Sala inexistente.' }); return; }
      const data = await body(req);
      if (data.role === 'spectator' || room.players.length >= 2 || room.phase !== 'lobby') {
        const spectator = freshPlayer(String(data.name || 'Espectador').trim().slice(0, 30));
        room.spectators ||= [];
        room.spectators.push(spectator);
        log(room, `${spectator.name} entrou para assistir à partida.`);
        send(res, 200, { code: room.code, token: spectator.token, spectator: true });
        emit(room);
        return;
      }
      const player = freshPlayer(String(data.name || 'Mercenário').trim().slice(0, 30));
      room.players.push(player);
      log(room, `${player.name} entrou na sala.`);
      send(res, 200, { code: room.code, token: player.token });
      emit(room);
      return;
    }
    const access = requireRoomPlayer(req, res, roomCode);
    if (!access) return;
    const { room, player } = access;
    if (operation === 'state' && req.method === 'GET') { send(res, 200, viewFor(room, player.id)); return; }
    if (operation === 'events' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'connection': 'keep-alive' });
      const client = { res, playerId: player.id };
      room.clients.add(client);
      res.write(`data: ${JSON.stringify(viewFor(room, player.id))}\n\n`);
      const heartbeat = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { clearInterval(heartbeat); room.clients.delete(client); });
      return;
    }
    if (operation === 'action' && req.method === 'POST') {
      const data = await body(req);
      if (!room.players.includes(player) && !['takeSeat','leave'].includes(data.type)) { send(res, 403, { error: 'Espectadores não podem alterar a partida.' }); return; }
      act(room, player, data);
      send(res, 200, { ok: true });
      emit(room);
      if (data.type === 'leave' && !room.players.length && !room.spectators.length) rooms.delete(room.code);
      return;
    }
    send(res, 405, { error: 'Método inválido.' });
  } catch (error) {
    send(res, 400, { error: error.message || 'Erro inesperado.' });
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => console.log(`Mesa disponível em http://localhost:${port}`));
}
