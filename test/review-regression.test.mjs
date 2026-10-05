import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../mesa-nova/criador/budget-model.js';
const app=fs.readFileSync('mesa-nova/app.js','utf8');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
test('Sem evento de compra, a carta da mão não fica aguardando uma animação inexistente',()=>{
 const ctx={pendingArrival:['removed']};vm.createContext(ctx);vm.runInContext(section(app,'function trackArrivals','async function command'),ctx);
 ctx.trackArrivals({you:'me',eventId:4,players:[{id:'me',hand:[]}]},{you:'me',eventId:200,events:[],players:[{id:'me',hand:[{uid:'new'}]}]});
 assert.deepEqual(Array.from(ctx.pendingArrival),[]);
});
test('Uma conexão temporária preserva a vaga; token inválido e sala inexistente a encerram',async()=>{
 for(const code of [undefined,'ACCESS_REQUIRED','SEAT_INVALID','ROOM_NOT_FOUND']){
  let erased=false;const ctx={connectionLost:false,refreshing:false,commandBusy:false,activeDrag:null,lastRevision:1,state:{phase:'prep'},sessionStorage:{getItem:()=>'{"code":"AUD123","token":"test"}',removeItem(){erased=true;}},api:async()=>{throw Object.assign(Error('offline'),{code});},render(){},err(){}};
  vm.createContext(ctx);vm.runInContext(section(app,'async function refresh()','function button('),ctx);await ctx.refresh();
  const invalid=['SEAT_INVALID','ROOM_NOT_FOUND'].includes(code);assert.equal(erased,invalid);assert.equal(ctx.state===null,invalid);
 }
});
function visualContext(){
 const node={dataset:{uid:'card'},classList:{remove(){}},remove(){},style:{visibility:'hidden'}};
 const ctx={state:{code:'AUD123',you:'me',matchId:'new',eventId:12,eventsFrom:1,events:[{id:11,type:'coin'},{id:12,type:'opening'}]},visualMatchKey:'AUD123:me:lobby',visualBooted:true,lastVisualId:10,lastBattleStep:'',visualGeneration:0,visualQueue:Promise.resolve(),noticeQueue:Promise.resolve(),pendingArrival:['card'],movingCards:new Set(['card']),deadVisuals:new Map(),displayedAttack:new Map(),pendingAttack:new Map(),displayedHealth:new Map(),pendingHealth:new Map(),displayedPatronHealth:new Map(),spellTargetRects:new Map(),$:()=>({replaceChildren(){}}),document:{querySelectorAll:()=>[node]},setTimeout(){},serverClockOffset:0,played:[],Date,animateEvent:async e=>{ctx.played.push(e.type);}};
 vm.createContext(ctx);vm.runInContext(section(app,'function resetVisualSession()','function tickCombat()'),ctx);return {ctx,node};
}
test('Abertura de uma partida nova cancela efeitos antigos e ainda reproduz a moeda e a mão inicial',async()=>{
 const {ctx}=visualContext();ctx.resetVisualSession();ctx.queueEvents();await ctx.visualQueue;
 assert.deepEqual(ctx.played,['coin','opening']);assert.equal(ctx.visualGeneration,1);assert.equal(ctx.lastVisualId,12);assert.equal(ctx.movingCards.size,0);
});
test('Lacuna de eventos cancela a fila antiga e recupera a visibilidade de cartas',()=>{
 const {ctx,node}=visualContext();ctx.state.eventsFrom=120;ctx.state.eventId=130;ctx.state.events=[];ctx.recoverVisualGap();
 assert.equal(ctx.visualGeneration,1);assert.equal(ctx.lastVisualId,130);assert.equal(ctx.pendingArrival.length,0);assert.equal(ctx.movingCards.size,0);assert.equal(node.style.visibility,'');
});
test('Animação que não finaliza possui prazo de recuperação e é cancelada',async()=>{
 let cancelled=false;const ctx={pause:()=>Promise.resolve()};vm.createContext(ctx);vm.runInContext(section(app,'async function settleAnimation','function visualCard'),ctx);
 await ctx.settleAnimation({finished:new Promise(()=>{}),cancel(){cancelled=true;}},100);assert.equal(cancelled,true);
});
test('Reiniciar durante a abertura interrompe as compras animadas restantes',async()=>{
 const draws=[],ctx={visualGeneration:0,noticeQueue:Promise.resolve(),warmSounds:async()=>{},state:{players:[{id:'me'}]},seat:()=>({id:'me',hand:[{uid:'one'},{uid:'two'}]}),$:()=>({}),visualMessage(){},animateDraw:async uid=>{draws.push(uid);ctx.visualGeneration++;}};
 vm.createContext(ctx);vm.runInContext(section(app,'async function animateEvent','function resetVisualSession'),ctx);
 await ctx.animateEvent({type:'opening',playerId:'me'});assert.deepEqual(draws,['one']);
});
test('Um Banquete pendente não altera a vida da partida seguinte',async()=>{
 const updates=[],ctx={visualGeneration:0,sound(){},pause:async()=>{ctx.visualGeneration++;},tableCard:()=>null,applyHealthUpdates:u=>updates.push(...u)};
 vm.createContext(ctx);vm.runInContext(section(app,'async function animateBanquet','async function animateEvent'),ctx);
 await ctx.animateBanquet({healthUpdates:[{uid:'old',hp:7}]});assert.deepEqual(updates,[]);
});
test('Escrita tardia de histórico não marca outra partida como salva',async()=>{
 const source=fs.readFileSync('accounts.mjs','utf8');let finish;
 const room={phase:'finished',matchId:'old',recording:'not-finished',matchPlayers:[{id:'a',discordId:'a'},{id:'b',discordId:'b'}],winner:'a',code:'AUD123'};
 const ctx={accountsConfigured:()=>true,database:()=>({record:()=>new Promise(resolve=>finish=resolve)}),console,setInterval(){return {unref(){}};},clearInterval(){}};
 vm.createContext(ctx);vm.runInContext(section(source,'const retryResults=','function roomsList(').replace('export async function','async function'),ctx);
 const saving=ctx.persistMatch(room,'runamarca');room.matchId='new';room.recording='not-finished';finish();await saving;assert.equal(room.recording,'not-finished');
});
test('Catálogos sincronizados: efeitos atuais cobertos e preços desconhecidos explicitamente incompletos',()=>{
 const catalog=JSON.parse(fs.readFileSync('mesa-nova/cartas.json','utf8')),creator=JSON.parse(fs.readFileSync('mesa-nova/criador/prototipo.json','utf8'));
 assert.deepEqual(catalog,creator);
 for(const deck of catalog.decks)for(const card of deck.cards){assert.deepEqual(card.budgetEffects,RunaBudget.fromEffects(card));const result=RunaBudget.calculate(card);for(const [i] of (card.effects||[]).entries())assert.ok(card.budgetEffects.some(row=>row.sourceIndex===i),card.id);if(card.budgetEffects.some(row=>row.effect==='custom'&&!row.customPoints)){assert.equal(result.complete,false);assert.equal(result.suggestedMana,null);}}
 const a=RunaBudget.calculate({kind:'spell',generic:4,rules:'Adormeça o alvo.',budgetEffects:[]});assert.equal(a.complete,false);
});
