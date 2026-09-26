import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { server, act } from '../server.js';

test('grupos de runas e criaturas geradoras de energia', () => {
  const player = { id: 'p1', name: 'Aelra', ether: 0, hand: [], deck: [], discard: [] };
  const rival = { id: 'p2', name: 'Brann', ether: 0, hand: [], deck: [], discard: [] };
  const rune = id => ({ id, ownerId: 'p1', name: 'Runa de Forja', image: '/decks/ventus/runa.png', zone: 'rune', faceUp: true, tapped: false });
  const room = { players: [player, rival], board: [rune('r1'), rune('r2'), rune('r3')], log: [], turn: 'p1' };
  act(room, player, { type: 'tapGroup', cardIds: ['r1', 'r2', 'r3'] });
  assert.equal(player.ether, 3);
  assert.equal(room.board.filter(c => c.tapped).length, 3);
  assert.throws(() => act(room, player, { type: 'tapGroup', cardIds: ['r1'] }));
  room.board.push(rune('r4'));
  assert.throws(() => act(room, player, { type: 'tapGroup', cardIds: ['r4', 'r1'] }));
  act(room, player, { type: 'tap', cardId: 'r4' });
  assert.equal(player.ether, 4);
  room.board.push({ id: 'solidario', ownerId: 'p1', name: 'Rúnico Solidário', zone: 'creature', faceUp: true, tapped: false, energyEffect: { trigger: 'tap', amount: 1, resource: 'forja' } });
  room.board.push({ id: 'transbordante', ownerId: 'p1', name: 'Rúnico Transbordante', zone: 'creature', faceUp: true, tapped: false, energyEffect: { trigger: 'tap', amount: 1, boostedAmount: 2, condition: 'powerAtLeast4', resource: 'any' } });
  act(room, player, { type: 'tap', cardId: 'solidario' });
  assert.equal(player.ether, 5);
  assert.throws(() => act(room, player, { type: 'attack', cardId: 'solidario' }));
  act(room, player, { type: 'tap', cardId: 'transbordante' });
  assert.equal(player.ether, 6);
  assert.throws(() => act(room, player, { type: 'tap', cardId: 'transbordante' }));
  room.board.find(c => c.id === 'transbordante').tapped = false;
  room.board.push({ id: 'forte', ownerId: 'p1', name: 'Forte', zone: 'creature', faceUp: true, power: 3, powerModifier: 1 });
  act(room, player, { type: 'tap', cardId: 'transbordante' });
  assert.equal(player.ether, 8);
  assert.match(room.log.at(-1), /2 energias? à escolha/);
  const richRune = id => ({ ...rune(id), name: 'Runa da Tríplice Forja', runeEnergy: { generic: 0, ruptura: 0, forja: 3, fluxo: 0 } });
  room.board.push(richRune('r5'), richRune('r6'));
  act(room, player, { type: 'tapGroup', cardIds: ['r5', 'r6'] });
  assert.equal(player.ether, 14);
  assert.match(room.log.at(-1), /6 energias/);
});

