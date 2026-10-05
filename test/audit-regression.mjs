// Read-only audit: creates isolated rooms and never contacts the running server.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {makeRoom,join,act,resolveCombat,view,easyBotAction} from '../mesa-nova/game.mjs';
const catalog=JSON.parse(fs.readFileSync('mesa-nova/cartas.json','utf8')),forja=catalog.decks.find(d=>d.id==='forja-oficina-lyrik'),fluxo=catalog.decks.find(d=>d.id==='fluxo-virelion');

function setup(){const room=makeRoom('AUD123','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{deckData:forja,patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:[],hand:[],reserve:[],formation:[null,null,null]});Object.assign(room,{phase:'prep',round:1,first:a.id,turn:a.id,collectPreview:true});return {room,a,b};}
function card(id,p,extra={}){const model=[...forja.cards,...fluxo.cards].find(c=>c.id===id);return {...structuredClone(model),owner:p.id,uid:crypto.randomUUID(),modelId:id,damage:0,attackMod:0,...extra};}
function place(p,c,lane){p.reserve.push(c);p.formation[lane]=c.uid;return c;}

{
 const {room,a}=setup();room.phase='formation';assert.throws(()=>act(room,a,{type:'reset'},catalog),/encerramento/);assert.equal(room.phase,'formation');room.phase='finished';act(room,a,{type:'reset'},catalog);assert.equal(room.phase,'lobby');assert.deepEqual(a.formation,[null,null,null]);
}
{
 const {room,a,b}=setup();const spell=card('FV11',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:a.id},catalog);assert.throws(()=>act(room,a,{type:'movePrepared',cardId:spell.uid,lane:0,targetSide:b.id},catalog),/aliada/);place(b,card('FL16',b),0);room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[1].health,2);
}
{
 const {room,a,b}=setup();const spell=card('FL10',a);a.hand.push(spell);assert.throws(()=>act(room,a,{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:b.id},catalog),/aliada/);assert.ok(a.hand.includes(spell));assert.equal(a.mana,10);const target=place(b,card('FL16',b),0);room.phase='resolving';resolveCombat(room);assert.equal(target.attack,0);assert.equal(target.health,2);
}
{
 const {room,a}=setup();const source=card('FL03',a,{effects:[{op:'summon',amount:1,attack:0,health:2,timing:'on_enter'}]});a.hand.push(source);act(room,a,{type:'play',cardId:source.uid},catalog);const token=a.reserve.find(c=>c.token);assert.equal(token.attack,0);
}
{
 const {room,a}=setup();const source=place(a,card('FL03',a,{attack:1,health:20,effects:[{op:'attack_modifier',amount:1,timing:'revelation',target:'self'},{op:'attack_modifier',amount:2,timing:'revelation',target:'self'}]}),0);room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,4);assert.equal(room.revelationsApplied.length,2);
}
{
 const {room,a,b}=setup();const source=place(a,card('FL16',a),0),spell=card('FV11',a);a.prepared.push({card:spell,targetSide:a.id,lane:0});place(b,card('FL05',b),0);room.phase='resolving';resolveCombat(room);const dead=a.discard.find(c=>c.uid===source.uid);assert.equal(dead.health,2);assert.equal(dead.temporaryHealth,undefined);assert.ok(dead.damage>=dead.health);
}
{
 const {room,a,b}=setup();const c=place(b,card('FL02',b,{damage:1,health:20}),0),spell=card('FL13',a);a.prepared.push({card:spell,targetSide:b.id,lane:0});room.phase='resolving';resolveCombat(room);const displayed=room.spellHealthUpdates[0].targets.find(t=>t.uid===c.uid).attack,actual=room.preClash[0].cards[1].attack;assert.equal(displayed,1);assert.equal(actual,1);
}
{
 const {room,a}=setup();a.bot=true;a.patron.hp=a.patron.maxHp=16;const injured=card('FL02',a,{damage:1});a.reserve.push(injured);const spell={uid:crypto.randomUUID(),name:'Cura de auditoria',cost:2,type:'direct_spell',effects:[{op:'choose_one',options:[{target:'own_patron',amount:3},{target:'chosen_allied_creature',amount:3}]}]};a.hand.push(spell);const action=easyBotAction(room);assert.equal(action.targetId,injured.uid);
}
{
 const source=fs.readFileSync('mesa-nova/app.js','utf8'),start=source.indexOf('async function refresh()'),end=source.indexOf('function button(',start);let erased=false;const ctx={sessionStorage:{getItem:()=>JSON.stringify({code:'AUD123',token:'test'}),removeItem:()=>{erased=true;}},connectionLost:false,refreshing:false,commandBusy:false,activeDrag:null,api:async()=>{throw Error('Network temporarily unavailable');},lastRevision:0,state:{phase:'prep'},render(){},err(){}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);await ctx.refresh();assert.equal(erased,false);assert.equal(ctx.state.phase,'prep');assert.equal(ctx.connectionLost,true);
}
{
 const {room,a,b}=setup();room.events=Array.from({length:30},(_,i)=>({id:i+1,type:i===0?'draw':'creature',playerId:a.id,cardId:i===0?'new-card':'other',at:Date.now()}));room.eventId=30;const next=view(room,a);a.hand.push({uid:'new-card'});next.players.find(p=>p.id===a.id).hand=a.hand;const source=fs.readFileSync('mesa-nova/app.js','utf8'),start=source.indexOf('function trackArrivals('),end=source.indexOf('async function command(',start),ctx={pendingArrival:[]};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);ctx.trackArrivals({you:a.id,matchId:next.matchId,eventId:0,players:[{id:a.id,hand:[]},{id:b.id,hand:[]}]},next);assert.equal(next.events.some(e=>e.type==='draw'),true);assert.ok(ctx.pendingArrival.includes('new-card'));
}
{
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('mesa-nova/criador/budget-model.js','utf8'),context);const ids=['FL06','FL08','FL16','FV05','FV06','FV07','FV13','FV14'];const rows=ids.map(id=>{const c=[...forja.cards,...fluxo.cards].find(c=>c.id===id),budget=context.RunaBudget.calculate(c);return {id,name:c.name,actualEffects:c.effects,budgetEffects:c.budgetEffects||[],abilityPoints:budget.abilityPoints};});assert.ok(rows.find(c=>c.id==='FV05').abilityPoints>0);assert.equal(rows.find(c=>c.id==='FV07').budgetEffects.length,0);assert.ok(rows.find(c=>c.id==='FL06').budgetEffects.some(e=>e.effect==='health'));for(const id of ['FL08','FL16','FV06','FV13','FV14'])assert.ok(rows.find(c=>c.id===id).budgetEffects.length);
}
{
 const source=fs.readFileSync('mesa-nova/criador/editor.js','utf8'),messages=[],ctx={project:[],db:null,crypto,blank:()=>({}),status:(message,error)=>messages.push({message,error}),energyIds:['ruptura','forja','fluxo'],rulesOverflow:()=>false,runeTokens:()=>[],projectList(){},$:()=>({})};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function validateDesign('),source.indexOf('function reportInvalid(')),ctx);vm.runInContext(source.slice(source.indexOf('async function importProject('),source.indexOf('let starterDecks=',source.indexOf('async function importProject('))),ctx);const c={name:'Essência de teste',kind:'rune',rarity:'padrao',rules:'Gere 1 energia.',quantity:1,themeEnergy:'forja',art:''};assert.equal(ctx.validateDesign(c),null);await ctx.importProject({text:async()=>JSON.stringify({format:'runamarca-prototipo-editor',cards:[c]})});assert.equal(ctx.project.length,1);assert.match(messages.at(-1).message,/memória/);
}
{
 const source=fs.readFileSync('accounts.mjs','utf8');let retry,count=0;const room={phase:'finished',matchId:'isolated-audit',matchPlayers:[{id:'a',discordId:'a'},{id:'b',discordId:'b'}],winner:'a',code:'AUD123'},ctx={accountsConfigured:()=>true,database:()=>({record:async()=>{if(++count===1)throw Error('Temporary outage');}}),console:{error(){}},setInterval:fn=>{retry=fn;return {unref(){}};},clearInterval(){}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const retryResults='),source.indexOf('function roomsList(')).replace('export async function','async function'),ctx);await ctx.persistMatch(room,'runamarca');assert.equal(room.recording,'pending');await retry();assert.equal(count,2);assert.equal(room.recording,'saved');assert.equal(room.revision,2);
}
{
 const source=fs.readFileSync('mesa-nova/criador/editor.js','utf8'),messages=[],ctx={project:[],draft:{id:'audit',name:'Teste'},db:null,structuredClone,readForm(){},validateDesign:()=>null,reportInvalid:()=>false,status:m=>messages.push(m),projectList(){}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function saveCard('),source.indexOf('async function pngCard(')),ctx);await ctx.saveCard({preventDefault(){}});assert.match(messages.at(-1),/apenas na memória/);
}
{
 const {room,a,b}=setup();const target=place(b,card('FL02',b,{effects:[],health:3}),0),defeat=card('FL15',a,{effects:[{op:'defeat'}]}),buff=card('FL10',b);a.prepared.push({card:defeat,targetSide:b.id,lane:0});b.prepared.push({card:buff,targetSide:b.id,lane:0});room.phase='resolving';resolveCombat(room);const last=room.spellHealthUpdates.at(-1).targets.find(t=>t.uid===target.uid);assert.equal(last.hp,0);assert.ok(b.discard.some(c=>c.uid===target.uid));
}
{
 const source=fs.readFileSync('mesa-nova/app.js','utf8');let highlighted;const ctx={displayedAttack:new Map(),displayedHealth:new Map(),pendingHealth:new Map(),state:{players:[]},document:{querySelectorAll:()=>[{dataset:{uid:'buffed',baseAttack:5},querySelector:()=>({classList:{toggle:(name,on)=>{if(name==='attack-buffed')highlighted=on;},remove(){},add(){}},offsetWidth:1}),classList:{toggle(){}}}]},updateLiquidHeart(){}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function applyHealthUpdates('),source.indexOf('function damagePatron(')),ctx);ctx.applyHealthUpdates([{uid:'buffed',attack:7,hp:4,maxHp:4}]);assert.equal(highlighted,true);assert.ok(source.includes('baseAttack=card.baseStats?.attack'));;
}
{
 const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('mesa-nova/criador/budget-model.js','utf8'),ctx);const options=ctx.RunaBudget.choices('spell',{effect:'health',timing:'direct',target:'area'});assert.equal(options.maxTargets,10);assert.equal(ctx.RunaBudget.choices('spell',{effect:'damage',timing:'direct',target:'area'}).maxTargets,8);
}
{
 const {room,a,b}=setup();a.patron.hp=b.patron.hp=1;for(const p of [a,b]){place(p,card('FL16',p),0);p.prepared.push({card:card('FV08',p),targetSide:p.id,lane:0});}room.phase='resolving';resolveCombat(room);assert.equal(a.patron.hp,0);assert.equal(b.patron.hp,0);assert.equal(room.winner,null);
}
console.log('OK: 18 casos de regressão da auditoria.');
