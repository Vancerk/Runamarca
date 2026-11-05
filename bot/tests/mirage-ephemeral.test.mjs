import {fileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engine} from '../runner/lib/engine.mjs';
import {activateMirage,expireMirages} from '../runner/source/mesa-nova/forja-effects.mjs';
const source=fileURLToPath(new URL('../runner/source/',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(source+'mesa-nova/cartas.json'));
const models=[...catalog.decks.flatMap(d=>d.cards),...(catalog.additionalCards||[])];
async function fixture(seed=54123){
 const api=await engine(seed,0,source),r=api.makeRoom('BARRIER','A'),a=r.players[0],b=api.join(r,'B');
 for(const [p,deckId]of [[a,'fluxo-virelion'],[b,'ruptura-grupo']])api.act(r,p,{type:'deck',deckId},catalog);
 for(const p of r.players)api.act(r,p,{type:'confirmMulligan'},catalog);
 r.phase='prep';r.turn=a.id;r.first=a.id;r.round=4;r.collectPreview=true;
 for(const p of r.players){p.hand=[];p.reserve=[];p.prepared=[];p.emanation=[];p.formation=[null,null,null];p.mana=p.manaMax=10;p.patron.hp=p.patron.maxHp=100;p.directPlayed=false;p.pendingDiscard=0;delete p.apprenticeQueue;delete p.firstSpellRound;}
 let serial=0;
 const card=(id,p=a,extra={})=>{const model=models.find(c=>c.id===id);assert.ok(model,'model '+id);return {...structuredClone(model),uid:'barrier-fixture-'+(++serial),modelId:id,owner:p.id,damage:0,attackMod:0,baseStats:{attack:model.attack,health:model.health,cost:model.cost},...extra};};
 const unit=(p=a,attack=0,health=30,extra={})=>card('FV01',p,{name:'Fixture creature',attack,health,cost:0,effects:[],baseStats:{attack,health,cost:0},...extra});
 const place=(p,c,lane)=>{if(!p.reserve.includes(c))p.reserve.push(c);if(lane!==undefined)p.formation[lane]=c.uid;return c;};
 const cast=(p,c,action={})=>{r.phase='prep';r.turn=p.id;p.mana=10;p.hand.push(c);api.act(r,p,{type:'play',cardId:c.uid,mode:'direct',...action},catalog);return c;};
 const shield=(c,p=a)=>cast(p,card('FV11',p),{targetId:c.uid});
 const spell=(p,op,extra={})=>card('RG07',p,{cost:0,positionOnly:false,directOnly:false,effects:[{op,...extra}]});
 const hit=(c,amount,p=b)=>cast(p,spell(p,'damage',{amount,target:'any'}),{targetId:c.uid});
 const combat=()=>{r.phase='resolving';api.resolveCombat(r);};
 return {api,r,a,b,card,unit,place,cast,shield,spell,hit,combat};
}
const zones=['hand','reserve','discard','deck'];
function previewCombat(f){f.r.collectPreview=false;f.r.phase='formation';for(const p of f.r.players)p.ready=false;for(const p of f.r.players)f.api.act(f.r,p,{type:'ready'},catalog);assert.ok(f.r.combat?.timeline);return f.r.combat;}
function absent(r,uid){for(const p of r.players){for(const zone of zones)assert.ok(!(p[zone]||[]).some(c=>c.uid===uid),'no token in '+zone);assert.ok(!p.formation.includes(uid));assert.ok(!p.emanation.includes(uid));}}
// Canonical token constructor, placed in the next-combat fixture to exercise states
// that cannot be changed by player actions while resolution is running.
function spawnNext(f){const enemy=f.place(f.b,f.unit(f.b,0),0),old=f.r.combatCount||0;f.r.combatCount=old+1;const token=activateMirage(f.r,f.a,enemy,{card:f.card('FL20'),lane:0,targetSide:f.b.id});f.r.combatCount=old;assert.ok(token);return {token,enemy};}
test('real trap creates 0/1 without granting trample and removes intact token after combat',async()=>{
 const f=await fixture();const enemy=f.place(f.b,f.unit(f.b,0),0),spell=f.card('FL20');f.cast(f.a,spell,{mode:'lane',targetSide:f.b.id,lane:0});const preview=previewCombat(f);f.combat();assert.equal(f.r.spawnedMirages.length,1);const t=f.r.spawnedMirages[0].card;assert.equal(t.attack,0);assert.equal(t.health,1);assert.ok(!enemy.temporaryTrample);assert.ok(!t.effects.some(e=>e.op==='trample'));absent(f.r,t.uid);assert.equal(f.a.discard.filter(c=>c.uid===spell.uid).length,1);assert.ok(!preview.casualties.some(c=>c.uid===t.uid));assert.ok(f.r.lastCombat.expiredMirages.some(c=>c.uid===t.uid));
});
test('real token dies in combat then disappears from discard without duplicate casualty',async()=>{
 const f=await fixture();f.place(f.b,f.unit(f.b,3),0);f.cast(f.a,f.card('FL20'),{mode:'lane',targetSide:f.b.id,lane:0});const hp=f.a.patron.hp,preview=previewCombat(f);f.combat();const t=f.r.spawnedMirages[0].card;absent(f.r,t.uid);assert.equal(f.a.patron.hp,hp,'no trample granted');assert.equal(preview.casualties.filter(c=>c.uid===t.uid).length,1);
});
for(const mode of ['buffed','silenced','asleep','shielded'])test('intrinsic lifetime survives '+mode+' state',async()=>{
 const f=await fixture(),{token}=spawnNext(f);const lifetime=structuredClone(token.mirageLifetime);assert.ok(lifetime);
 if(mode==='buffed'){token.attack=7;token.health=12;token.extraLife=3;}
 if(mode==='silenced'){f.cast(f.b,f.spell(f.b,'silence',{target:'any_creature'}),{targetId:token.uid});assert.ok(token.silenced);assert.deepEqual(token.mirageLifetime,lifetime);}
 if(mode==='asleep'){token.sleep=true;token.sleepUntilCombat=lifetime.combat+1;}
 if(mode==='shielded')f.shield(token);
 f.combat();absent(f.r,token.uid);assert.ok(f.r.lastCombat.expiredMirages.some(c=>c.uid===token.uid));
});
test('expiration of living token does not fire death-only effect',async()=>{
 const f=await fixture(),{token}=spawnNext(f);token.effects=[{op:'death_patron_damage',amount:3}];const hp=f.b.patron.hp;f.combat();absent(f.r,token.uid);assert.equal(f.b.patron.hp,hp);assert.equal(f.r.deathBursts.filter(e=>e.sourceId===token.uid).length,0);assert.ok(f.r.lastCombat.expiredMirages.some(c=>c.uid===token.uid&&c.zone==='reserve'));
});
test('natural death triggers once, later cleanup never retriggers death-only effect',async()=>{
 const f=await fixture(),{token,enemy}=spawnNext(f);token.effects=[{op:'death_patron_damage',amount:3}];enemy.attack=2;const hp=f.b.patron.hp;f.combat();absent(f.r,token.uid);assert.equal(f.b.patron.hp,hp-3);assert.equal(f.r.deathBursts.filter(e=>e.sourceId===token.uid).length,1);
});
test('legal Ithalion seal exchange moves newly spawned token to enemy side, cleanup still removes it',async()=>{
 const f=await fixture();f.place(f.b,f.unit(f.b,0),0);f.place(f.b,f.unit(f.b,0),1);const ith=f.place(f.a,f.card('FV15',f.a,{health:30}),2);ith.sealChoices={allyLane:0,enemyLane:1};f.cast(f.a,f.card('FL20'),{mode:'lane',targetSide:f.b.id,lane:0});f.combat();const t=f.r.spawnedMirages[0].card;assert.ok(f.r.teleports.some(e=>e.movements.some(m=>m.uid===t.uid&&m.owner===f.b.id)),'real seal movement happened');absent(f.r,t.uid);
});
test('defensive cleanup covers same-origin copies in all zones, preserving future and unrelated tokens',async()=>{
 const f=await fixture();f.r.combatCount=7;const target=f.place(f.b,f.unit(f.b,0),0),t=activateMirage(f.r,f.a,target,{card:f.card('FL20'),lane:0,targetSide:f.b.id});
 for(const [i,z]of zones.entries())f.a[z].push({...structuredClone(t),uid:'copy-'+i,mirageLifetime:{...t.mirageLifetime}});
 const future={...structuredClone(t),uid:'future',mirageLifetime:{combat:8,origin:'future'}},unmarked={...structuredClone(t),uid:'unmarked'};delete unmarked.mirageLifetime;const other={...structuredClone(t),uid:'other-token',modelId:'another-token'};f.a.reserve.push(future,unmarked,other);const magic=f.card('FL20');f.a.hand.push(magic);
 expireMirages(f.r,{});absent(f.r,t.uid);for(let i=0;i<zones.length;i++)absent(f.r,'copy-'+i);for(const u of ['future','unmarked','other-token'])assert.ok(f.a.reserve.some(c=>c.uid===u));assert.ok(f.a.hand.some(c=>c.uid===magic.uid));
});
test('intrinsic Transpassar keeps normal overflow: attack4 versus Miragem0/1 deals3 to Patron',async()=>{
 const f=await fixture(),attacker=f.place(f.b,f.card('FL05',f.b,{attack:4,baseStats:{attack:4,health:2,cost:5}}),0);assert.ok(attacker.effects.some(e=>e.op==='trample'));
 f.cast(f.a,f.card('FL20'),{mode:'lane',targetSide:f.b.id,lane:0});const hp=f.a.patron.hp;f.combat();assert.equal(f.a.patron.hp,hp-3);assert.ok(!attacker.temporaryTrample,'Miragem did not grant the existing keyword');const t=f.r.spawnedMirages[0].card;absent(f.r,t.uid);
});
test('Transpassar granted by legal Engenheira emanação keeps normal overflow of3',async()=>{
 const f=await fixture(),attacker=f.place(f.b,f.unit(f.b,4,20),0),engineer=f.card('FEX01',f.b);assert.ok(!attacker.effects.some(e=>e.op==='trample'));
 f.cast(f.b,engineer,{mode:'emanate'});assert.ok(f.b.emanation.includes(engineer.uid));f.cast(f.a,f.card('FL20'),{mode:'lane',targetSide:f.b.id,lane:0});f.r.phase='formation';f.api.act(f.r,f.b,{type:'pressureLane',cardId:engineer.uid,lane:0},catalog);assert.ok(attacker.auraKeywords.includes('trample'));
 const hp=f.a.patron.hp;f.combat();assert.equal(f.a.patron.hp,hp-3);assert.ok(!attacker.temporaryTrample,'Miragem did not grant the aura keyword');absent(f.r,f.r.spawnedMirages[0].card.uid);
});