test('escolha, moeda, vitória e reinício da partida', () => {
  const createPlayer = (id, name) => ({ id, name, deck: [], hand: [], discard: [], ether: 0, life: 20, deckReady: false, openingRemaining: 0, turnDrawRemaining: 0, bonusDraws: 0 });
  const first = createPlayer('one', 'Aelra');
  const second = createPlayer('two', 'Brann');
  const room = { players: [first, second], board: [], phase: 'lobby', turn: null, round: 1, log: [] };
  assert.throws(() => act(room, first, { type: 'draw' }), /Confirme/);
  act(room, first, { type: 'chooseDeck', deck: 'igni' });
  assert.equal(room.phase, 'lobby');
  assert.throws(() => act(room, first, { type: 'chooseDeck', deck: 'ventus' }), /confirmado/);
  act(room, second, { type: 'chooseDeck', deck: 'ventus' });
  assert.equal(room.phase, 'coin');
  assert.ok(['one', 'two'].includes(room.coinWinner));
  const winner = room.players.find(p => p.id === room.coinWinner);
  const loser = room.players.find(p => p.id !== room.coinWinner);
  assert.throws(() => act(room, loser, { type: 'decideFirst', position: 'first' }), /venceu/);
  act(room, winner, { type: 'decideFirst', position: 'second' });
  assert.equal(room.phase, 'active');
  assert.equal(room.turn, loser.id);
  assert.throws(() => act(room, winner, { type: 'chooseDeck', deck: 'glacies' }), /reinicie/);
  act(room, loser, { type: 'life', delta: -20 });
  assert.equal(room.phase, 'finished');
  assert.equal(room.winner, winner.id);
  assert.throws(() => act(room, winner, { type: 'draw' }), /terminou/);
  act(room, loser, { type: 'resetMatch' });
  assert.equal(room.phase, 'lobby');
  assert.equal(room.players.every(p => !p.deckReady && p.deck.length === 0 && p.life === 20), true);
});

