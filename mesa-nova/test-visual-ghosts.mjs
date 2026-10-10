import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const presentation=fs.readFileSync(new URL('damage-presentation.js',import.meta.url),'utf8'),app=fs.readFileSync(new URL('app.js',import.meta.url),'utf8');
class Node{constructor(uid='',hp=2){this.dataset={uid};this.hp=hp;this.style={};this.children=[];this.isConnected=true;this.className='';this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x)};}getBoundingClientRect(){return {left:100,top:200,width:100,height:140};}querySelector(s){return s==='.health-value'?{textContent:String(this.hp)}:null;}append(n){this.children.push(n);n.isConnected=true;}remove(){this.isConnected=false;}removeAttribute(){}animate(){return {playState:'running',currentTime:0,effect:{getTiming:()=>({duration:1000})},finished:Promise.resolve(),cancel(){}};}getAnimations(){return [];}}
function fixture(events,nodes=[]){const layer=new Node(),ctx={state:{phase:'prep',you:'a',players:[{id:'a',reserve:[],discard:[]},{id:'b',reserve:[],discard:[]}],events},lastVisualId:0,visualGeneration:1,pendingArrival:[],movingCards:new Set(),deadVisuals:new Map(),cloneVisual:n=>new Node(n.dataset.uid,n.hp),$:()=>layer,seat:()=>({id:'a'}),tableCard:()=>null,spellTarget:()=>null,document:{createElement:()=>new Node(),querySelectorAll:s=>s==='#game .card'?nodes:[]},revealArrival:uid=>{ctx.revealed=uid;},applyHealthUpdates(){},sound(){}};vm.createContext(ctx);vm.runInContext(presentation,ctx);return {ctx,layer};}
{
 const {ctx,layer}=fixture([{id:1,type:'spell',op:'area_attack_modifier',healthUpdates:[{uid:'old-dead',hp:0},{uid:'alive',hp:3}]}],[new Node('old-dead',0)]);ctx.captureDamageSnapshots();ctx.prepareDamagePresentation();assert.equal(layer.children.length,0,'Geada must not resurrect discarded creatures as visual ghosts');
}
{
 const {ctx,layer}=fixture([{id:1,type:'spell',op:'damage',healthUpdates:[{uid:'previously-dead',hp:0}]}],[new Node('previously-dead',2)]);ctx.captureDamageSnapshots();vm.runInContext("visuallyDefeated.add('previously-dead')",ctx);ctx.prepareDamagePresentation();assert.equal(layer.children.length,0,'repeated zero HP update must not recreate an already animated casualty');
}
{
 const {ctx,layer}=fixture([{id:1,type:'spell',op:'damage',healthUpdates:[{uid:'victim',hp:0}]}],[new Node('victim',2)]);ctx.captureDamageSnapshots();ctx.prepareDamagePresentation();assert.equal(layer.children.length,1,'new lethal spell holds one visible copy until its impact');ctx.prepareDamagePresentation();assert.equal(layer.children.length,1,'same pending event cannot duplicate the copy');
}
{
 const {ctx,layer}=fixture([],[new Node('returning',2)]);ctx.captureDamageSnapshots();ctx.damageRemnant('returning');await ctx.presentReturn({cardId:'returning',returnedId:'new',playerId:'b'});assert.equal(layer.children[0].isConnected,false,'no destination must not strand a return-to-hand copy');assert.equal(ctx.revealed,'new');
}
{
 const {ctx,layer}=fixture([{id:1,type:'spell',op:'area_damage',healthUpdates:[{uid:'old',hp:0},{uid:'new',hp:0}]}],[new Node('old',0),new Node('new',2)]);ctx.captureDamageSnapshots();ctx.prepareDamagePresentation();assert.equal(layer.children.length,1,'area damage must animate only the new casualty, excluding historical zero HP updates');assert.equal(layer.children[0].dataset.uid,'new');
}
console.log('Cartas fantasma: descarte não recria cópias, morte já animada não duplica, magia letal nova mantém uma cópia, retorno sem destino é limpo.');

function appFunction(name,next){const start=app.indexOf('function '+name+'('),end=next?app.indexOf(next,start):app.indexOf('\n',start);assert.ok(start>=0&&end>start);return (app.slice(start-6,start)==='async '?'async ':'')+app.slice(start,end);}
{
 const source=[new Node('left',2),new Node('right',2)],{ctx,layer}=fixture([],source);let release;const finished=new Promise(r=>{release=r;});
 Object.assign(ctx,{state:{phase:'resolving',combat:{id:'combat-1'},players:[{id:'a',reserve:[]},{id:'b',reserve:[]}]},displayedAttack:new Map(),attackSource:h=>source[h.sourceId==='left'?0:1],center:n=>{const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},RunaMotion:{contact:()=>({dx:0,dy:50}),strikeFrames:()=>[]},weightOf:()=>0,animationCue(){},settleAnimation:()=>finished});
 vm.runInContext(appFunction('combatPresentationCurrent')+'\n'+appFunction('finishVisual')+'\n'+appFunction('visualCard')+'\n'+appFunction('animateLaneClash','async function animateDirectedStrike('),ctx);
 const clash=ctx.animateLaneClash({cards:[{uid:'left',owner:'a',attack:2,health:2},{uid:'right',owner:'b',attack:2,health:2}],healthUpdates:[{uid:'left',hp:0},{uid:'right',hp:0}]});
 assert.equal(layer.children.length,2);assert.equal(layer.children[0].dataset.combatId,'combat-1');ctx.state.phase='prep';release();await clash;
 assert.ok(layer.children.every(n=>!n.isConnected),'a late attack must remove its copies instead of registering corpses in the next round');assert.equal(ctx.deadVisuals.size,0);assert.equal(ctx.movingCards.size,0);
}
{
 const {ctx,layer}=fixture([],[new Node('victim',2)]),attacker=new Node('victim',2);attacker.dataset.combatId='battle';layer.append(attacker);ctx.movingCards.add('victim');ctx.document.querySelectorAll=s=>s==='#visual-layer .visual-card'?[attacker]:[];
 ctx.finishDamageVictim({uid:'victim',hp:0});assert.equal(layer.children.length,1,'a lethal secondary effect must reuse the attacking copy instead of making another');assert.ok(vm.runInContext("visuallyDefeated.has('victim')",ctx));
 ctx.deadVisuals.set('victim',{copy:attacker,owner:'b'});ctx.center=()=>({x:100,y:200});ctx.safeFlight=async node=>{node.remove();};
 vm.runInContext(appFunction('animateCasualties','async function animateBanquet('),ctx);ctx.animateCasualties({casualties:[{uid:'victim',owner:'b'}]});assert.equal(attacker.isConnected,false,'a flagged casualty still removes its registered attack copy');assert.equal(ctx.deadVisuals.size,0);
}
{
 const {ctx,layer}=fixture([]),copy=new Node('old-combat');copy.dataset.combatId='old';layer.append(copy);ctx.movingCards.add('old-combat');ctx.document.querySelectorAll=s=>s==='#visual-layer [data-combat-id]'?layer.children.filter(n=>n.isConnected&&n.dataset.combatId):[];
 vm.runInContext(appFunction('finishVisual')+'\n'+appFunction('tickCombat',"let finaleKey="),ctx);ctx.tickCombat();assert.equal(copy.isConnected,false,'combat exit removes unregistered animation copies too');assert.equal(ctx.movingCards.size,0);
}
console.log('Ciclo do combate: ataque atrasado não deixa cadáver, morte durante ataque não duplica, saída do combate limpa cópias órfãs.');
