import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const motion={};vm.createContext(motion);vm.runInContext(await readFile(new URL('./combat-motion.js',import.meta.url),'utf8'),motion);
const source=await readFile(new URL('./app.js',import.meta.url),'utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
// A spell click must submit the individual chosen UID, including the patron option.
let choices,played;
const spells={commandBusy:false,state:{phase:'prep',turn:'me',you:'me'},seat:()=>({reserve:[{uid:'one'},{uid:'two'}]}),role:()=> 'friendly-or-patron',affordable:()=>true,showTargetPicker:(_card,ids,callback)=>{choices=ids;callback('two');},command:data=>{played=data;},selected:null};
vm.createContext(spells);vm.runInContext(extract('function chooseSpellTarget','function renderActions'),spells);spells.chooseSpellTarget({uid:'spell'});assert.deepEqual(Array.from(choices),['patron','one','two']);assert.equal(played.targetId,'two');assert.equal(played.mode,'direct');
// All three lane targets must retain their endpoints on the rival's preparation.
for(const x of [100,500,900]){
 const node=()=>({dataset:{},children:[],style:{},setAttribute(k,v){this[k]=v;},append(child){this.children.push(child);},remove(){}}),svg=node();svg.replaceChildren=()=>svg.children=[];svg.getScreenCTM=()=>({inverse:()=>({left:20,top:30})});svg.getBoundingClientRect=()=>({left:20,top:30,width:1000,height:700});
 const context={RunaMotion:motion.RunaMotion,DOMPoint:class {constructor(x,y){this.x=x;this.y=y;}matrixTransform(m){return {x:this.x-m.left,y:this.y-m.top};}},state:{phase:'prep',turn:'rival',you:'me'},seat:()=>({emanation:['source'],hand:[]}),emanationChoices:new Map([['source','target']]),spellTargets:new Map(),$:()=>svg,tableCard:uid=>({x:uid==='source'?250:x,y:uid==='source'?650:200,getBoundingClientRect:()=>({left:(uid==='source'?250:x)-30,top:(uid==='source'?650:200)-40,width:60,height:80})}),center:el=>el,document:{createElementNS:node},requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
 vm.createContext(context);vm.runInContext(extract('let targetLinkFrame','function scheduleAutomaticMulligan'),context);context.renderTargetLinks();assert.equal(svg.children.length,1);const points=svg.children[0].children[0].d.match(/-?\d+(?:\.\d+)?/g).map(Number),tip=points.slice(-2);assert.ok(Math.abs(tip[0]-(x-20))<=30.01&&Math.abs(tip[1]-170)<=40.01,'arrow ends on target border');const triangle=svg.children[0].children[2].d.match(/-?\d+(?:\.\d+)?/g).map(Number),base=[(triangle[0]+triangle[4])/2,(triangle[1]+triangle[5])/2];assert.ok((tip[0]-base[0])*(tip[0]-points[2])+(tip[1]-base[1])*(tip[1]-points[3])>0,'arrowhead points from source to target');
}
// Opening flights must aim at the actual hand even if hidden mulligan cards still exist.
let frames,finished,lookedUp;
const target={classList:{contains:()=>false},style:{},getBoundingClientRect:()=>({left:610,top:560,width:118,height:165})},layer={getBoundingClientRect:()=>({left:0,top:0}),append(){}},copy={classList:{contains:()=>false,remove(){},add(){}},removeAttribute(){}},flight={style:{},append(){},remove(){},animate(f){frames=f;return {finished:Promise.resolve(),cancel(){}};}};
const transfers={visualGeneration:0,pause:()=>Promise.resolve(),settleAnimation:async a=>a.finished,requestAnimationFrame:callback=>{setImmediate(callback);return 1;},document:{querySelectorAll:()=>[],querySelector:selector=>{lookedUp=selector;return target;},createElement:()=>flight},tableCard:()=>{throw Error('A hidden opening card must not be selected as the destination');},$:()=>layer,movingCards:new Set(),pendingArrival:['test'],weightOf:()=>0,sound(){},finishVisual:uid=>{finished=uid;}};
vm.createContext(transfers);vm.runInContext(extract('async function animateTransfer','async function animateOpeningToHand'),transfers);await transfers.animateTransfer({uid:'test',copy,rect:{left:250,top:240,width:145,height:205},destination:'#hand .card[data-uid="test"]'});assert.equal(lookedUp,'#hand .card[data-uid="test"]');assert.equal(frames.at(-1).transform,'translate(346.5px,300px) scale(0.8137931034482758)');assert.equal(finished,'test');
// Audio cues follow animation time and fire exactly once at collision, even after a long frame.
let nextFrame,hits=0;const cues={visualGeneration:0,requestAnimationFrame:callback=>{nextFrame=callback;return 1;},cancelAnimationFrame(){}};vm.createContext(cues);vm.runInContext(extract('function animationCue','warmSounds();\nfunction spellSound'),cues);const animation={currentTime:0,playState:'running',effect:{getTiming:()=>({duration:900})},finished:new Promise(()=>{})};cues.animationCue(animation,.84,()=>hits++);animation.currentTime=500;nextFrame();assert.equal(hits,0);animation.currentTime=800;nextFrame();assert.equal(hits,1);
console.log('OK: alvos individuais, seta nos três locais durante turno rival, voo para mão e áudio no momento da colisão.');
// A returned spell must no longer have the hidden pending-arrival class.
const classes=new Set(['pending-arrival']),returned={dataset:{uid:'returned'},style:{visibility:'hidden'},classList:{remove:name=>classes.delete(name)}},cleanup={state:{phase:'prep'},movingCards:new Set(['returned']),pendingArrival:['returned'],document:{querySelectorAll:()=>[returned]}};
vm.createContext(cleanup);vm.runInContext(extract('function finishVisual','async function safeFlight'),cleanup);cleanup.finishVisual('returned',{remove(){}});assert.equal(classes.has('pending-arrival'),false);assert.equal(returned.style.visibility,'');assert.equal(cleanup.pendingArrival.length,0);
// Damage is reflected on the displayed number immediately and marks damaged life red.
const lifeClasses=new Set(),life={textContent:'5',classList:{toggle:(name,on)=>on?lifeClasses.add(name):lifeClasses.delete(name),remove(){},add(){}},offsetWidth:1},cardNode={dataset:{uid:'victim'},querySelector:()=>life,classList:{toggle(){}}},health={updateLiquidHeart(){},state:{players:[]},displayedHealth:new Map([['victim',5]]),pendingHealth:new Map(),document:{querySelectorAll:()=>[cardNode]}};
vm.createContext(health);vm.runInContext(extract('function applyHealthUpdates','function damagePatron'),health);health.applyHealthUpdates([{uid:'victim',hp:2,maxHp:5}]);assert.equal(life.textContent,'2');assert.ok(lifeClasses.has('health-damaged'));health.applyHealthUpdates([{uid:'victim',hp:5,maxHp:5}]);assert.equal(lifeClasses.has('health-damaged'),false);
console.log('OK: devolução visível da magia e HP atualizado no impacto.');
const arrivals={pendingArrival:[]};vm.createContext(arrivals);vm.runInContext(extract('function trackArrivals','async function command'),arrivals);arrivals.trackArrivals({you:'me',players:[{id:'me',hand:[],prepared:[{card:{uid:'returned'}}]}]},{you:'me',events:[{id:1,type:'draw',playerId:'me',cardId:'drawn'}],players:[{id:'me',hand:[{uid:'returned'},{uid:'drawn'}]}]});assert.deepEqual(Array.from(arrivals.pendingArrival),['drawn'],'only an actual draw waits for a deck animation, never a returned spell');

// Target selection retains hover zoom for both sides and hides it before submitting.
{
 const nodes=new Map(),highlight=new Set();let hovered,chosen,hidden=0;
 const node=()=>({children:[],classList:{add(){},remove(){}},append(c){this.children.push(c);},replaceChildren(){this.children=[];},getBoundingClientRect:()=>({right:200,top:100,height:200}),setAttribute(){}});
 const dialog=node();dialog.open=false;dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
 const content=node();nodes.set('target-picker',dialog);nodes.set('target-picker-content',content);
 const picker={state:{players:[{reserve:[{uid:'ally'},{uid:'enemy'}]}]},$:id=>nodes.get(id),hideHover:()=>hidden++,showHover:c=>hovered=c.uid,moveHover(){},cardEl:node,text(){},tableCard:uid=>({classList:{add:()=>highlight.add(uid),remove:()=>highlight.delete(uid)}}),document:{createElement:node,querySelectorAll:()=>[]}};
 vm.createContext(picker);vm.runInContext(extract('function showTargetPicker','function chooseEmanationTarget'),picker);
 picker.showTargetPicker({},['ally','enemy'],uid=>{chosen=uid;});
 const [ally,enemy]=content.children[0].children;ally.onmouseenter({});assert.equal(hovered,'ally');assert.ok(highlight.has('ally'));ally.onmouseleave();assert.ok(!highlight.has('ally'));enemy.onfocus();assert.equal(hovered,'enemy');enemy.onclick();assert.equal(chosen,'enemy');assert.equal(dialog.open,false);assert.equal(hidden,3);
}
// Text fitting changes font size instead of horizontally stretching its glyphs.
{
 const visual=await readFile(new URL('./card-visual.js',import.meta.url),'utf8');const a=visual.indexOf('function fitLabel'),b=visual.indexOf('function number',a);
 const ctx={font:'',measureText(label){return {width:label.length*parseFloat(this.font.match(/[0-9.]+px/)[0])};}},fit={};vm.createContext(fit);vm.runInContext(visual.slice(a,b),fit);assert.equal(fit.fitLabel(ctx,'LONG CLASSIFICATION',21,'600 {size}px Georgia',190),'LONG CLASSIFICATION');assert.ok(ctx.measureText('LONG CLASSIFICATION').width<=190);assert.ok(!ctx.font.includes('scale'));
}
console.log('OK: zoom de alvos aliados/inimigos, seleção preservada e fonte sem compressão horizontal.');

// The zoom must join the modal top layer, then return to the page outside it.
{
 const holder={hidden:true,parentElement:null,replaceChildren(){},append(){}},host=()=>({append(el){el.parentElement=this;}}),body=host(),dialog=host();dialog.open=true;
 const preview={hoverUid:null,narrativeTimer:null,clearTimeout(){},keywordGlossary:[],moveHover(){},cardEl:()=>({classList:{add(){}}}),document:{body},$:id=>id==='hover-preview'?holder:dialog};vm.createContext(preview);vm.runInContext(extract('function showHover','function moveHover'),preview);
 preview.showHover({uid:'ally'},{});assert.equal(holder.parentElement,dialog);assert.equal(holder.hidden,false);dialog.open=false;preview.showHover({uid:'ally'},{});assert.equal(holder.parentElement,body);
}
