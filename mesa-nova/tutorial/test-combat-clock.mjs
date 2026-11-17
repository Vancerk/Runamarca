import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
// Regressão S3: offsets variáveis entre polls (jitter de entrega) não podem fazer o passo regredir nem reapresentar uma cena.
const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8'),patron=fs.readFileSync(new URL('./patron-combat-ui.js',import.meta.url),'utf8');
const code=app.slice(app.indexOf('function combatPlacements('),app.indexOf('function tickCombat('));
const tick=app.slice(app.indexOf('function tickCombat('));
assert.match(tick,/elapsed=Math\.max\(0,combatElapsed\(battle\)\)/,'tickCombat usa o relógio monotônico por combate');
for(const name of ['combatPlacements','boardSeals']){const body=app.slice(app.indexOf('function '+name+'('));assert.match(body.slice(0,body.indexOf('\n')),/elapsed=combatElapsed\(state\.combat\)/,name+' usa combatElapsed');}
assert.equal(patron.split('Date.now()-serverClockOffset-state.combat.startedAt').length,2,'Patrono: relógio bruto só no fallback de patronCombatElapsed');
for(const use of ['elapsedMs=Math.max(0,patronCombatElapsed())','return patronCombatElapsed()<end','patronCombatElapsed()>=1050','elapsedTime:()=>Math.max(0,patronCombatElapsed())'])assert.ok(patron.includes(use),'Patrono usa o relógio de combate: '+use);
const timeline=[{kind:'reveal',duration:1200},{kind:'teleport',duration:1100,teleport:{movements:[{uid:'x',owner:'a',lane:2}]}},{kind:'patron_entry',duration:1050,participants:[{uid:'patron:a',owner:'a'}]},{kind:'magic',duration:2500,spell:{op:'push_right',cardId:'s',push:{movements:[{uid:'x',owner:'a',lane:1}]}}},{kind:'clash',duration:1500}];
const state={phase:'resolving',players:[{id:'a',formation:['x',null,null]},{id:'b',formation:[]}],combat:{id:'battle-1',startedAt:0,timeline}};
let now=0;const c={state,presentedPushes:new Map(),serverClockOffset:8,displayedHealth:new Map(),Date:{now:()=>now}};vm.createContext(c);vm.runInContext(code,c);
const stepAt=elapsed=>{let remaining=Math.max(0,elapsed),index=0;for(;index<timeline.length-1&&remaining>=timeline[index].duration;index++)remaining-=timeline[index].duration;return index;};
// Relógios alinhados; o offset medido (Date.now()-serverNow) inclui o atraso de entrega 8 → 264 → 8 → 442 ms, variando a cada poll de 120 ms e cruzando todas as fronteiras de passo.
const offsets=[8,264,8,442,8,264];const raw=[],clock=[],lanes=[];
for(let t=0,i=0;t<=7400;t+=120,i++){c.serverClockOffset=offsets[i%offsets.length];now=t;
 raw.push(stepAt(now-c.serverClockOffset-state.combat.startedAt));clock.push(stepAt(c.combatElapsed(state.combat)));lanes.push(c.combatPlacements().get('x').lane);}
const regress=list=>list.some((s,i)=>i&&s<list[i-1]);
assert.ok(regress(raw),'Controle: o relógio bruto regride com o jitter (o teste discrimina a falha original)');
assert.ok(!regress(clock),'O índice do passo nunca regride com offsets variáveis');
const keys=[];let last='';for(const s of clock){const key='battle-1:'+s;if(key!==last){keys.push(key);last=key;}}
assert.equal(new Set(keys).size,keys.length,'Cada passo é apresentado uma única vez (sem reentrada)');
assert.deepEqual([...new Set(clock)],[0,1,2,3,4],'Todos os passos são atravessados em ordem');
const order=[0,2,1];assert.ok(!lanes.some((l,i)=>i&&order.indexOf(l)<order.indexOf(lanes[i-1])),'Posições coerentes: origem → teletransporte → empurrão, sem voltar');
assert.equal(lanes.at(-1),1,'Posição final do empurrão preservada');
// Patrono: entrada pendente e partida seguem o mesmo relógio, sem reabrir com offset maior.
const p={state,serverClockOffset:999,combatElapsed:c.combatElapsed,Date:c.Date,document:{getElementById:()=>null}};vm.createContext(p);vm.runInContext(patron,p);
state.combat={id:'battle-p',startedAt:0,timeline};c.serverClockOffset=8;now=3000;assert.equal(p.patronEntryPending('patron:a'),true,'Entrada pendente dentro do passo');
c.serverClockOffset=264;now=3400;assert.equal(now-264<3350,true,'Controle: relógio bruto reabriria a entrada');assert.equal(p.patronEntryPending('patron:a'),false,'Offset maior não reabre a entrada já encerrada');
// Combate seguinte: o relógio reinicia e adota o offset atual, mesmo maior que o mínimo anterior.
state.combat={id:'battle-2',startedAt:20000,timeline};c.serverClockOffset=300;now=20000+300+100;
assert.equal(Math.round(c.combatElapsed(state.combat)),100,'Novo combate reinicia o relógio');assert.equal(stepAt(c.combatElapsed(state.combat)),0);
c.serverClockOffset=40;now=20000+40+1250;assert.equal(stepAt(c.combatElapsed(state.combat)),1,'Novo combate aceita offset menor e avança');
console.log('Relógio de combate: sem regressão de passo com offsets 8/264/442 ms, sem reentrada, posições coerentes, Patrono estável e reinício no combate seguinte aprovados.');
