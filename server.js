import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(await readFile(path.join(here, 'public', 'decks', 'catalog.json'), 'utf8'));
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

export function viewFor(room, playerId) {
  return {
    code: room.code,
    phase: room.phase || 'active',
    coinWinner: room.coinWinner || null,
    winner: room.winner || null,
    firstPlayer: room.firstPlayer || null,
    turn: room.turn,
    round: room.round,
    log: room.log.slice(-25),
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      deckCount: p.deck.length,
      handCount: p.hand.length,
      discardCount: p.discard.length,
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
      discard: p.discard
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

function tapRune(room, player, card) {
  if (card.zone !== 'rune' || card.ownerId !== player.id || card.tapped) throw new Error('Escolha uma Runa sua que ainda não foi virada.');
  card.tapped = true;
  const resource = card.runeEnergy;
  const amount = resource ? Object.values(resource).reduce((sum, value) => sum + value, 0) : 1;
  player.ether += amount;
  return amount;
}

function requireRoomPlayer(req, res, roomCode) {
  const room = rooms.get(roomCode?.toUpperCase());
  const player = room && playerFor(room, req.headers['x-player-token']);
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
    const agile = card.agile === true;
    const effect = card.drawEffect;
    const drawEffect = effect && ['enter', 'reveal', 'turnStart', 'agileAttack'].includes(effect.trigger)
      ? { trigger: effect.trigger, count: Math.max(1, Math.min(7, Math.trunc(Number(effect.count) || 1))), condition: effect.condition === 'powerAtLeast4' ? 'powerAtLeast4' : undefined }
      : undefined;
    const discount = card.costDiscount;
    const costDiscount = discount?.condition === 'agileCreature'
      ? { condition: 'agileCreature', amount: Math.max(0, Math.min(5, Math.trunc(Number(discount.amount) || 0))) }
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
    return { id: randomUUID(), name, image, kind, subtype: String(card.subtype || '').slice(0, 45), rules: String(card.rules || '').slice(0, 850), cost: { colored, generic, ...(energies ? { energies } : {}) }, power, health, agile, drawEffect, costDiscount, energyEffect, runeEnergy, patronAbilities, patronStyle };
  });
}

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUInt32BE() % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

