import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=n=>fs.readFileSync(new URL(n,import.meta.url),'utf8'),app=read('app.js');
function fn(code,name){const start=code.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,name);const rest=code.slice(start),end=rest.slice(1).search(/\n(?:async )?function /);return end<0?rest:rest.slice(0,end+1);}
function harness(you='a'){
 const nodes={a:{id:'portrait-a'},b:{id:'portrait-b'},spell:{id:'hand'},friend:{id:'friend'},enemy:{id:'enemy'}};
 const a={id:'a',patron:{hp:16},hand:[{uid:'spell',type:'spell',effects:[]}],reserve:[{uid:'friend',health:2,damage:0}],emanation:[]},b={id:'b',patron:{hp:16},hand:[],reserve:[{uid:'enemy',health:2,damage:0}],emanation:[]};
 const state={you,code:'QA',matchId:'m',phase:'prep',turn:you,players:[a,b]};let aim=null,effect=null;
 const scope=vm.createContext({state,commandBusy:false,visualGeneration:1,noticeQueue:Promise.resolve(),warmSounds:async()=>{},hideHover(){},seat:()=>state.players.find(p=>p.id===you),affordable:()=>true,pendingEntryNode:()=>null,role:()=> 'enemy',tableCard:id=>nodes[id],aimNode:id=>nodes[id],$:id=>({querySelector:()=>nodes[id==='self-head'?you:you==='a'?'b':'a']}),document:{querySelectorAll:()=>[]},RunaTargeting:{start:options=>aim=options,active:()=>true,creatureIds:()=>['enemy']},showTargetDialog(){},damageTarget:id=>nodes[id],damageSpellKind:(card,op)=>op==='ally_attack_damage'?'forge':null,applyDamageHit(){},applyHealthUpdates(){},patronImpact(){},playDamageEffect:async(...args)=>{effect=args;args[3]?.();}});
 for(const [code,name] of [[read('damage-presentation.js'),'patronDamageSource'],[app,'showTargetPicker'],[app,'beginDraggedAim'],[read('damage-presentation.js'),'presentDamageSpell'],[read('card-effects-table.js'),'identitySpellSource'],[app,'animateEvent']])vm.runInContext(fn(code,name),scope);
 scope.spellTarget=id=>nodes[id];return {scope,state,nodes,aim:()=>aim,effect:()=>effect};
}
for(const you of ['a','b'])test(`magia clicada/arrastada e Golpe usam o Patrono controlador: ${you}`,async()=>{
 const h=harness(you),card={uid:'spell',type:'spell',effects:[]};h.scope.showTargetPicker(card,['enemy'],()=>{});assert.equal(h.aim().source(),h.nodes[you]);assert.equal(h.aim().valid(),true);
 h.scope.beginDraggedAim(card,{x:500,y:200});assert.equal(h.aim().source(),h.nodes[you]);
 h.scope.showTargetPicker({id:'golpe-do-maioral'},['enemy'],()=>{});assert.equal(h.aim().source(),h.nodes[you]);
 await h.scope.animateEvent({type:'patron_power',powerId:'golpe-do-maioral',playerId:you,targetId:'enemy',healthUpdates:[]},1);assert.equal(h.effect()[1],h.nodes[you]);assert.equal(h.effect()[2],h.nodes.enemy);
 h.state.turn=you==='a'?'b':'a';assert.equal(h.aim().valid(),false,'turno rival invalida mira');
});
test('origens de efeitos respeitam proprietário e Bomba mantém doador → Patrono → alvo',async()=>{
 const h=harness();assert.equal(h.scope.identitySpellSource('a'),h.nodes.a);assert.equal(h.scope.identitySpellSource('b'),h.nodes.b);assert.equal(h.scope.identitySpellSource('unknown'),null);
 await h.scope.presentDamageSpell({playerId:'a',sourceId:'friend',targetId:'enemy',op:'ally_attack_damage',healthUpdates:[]});assert.equal(h.effect()[0],'forge');assert.equal(h.effect()[1],h.nodes.a);assert.equal(h.effect()[2],h.nodes.enemy);assert.equal(h.effect()[4],h.nodes.friend);
 h.scope.showTargetPicker({uid:'friend',type:'creature'},['enemy'],()=>{});assert.equal(h.aim().source(),h.nodes.friend,'seleção da criatura mantém fonte própria');
});
test('poderes de Forja preservam custo/limite e os textos curtos aprovados',()=>{
 const current=JSON.parse(read('cartas.json'));const before={decks:[{patron:{powers:[{id:'forjar-armadura',cost:1,limit:'round',duration:'permanent'},{id:'forjar-arma',cost:3,limit:'match',duration:'permanent'}]}}]};
 const texts={'forjar-armadura':'Conceda +1 de Vida Extra ao seu Patrono.','forjar-arma':'Crie um equipamento ao longo de três preparações: custo, estrutura e lâmina.'};let count=0;
 const previous=before.decks.flatMap(d=>d.patron?.powers||[]);for(const power of current.decks.flatMap(d=>d.patron?.powers||[])){if(!texts[power.id])continue;count++;assert.equal(power.text,texts[power.id]);const old=previous.find(p=>p.id===power.id);assert.equal(power.cost,old.cost);assert.equal(power.limit,old.limit);assert.equal(power.duration,old.duration);}assert.ok(count>=2);assert.equal(read('cartas.json'),read('criador/prototipo.json'));
});
test('áudio lento não bloqueia animação de poder; impacto continua único',async()=>{
 const h=harness();h.scope.warmSounds=()=>new Promise(()=>{});
 await h.scope.animateEvent({type:'patron_power',powerId:'golpe-do-maioral',playerId:'a',targetId:'enemy',healthUpdates:[]},1);
 assert.equal(h.effect()[1],h.nodes.a);assert.equal(h.effect()[2],h.nodes.enemy);
});
