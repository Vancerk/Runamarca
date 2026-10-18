import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const app=read('app.js');
const between=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

test('persistent card effects stop on victory/draw and cannot be recreated by polling',()=>{
 const updates=[];let clears=0;
 const node={dataset:{uid:'c'},classList:{contains:()=>false},getBoundingClientRect:()=>({width:100}),closest:()=>({classList:{contains:()=>true}})};
 const state={code:'ABC123',matchId:'one',you:'a',phase:'prep',players:[{reserve:[{uid:'c',anchor:true,sleep:true,corruption:true,runeCoating:true,effects:[{op:'initiative'}]}]}]};
 const c={state,document:{querySelectorAll:()=>[node]},getComputedStyle:()=>({visibility:'visible'}),RunaCardEffects:{clear:()=>clears++,sync:o=>updates.push(o)},visualGeneration:0};
 vm.createContext(c);vm.runInContext(read('card-effects-table.js'),c);
 c.syncCardIdentities();assert.ok(updates[0].items.length>=5);
 for(const winner of ['a',null]){state.phase='finished';state.winner=winner;c.syncCardIdentities();c.syncCardIdentities();}
 assert.equal(updates.length,1,'final snapshots never recreate effects');assert.equal(clears,4);
 state.phase='lobby';c.syncCardIdentities();state.matchId='two';state.phase='prep';c.syncCardIdentities();assert.equal(updates.length,2,'next match still has effects');
});

function finaleFixture(winner='a'){
 const calls=[],c={state:{code:'ABC123',matchId:'one',round:4,phase:'finished',winner,players:[{id:'a'},{id:'b'}]},finaleKey:'',finaleGeneration:0,visualQueue:Promise.resolve(),noticeQueue:Promise.resolve(),finishMatchPresentation:()=>calls.push('clear'),animateFinale:()=>calls.push('result'),document:{querySelector:()=>null},err:e=>{throw e;}};
 vm.createContext(c);vm.runInContext(between(app,'function scheduleFinale(){','async function animateFinale('),c);return {c,calls};
}
test('victory cleanup waits for the final spell and runs only once before the result',async()=>{
 const {c,calls}=finaleFixture();let finish;c.visualQueue=new Promise(r=>finish=r);
 c.scheduleFinale();await Promise.resolve();assert.deepEqual(calls,[]);
 finish();await c.visualQueue;assert.deepEqual(calls,['clear','result']);
 c.scheduleFinale();await c.visualQueue;assert.deepEqual(calls,['clear','result']);
});
test('a draw also releases all match effects',async()=>{
 const {c,calls}=finaleFixture(null);c.scheduleFinale();await c.visualQueue;assert.deepEqual(calls,['clear']);
});
test('a pending old result cannot clean or cover a new match',async()=>{
 const {c,calls}=finaleFixture();let finish;c.visualQueue=new Promise(r=>finish=r);
 c.scheduleFinale();c.state.phase='lobby';c.scheduleFinale();c.state.phase='prep';c.state.matchId='two';finish();await c.visualQueue;assert.deepEqual(calls,[]);
});
test('prepared spell cannot resume its effects after a terminal update while reading the card',async()=>{
 let release,shown=0;const reading=new Promise(r=>release=r);
 const c={visualGeneration:1,state:{phase:'resolving',combat:{id:'battle'}},combatPresentationCurrent:id=>c.state.phase==='resolving'&&id==='battle',damageSpellKind:()=>null,highlightUsedSpell:()=>reading,document:{querySelectorAll:()=>[]},presentIdentitySpell:()=>{shown++;},};
 vm.createContext(c);vm.runInContext(between(read('damage-presentation.js'),'async function presentPreparedMagic(','async function animatePushCollision('),c);
 const playing=c.presentPreparedMagic({card:{name:'Sono'},op:'sleep'});c.state.phase='finished';c.visualGeneration++;let exits=0;release(async()=>exits++);await playing;
 assert.equal(shown,0);assert.equal(exits,1,'the displayed card is still released');
});
test('global table cleanup releases every effects engine without removing the result scene',()=>{
 const called=[],node=()=>({style:{visibility:'hidden'},classList:{remove(){}},getAnimations:()=>[{cancel:()=>called.push('animation')}],replaceChildren:()=>called.push('layer'),remove:()=>called.push('transient')});
 const card=node(),c={document:{querySelectorAll:s=>s==='#game .card,#game .spell-mark'?[card]:[node()]},$:()=>node(),cleanupDrag:()=>called.push('drag'),hideHover:()=>called.push('hover'),cancelForgeVisuals:()=>called.push('forge')};
 const apis={RunaCombatReturn:'cancel',RunaPatronCaptions:'clear',RunaMarikaEffects:'clear',RunaCardEffects:'clear',RunaDamageFX:'clear',RunaTableAtmosphere:'clear',RunaTurnClock:'clear',RunaWeaponEntry:'clear'};
 for(const [api,method]of Object.entries(apis))c[api]={[method]:()=>called.push(api)};
 vm.createContext(c);vm.runInContext(between(app,'function clearTableEffects(){','function finishMatchPresentation('),c);c.clearTableEffects();
 for(const api of Object.keys(apis))assert.ok(called.includes(api));assert.equal(card.style.visibility,'');
 assert.ok(!between(app,'function clearTableEffects(){','function finishMatchPresentation(').includes('capture-scene'),'result animations keep their own lifecycle');
});
