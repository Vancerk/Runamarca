import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('./app.js',import.meta.url),'utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
// A spell click must submit the individual chosen UID, including the patron option.
let choices,played;
const spells={commandBusy:false,state:{phase:'prep',turn:'me',you:'me'},seat:()=>({reserve:[{uid:'one'},{uid:'two'}]}),role:()=> 'friendly-or-patron',affordable:()=>true,showTargetPicker:(_card,ids,callback)=>{choices=ids;callback('two');},command:data=>{played=data;},selected:null};
vm.createContext(spells);vm.runInContext(extract('function chooseSpellTarget','function renderActions'),spells);spells.chooseSpellTarget({uid:'spell'});assert.deepEqual(Array.from(choices),['patron','one','two']);assert.equal(played.targetId,'two');assert.equal(played.mode,'direct');
// All three lane targets must retain their endpoints on the rival's preparation.
for(const x of [100,500,900]){
 const node=()=>({dataset:{},children:[],style:{},setAttribute(k,v){this[k]=v;},append(child){this.children.push(child);},remove(){}}),svg=node();svg.replaceChildren=()=>svg.children=[];svg.getBoundingClientRect=()=>({left:20,top:30,width:1000,height:700});
 const context={state:{phase:'prep',turn:'rival',you:'me'},seat:()=>({emanation:['source'],hand:[]}),emanationChoices:new Map([['source','target']]),spellTargets:new Map(),$:()=>svg,tableCard:uid=>({x:uid==='source'?250:x,y:uid==='source'?650:200}),center:el=>el,document:{createElementNS:node},requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
 vm.createContext(context);vm.runInContext(extract('let targetLinkFrame','function scheduleAutomaticMulligan'),context);context.renderTargetLinks();assert.equal(svg.children.length,1);assert.ok(svg.children[0].children[0].d.endsWith(`${x-20} 170`));
}
// Opening flights must aim at the actual hand even if hidden mulligan cards still exist.
let frames,finished,lookedUp;
const target={style:{},getBoundingClientRect:()=>({left:610,top:560,width:118,height:165})},layer={getBoundingClientRect:()=>({left:0,top:0}),append(){}},copy={classList:{remove(){},add(){}},removeAttribute(){}},flight={style:{},append(){},animate(f){frames=f;return {finished:Promise.resolve(),cancel(){}};}};
const transfers={requestAnimationFrame:callback=>{setImmediate(callback);return 1;},document:{querySelector:selector=>{lookedUp=selector;return target;},createElement:()=>flight},tableCard:()=>{throw Error('A hidden opening card must not be selected as the destination');},$:()=>layer,movingCards:new Set(),pendingArrival:['test'],weightOf:()=>0,sound(){},finishVisual:uid=>{finished=uid;}};
vm.createContext(transfers);vm.runInContext(extract('async function animateTransfer','async function animateOpeningToHand'),transfers);await transfers.animateTransfer({uid:'test',copy,rect:{left:250,top:240,width:145,height:205},destination:'#hand .card[data-uid="test"]'});assert.equal(lookedUp,'#hand .card[data-uid="test"]');assert.equal(frames.at(-1).left,'610px');assert.equal(frames.at(-1).top,'560px');assert.equal(finished,'test');
// Audio cues follow animation time and fire exactly once at collision, even after a long frame.
let nextFrame,hits=0;const cues={requestAnimationFrame:callback=>{nextFrame=callback;return 1;},cancelAnimationFrame(){}};vm.createContext(cues);vm.runInContext(extract('function animationCue','warmSounds();\nfunction spellSound'),cues);const animation={currentTime:0,playState:'running',effect:{getTiming:()=>({duration:900})},finished:new Promise(()=>{})};cues.animationCue(animation,.84,()=>hits++);animation.currentTime=500;nextFrame();assert.equal(hits,0);animation.currentTime=800;nextFrame();assert.equal(hits,1);
console.log('OK: alvos individuais, seta nos três locais durante turno rival, voo para mão e áudio no momento da colisão.');
