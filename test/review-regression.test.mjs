import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../mesa-nova/criador/budget-model.js';
const app=fs.readFileSync('mesa-nova/app.js','utf8'),damagePresentation=fs.readFileSync('mesa-nova/damage-presentation.js','utf8');
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
 const ctx={state:{code:'AUD123',you:'me',matchId:'new',eventId:12,eventsFrom:1,events:[{id:11,type:'coin'},{id:12,type:'opening'}]},visualMatchKey:'AUD123:me:lobby',visualBooted:true,lastVisualId:10,lastBattleStep:'',visualGeneration:0,visualQueue:Promise.resolve(),noticeQueue:Promise.resolve(),pendingArrival:['card'],movingCards:new Set(['card']),deadVisuals:new Map(),displayedAttack:new Map(),pendingAttack:new Map(),displayedHealth:new Map(),pendingHealth:new Map(),displayedPatronHealth:new Map(),pendingPatronHealth:new Map(),spellTargetRects:new Map(),mulliganDepartures:new Map(),$:()=>({replaceChildren(){}}),document:{querySelectorAll:()=>[node]},setTimeout(){},serverClockOffset:0,played:[],Date,animateEvent:async e=>{ctx.played.push(e.type);}};
 vm.createContext(ctx);vm.runInContext(damagePresentation,ctx);vm.runInContext(section(app,'function resetVisualSession()','function tickCombat()'),ctx);return {ctx,node};
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
 vm.createContext(ctx);vm.runInContext(damagePresentation,ctx);vm.runInContext(section(app,'async function animateEvent','function resetVisualSession'),ctx);
 await ctx.animateEvent({type:'opening',playerId:'me'});assert.deepEqual(draws,['one']);
});
test('Um Banquete pendente não altera a vida da partida seguinte',async()=>{
 const updates=[],ctx={visualGeneration:0,sound(){},pause:async()=>{ctx.visualGeneration++;},tableCard:()=>null,applyHealthUpdates:u=>updates.push(...u)};
 vm.createContext(ctx);vm.runInContext(section(app,'async function animateBanquet','async function animateEvent'),ctx);
 await ctx.animateBanquet({healthUpdates:[{uid:'old',hp:7}]});assert.deepEqual(updates,[]);
});
test('A mão inicial espera cada compra, sem ocultar cartas de uma sessão já carregada',()=>{
 const ctx={visualBooted:true,lastVisualId:4,pendingArrival:[],state:{you:'me',events:[{id:5,type:'opening',playerId:'me',cardIds:['a','b'],count:2}]},seat:()=>({hand:[{uid:'a'},{uid:'b'},{uid:'later'}]})};
 vm.createContext(ctx);vm.runInContext(section(app,'function prepareOpeningArrivals','async function command'),ctx);ctx.prepareOpeningArrivals();assert.deepEqual(Array.from(ctx.pendingArrival),['a','b']);
 ctx.pendingArrival=[];ctx.lastVisualId=5;ctx.prepareOpeningArrivals();assert.deepEqual(Array.from(ctx.pendingArrival),[]);
 ctx.lastVisualId=0;ctx.visualBooted=false;ctx.prepareOpeningArrivals();assert.deepEqual(Array.from(ctx.pendingArrival),[]);
});
test('Alvos de ataque seguem o dono e a posição reais nos dois lados da mesa',()=>{
 const nodes=[{dataset:{uid:'taunt'},closest:()=>({dataset:{owner:'b'}})},{dataset:{uid:'other'},closest:()=>({dataset:{owner:'b'}})}],patrons={a:{id:'patron-a',dataset:{owner:'a'}},b:{id:'patron-b',dataset:{owner:'b'}}};
 for(const viewer of ['a','b']){
  const ctx={seat:()=>({id:viewer}),document:{querySelectorAll:selector=>selector.includes('patron-card')?Object.values(patrons):nodes},$:id=>({querySelector:()=>patrons[id==='self-head'?viewer:viewer==='a'?'b':'a']})};vm.createContext(ctx);vm.runInContext(section(app,'function attackTarget','async function animateLaneClash'),ctx);
  assert.equal(ctx.attackTarget({owner:'a',targetOwner:'b',targetId:null}),patrons.b);
  assert.equal(ctx.attackTarget({owner:'b',targetOwner:'a',targetId:null}),patrons.a);
  assert.equal(ctx.attackTarget({owner:'a',targetOwner:'b',targetId:'taunt'}),nodes[0]);
  assert.equal(ctx.attackTarget({owner:'a',targetOwner:'b',targetId:'missing'}),null);
  assert.equal(ctx.attackTarget({owner:'a',targetOwner:'a',targetId:null}),null);
 }
});
test('Par de ataques conserva os IDs e donos mesmo sem metadados da prévia visual',async()=>{
 let entry;const ctx={applyRetaliationUpdates:()=>{},visualGeneration:0,state:{combat:{visual:[]}},animateLaneClash:async value=>{entry=value;}};
 vm.createContext(ctx);vm.runInContext(damagePresentation,ctx);vm.runInContext(section(app,'async function animateDirectedStrike','function animateCasualties'),ctx);
 await ctx.animateDirectedStrike({sourceId:'first',owner:'a',targetId:'second',targetOwner:'b',amount:3,lane:0,healthUpdates:[],pair:{sourceId:'second',owner:'b',targetId:'first',targetOwner:'a',amount:2}});
 assert.deepEqual(Array.from(entry.cards,c=>[c.uid,c.owner,c.attack]),[['first','a',3],['second','b',2]]);
});
test('Ataque usa um portador com origem e dimensões fixas, separado da aparência da carta',()=>{
 const layer={getBoundingClientRect:()=>({left:20,top:30}),append(){}},face={classList:{remove(){},add(){}},removeAttribute(){}},source={dataset:{uid:'fighter'},style:{},getBoundingClientRect:()=>({left:420,top:230,width:132,height:120})};
 const ctx={state:{phase:'resolving',combat:{id:'battle-1'}},movingCards:new Set(),cloneVisual:()=>face,$:()=>layer,document:{createElement:()=>({style:{},dataset:{},append(){}})}};vm.createContext(ctx);vm.runInContext(section(app,'function visualCard','async function animateTransfer'),ctx);
 const copy=ctx.visualCard(source);assert.equal(copy.style.left,'400px');assert.equal(copy.style.top,'200px');assert.equal(copy.style.width,'132px');assert.equal(copy.style.height,'120px');assert.equal(copy.dataset.uid,'fighter');assert.equal(copy.dataset.combatId,'battle-1');assert.equal(source.style.visibility,'hidden');assert.ok(ctx.movingCards.has('fighter'));
});
test('Fonte de ataque recusa carta de outro dono com o mesmo identificador',()=>{
 const fake={dataset:{uid:'eye'},closest:()=>({dataset:{owner:'self'}})},real={dataset:{uid:'eye'},closest:()=>({dataset:{owner:'rival'}})},ctx={document:{querySelectorAll:()=>[fake,real]}};
 vm.createContext(ctx);vm.runInContext(section(app,'function attackSource','function attackTarget'),ctx);assert.equal(ctx.attackSource({sourceId:'eye',owner:'rival'}),real);assert.equal(ctx.attackSource({sourceId:'eye',owner:'absent'}),null);
});
test('Recomprar a mesma instância após a troca ainda aguarda a animação de chegada',()=>{
 const ctx={pendingArrival:[]};vm.createContext(ctx);vm.runInContext(section(app,'function trackArrivals','function prepareOpeningArrivals'),ctx);
 ctx.trackArrivals({you:'me',matchId:'match',eventId:10,players:[{id:'me',hand:[{uid:'same'}]}]},{you:'me',matchId:'match',eventId:12,events:[{id:11,type:'mulligan',playerId:'me',cardIds:['same']},{id:12,type:'draw',playerId:'me',cardId:'same'}],players:[{id:'me',hand:[{uid:'same'}]}]});
 assert.deepEqual(Array.from(ctx.pendingArrival),['same']);
});
test('A devolução da troca voa até o deck sem revelar antecipadamente a carta recomprada',async()=>{
 const flights=[],removed=[],copy={classList:{remove(){},add(){}},removeAttribute(){}},ctx={visualGeneration:0,mulliganDepartures:new Map([[4,[{copy,rect:{left:400,top:200,width:140,height:200}}]]]),pendingArrival:['same'],center:()=>({x:100,y:600}),$:()=>({getBoundingClientRect:()=>({left:0,top:0}),append(){}}),document:{createElement:()=>({style:{},append(){},remove(){removed.push(true);},animate(frames){flights.push(frames);return {};}})},settleAnimation:async()=>{},sound(){}};
 vm.createContext(ctx);vm.runInContext(section(app,'async function animateMulliganReturn','async function animateOpeningToHand'),ctx);await ctx.animateMulliganReturn({id:4});
 assert.equal(flights.length,1);assert.equal(flights[0].at(-1).transform,'translate(-370px,300px) scale(.28)');assert.equal(removed.length,1);assert.deepEqual(ctx.pendingArrival,['same']);assert.equal(ctx.mulliganDepartures.size,0);
});
test('Textos usam travessão, itálico nas mecânicas e ajuste integral na caixa',()=>{
 const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('mesa-nova/card-visual.js','utf8'),ctx);const visual=ctx.window.RunaCardVisual;
 assert.equal(visual.formatRulesText('Ao entrar: compre 1 carta. Revelação: +1.'),'Entrada — compre 1 carta. Revelação — +1.');
 const runs=visual.richRuns('Iniciativa. Entrada: compre 1 carta. *Texto manual*.');assert.ok(runs.some(r=>r.text==='Iniciativa'&&r.italic));assert.ok(runs.some(r=>r.text==='Entrada'&&r.italic));assert.ok(runs.some(r=>r.text.includes('Texto manual')&&r.italic));
 const measure={font:'',measureText(text){const size=Number(this.font.match(/(\d+)px/)[1]);return {width:Array.from(text).length*size*.52,actualBoundingBoxAscent:size*.8,actualBoundingBoxDescent:size*.2};}};
 const catalog=JSON.parse(fs.readFileSync('mesa-nova/cartas.json','utf8'));
 for(const deck of catalog.decks)for(const c of deck.cards){const layout=visual.layoutRules(measure,{rules:c.text,fontRules:c.fontRules||36});assert.ok(layout.fits,c.id);assert.ok(layout.y-measure.measureText('').actualBoundingBoxAscent>=883,c.id);assert.ok(layout.y+(layout.lines.length-1)*layout.lineHeight+layout.size*.2<=1097.001,c.id);assert.equal(layout.lines.flat().map(r=>r.text).join('').replace(/\s/g,''),visual.richRuns(visual.formatRulesText(c.text)).map(r=>r.text).join('').replace(/\s/g,''),c.id+' preserves the complete text');assert.ok(!/\b(?:Entrada|Revelação|Emanação):/.test(c.text),c.id);}
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