export function act(room, player, data) {
  const other = room.players.find(p => p.id !== player.id);
  const mine = player.id;
  const phase = room.phase || 'active';
  if (phase === 'lobby' && !['chooseDeck','import','resetMatch','clear'].includes(data.type)) throw new Error('Confirme os dois decks antes de começar.');
  if (phase === 'coin' && !['decideFirst','resetMatch','clear'].includes(data.type)) throw new Error('Aguarde o resultado da moeda e a decisão de quem começa.');
  if (phase === 'finished' && !['resetMatch','clear'].includes(data.type)) throw new Error('A partida terminou. Inicie uma nova para jogar novamente.');
  if (phase === 'active' && ['chooseDeck','import','decideFirst'].includes(data.type)) throw new Error('Para trocar de deck, reinicie a partida.');
  const handCard = () => player.hand.find(c => c.id === data.cardId);
  const cardOnBoard = () => {
    const card = room.board.find(c => c.id === data.cardId);
    if (!card || card.ownerId !== mine) throw new Error('Você só pode mover suas cartas.');
    return card;
  };
  const unplay = card => ({ id: card.id, name: card.name, image: card.image, kind: card.kind, subtype: card.subtype, rules: card.rules, cost: card.cost, power: card.power, health: card.health, agile: card.agile, drawEffect: card.drawEffect, costDiscount: card.costDiscount, energyEffect: card.energyEffect, runeEnergy: card.runeEnergy, patronAbilities: card.patronAbilities, patronStyle: card.patronStyle });
  const grantDraws = (recipient, count, source) => {
    recipient.bonusDraws += count;
    log(room, `${source}: ${recipient.name} pode comprar ${count} carta(s) extra.`);
  };
  const triggerVisibleEntry = card => {
    if (card.faceUp && !card.entryTriggered && card.drawEffect?.trigger === 'enter') {
      card.entryTriggered = true;
      grantDraws(player, card.drawEffect.count, card.name);
    }
  };
  const prepareDeck = cards => {
    player.deck = cards;
    player.hand = [];
    player.discard = [];
    player.ether = 0;
    player.life = 20;
    player.runePlayed = false;
    player.deckReady = true;
    player.openingRemaining = Math.min(7, cards.length);
    player.turnDrawRemaining = 0;
    player.bonusDraws = 0;
    shuffle(player.deck);
  };
  const resetMatch = () => {
    for (const participant of room.players) {
      participant.deck = []; participant.hand = []; participant.discard = [];
      participant.ether = 0; participant.life = 20; participant.deckColor = null;
      participant.deckChoice = null; participant.runePlayed = false;
      participant.deckReady = false; participant.openingRemaining = 0;
      participant.turnDrawRemaining = 0; participant.bonusDraws = 0;
    }
    room.board = []; room.phase = 'lobby'; room.turn = null;
    room.firstPlayer = null; room.coinWinner = null; room.winner = null; room.round = 1;
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
      const cards = preset.cards.flatMap(entry => Array.from({ length: entry.quantity }, () => ({ id: randomUUID(), name: entry.name, image: entry.image, kind: entry.kind, cost: entry.cost, power: entry.power || 0, health: entry.health || 0, agile: entry.agile || false, drawEffect: entry.drawEffect, costDiscount: entry.costDiscount, energyEffect: entry.energyEffect })));
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
      room.turn = room.firstPlayer; room.phase = 'active'; room.round = 1;
      const starter = room.players.find(p => p.id === room.firstPlayer);
      log(room, `${player.name} venceu a moeda e escolheu ${data.position === 'first' ? 'começar' : 'jogar em segundo'}. ${starter.name} começa.`);
      break;
    }
    case 'draw': {
      if (!player.deck.length) throw new Error('Seu baralho acabou.');
      if (data.count !== undefined && Number(data.count) !== 1) throw new Error('Compre uma carta por clique.');
      let source;
      if (player.openingRemaining > 0) { player.openingRemaining--; source = 'mão inicial'; }
      else if (player.bonusDraws > 0) { player.bonusDraws--; source = 'efeito de carta'; }
      else if (room.turn === mine && player.turnDrawRemaining > 0) { player.turnDrawRemaining--; source = 'turno'; }
      else throw new Error('Você não tem compras de carta disponíveis.');
      player.hand.push(player.deck.pop());
      log(room, `${player.name} comprou uma carta (${source}).`);
      break;
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
      if (zone === 'rune' && player.runePlayed) throw new Error('Você já jogou uma Runa neste turno.');
      if (zone === 'patron' && room.board.some(c => c.ownerId === mine && c.zone === 'patron')) throw new Error('Você já tem um Patrono em campo.');
      let cost = zone === 'rune' ? 0 : (card.cost?.colored || 0) + (card.cost?.generic || 0);
      if (card.costDiscount?.condition === 'agileCreature' && room.board.some(c => c.ownerId === mine && c.zone === 'creature' && c.faceUp && c.agile)) cost = Math.max(0, cost - card.costDiscount.amount);
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
      const played = { ...card, ownerId: mine, zone, faceUp: data.faceUp !== false, tapped: false, attackedThisTurn: false, entryTriggered: false, powerModifier: 0, healthModifier: 0 };
      player.hand = player.hand.filter(c => c.id !== card.id);
      player.ether -= cost;
      if (zone === 'rune') player.runePlayed = true;
      room.board.splice(insertion, 0, played);
      log(room, `${player.name} colocou ${played.faceUp ? card.name : 'uma carta oculta'} em ${zone === 'rune' ? 'Terrenos' : zone === 'spell' ? 'Magias' : zone === 'patron' ? 'Patrono' : 'Criaturas'}.`);
      triggerVisibleEntry(played);
      break;
    }
    case 'flip': {
      const card = cardOnBoard();
      card.faceUp = !card.faceUp;
      log(room, `${player.name} ${card.faceUp ? 'revelou' : 'ocultou'} uma carta.`);
      if (card.faceUp) {
        triggerVisibleEntry(card);
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
      card.attackedThisTurn = true;
      card.tapped = true;
      log(room, `${player.name} declarou ataque com ${card.name}.`);
      if (card.agile) {
        for (const sphinx of room.board) {
          if (!sphinx.faceUp || sphinx.drawEffect?.trigger !== 'agileAttack') continue;
          const recipient = room.players.find(p => p.id === sphinx.ownerId);
          if (recipient) grantDraws(recipient, sphinx.drawEffect.count, sphinx.name);
        }
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
      if (card.zone === 'rune') {
        const amount = tapRune(room, player, card);
        log(room, `${player.name} virou uma Runa e ganhou ${amount} energia${amount === 1 ? '' : 's'}.`);
      } else if (card.zone === 'creature' && card.energyEffect) {
        if (!card.faceUp || card.tapped || card.attackedThisTurn) throw new Error('Esta criatura não pode gerar energia agora.');
        card.tapped = true;
        const effect = card.energyEffect;
        const boosted = effect.condition === 'powerAtLeast4' && room.board.some(c => c.ownerId === mine && c.zone === 'creature' && c.faceUp && currentStat(c, 'power') >= 4);
        const amount = boosted ? effect.boostedAmount : effect.amount;
        player.ether += amount;
        log(room, `${player.name} girou ${card.name} e ganhou ${amount} energia${effect.resource === 'any' ? ' à escolha' : ` de ${effect.resource}`}.`);
      } else card.tapped = !card.tapped;
      break;
    }
    case 'tapGroup': {
      const ids = data.cardIds;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length) throw new Error('Escolha de 1 a 3 Runas diferentes.');
      const cards = ids.map(id => room.board.find(c => c.id === id));
      if (cards.some(c => !c || c.ownerId !== mine || c.zone !== 'rune' || c.tapped)) throw new Error('Grupo de Runas inválido.');
      if (cards.some(c => c.name !== cards[0].name || c.image !== cards[0].image || c.faceUp !== cards[0].faceUp)) throw new Error('O grupo deve conter Runas iguais.');
      const amount = cards.reduce((sum, card) => sum + tapRune(room, player, card), 0);
      log(room, `${player.name} virou ${cards.length} Runa(s) e ganhou ${amount} energia${amount === 1 ? '' : 's'}.`);
      break;
    }
    case 'return': {
      const card = cardOnBoard();
      room.board = room.board.filter(c => c.id !== card.id);
      player.hand.push(unplay(card));
      log(room, `${player.name} devolveu uma carta à mão.`);
      break;
    }
    case 'discard': {
      const index = player.hand.findIndex(c => c.id === data.cardId);
      if (index >= 0) player.discard.push(player.hand.splice(index, 1)[0]);
      else {
        const card = cardOnBoard();
        room.board = room.board.filter(c => c.id !== card.id);
        player.discard.push(unplay(card));
      }
      log(room, `${player.name} descartou uma carta.`);
      break;
    }
    case 'endTurn':
      if (room.turn !== mine) throw new Error('Ainda não é seu turno.');
      if (!other) throw new Error('Aguarde o outro jogador.');
      if (room.players.some(p => !p.deckReady || p.openingRemaining > 0)) throw new Error('Os dois jogadores precisam concluir as 7 compras iniciais.');
      player.turnDrawRemaining = 0;
      player.bonusDraws = 0;
      room.turn = other.id;
      if (room.firstPlayer === room.turn || (!room.firstPlayer && room.players[0].id === room.turn)) room.round++;
      other.ether = 0;
      other.runePlayed = false;
      other.turnDrawRemaining = 1;
      for (const card of room.board) if (card.ownerId === other.id) { card.tapped = false; card.attackedThisTurn = false; }
      log(room, `${player.name} encerrou o turno.`);
      const hasPowerFour = room.board.some(card => card.ownerId === other.id && card.zone === 'creature' && card.faceUp && currentStat(card, 'power') >= 4);
      for (const card of room.board) {
        if (card.ownerId !== other.id || !card.faceUp || card.drawEffect?.trigger !== 'turnStart') continue;
        if (card.drawEffect.condition === 'powerAtLeast4' && !hasPowerFour) continue;
        grantDraws(other, card.drawEffect.count, card.name);
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
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/editor.html': ['editor.html', 'text/html; charset=utf-8'],
  '/editor.css': ['editor.css', 'text/css; charset=utf-8'],
  '/editor.js': ['editor.js', 'text/javascript; charset=utf-8'],
  '/app-v2.js': ['app-v2.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/zones.css': ['zones.css', 'text/css; charset=utf-8'],
  '/theme.css': ['theme.css', 'text/css; charset=utf-8'],
  '/card-back.png': ['card-back.png', 'image/png'],
  '/energies.png': ['energies.png', 'image/png']
};

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://local');
    if (req.method === 'GET' && url.pathname === '/health') { send(res, 200, { ok: true }); return; }
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
      let roomCode; do { roomCode = code(); } while (rooms.has(roomCode));
      const player = { id: randomUUID(), token: token(), name, deck: [], hand: [], discard: [], ether: 0, deckColor: null, life: 20, runePlayed: false, deckReady: false, openingRemaining: 0, turnDrawRemaining: 0, bonusDraws: 0 };
      const room = { code: roomCode, players: [player], board: [], phase: 'lobby', turn: null, firstPlayer: null, coinWinner: null, winner: null, round: 1, log: [], clients: new Set() };
      rooms.set(roomCode, room);
      send(res, 200, { code: roomCode, token: player.token });
      return;
    }
    const match = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/(join|state|events|action)$/);
    if (!match) { send(res, 404, { error: 'Não encontrado.' }); return; }
    const [, roomCode, operation] = match;
    if (operation === 'join' && req.method === 'POST') {
      const room = rooms.get(roomCode.toUpperCase());
      if (!room || room.players.length >= 2) { send(res, 400, { error: 'Sala inexistente ou lotada.' }); return; }
      const data = await body(req);
      const player = { id: randomUUID(), token: token(), name: String(data.name || 'Mercenário').trim().slice(0, 30), deck: [], hand: [], discard: [], ether: 0, deckColor: null, life: 20, runePlayed: false, deckReady: false, openingRemaining: 0, turnDrawRemaining: 0, bonusDraws: 0 };
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
      act(room, player, await body(req));
      send(res, 200, { ok: true });
      emit(room);
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
