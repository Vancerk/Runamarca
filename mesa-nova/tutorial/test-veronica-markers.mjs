import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {applyProtocol} from './forja-effects.mjs';
const code=readFileSync(new URL('card-effects-table.js',import.meta.url),'utf8');
function fixture(lane,mode){
 const cards=Array.from({length:3},(_,i)=>({uid:'card'+i,owner:'a',attack:1,health:3,damage:0,effects:i===lane?[{op:'combat_protocol'}]:[],protocolMode:mode}));
 const p={id:'a',reserve:cards,formation:cards.map(c=>c.uid)};
 const targets=applyProtocol({}, {p,lane,card:cards[lane]}, {laneCard:(_r,_p,l)=>cards[l],attack:c=>c.attack+(c.attackMod||0)});
 const nodes=cards.map(c=>({dataset:{uid:c.uid},classList:{contains:()=>false},querySelector:()=>null,getBoundingClientRect:()=>({width:120}),closest:()=>({classList:{contains:()=>false}})}));
 const updates=[],state={code:'MARK',matchId:'one',you:'a',phase:'resolving',combat:{id:'one',startedAt:Date.now()+10000,timeline:[]},players:[p]},scope={state,Date,visualGeneration:1,document:{querySelectorAll:()=>nodes,querySelector:()=>nodes[0]},getComputedStyle:()=>({visibility:'visible'}),RunaCardEffects:{clear(){},sync:data=>updates.push(data)},damageTarget:uid=>nodes.find(n=>n.dataset.uid===uid),applyHealthUpdates(){}};
 vm.createContext(scope);vm.runInContext(code,scope);scope.syncCardIdentities();scope.identityPlay=(_kind,_from,_to,hit)=>hit();
 return {scope,state,targets,updates,cards,marks:()=>Array.from(updates.at(-1).items.filter(x=>x.kind==='veronica'),x=>x.uid).sort()};
}
for(const mode of ['assault','escort'])for(const lane of [0,1,2])test('Verônica '+mode+' in lane '+lane+' marks precisely the actual recipients',()=>{
 const f=fixture(lane,mode);assert.deepEqual(f.marks(),[],'no marker before Revelation');
 f.scope.presentIdentityRevelation({sourceId:'card'+lane,targetSide:'a',lane,op:'combat_protocol',healthUpdates:f.targets});
 assert.deepEqual(f.marks(),Array.from(new Set([lane,lane-1,lane+1].filter(i=>i>=0&&i<3))).map(i=>'card'+i).sort());
 f.scope.syncCardIdentities();assert.equal(f.marks().length,lane===1?3:2,'polling preserves applied marks');
 f.state.phase='prep';f.state.combat=null;f.scope.syncCardIdentities();assert.equal(f.marks().length,0,'temporary bonus expires with combat');
});
test('joining during combat recovers only completed protocol marks; unoccupied lane adds no phantom recipient',()=>{
 const f=fixture(0,'escort');f.state.combat.startedAt=Date.now()-2000;f.state.combat.timeline=[{kind:'revelation',duration:1200,ability:{op:'combat_protocol',healthUpdates:[f.targets[0]]}}];f.scope.syncCardIdentities();assert.deepEqual(f.marks(),['card0']);
 f.state.phase='finished';f.scope.syncCardIdentities();f.state.phase='resolving';f.state.combat={id:'two',startedAt:Date.now()+10000,timeline:[]};f.scope.syncCardIdentities();assert.deepEqual(f.marks(),[]);
});
