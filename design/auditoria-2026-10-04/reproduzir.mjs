// Read-only audit: creates isolated rooms and never contacts the running server.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {makeRoom,join,act,resolveCombat,view,easyBotAction} from '../../mesa-nova/game.mjs';
const catalog=JSON.parse(fs.readFileSync('mesa-nova/cartas.json','utf8')),forja=catalog.decks.find(d=>d.id==='forja-oficina-lyrik'),fluxo=catalog.decks.find(d=>d.id==='fluxo-virelion');
const findings=[];
function setup(){const room=makeRoom('AUD123','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{deckData:forja,patron:{hp:100,maxHp:100},mana:10,manaMax:10,deck:[],hand:[],reserve:[],formation:[null,null,null]});Object.assign(room,{phase:'prep',round:1,first:a.id,turn:a.id,collectPreview:true});return {room,a,b};}
function card(id,p,extra={}){const model=[...forja.cards,...fluxo.cards].find(c=>c.id===id);return {...structuredClone(model),owner:p.id,uid:crypto.randomUUID(),modelId:id,damage:0,attackMod:0,...extra};}
function place(p,c,lane){p.reserve.push(c);p.formation[lane]=c.uid;return c;}
function record(id,observed){findings.push({id,observed});console.log(id,JSON.stringify(observed));}
{
 const {room,a}=setup();room.phase='formation';act(room,a,{type:'reset'},catalog);assert.equal(room.phase,'lobby');record('A01',{phaseBefore:'formation',phaseAfter:room.phase,opponentConsent:false});
}
{
 const {room,a,b}=setup();const spell=card('FV11',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:a.id},catalog);act(room,a,{type:'movePrepared',cardId:spell.uid,lane:0,targetSide:b.id},catalog);place(b,card('FL16',b),0);room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[1].health,4);record('A02',{barrierMovedToEnemy:true,enemyHealthInCombat:room.preClash[0].cards[1].health});
}
{
 const {room,a,b}=setup();const spell=card('FL10',a);a.hand.push(spell);act(room,a,{type:'play',cardId:spell.uid,mode:'lane',lane:0,targetSide:b.id},catalog);const target=place(b,card('FL16',b),0);room.phase='resolving';resolveCombat(room);assert.equal(target.attack,2);assert.equal(target.health,4);record('A03',{card:spell.name,text:spell.text,enemyReceivedBuff:[target.attack,target.health]});
}
{
 const {room,a}=setup();const source=card('FL03',a,{effects:[{op:'summon',amount:1,attack:0,health:2,timing:'on_enter'}]});a.hand.push(source);act(room,a,{type:'play',cardId:source.uid},catalog);const token=a.reserve.find(c=>c.token);assert.equal(token.attack,1);record('A04',{requestedTokenAttack:0,actualTokenAttack:token.attack});
}
{
 const {room,a}=setup();const source=place(a,card('FL03',a,{attack:1,health:20,effects:[{op:'attack_modifier',amount:1,timing:'revelation',target:'self'},{op:'attack_modifier',amount:2,timing:'revelation',target:'self'}]}),0);room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,2);record('A05',{baseAttack:1,revelationBonuses:[1,2],actualCombatAttack:room.preClash[0].cards[0].attack});
}
{
 const {room,a,b}=setup();const source=place(a,card('FL16',a),0),spell=card('FV11',a);a.prepared.push({card:spell,targetSide:a.id,lane:0});place(b,card('FL05',b),0);room.phase='resolving';resolveCombat(room);const dead=a.discard.find(c=>c.uid===source.uid);assert.equal(dead.health,4);assert.equal(dead.temporaryHealth,2);record('A06',{originalMaxHealth:2,discardedMaxHealth:dead.health,temporaryHealthInDiscard:dead.temporaryHealth});
}
{
 const {room,a,b}=setup();const c=place(b,card('FL02',b,{damage:1,health:20}),0),spell=card('FL13',a);a.prepared.push({card:spell,targetSide:b.id,lane:0});room.phase='resolving';resolveCombat(room);const displayed=room.spellHealthUpdates[0].targets.find(t=>t.uid===c.uid).attack,actual=room.preClash[0].cards[1].attack;assert.equal(displayed,0);assert.equal(actual,1);record('A07',{creature:c.name,previewAttack:displayed,actualCombatAttack:actual});
}
{
 const {room,a}=setup();a.bot=true;a.patron.hp=a.patron.maxHp=16;const injured=card('FL02',a,{damage:1});a.reserve.push(injured);const spell={uid:crypto.randomUUID(),name:'Cura de auditoria',cost:2,type:'direct_spell',effects:[{op:'choose_one',options:[{target:'own_patron',amount:3},{target:'chosen_allied_creature',amount:3}]}]};a.hand.push(spell);const action=easyBotAction(room);assert.equal(action.targetId,'patron');record('A08',{patronHealth:16,patronMaxHealth:16,injuredAlly:true,botChosenTarget:action.targetId});
}
{
 const source=fs.readFileSync('mesa-nova/app.js','utf8'),start=source.indexOf('async function refresh()'),end=source.indexOf('function button(',start);let erased=false;const ctx={sessionStorage:{getItem:()=>JSON.stringify({code:'AUD123',token:'test'}),removeItem:()=>{erased=true;}},refreshing:false,commandBusy:false,activeDrag:null,api:async()=>{throw Error('Network temporarily unavailable');},lastRevision:0,state:{phase:'prep'},render(){},err(){}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);await ctx.refresh();assert.equal(erased,true);assert.equal(ctx.state,null);record('A09',{temporaryNetworkFailure:true,seatTokenRemoved:erased,stateCleared:ctx.state===null});
}
{
 const {room,a,b}=setup();room.events=Array.from({length:30},(_,i)=>({id:i+1,type:i===0?'draw':'creature',playerId:a.id,cardId:i===0?'new-card':'other',at:Date.now()}));room.eventId=30;const next=view(room,a);a.hand.push({uid:'new-card'});next.players.find(p=>p.id===a.id).hand=a.hand;const source=fs.readFileSync('mesa-nova/app.js','utf8'),start=source.indexOf('function trackArrivals('),end=source.indexOf('async function command(',start),ctx={pendingArrival:[]};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);ctx.trackArrivals({you:a.id,players:[{id:a.id,hand:[]},{id:b.id,hand:[]}]},next);assert.equal(next.events.some(e=>e.type==='draw'),false);assert.ok(ctx.pendingArrival.includes('new-card'));record('A10',{returnedEvents:next.events.length,drawEventRetained:false,cardAwaitingMissingDrawAnimation:true});
}
{
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('mesa-nova/criador/budget-model.js','utf8'),context);const ids=['FL06','FL08','FL16','FV05','FV06','FV07','FV13','FV14'];const rows=ids.map(id=>{const c=[...forja.cards,...fluxo.cards].find(c=>c.id===id),budget=context.RunaBudget.calculate(c);return {id,name:c.name,actualEffects:c.effects,budgetEffects:c.budgetEffects||[],abilityPoints:budget.abilityPoints};});assert.equal(rows.find(c=>c.id==='FV05').abilityPoints,0);assert.ok(rows.find(c=>c.id==='FV07').budgetEffects.some(e=>e.effect==='heal'));record('A11',{cards:rows});
}
{
 const source=fs.readFileSync('mesa-nova/criador/editor.js','utf8'),messages=[],ctx={project:[],db:null,crypto,blank:()=>({}),status:(message,error)=>messages.push({message,error}),energyIds:['ruptura','forja','fluxo'],rulesOverflow:()=>false,runeTokens:()=>[],$:()=>({})};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function validateDesign('),source.indexOf('function reportInvalid(')),ctx);vm.runInContext(source.slice(source.indexOf('async function importProject('),source.indexOf('let starterDecks=',source.indexOf('async function importProject('))),ctx);const c={name:'Essência de teste',kind:'rune',rarity:'padrao',rules:'Gere 1 energia.',quantity:1,themeEnergy:'forja'};assert.equal(ctx.validateDesign(c),null);await ctx.importProject({text:async()=>JSON.stringify({format:'runamarca-prototipo-editor',cards:[c]})});assert.equal(messages.at(-1).message,'Tipo de carta inválido.');record('A12',{creatorValidationAcceptedRune:true,reimportedOwnExportError:messages.at(-1).message});
}
{
 const source=fs.readFileSync('accounts.mjs','utf8');let retry,count=0;const room={phase:'finished',matchId:'isolated-audit',matchPlayers:[{id:'a',discordId:'a'},{id:'b',discordId:'b'}],winner:'a',code:'AUD123'},ctx={accountsConfigured:()=>true,database:()=>({record:async()=>{if(++count===1)throw Error('Temporary outage');}}),console:{error(){}},setInterval:fn=>{retry=fn;return {unref(){}};},clearInterval(){}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const retryResults='),source.indexOf('function roomsList(')).replace('export async function','async function'),ctx);await ctx.persistMatch(room,'runamarca');assert.equal(room.recording,'pending');await retry();assert.equal(count,2);assert.equal(room.recording,'pending');record('A13',{databaseRetrySucceeded:true,roomRecordingStill:room.recording});
}
{
 const source=fs.readFileSync('mesa-nova/criador/editor.js','utf8'),messages=[],ctx={project:[],draft:{id:'audit',name:'Teste'},db:null,structuredClone,readForm(){},validateDesign:()=>null,reportInvalid:()=>false,status:m=>messages.push(m),projectList(){}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function saveCard('),source.indexOf('async function pngCard(')),ctx);await ctx.saveCard({preventDefault(){}});assert.equal(messages.at(-1),'Teste guardada neste navegador.');record('A14',{persistentStorageAvailable:false,onlyInMemory:true,message:messages.at(-1)});
}
{
 const {room,a,b}=setup();const target=place(b,card('FL02',b,{effects:[],health:3}),0),defeat=card('FL15',a,{effects:[{op:'defeat'}]}),buff=card('FL10',b);a.prepared.push({card:defeat,targetSide:b.id,lane:0});b.prepared.push({card:buff,targetSide:b.id,lane:0});room.phase='resolving';resolveCombat(room);const last=room.spellHealthUpdates.at(-1).targets.find(t=>t.uid===target.uid);assert.equal(last.hp,2);assert.ok(b.discard.some(c=>c.uid===target.uid));record('A15',{previewRemainingHealth:last.hp,actualTargetDefeated:true,fixture:'Simultaneous prepared defeat and +2/+2'});
}
{
 const source=fs.readFileSync('mesa-nova/app.js','utf8');let highlighted;const ctx={displayedAttack:new Map(),displayedHealth:new Map(),pendingHealth:new Map(),state:{players:[]},document:{querySelectorAll:()=>[{dataset:{uid:'buffed',baseAttack:7},querySelector:()=>({classList:{toggle:(name,on)=>{if(name==='attack-buffed')highlighted=on;},remove(){},add(){}},offsetWidth:1}),classList:{toggle(){}}}]},updateLiquidHeart(){}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function applyHealthUpdates('),source.indexOf('function damagePatron(')),ctx);ctx.applyHealthUpdates([{uid:'buffed',attack:7,hp:4,maxHp:4}]);assert.equal(highlighted,false);record('A16',{originalAttack:5,currentCardAttackAfterPermanentBuff:7,updateAttack:7,greenBuffHighlight:false});
}
{
 const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('mesa-nova/criador/budget-model.js','utf8'),ctx);const options=ctx.RunaBudget.choices('spell',{effect:'health',timing:'direct',target:'area'});assert.equal(options.maxTargets,8);record('A17',{creatorMaximumAreaTargets:8,maximumFriendlyCreaturesInField:10,reason:'8 reserve creatures plus 2 Emanação; area_stat_buff includes both'});
}
{
 const {room,a,b}=setup();a.patron.hp=b.patron.hp=1;for(const p of [a,b]){place(p,card('FL16',p),0);p.prepared.push({card:card('FV08',p),targetSide:p.id,lane:0});}room.phase='resolving';resolveCombat(room);assert.equal(a.patron.hp,0);assert.equal(b.patron.hp,0);assert.equal(room.winner,b.id);record('A18',{bothPatronsAtZero:true,result:'B wins instead of a consistent terminal state',cause:'Two prepared draws with empty decks; checkWin stops reconsidering after first fatigue death'});
}
fs.writeFileSync(new URL('./resultados.json',import.meta.url),JSON.stringify({executedAt:new Date().toISOString(),findings},null,2));
console.log('Audit complete: '+findings.length+' isolated cases confirmed. No running room was contacted.');
