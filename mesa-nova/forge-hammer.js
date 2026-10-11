// Heavy forging impact: local click immediately, public effect on confirmed use.
const locallyHammeredPowers=new Set();
function cancelForgeVisuals(){document.querySelectorAll('.forge-impact-layer').forEach(layer=>{layer.getAnimations?.({subtree:true}).forEach(animation=>animation.cancel());layer.remove();});locallyHammeredPowers.clear();if(typeof powerUsagePresentation!=='undefined')powerUsagePresentation.clear();}
function hammerKey(owner,powerId){return [state?.code,state?.matchId,state?.round,owner,powerId].join(':');}
async function playForgeHammer(owner,powerId,{localClick=false,onImpact=null}={}){
 if(localClick){locallyHammeredPowers.add(hammerKey(owner,powerId));if(locallyHammeredPowers.size>128)locallyHammeredPowers.delete(locallyHammeredPowers.values().next().value);}
 const head=$(owner===seat()?.id?'self-head':'opponent-head'),index=powerId==='forjar-armadura'?0:1,anchor=head?.querySelectorAll('.patron-power')?.[index]||head?.querySelector('.patron-card');if(!anchor)return;
 const rect=anchor.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2,layer=document.createElement('div');layer.className='forge-impact-layer';document.body.append(layer);
 const hammer=document.createElement('div');hammer.className='forge-hammer';hammer.style.left=(x-80)+'px';hammer.style.top=(y-67.2)+'px';hammer.style.opacity='0';
 hammer.innerHTML=RunaForgeHammerArt();
 layer.append(hammer);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const strike=RunaForgeHammerStrike(reduced);
 const animation=hammer.animate(strike.frames,{duration:strike.duration,easing:'linear',fill:'forwards'});
 animationCue(animation,strike.impact,()=>{
  if(!hammer.isConnected)return;hammer.dataset.phase='impact';
  hammer.querySelector('.forge-art-heat')?.animate([{opacity:0},{opacity:.95,offset:.2},{opacity:0}],{duration:135,fill:'forwards'});
  onImpact?.();
  if(typeof RunaDamageFX!=='undefined')RunaDamageFX.play({kind:'hammer',from:anchor,to:anchor,getGeneration:()=>visualGeneration});else forgeHammerSound();const flash=document.createElement('div');flash.className='forge-flash';flash.style.left=x+'px';flash.style.top=y+'px';layer.append(flash);flash.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scale(2.5)',opacity:0}],{duration:450,easing:'ease-out',fill:'forwards'});
  for(let i=0;i<(reduced?5:36);i++){const spark=document.createElement('i');spark.className='forge-spark';spark.style.left=x+'px';spark.style.top=y+'px';const angle=Math.PI*2*i/36+(i%3)*.1,distance=65+(i%7)*28;layer.append(spark);spark.animate([{transform:'translate(-50%,-50%) rotate('+angle+'rad) scale(1.4)',opacity:1},{transform:'translate('+Math.cos(angle)*distance+'px,'+(Math.sin(angle)*distance+50)+'px) rotate('+angle+'rad) scale(.2)',opacity:0}],{duration:420+(i%5)*90,easing:'cubic-bezier(.15,.7,.4,1)',fill:'forwards'});}
  for(let i=0;i<2;i++){const ring=document.createElement('i');ring.className='forge-shock-ring';ring.style.left=x+'px';ring.style.top=y+'px';layer.append(ring);ring.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.95},{transform:'translate(-50%,-50%) scale('+(i?4:2.5)+')',opacity:0}],{duration:600+i*160,delay:i*70,easing:'ease-out',fill:'forwards'});}
  if(!reduced)head.animate([{transform:'translate(0,0)'},{transform:'translate(-5px,3px)',offset:.2},{transform:'translate(4px,-2px)',offset:.4},{transform:'translate(-2px,1px)',offset:.65},{transform:'translate(0,0)'}],{duration:340});
 });
 try{await settleAnimation(animation,strike.duration);hammer.remove();await pause(320);}finally{layer.remove();}
}
async function publicForgeHammer(event,powerId){const key=hammerKey(event.playerId,powerId);if(locallyHammeredPowers.delete(key))return;await playForgeHammer(event.playerId,powerId,{onImpact:()=>flipConfirmedForgePower(event.playerId,powerId)});}

function forgeHammerSound(){if(typeof RunaDamageFX!=='undefined'){RunaDamageFX.audio('hammer','impact',{x:innerWidth/2});return;}sound('impact',10);try{if(typeof audioContext==='undefined'||audioContext?.state!=='running')return;const now=audioContext.currentTime;for(const [frequency,volume,duration] of [[120,.11,.18],[540,.045,.6],[1320,.025,.46],[2470,.014,.32]]){const tone=audioContext.createOscillator(),gain=audioContext.createGain();tone.type='sine';tone.frequency.setValueAtTime(frequency,now);if(frequency===120)tone.frequency.exponentialRampToValueAtTime(48,now+.16);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.003);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);tone.connect(gain).connect(audioContext.destination);tone.start(now);tone.stop(now+duration+.03);}}catch{}}

function flipConfirmedForgePower(owner,powerId){
 if(typeof powerUsagePresentation==='undefined')return;const key=[state.code,state.matchId,owner,powerId].join(':'),previous=powerUsagePresentation.get(key);if(!previous?.used)return;powerUsagePresentation.set(key,{used:true,pending:false,started:Date.now()});
 const cost=$(owner===seat()?.id?'self-head':'opponent-head')?.querySelectorAll('.patron-power')?.[powerId==='forjar-armadura'?0:1]?.querySelector('.power-cost');if(cost){cost.style.transform='rotateX(180deg)';cost.animate?.([{transform:'rotateX(0deg)'},{transform:'rotateX(180deg)'}],{duration:650,easing:'linear'});}
}