test('Runa importada conserva a energia exibida no editor', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (route, token, data) => {
    const response = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'x-player-token': token } : {}) }, body: JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  };
  try {
    const { data: maker } = await post('/api/rooms', null, { name: 'Criadora' });
    const route = `/api/rooms/${maker.code}`;
    const rune = { name: 'Runa da Forja', kind: 'rune', image: '', rules: '', cost: { generic: 0, colored: 0 }, runeEnergy: { generic: 0, ruptura: 0, forja: 3, fluxo: 0 } };
    assert.equal((await post(`${route}/action`, maker.token, { type: 'import', cards: [rune] })).status, 200);
    const { data: rival } = await post(`${route}/join`, null, { name: 'Rival' });
    assert.equal((await post(`${route}/action`, rival.token, { type: 'chooseDeck', deck: 'igni' })).status, 200);
    const coin = (await (await fetch(base + `${route}/state`, { headers: { 'x-player-token': maker.token } })).json());
    const winnerToken = coin.coinWinner === coin.players[0].id ? maker.token : rival.token;
    const position = winnerToken === maker.token ? 'first' : 'second';
    assert.equal((await post(`${route}/action`, winnerToken, { type: 'decideFirst', position })).status, 200);
    assert.equal((await post(`${route}/action`, maker.token, { type: 'draw' })).status, 200);
    const state = (await (await fetch(base + `${route}/state`, { headers: { 'x-player-token': maker.token } })).json());
    const card = state.players[0].hand[0];
    assert.equal(card.runeEnergy.forja, 3);
    assert.equal((await post(`${route}/action`, maker.token, { type: 'play', cardId: card.id })).status, 200);
    assert.equal((await post(`${route}/action`, maker.token, { type: 'tap', cardId: card.id })).status, 200);
    const after = (await (await fetch(base + `${route}/state`, { headers: { 'x-player-token': maker.token } })).json());
    assert.equal(after.players[0].ether, 3);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('decks, compras limitadas, zonas, adjacência, energia e cartas ocultas', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, token, data) => {
    const response = await fetch(base + route, {
      method: data ? 'POST' : 'GET',
      headers: { ...(data ? { 'content-type': 'application/json' } : {}), ...(token ? { 'x-player-token': token } : {}) },
      body: data ? JSON.stringify(data) : undefined
    });
    return { status: response.status, data: await response.json() };
  };
  const decideMakerFirst = async (route, maker, rival) => {
    const coin = (await call(`${route}/state`, maker.token)).data;
    assert.equal(coin.phase, 'coin');
    const winnerToken = coin.coinWinner === coin.players[0].id ? maker.token : rival.token;
    const position = winnerToken === maker.token ? 'first' : 'second';
    assert.equal((await call(`${route}/action`, winnerToken, { type: 'decideFirst', position })).status, 200);
    assert.equal((await call(`${route}/state`, maker.token)).data.turn, coin.players[0].id);
  };
  const joinAndStart = async (route, maker) => {
    const { data: rival } = await call(`${route}/join`, null, { name: 'Rival de teste' });
    assert.equal((await call(`${route}/action`, rival.token, { type: 'chooseDeck', deck: 'igni' })).status, 200);
    await decideMakerFirst(route, maker, rival);
    return rival;
  };
  try {
    for (const file of ['/editor.html', '/editor.css', '/editor.js']) {
      const response = await fetch(base + file);
      assert.equal(response.status, 200);
    }
    const { data: maker } = await call('/api/rooms', null, { name: 'Criadora' });
    const makerRoute = `/api/rooms/${maker.code}`;
    const created = { name: 'Sentinela da Fratura', kind: 'creature', subtype: 'Caçadora', rules: 'Marque uma criatura.', cost: { generic: 2, colored: 0, energies: { ruptura: 1, forja: 1, fluxo: 0 } }, power: 2, health: 3, agile: true, drawEffect: { trigger: 'enter', count: 2 }, energyEffect: { trigger: 'tap', amount: 1, resource: 'forja' }, costDiscount: { condition: 'agileCreature', amount: 1 }, image: 'data:image/png;base64,iVBORw0KGgo=' };
    assert.equal((await call(`${makerRoute}/action`, maker.token, { type: 'import', cards: [created] })).status, 200);
    await joinAndStart(makerRoute, maker);
    assert.equal((await call(`${makerRoute}/action`, maker.token, { type: 'draw' })).status, 200);
    const imported = (await call(`${makerRoute}/state`, maker.token)).data.players[0].hand[0];
    assert.deepEqual(imported.cost, { generic: 2, colored: 2, energies: { ruptura: 1, forja: 1, fluxo: 0 } });
    assert.equal(imported.rules, created.rules);
    assert.equal(imported.subtype, created.subtype);
    assert.equal(imported.agile, true);
    assert.deepEqual(imported.drawEffect, created.drawEffect);
    assert.deepEqual(imported.energyEffect, created.energyEffect);
    assert.deepEqual(imported.costDiscount, created.costDiscount);
    const decks = (await call('/api/decks')).data;
    assert.deepEqual(decks.map(d => [d.slug, d.count]), [['igni', 60], ['ventus', 60], ['glacies', 60]]);
    assert.deepEqual(decks.map(d => d.title), ['Ruptura', 'Forja', 'Fluxo']);
    assert.deepEqual(decks.map(d => d.energy), ['ruptura', 'forja', 'fluxo']);
    const catalog = JSON.parse(await readFile(new URL('../public/decks/catalog.json', import.meta.url), 'utf8'));
    assert.deepEqual(catalog.ventus.cards.find(card => card.name === 'Torreta de Vigia').cost, { colored: 2, generic: 2 });
    assert.deepEqual(catalog.ventus.cards.find(card => card.name === 'Rúnico Solidário').energyEffect, { trigger: 'tap', amount: 1, resource: 'forja' });
    assert.deepEqual(catalog.ventus.cards.find(card => card.name === 'Rúnico Transbordante').energyEffect, { trigger: 'tap', amount: 1, boostedAmount: 2, condition: 'powerAtLeast4', resource: 'any' });
    const energies = (await call('/api/energies')).data;
    assert.deepEqual(energies.energies.map(energy => energy.name), ['Ruptura', 'Fluxo', 'Eco', 'Forja', 'Véu', 'Vazio']);
    assert.equal(energies.legacyColorEnergy.green, 'forja');
    const energyArt = await fetch(base + '/energies.png');
    assert.equal(energyArt.headers.get('content-type'), 'image/png');
    const art = await fetch(base + decks[0].cover);
    assert.equal(art.status, 200);
    assert.equal(art.headers.get('content-type'), 'image/png');
    const { data: one } = await call('/api/rooms', null, { name: 'Aelra' });
    const { data: two } = await call(`/api/rooms/${one.code}/join`, null, { name: 'Brann' });
    const route = `/api/rooms/${one.code}`;
    assert.equal((await call(`${route}/state`)).status, 403);
    await call(`${route}/action`, one.token, { type: 'chooseDeck', deck: 'igni' });
    assert.equal((await call(`${route}/action`, one.token, { type: 'draw' })).status, 400);
    await call(`${route}/action`, two.token, { type: 'chooseDeck', deck: 'glacies' });
    await decideMakerFirst(route, one, two);
    let own = (await call(`${route}/state`, one.token)).data;
    assert.equal(own.players[0].deckCount, 60);
    assert.equal(own.players[0].handCount, 0);
    assert.equal(own.players[0].openingRemaining, 7);
    assert.equal((await call(`${route}/action`, one.token, { type: 'draw', count: 5 })).status, 400);
    assert.equal((await call(`${route}/action`, one.token, { type: 'endTurn' })).status, 400);
    for (let i = 0; i < 7; i++) assert.equal((await call(`${route}/action`, one.token, { type: 'draw', count: 1 })).status, 200);
    own = (await call(`${route}/state`, one.token)).data;
    assert.equal(own.players[0].deckCount, 53);
    assert.equal(own.players[0].handCount, 7);
    assert.equal((await call(`${route}/action`, one.token, { type: 'draw' })).status, 400);
    assert.equal(own.players[0].life, 20);
    assert.equal((await call(`${route}/state`, two.token)).data.players[0].hand, undefined);
    for (let i = 0; i < 7; i++) assert.equal((await call(`${route}/action`, two.token, { type: 'draw' })).status, 200);
    await call(`${route}/action`, one.token, { type: 'endTurn' });
    assert.equal((await call(`${route}/state`, two.token)).data.players[1].turnDrawRemaining, 1);
    assert.equal((await call(`${route}/action`, two.token, { type: 'draw' })).status, 200);
    assert.equal((await call(`${route}/action`, two.token, { type: 'draw' })).status, 400);
    await call(`${route}/action`, two.token, { type: 'endTurn' });
    assert.equal((await call(`${route}/state`, one.token)).data.players[0].turnDrawRemaining, 1);
    await call(`${route}/action`, one.token, { type: 'resetMatch' });
    assert.equal((await call(`${route}/state`, one.token)).data.phase, 'lobby');
    await call(`${route}/action`, one.token, { type: 'import', cards: [
      { name: 'Runa A', kind: 'rune' }, { name: 'Runa B', kind: 'rune' },
      { name: 'Lobo A', kind: 'creature', power: 1, health: 1 }, { name: 'Lobo B', kind: 'creature' },
      { name: 'Lobo C', kind: 'creature', cost: { colored: 1, generic: 0 } }
    ] });
    await call(`${route}/action`, two.token, { type: 'chooseDeck', deck: 'glacies' });
    await decideMakerFirst(route, one, two);
    for (let i = 0; i < 5; i++) assert.equal((await call(`${route}/action`, one.token, { type: 'draw' })).status, 200);
    own = (await call(`${route}/state`, one.token)).data;
    const byName = name => own.players[0].hand.find(c => c.name === name).id;
    const a = byName('Lobo A'), b = byName('Lobo B'), c = byName('Lobo C');
    const runeA = byName('Runa A'), runeB = byName('Runa B');
    assert.equal((await call(`${route}/action`, one.token, { type: 'play', cardId: c })).status, 400);
    await call(`${route}/action`, one.token, { type: 'play', cardId: a });
    assert.equal((await call(`${route}/action`, one.token, { type: 'play', cardId: b })).status, 400);
    await call(`${route}/action`, one.token, { type: 'play', cardId: b, neighborId: a, side: 'right' });
    await call(`${route}/action`, one.token, { type: 'play', cardId: runeA });
    assert.equal((await call(`${route}/action`, one.token, { type: 'play', cardId: runeB })).status, 400);
    await call(`${route}/action`, one.token, { type: 'tap', cardId: runeA });
    assert.equal((await call(`${route}/action`, one.token, { type: 'tap', cardId: runeA })).status, 400);
    await call(`${route}/action`, one.token, { type: 'play', cardId: c, neighborId: a, side: 'left', faceUp: false });
    own = (await call(`${route}/state`, one.token)).data;
    assert.deepEqual(own.board.filter(x => x.zone === 'creature').map(x => x.name), ['Lobo C', 'Lobo A', 'Lobo B']);
    assert.equal(own.players[0].ether, 0);
    await call(`${route}/action`, one.token, { type: 'stat', cardId: c, stat: 'power', delta: 1 });
    const rival = (await call(`${route}/state`, two.token)).data;
    assert.equal(rival.board.find(x => x.id === c).name, undefined);
    assert.equal(rival.board.find(x => x.id === c).power, undefined);
    assert.equal(rival.board.find(x => x.id === c).powerModifier, undefined);
    assert.equal((await call(`${route}/action`, two.token, { type: 'flip', cardId: c })).status, 400);
    await call(`${route}/action`, one.token, { type: 'flip', cardId: c });
    assert.equal((await call(`${route}/state`, two.token)).data.board.find(x => x.id === c).name, 'Lobo C');
    assert.equal((await call(`${route}/state`, two.token)).data.board.find(x => x.id === c).powerModifier, 1);
    assert.equal((await call(`${route}/action`, one.token, { type: 'stat', cardId: a, stat: 'power', delta: 1 })).status, 200);
    assert.equal((await call(`${route}/action`, one.token, { type: 'stat', cardId: a, stat: 'health', delta: -1 })).status, 200);
    const modified = (await call(`${route}/state`, two.token)).data.board.find(x => x.id === a);
    assert.equal(modified.power + modified.powerModifier, 2);
    assert.equal(modified.health + modified.healthModifier, 0);
    assert.equal((await call(`${route}/action`, two.token, { type: 'stat', cardId: a, stat: 'power', delta: 1 })).status, 400);
    assert.equal((await call(`${route}/action`, one.token, { type: 'stat', cardId: a, stat: 'health', delta: -1 })).status, 400);
    await call(`${route}/action`, one.token, { type: 'return', cardId: a });
    const returned = (await call(`${route}/state`, one.token)).data.players[0].hand.find(x => x.id === a);
    assert.equal(returned.power, 1);
    assert.equal(returned.health, 1);
    assert.equal(returned.powerModifier, undefined);

    const { data: spellPlayer } = await call('/api/rooms', null, { name: 'Maga' });
    const spellRoute = `/api/rooms/${spellPlayer.code}`;
    await call(`${spellRoute}/action`, spellPlayer.token, { type: 'import', cards: Array.from({ length: 14 }, () => ({ name: 'Sete Compras', kind: 'spell', drawEffect: { trigger: 'enter', count: 7 } })) });
    await joinAndStart(spellRoute, spellPlayer);
    for (let i = 0; i < 7; i++) await call(`${spellRoute}/action`, spellPlayer.token, { type: 'draw' });
    let spellState = (await call(`${spellRoute}/state`, spellPlayer.token)).data;
    await call(`${spellRoute}/action`, spellPlayer.token, { type: 'play', cardId: spellState.players[0].hand[0].id });
    spellState = (await call(`${spellRoute}/state`, spellPlayer.token)).data;
    assert.equal(spellState.players[0].bonusDraws, 7);
    for (let i = 0; i < 7; i++) assert.equal((await call(`${spellRoute}/action`, spellPlayer.token, { type: 'draw' })).status, 200);
    assert.equal((await call(`${spellRoute}/action`, spellPlayer.token, { type: 'draw' })).status, 400);

    const bote = catalog.igni.cards.find(card => card.name === 'Bote Planejado');
    assert.equal(bote.kind, 'spell');
    const { data: caster } = await call('/api/rooms', null, { name: 'Conjuradora' });
    const { data: witness } = await call(`/api/rooms/${caster.code}/join`, null, { name: 'Testemunha' });
    const castRoute = `/api/rooms/${caster.code}`;
    await call(`${castRoute}/action`, caster.token, { type: 'import', cards: [
      { name: 'Runa de Ruptura', kind: 'rune' },
      { name: bote.name, kind: bote.kind, cost: bote.cost },
      ...Array.from({ length: 5 }, (_, i) => ({ name: `Reserva ${i}`, kind: 'rune' }))
    ] });
    await call(`${castRoute}/action`, witness.token, { type: 'chooseDeck', deck: 'igni' });
    await decideMakerFirst(castRoute, caster, witness);
    for (let i = 0; i < 7; i++) await call(`${castRoute}/action`, caster.token, { type: 'draw' });
    let castState = (await call(`${castRoute}/state`, caster.token)).data;
    const runeId = castState.players[0].hand.find(card => card.name === 'Runa de Ruptura').id;
    const boteId = castState.players[0].hand.find(card => card.name === bote.name).id;
    assert.equal((await call(`${castRoute}/action`, caster.token, { type: 'play', cardId: boteId })).status, 400);
    assert.equal((await call(`${castRoute}/action`, caster.token, { type: 'play', cardId: runeId })).status, 200);
    assert.equal((await call(`${castRoute}/action`, caster.token, { type: 'tap', cardId: runeId })).status, 200);
    assert.equal((await call(`${castRoute}/action`, caster.token, { type: 'play', cardId: boteId, zone: 'spell' })).status, 200);
    castState = (await call(`${castRoute}/state`, witness.token)).data;
    assert.equal(castState.board.find(card => card.id === boteId).zone, 'spell');
    assert.equal(castState.board.find(card => card.id === boteId).name, 'Bote Planejado');
    assert.equal((await call(`${castRoute}/action`, caster.token, { type: 'discard', cardId: boteId })).status, 200);
    castState = (await call(`${castRoute}/state`, witness.token)).data;
    assert.equal(castState.board.some(card => card.id === boteId), false);

    const { data: revealPlayer } = await call('/api/rooms', null, { name: 'Vidente' });
    const revealRoute = `/api/rooms/${revealPlayer.code}`;
    await call(`${revealRoute}/action`, revealPlayer.token, { type: 'import', cards: Array.from({ length: 14 }, () => ({ name: 'Vidente de teste', kind: 'creature', agile: true, drawEffect: { trigger: 'enter', count: 1 } })) });
    await joinAndStart(revealRoute, revealPlayer);
    for (let i = 0; i < 7; i++) await call(`${revealRoute}/action`, revealPlayer.token, { type: 'draw' });
    let revealState = (await call(`${revealRoute}/state`, revealPlayer.token)).data;
    const hiddenId = revealState.players[0].hand[0].id;
    await call(`${revealRoute}/action`, revealPlayer.token, { type: 'play', cardId: hiddenId, faceUp: false });
    assert.equal((await call(`${revealRoute}/state`, revealPlayer.token)).data.players[0].bonusDraws, 0);
    await call(`${revealRoute}/action`, revealPlayer.token, { type: 'flip', cardId: hiddenId });
    await call(`${revealRoute}/action`, revealPlayer.token, { type: 'flip', cardId: hiddenId });
    await call(`${revealRoute}/action`, revealPlayer.token, { type: 'flip', cardId: hiddenId });
    assert.equal((await call(`${revealRoute}/state`, revealPlayer.token)).data.players[0].bonusDraws, 1);

    const { data: attackPlayer } = await call('/api/rooms', null, { name: 'Esfinge' });
    const attackRoute = `/api/rooms/${attackPlayer.code}`;
    await call(`${attackRoute}/action`, attackPlayer.token, { type: 'import', cards: Array.from({ length: 14 }, () => ({ name: 'Esfinge de teste', kind: 'creature', agile: true, drawEffect: { trigger: 'agileAttack', count: 1 } })) });
    await joinAndStart(attackRoute, attackPlayer);
    for (let i = 0; i < 7; i++) await call(`${attackRoute}/action`, attackPlayer.token, { type: 'draw' });
    const attackState = (await call(`${attackRoute}/state`, attackPlayer.token)).data;
    const attackerId = attackState.players[0].hand[0].id;
    await call(`${attackRoute}/action`, attackPlayer.token, { type: 'play', cardId: attackerId });
    assert.equal((await call(`${attackRoute}/action`, attackPlayer.token, { type: 'attack', cardId: attackerId })).status, 200);
    assert.equal((await call(`${attackRoute}/state`, attackPlayer.token)).data.players[0].bonusDraws, 1);
    assert.equal((await call(`${attackRoute}/action`, attackPlayer.token, { type: 'attack', cardId: attackerId })).status, 400);

    const { data: startOne } = await call('/api/rooms', null, { name: 'Inventora' });
    const { data: startTwo } = await call(`/api/rooms/${startOne.code}/join`, null, { name: 'Rival' });
    const startRoute = `/api/rooms/${startOne.code}`;
    await call(`${startRoute}/action`, startOne.token, { type: 'import', cards: Array.from({ length: 14 }, () => ({ name: 'Sobrecarga', kind: 'creature', power: 3, health: 2, drawEffect: { trigger: 'turnStart', count: 1, condition: 'powerAtLeast4' } })) });
    await call(`${startRoute}/action`, startTwo.token, { type: 'import', cards: Array.from({ length: 7 }, () => ({ name: 'Runa', kind: 'rune' })) });
    await decideMakerFirst(startRoute, startOne, startTwo);
    for (let i = 0; i < 7; i++) {
      await call(`${startRoute}/action`, startOne.token, { type: 'draw' });
      await call(`${startRoute}/action`, startTwo.token, { type: 'draw' });
    }
    const startState = (await call(`${startRoute}/state`, startOne.token)).data;
    await call(`${startRoute}/action`, startOne.token, { type: 'play', cardId: startState.players[0].hand[0].id });
    await call(`${startRoute}/action`, startOne.token, { type: 'stat', cardId: startState.players[0].hand[0].id, stat: 'power', delta: 1 });
    await call(`${startRoute}/action`, startOne.token, { type: 'endTurn' });
    await call(`${startRoute}/action`, startTwo.token, { type: 'endTurn' });
    const nextTurn = (await call(`${startRoute}/state`, startOne.token)).data.players[0];
    assert.equal(nextTurn.turnDrawRemaining, 1);
    assert.equal(nextTurn.bonusDraws, 1);

    const { data: discountPlayer } = await call('/api/rooms', null, { name: 'Corredora' });
    const discountRoute = `/api/rooms/${discountPlayer.code}`;
    await call(`${discountRoute}/action`, discountPlayer.token, { type: 'import', cards: [
      { name: 'Runa', kind: 'rune' },
      { name: 'Ágil', kind: 'creature', agile: true },
      { name: 'Passo', kind: 'spell', cost: { generic: 2 }, drawEffect: { trigger: 'enter', count: 2 }, costDiscount: { condition: 'agileCreature', amount: 1 } },
      ...Array.from({ length: 4 }, () => ({ name: 'Reserva', kind: 'spell' }))
    ] });
    await joinAndStart(discountRoute, discountPlayer);
    for (let i = 0; i < 7; i++) await call(`${discountRoute}/action`, discountPlayer.token, { type: 'draw' });
    const discountState = (await call(`${discountRoute}/state`, discountPlayer.token)).data;
    const named = name => discountState.players[0].hand.find(card => card.name === name).id;
    await call(`${discountRoute}/action`, discountPlayer.token, { type: 'play', cardId: named('Runa') });
    await call(`${discountRoute}/action`, discountPlayer.token, { type: 'tap', cardId: named('Runa') });
    await call(`${discountRoute}/action`, discountPlayer.token, { type: 'play', cardId: named('Ágil') });
    assert.equal((await call(`${discountRoute}/action`, discountPlayer.token, { type: 'play', cardId: named('Passo') })).status, 200);
    assert.equal((await call(`${discountRoute}/state`, discountPlayer.token)).data.players[0].bonusDraws, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
