import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server.js';
import { scoreDice } from '../dice-game.js';

test('combinações de seis dados e poderes das insígnias', () => {
  assert.equal(scoreDice([1]),100);
  assert.equal(scoreDice([5]),50);
  assert.equal(scoreDice([2,2,2]),200);
  assert.equal(scoreDice([1,1,1]),1000);
  assert.equal(scoreDice([2,2,2,2]),400);
  assert.equal(scoreDice([2,2,2,2,2]),800);
  assert.equal(scoreDice([2,2,2,2,2,2]),1600);
  assert.equal(scoreDice([1,2,3,4,5]),500);
  assert.equal(scoreDice([2,3,4,5,6]),750);
  assert.equal(scoreDice([1,2,3,4,5,6]),1500);
  assert.equal(scoreDice([2,3]),0);
  assert.equal(scoreDice([1,5],{tique:true}),300);
  assert.equal(scoreDice([3,5],{carpinteiro:true}),100);
  assert.equal(scoreDice([4,5,6],{carrasco:true}),300);
  assert.equal(scoreDice([1,3,5],{sacerdote:true}),1000);
  assert.equal(scoreDice([2,2],{casamento:true}),100);
  assert.equal(scoreDice([2,2,2],{imperador:true}),300);
});

test('hub, cartas automáticas, ataque e mesa de dados online', async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=async(path,data,secret)=>{const r=await fetch(base+path,{method:data?'POST':'GET',headers:{...(data?{'content-type':'application/json'}:{}),...(secret?{'x-player-token':secret}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()}};
  try {
    for(const page of ['/','/runamarca','/dados','/editor.html','/dice.js','/hub.css','/insignias/defesa-estanho.png']) assert.equal((await call(page)).status,200,page);
    assert.match((await call('/')).data,/Jogos Elysium/);
    assert.match((await call('/runamarca')).data,/RUNAMARCA/i);
    const a=(await call('/api/rooms',{name:'A'})).data;
    const b=(await call(`/api/rooms/${a.code}/join`,{name:'B'})).data;
    const route=`/api/rooms/${a.code}`;
    const cards=Array.from({length:8},(_,i)=>({name:i%2===0?'Ágil':'Guarda',kind:'creature',agile:i%2===0,quickAttack:i===0||i===4,power:1,health:1,...(i%2?{drawEffect:{trigger:'enter',count:1}}:{})}));
    assert.equal((await call(`${route}/action`,{type:'import',cards},a.token)).status,200);
    assert.equal((await call(`${route}/action`,{type:'import',cards},b.token)).status,200);
    const coin=(await call(`${route}/state`,undefined,a.token)).data;
    const coinToken=coin.coinWinner===coin.players[0].id?a.token:b.token;
    assert.equal((await call(`${route}/action`,{type:'decideFirst',position:coinToken===a.token?'first':'second'},coinToken)).status,200);
    let aState=(await call(`${route}/state`,undefined,a.token)).data;
    let bState=(await call(`${route}/state`,undefined,b.token)).data;
    assert.equal(aState.players[0].hand.length,7);
    assert.equal(bState.players[1].hand.length,7);
    assert.equal(aState.players[1].hand,undefined);
    assert.equal((await call(`${route}/action`,{type:'draw'},a.token)).status,400);
    const starter=aState.turn===aState.you?{token:a.token,index:0}:{token:b.token,index:1};
    const second=starter.token===a.token?{token:b.token,index:1}:{token:a.token,index:0};
    let start=(await call(`${route}/state`,undefined,starter.token)).data;
    const hand=start.players[starter.index].hand;
    const agile=hand.find(c=>c.agile&&c.quickAttack),agileOnly=hand.find(c=>c.agile&&!c.quickAttack),normal=hand.find(c=>!c.agile);
    assert.ok(agile&&agileOnly&&normal);
    assert.equal((await call(`${route}/action`,{type:'play',cardId:normal.id},starter.token)).status,200);
    start=(await call(`${route}/state`,undefined,starter.token)).data;
    assert.equal(start.players[starter.index].hand.length,7);
    assert.equal((await call(`${route}/action`,{type:'attack',cardId:normal.id},starter.token)).status,400);
    assert.equal((await call(`${route}/action`,{type:'play',cardId:agile.id,neighborId:normal.id,side:'right'},starter.token)).status,200);
    assert.equal((await call(`${route}/action`,{type:'attack',cardId:agile.id},starter.token)).status,200);
    assert.equal((await call(`${route}/action`,{type:'play',cardId:agileOnly.id,neighborId:normal.id,side:'left'},starter.token)).status,200);
    assert.equal((await call(`${route}/action`,{type:'attack',cardId:agileOnly.id},starter.token)).status,400);
    assert.equal((await call(`${route}/action`,{type:'endTurn'},starter.token)).status,200);
    let secondState=(await call(`${route}/state`,undefined,second.token)).data;
    assert.equal(secondState.players[second.index].hand.length,8);
    assert.equal((await call(`${route}/action`,{type:'endTurn'},second.token)).status,200);
    assert.equal((await call(`${route}/action`,{type:'attack',cardId:normal.id},starter.token)).status,200);
    const diceA=(await call('/api/dice/rooms',{name:'Lia',target:3000,stake:'Um hidromel'})).data;
    const diceB=(await call(`/api/dice/rooms/${diceA.code}/join`,{name:'Daro'})).data;
    const dr=`/api/dice/rooms/${diceA.code}`;
    let ds=(await call(`${dr}/state`,undefined,diceA.token)).data;
    assert.equal(ds.phase,'active');assert.equal(ds.target,3000);assert.equal(ds.players.length,2);
    assert.equal((await call(`${dr}/action`,{type:'propose',insignia:'fortuna-prata'},diceA.token)).status,200);
    assert.equal((await call(`${dr}/action`,{type:'accept',insignia:'defesa-ouro'},diceB.token)).status,400);
    assert.equal((await call(`${dr}/action`,{type:'accept',insignia:'defesa-prata'},diceB.token)).status,200);
    ds=(await call(`${dr}/state`,undefined,diceB.token)).data;
    assert.equal(ds.players[0].insignia,'fortuna-prata');assert.equal(ds.players[1].insignia,'defesa-prata');
    assert.equal(ds.players[0].insigniaActive,false);
    const roller=ds.turn===ds.players[0].id?diceA:diceB;
    assert.equal((await call(`${dr}/action`,{type:'roll'},roller.token)).status,200);
    ds=(await call(`${dr}/state`,undefined,roller.token)).data;
    assert.equal(ds.roll.length===6||ds.round===2,true);
    assert.equal((await call(`${dr}/action`,{type:'keep',indices:[99]},roller.token)).status,400);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('espectadores não veem mãos; fichas, ataque e descarte ficam sincronizados', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, data, secret) => {
    const response = await fetch(base + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'content-type': 'application/json' } : {}), ...(secret ? { 'x-player-token': secret } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, data: await response.json() };
  };
  try {
    const first = (await call('/api/rooms', { name: 'Primeiro' })).data;
    const route = `/api/rooms/${first.code}`;
    const second = (await call(`${route}/join`, { name: 'Segundo' })).data;
    const audience = (await call(`${route}/join`, { name: 'Plateia' })).data;
    assert.equal(audience.spectator, true);
    const cards = Array.from({ length: 8 }, () => ({ name: 'Invocador', kind: 'creature', agile: true, quickAttack: true, power: 1, health: 2, rules: 'Ao entrar em jogo, crie uma ficha de Lobo 1/1.' }));
    assert.equal((await call(`${route}/action`, { type: 'import', cards }, first.token)).status, 200);
    assert.equal((await call(`${route}/action`, { type: 'import', cards }, second.token)).status, 200);
    const coin = (await call(`${route}/state`, undefined, first.token)).data;
    const winnerToken = coin.coinWinner === coin.players[0].id ? first.token : second.token;
    assert.equal((await call(`${route}/action`, { type: 'decideFirst', position: 'first' }, winnerToken)).status, 200);
    const watched = (await call(`${route}/state`, undefined, audience.token)).data;
    assert.equal(watched.spectator, true);
    assert.ok(watched.players.every(player => player.hand === undefined && player.tokens === undefined));
    assert.equal((await call(`${route}/action`, { type: 'endTurn' }, audience.token)).status, 403);
    const playing = (await call(`${route}/state`, undefined, winnerToken)).data;
    const card = playing.players.find(player => player.id === playing.you).hand[0];
    assert.equal((await call(`${route}/action`, { type: 'play', cardId: card.id }, winnerToken)).status, 200);
    const afterPlay = (await call(`${route}/state`, undefined, winnerToken)).data;
    const tokenCard = afterPlay.players.find(player => player.id === afterPlay.you).tokens[0];
    assert.equal(tokenCard.name, 'Ficha de Lobo');
    assert.equal((await call(`${route}/action`, { type: 'play', cardId: tokenCard.id, neighborId: card.id, side: 'right' }, winnerToken)).status, 200);
    assert.equal((await call(`${route}/action`, { type: 'attack', cardId: card.id }, winnerToken)).status, 200);
    assert.equal((await call(`${route}/state`, undefined, audience.token)).data.board.find(item => item.id === card.id).attacking, true);
    assert.equal((await call(`${route}/action`, { type: 'discard', cardId: tokenCard.id }, winnerToken)).status, 200);
    const discarded = (await call(`${route}/state`, undefined, audience.token)).data.players.find(player => player.id === playing.you).discard;
    assert.equal(discarded.at(-1).name, 'Ficha de Lobo');
    assert.equal((await call(`${route}/action`, { type: 'endTurn' }, winnerToken)).status, 200);
    const afterTurn = (await call(`${route}/state`, undefined, audience.token)).data.board.find(item => item.id === card.id);
    assert.equal(afterTurn.attacking, false);
    assert.equal(afterTurn.tapped, true);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('efeito de fichas pode contar cópias no descarte', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, data, secret) => {
    const response = await fetch(base + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'content-type': 'application/json' } : {}), ...(secret ? { 'x-player-token': secret } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, data: await response.json() };
  };
  try {
    const first = (await call('/api/rooms', { name: 'A' })).data;
    const route = `/api/rooms/${first.code}`;
    const second = (await call(`${route}/join`, { name: 'B' })).data;
    const cards = Array.from({ length: 8 }, () => ({ name: 'Uivo', kind: 'spell', tokenEffect: { trigger: 'enter', count: 2, name: 'Lobo', power: 1, health: 1, extraPerDiscardName: 'Uivo' } }));
    await call(`${route}/action`, { type: 'import', cards }, first.token);
    await call(`${route}/action`, { type: 'import', cards }, second.token);
    const coin = (await call(`${route}/state`, undefined, first.token)).data;
    const starterToken = coin.coinWinner === coin.players[0].id ? first.token : second.token;
    await call(`${route}/action`, { type: 'decideFirst', position: 'first' }, starterToken);
    const start = (await call(`${route}/state`, undefined, starterToken)).data;
    const hand = start.players.find(player => player.id === start.you).hand;
    await call(`${route}/action`, { type: 'discard', cardId: hand[0].id }, starterToken);
    assert.equal((await call(`${route}/action`, { type: 'play', cardId: hand[1].id }, starterToken)).status, 200);
    const after = (await call(`${route}/state`, undefined, starterToken)).data.players.find(player => player.id === start.you);
    assert.equal(after.tokens.length, 3);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
