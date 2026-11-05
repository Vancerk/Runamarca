import {protectContact} from './hand.js';
// Revision 10: combat contact reads on the projected faces as well.
// The native heavyCombatImpact shakes `.card-art-canvas`, which the hybrid table
// hides behind its projected sample, so table targets showed no jolt. This adds a
// short jolt and flash on the visible element only. It is called by the existing
// contact cue (after the server's timeline step), never schedules damage, health,
// audio or commands, and ignores a repeated call on the same node within 120 ms.
export function installImpacts(){
 if(typeof heavyCombatImpact!=='function')return;
 const recent=new WeakMap(),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;let count=0,skipped=0,spellHits=0;
 function physical({target,attack,attacker}){
  try{
   // A render between wind-up and contact replaces table nodes; follow the live one.
   if(target&&!target.isConnected&&typeof currentVisualTarget==='function')target=currentVisualTarget(target);
   if(!target?.isConnected||!(attack>0)||reduced())return;
   const now=performance.now();if(now-(recent.get(target)||-1e9)<120){skipped++;return;}recent.set(target,now);
   const tier=globalThis.RunaDamageFX?.impactTier?.(attack)||1,push=[0,3,5,8][tier]||3,face=target.querySelector?.(':scope>.hybrid-card-face')||(target.classList?.contains('visual-card')?target:null)||target;
   // Individual translate/filter compose with matrix3d projections and strike motion.
   face.animate([{translate:'0 0',filter:'brightness(1)'},{translate:`${push}px ${-push*.45}px`,filter:'brightness(1.75) saturate(1.15)',offset:.16},{translate:`${-push*.55}px ${push*.25}px`,filter:'brightness(1.2)',offset:.42},{translate:'0 0',filter:'brightness(1)'}],{duration:200+tier*45,easing:'cubic-bezier(.2,.7,.3,1)'});count++;
  }catch{}
  return;
 };
 // Spell and ability hits arrive through applyDamageHit at the effect's own impact
 // frame. A magical flash (cool glow, vertical kick) distinguishes them from the
 // lateral physical jolt of attacks. Health is still applied only by the native call.
 // A lethal spell victim may already have left the board and exist only as a
 // damage remnant in #visual-layer (tableCard excludes that layer by contract), so
 // the visual target is captured before the native call; afterwards the corpse that
 // finishDamageVictim marked in this call is preferred, since it may be a new copy.
 if(typeof applyDamageHit==='function'){
  const inLayer=n=>n?.isConnected&&n.closest('#visual-layer')?n:null;
  const remnantOf=uid=>inLayer(typeof damageRemnants!=='undefined'?damageRemnants.get(uid):null);
  const boardOf=uid=>{const n=typeof tableCard==='function'?tableCard(uid):null;return n?.isConnected&&n.closest('#game')?n:null;};
  const defeated=uid=>typeof visuallyDefeated!=='undefined'&&visuallyDefeated.has(uid);
  const corpseOf=uid=>inLayer(typeof deadVisuals!=='undefined'?deadVisuals.get(uid)?.copy:null)||[...document.querySelectorAll('#visual-layer .visual-dead')].find(n=>n.dataset.uid===uid)||null;
  function beforeHit(updates=[]){
   const marks=[];try{if(!reduced())for(const u of updates||[]){if(!u?.uid)continue;const old=typeof displayedHealth!=='undefined'?displayedHealth.get(u.uid):undefined;if(old!==undefined&&!(u.hp<old))continue;marks.push({uid:u.uid,node:remnantOf(u.uid)||boardOf(u.uid),dead:defeated(u.uid)});}}catch{}
   return marks;
  }
  function afterHit(marks){
   for(const m of marks)try{let node=!m.dead&&defeated(m.uid)?corpseOf(m.uid)||m.node:m.node;if(!node?.isConnected)node=remnantOf(m.uid)||boardOf(m.uid);if(!inLayer(node)&&!node?.closest('#game'))continue;const now=performance.now();if(now-(recent.get(node)||-1e9)<120){skipped++;continue;}recent.set(node,now);const face=node.querySelector(':scope>.hybrid-card-face')||node.querySelector(':scope>.card>.hybrid-card-face')||node.querySelector(':scope>.card')||node;face.animate([{translate:'0 0',filter:'brightness(1)'},{translate:'0 3px',filter:'brightness(1.65) saturate(1.3) drop-shadow(0 0 7px #bcd8ff)',offset:.2},{translate:'0 -1px',filter:'brightness(1.15) drop-shadow(0 0 3px #bcd8ff88)',offset:.5},{translate:'0 0',filter:'brightness(1)'}],{duration:320,easing:'cubic-bezier(.2,.7,.3,1)'});spellHits++;}catch{}
   return;
  };
  RunaPresentation.register('spell-impacts',{beforePart:(kind,updates)=>kind==='damage-hit'?beforeHit(updates):null,afterPart:(kind,updates,marks)=>{if(kind==='damage-hit')afterHit(marks);}});
 }
 // Wind-up lift on this page only: the attacker rises toward the camera during the
 // pull-back and drops on contact. Translate path, offsets and the .42 contact cue
 // from the shared RunaMotion module are preserved by the presentation hooks.
 let lifted=0;
 RunaPresentation.register('physical-impacts',{
  notify(kind,payload){if(kind==='physical-impact')physical(payload);},
  decorate(kind,value,payload){
   if(kind==='contact'){protectContact(payload.from,payload.to,value,payload.shared);return value;}
   if(kind!=='strike-frames'||reduced()||value.length!==6)return value;
   const force=Math.max(0,Math.min(1,payload.weight||0)),scale=[1,1.06+force*.035,1.015,1,1,1];lifted++;
   return value.map((f,i)=>({...f,scale:String(scale[i])}));
  }
 });
 window.RunaHybridImpacts={get stats(){return {count,skipped,lifted,spellHits};}};
}
