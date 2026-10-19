/* Shared by the live table and effects gallery. Presentation never changes game state. */
(function(root){
 const manifests=new Map(),buffers=new Map();let active=null,ownAudio=null;
 const characterByEnergy={forja:'lyrik',fluxo:'marika',ruptura:'dom'};
 function manifest(base){if(!manifests.has(base))manifests.set(base,fetch(base+'patron-dialogues.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Falas indisponíveis');return r.json();}).catch(e=>{manifests.delete(base);throw e;}));return manifests.get(base);}
 function selectDialogue(data,players,firstId,options={}){
  const first=players.find(p=>p.id===firstId)||players[0],second=players.find(p=>p.id!==first?.id);
  const matches=data.matchups.filter(m=>m.first===characterByEnergy[first?.patron.affinity]&&m.second===characterByEnergy[second?.patron.affinity]);
  if(options.dialogueId)return matches.find(m=>m.id===options.dialogueId)||matches[0]||null;
  // Both clients choose the same mirror exchange, regardless of local perspective.
  let hash=0;for(const c of String(options.matchKey||firstId||''))hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
  return matches[hash%matches.length]||null;
 }
 function actorForLine(line,players,firstId){
  const first=players.find(p=>p.id===firstId)||players[0];
  if(line.role==='first')return first;
  if(line.role==='second')return players.find(p=>p.id!==first?.id);
  return players.find(p=>characterByEnergy[p.patron.affinity]===line.speaker);
 }
 function wait(ms,signal){return new Promise(resolve=>{if(signal.aborted)return resolve();const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();},timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});});}
 async function bounded(promise,ms,signal){return Promise.race([promise,wait(ms,signal)]);}
 function element(tag,klass,text){const node=document.createElement(tag);if(klass)node.className=klass;if(text!==undefined)node.textContent=text;return node;}
 function cancel(){active?.controller.abort();}
 function trackSound(node){const record=active;if(!record)return;record.audioNodes.add(node);const stop=()=>{if(!record.completed&&!root.RunaSfx?.release(node))try{node.stop();}catch{}};record.controller.signal.addEventListener('abort',stop,{once:true});node.addEventListener('ended',()=>{record.audioNodes.delete(node);record.controller.signal.removeEventListener('abort',stop);},{once:true});}
 function stopEffects(){for(const node of active?.audioNodes||[]){if(!root.RunaSfx?.release(node))try{node.stop();}catch{}}}
 function pressureSound(context,muted,landing=false,point=null){if(!muted)root.RunaSfx?.play(context,landing?'forge_landing':'forge_pressure',{track:trackSound,to:point});}
 function anvilSound(context,muted,point){if(muted||context?.state!=='running')return;if(root.RunaTableAudio)root.RunaTableAudio.hammer(context,{track:trackSound,to:point});else pressureSound(context,muted);}
 function impact(scene,point,context,muted,reduced){
  anvilSound(context,muted,point);if(reduced)return;
  const layer=element('div','intro-anvil-burst');layer.style.left=point.x+'px';layer.style.top=point.y+'px';scene.append(layer);
  const flare=element('i','intro-impact-flare');layer.append(flare);
  for(let i=0;i<2;i++){const ring=element('i','intro-impact-ring');layer.append(ring);ring.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scale('+(i?2.8:2)+')',opacity:0}],{duration:650+i*180,delay:i*70,fill:'both'});}
  for(let i=0;i<42;i++){const spark=element('i','intro-metal-spark'),angle=i*2.39996,radius=65+(i%7)*21;layer.append(spark);spark.animate([{transform:'translate(0,0) rotate('+angle+'rad)',opacity:1},{transform:'translate('+Math.cos(angle)*radius+'px,'+(Math.sin(angle)*radius*.55+45)+'px) rotate('+(angle+2)+'rad)',opacity:0}],{duration:500+(i%5)*105,delay:i%4*12,fill:'both',easing:'cubic-bezier(.15,.6,.45,1)'});}
  for(let i=0;i<8;i++){const smoke=element('i','intro-hot-smoke');layer.append(smoke);smoke.animate([{transform:'translate(-50%,-40%) scale(.2)',opacity:0},{opacity:.55,offset:.14},{transform:'translate(calc(-50% + '+((i-3.5)*34)+'px),'+(-95-i%3*22)+'px) scale('+(1.3+i%3*.35)+')',opacity:0}],{duration:1100+(i%3)*120,delay:i*27,fill:'both'});}
  scene.animate([{transform:'translate(0,0)'},{transform:'translate(0,5px)',offset:.15},{transform:'translate(-3px,-2px)',offset:.35},{transform:'translate(2px,1px)',offset:.6},{transform:'translate(0,0)'}],{duration:340});
 }
 function forgeSeat(scene,end,frame,context,muted){
  pressureSound(context,muted,true,{x:end.left+end.width/2,y:end.top+end.height*.78});const x=end.left+end.width/2,y=end.top+end.height*.78;
  const glow=element('div','intro-forge-seat');glow.style.left=(end.left-35)+'px';glow.style.top=(end.top-25)+'px';glow.style.width=(end.width+70)+'px';glow.style.height=(end.height+50)+'px';scene.append(glow);
  glow.animate([{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1.08)',offset:.06},{opacity:.8,transform:'scale(1.02)',offset:.28},{opacity:0,transform:'scale(1.18)'}],{duration:1400,easing:'ease-out',fill:'both'});
  frame.animate([{filter:'brightness(2.1) sepia(.65) drop-shadow(0 0 27px #ff8a26)'},{filter:'brightness(1.3) sepia(.2) drop-shadow(0 0 12px #e76020)',offset:.3},{filter:'brightness(1) sepia(0) drop-shadow(0 0 0px transparent)'}],{duration:1400,easing:'ease-out',fill:'both'});
  for(let side of [-1,1])for(let i=0;i<7;i++){const jet=element('i','intro-pressure-plume');jet.style.left=x+'px';jet.style.top=y+'px';scene.append(jet);jet.animate([{transform:'translate(-50%,-50%) scale(.15,.4)',opacity:0},{transform:'translate(calc(-50% + '+side*(30+i*4)+'px),-55%) scale(1.1,.6)',opacity:.8,offset:.12},{transform:'translate(calc(-50% + '+side*(70+i*13)+'px),calc(-50% - '+(15+i*12)+'px)) scale('+(1.8+i*.15)+',1.2)',opacity:0}],{duration:650+i*80,delay:i*18,fill:'both',easing:'cubic-bezier(.05,.75,.25,1)'});}
  scene.animate([{transform:'translate(0,0)'},{transform:'translate(0,11px)',offset:.07},{transform:'translate(-7px,-5px)',offset:.2},{transform:'translate(4px,3px)',offset:.37},{transform:'translate(-2px,-1px)',offset:.65},{transform:'translate(0,0)'}],{duration:420});
 }
 function frameMotion(ms,signal,draw){return new Promise(resolve=>{let raf=0,start=performance.now();const done=()=>{cancelAnimationFrame(raf);signal.removeEventListener('abort',done);resolve();};const tick=now=>{if(signal.aborted)return done();const t=Math.min(1,(now-start)/ms);draw(t);if(t<1)raf=requestAnimationFrame(tick);else done();};signal.addEventListener('abort',done,{once:true});raf=requestAnimationFrame(tick);});}
 const ease=t=>t*t*(3-2*t),clamp=t=>Math.max(0,Math.min(1,t));
 function whisper(context,muted,from,to){if(!muted)root.RunaSfx?.play(context,'flux_whisper',{track:trackSound,from,to,travelSeconds:1.6});}
 function chainSound(context,muted,heavy=false,from,to){if(!muted)root.RunaSfx?.play(context,heavy?'chain_land':'chain_throw',{track:trackSound,from,to,travelSeconds:.55});}
 async function fluxArrival(scene,frame,start,end,signal,context,muted,reduced){
  const dx=end.left+end.width/2-start.left-start.width/2,dy=end.top+end.height/2-start.top-start.height/2,final='translate('+dx+'px,'+dy+'px) scale('+end.width/start.width+','+end.height/start.height+')';
  if(reduced){frame.style.transform=final;await wait(160,signal);return;}
  whisper(context,muted,{x:start.left+start.width/2,y:start.top+start.height/2},{x:end.left+end.width/2,y:end.top+end.height/2});scene.dataset.motionFlux='dissolving';
  const canvas=element('canvas','intro-ether-canvas'),ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=innerWidth*ratio;canvas.height=innerHeight*ratio;scene.append(canvas);const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);
  const swatch=document.createElement('canvas');swatch.width=24;swatch.height=32;const sample=swatch.getContext('2d');let colors=null;try{sample.drawImage(frame.querySelector('img'),0,0,24,32);colors=sample.getImageData(0,0,24,32).data;}catch{}
  const particles=Array.from({length:360},(_,i)=>{const u=(i%24+.5+Math.sin(i*12.9898)*.4)/24,v=(Math.floor(i/24)+.5+Math.cos(i*4.391)*.4)/15,si=(Math.floor(v*31)*24+Math.floor(u*23))*4;return {u,v,delay:.025+(1-v)*.19+(i%7)*.008,curve:Math.sin(i*2.39996)*75,color:colors?'rgb('+colors[si]+','+colors[si+1]+','+colors[si+2]+')':'#c3dbe6'};});
  try{await frameMotion(1850,signal,t=>{
   ctx.clearRect(0,0,innerWidth,innerHeight);const relocated=t>.46;frame.style.transform=relocated?final:'';frame.style.opacity=String(relocated?ease(clamp((t-.79)/.21)):1-ease(clamp((t-.04)/.31)));scene.dataset.motionFlux=t<.34?'dissolving':t<.78?'ether':'reforming';
   if(t>.16&&t<.88){for(let ribbon=0;ribbon<5;ribbon++){ctx.globalAlpha=.16*Math.sin((t-.16)/.72*Math.PI);ctx.lineWidth=ribbon%2?.65:1.2;ctx.strokeStyle=ribbon%2?'#f2e6d5':'#acd5e4';ctx.beginPath();for(let j=0;j<=20;j++){const progress=clamp((t-.12)/.72+(j/20-.5)*.22),bend=Math.sin(progress*Math.PI),x=start.left+start.width/2+dx*progress+Math.sin(progress*8+ribbon)*35*bend,y=start.top+start.height/2+dy*progress-(80+ribbon*9)*bend;ctx[j?'lineTo':'moveTo'](x,y);}ctx.stroke();}}
   for(const [i,p] of particles.entries()){
    const travel=ease(clamp((t-p.delay)/(.82-p.delay))),sx=start.left+p.u*start.width,sy=start.top+p.v*start.height,ex=end.left+p.u*end.width,ey=end.top+p.v*end.height,bend=Math.sin(travel*Math.PI),x=sx+(ex-sx)*travel+p.curve*bend,y=sy+(ey-sy)*travel-75*bend;
    const alpha=(1-ease(clamp((t-.85)/.15)))*(.24+Math.sin(Math.PI*clamp((t-p.delay)*2))*.6),size=(1-travel)*1.3+.5+(i%3)*.18;
    ctx.globalAlpha=Math.max(0,alpha);ctx.fillStyle=travel>.12&&travel<.9?(i%3?'#add9e4':'#fff0d4'):p.color;ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();if(i%13===0){ctx.strokeStyle='#b5e8ef';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();}
   }
   ctx.globalAlpha=1;
  });}finally{canvas.remove();}frame.style.transform=final;frame.style.opacity='1';scene.dataset.motionFlux='settled';
 }
 async function chainArrival(scene,frame,start,end,signal,context,muted,reduced){
  const dx=end.left+end.width/2-start.left-start.width/2,dy=end.top+end.height/2-start.top-start.height/2,sx=end.width/start.width,sy=end.height/start.height;
  if(reduced){frame.style.transform='translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')';await wait(160,signal);return;}
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('intro-chain');svg.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight);svg.setAttribute('aria-hidden','true');scene.append(svg);
  const links=Array.from({length:75},(_,i)=>{const link=document.createElementNS(ns,'ellipse');link.setAttribute('rx',i%2?5:8);link.setAttribute('ry',i%2?3.5:4);link.setAttribute('fill','#171d21');link.setAttribute('stroke',i%2?'#71838b':'#c7d0cc');link.setAttribute('stroke-width',i%2?'2.2':'2.5');svg.append(link);return link;});
  const hook=document.createElementNS(ns,'path');hook.setAttribute('d','M-10 -12 L8 -12 L14 -5 L9 4 L4 4 L7 -3 L2 -6 L-3 -3 L-3 9 L-8 13 L-13 8 L-10 4 Z');hook.setAttribute('fill','#b6c3c4');hook.setAttribute('stroke','#263238');hook.setAttribute('stroke-width','2');svg.append(hook);
  const origin={x:start.left+start.width*.66,y:start.top+start.height*.75},target={x:end.left+end.width*.6,y:end.top+end.height*.64};let hit=false;chainSound(context,muted,false,origin,target);scene.dataset.motionDom='casting';
  try{await frameMotion(1500,signal,t=>{
   const launch=ease(clamp(t/.28)),pull=Math.pow(clamp((t-.34)/.52),1.65),fade=1-clamp((t-.9)/.1),scaleX=1+(sx-1)*pull,scaleY=1+(sy-1)*pull;
   frame.style.transform='translate('+dx*pull+'px,'+dy*pull+'px) scale('+scaleX+','+scaleY+')';
   const a={x:origin.x+dx*pull+(start.width*.16)*(scaleX-1),y:origin.y+dy*pull+(start.height*.25)*(scaleY-1)},b={x:origin.x+(target.x-origin.x)*launch,y:origin.y+(target.y-origin.y)*launch},length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.min(75,Math.ceil(length/11));
   for(let i=0;i<links.length;i++){const link=links[i];if(i>=count){link.style.opacity='0';continue;}const u=i/Math.max(1,count-1),sag=Math.sin(u*Math.PI)*(1-pull)*(t<.3?22:8),x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u+sag,angle=Math.atan2(b.y-a.y+Math.cos(u*Math.PI)*(1-pull)*20,b.x-a.x)*180/Math.PI;link.setAttribute('transform','translate('+x+' '+y+') rotate('+angle+')');link.style.opacity=String(fade);}
   hook.setAttribute('transform','translate('+b.x+' '+b.y+') rotate('+(Math.atan2(b.y-origin.y,b.x-origin.x)*180/Math.PI+90)+')');hook.style.opacity=String(fade);
   if(!hit&&t>=.29){hit=true;chainSound(context,muted,true,target,target);const ring=element('i','intro-chain-anchor');ring.style.left=target.x+'px';ring.style.top=target.y+'px';scene.append(ring);ring.animate([{opacity:1,transform:'translate(-50%,-50%) scale(.3)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.6)'}],{duration:450,fill:'both'});}
   scene.dataset.motionDom=t<.3?'casting':t<.86?'pulling':'settled';
  });}finally{svg.remove();}
 }
 async function forgeArrival(scene,frame,start,end,signal,context,muted,reduced,side='self'){
  const dx=end.left+end.width/2-start.left-start.width/2,dy=end.top+end.height/2-start.top-start.height/2,sx=end.width/start.width,sy=end.height/start.height,final='translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')';
  if(reduced){frame.style.transform=final;impact(scene,{x:end.left+end.width/2,y:end.top+end.height*.8},context,muted,true);await wait(160,signal);return;}
  const distance=Math.hypot(dx,dy)||1,ux=dx/distance,uy=dy/distance;
  // Hit the trailing edge: the face of the hammer drives Lyrik towards his actual home.
  const point={x:start.left+start.width/2-ux*start.width*.34,y:start.top+start.height/2-uy*start.height*.34};
  const model=root.RunaForgeHammer3D?.create(scene,{...point,side,kind:'arrival',direction:{x:dx,y:dy}});
  const hammer=element('div','intro-forge-hammer');hammer.style.left=(point.x-80)+'px';hammer.style.top=(point.y-67.2)+'px';if(!model)hammer.innerHTML=root.RunaForgeHammerArt();scene.append(hammer);
  const strike=root.RunaForgeHammerStrike(),hammerDuration=920,arrivalDuration=1320;
  // Both the strike and the portrait use this one clock; sound has no separate timer.
  const hammerMotion=hammer.animate(model?[{opacity:0},{opacity:0}]:strike.frames,{duration:hammerDuration,easing:'linear',fill:'forwards'});hammerMotion.pause();
  const heat=hammer.querySelector('.forge-art-heat'),trail=element('div','intro-forge-trail');scene.append(trail);
  const coals=Array.from({length:28},()=>{const node=element('i','intro-forge-coal');scene.append(node);return node;});
  let struck=false,landed=false;frame.classList.add('forging-hot');scene.dataset.motionForge='hammer';
  try{await frameMotion(arrivalDuration,signal,t=>{
   const ms=t*arrivalDuration;hammerMotion.currentTime=Math.min(hammerDuration,ms);model?.draw(Math.min(1,ms/hammerDuration));
   if(!struck&&ms>=hammerDuration*strike.impact){struck=true;scene.dataset.motionForge='driven';impact(scene,point,context,muted,false);}
   const afterHit=Math.max(0,ms-hammerDuration*strike.impact);if(heat)heat.style.opacity=String(struck?Math.max(0,1-afterHit/130):0);
   if(ms>=hammerDuration*strike.vanished)hammer.style.visibility='hidden';
   const launch=hammerDuration*strike.impact;const p=clamp((ms-launch)/300),travel=1-Math.pow(1-p,2.7),scaleX=1+(sx-1)*travel,scaleY=1+(sy-1)*travel;
   const compression=Math.sin(Math.PI*clamp(afterHit/95))*(struck&&p<.2?.16:0),bounce=landed?Math.sin((ms-launch-300)/32)*Math.exp(-(ms-launch-300)/85)*5:0;
   // Compress along the launch vector, then reverberate along that same vector at landing.
   const a=scaleX*(1-compression*ux*ux+compression*.5*uy*uy),b=scaleX*(-1.5*compression*ux*uy),c=scaleY*(-1.5*compression*ux*uy),d=scaleY*(1-compression*uy*uy+compression*.5*ux*ux);
   frame.style.transform='matrix('+a+','+b+','+c+','+d+','+(dx*travel+ux*bounce)+','+(dy*travel+uy*bounce)+')';
   if(!landed)frame.style.filter='brightness('+(1+travel*1.7)+') sepia('+(travel*.75)+') drop-shadow(0 0 '+(12+travel*19)+'px #ffae38)';
   const x=start.left+start.width/2+dx*travel,y=start.top+start.height/2+dy*travel;
   trail.style.left=(x-start.width*scaleX*.7)+'px';trail.style.top=(y-start.height*scaleY*.55)+'px';trail.style.width=(start.width*scaleX*1.4)+'px';trail.style.height=(start.height*scaleY*1.1)+'px';trail.style.opacity=String(p>0&&p<1?.85:0);
   for(const [i,coal] of coals.entries()){
    const tail=clamp(travel-(i%7)*.016),sway=Math.sin(i*2.39996),radius=(12+i%5*6)*Math.sin(p*Math.PI);
    coal.style.left=(start.left+start.width/2+dx*tail+sway*radius)+'px';coal.style.top=(start.top+start.height/2+dy*tail+Math.cos(i*2.39996)*radius)+'px';coal.style.opacity=String(p>0&&p<1?.35+i%4*.15:0);
   }
   if(!landed&&p>=1){landed=true;scene.dataset.motionForge='incandescent';frame.style.filter='';forgeSeat(scene,end,frame,context,muted);impact(scene,{x:end.left+end.width/2,y:end.top+end.height*.7},null,true,false);}
  });frame.style.transform=final;scene.dataset.motionForge='settled';
  }finally{model?.destroy();hammerMotion.cancel();hammer.remove();trail.remove();coals.forEach(c=>c.remove());frame.classList.remove('forging-hot');}
 }
 async function play(options){
  cancel();const controller=new AbortController(),signal=controller.signal,record={controller,audioNodes:new Set()};active=record;
  const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
  const base=options.base||'/runamarca/',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,previousFocus=document.activeElement;
  let scene=null,source=null,context=null,muted=false;
  const stopVoice=()=>{if(source){try{source.stop();}catch{}source.disconnect();source=null;}};
  signal.addEventListener('abort',stopVoice);
  document.body.classList.add('patron-intro-active');
  try{
   let data;try{data=await bounded(manifest(base),4000,signal);}catch{data=null;}if(signal.aborted)return;
   const players=options.players.slice(0,2),firstId=options.firstId||players[0]?.id;if(players.length!==2)return;
   const dialogue=data?selectDialogue(data,players,firstId,options):null;
   scene=element('section','patron-intro-scene');scene.setAttribute('role','dialog');scene.setAttribute('aria-modal','true');scene.setAttribute('aria-label','Apresentação dos Patronos');scene.dataset.phase='arrival';
   const veil=element('div','intro-veil'),crest=element('div','intro-crossing','◈');crest.setAttribute('aria-hidden','true');scene.append(veil,crest);
   const heading=element('p','intro-heading','DOIS PATRONOS · UM CONFRONTO');scene.append(heading);
   const caption=element('div','intro-caption');caption.hidden=!dialogue||Boolean(options.arrivalOnly);caption.setAttribute('aria-live','polite');const speaker=element('strong'),words=element('p');caption.append(speaker,words);scene.append(caption);
   const controls=element('div','intro-controls'),sound=element('button','','Som ligado'),skip=element('button','','Pular introdução');sound.type=skip.type='button';sound.setAttribute('aria-pressed','true');controls.append(sound,skip);scene.append(controls);
   const escape=e=>{if(e.key==='Escape')abort();if(e.key==='Tab'){const first=controls.firstElementChild,last=controls.lastElementChild;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};scene.addEventListener('keydown',escape);
   document.body.append(scene);skip.focus({preventScroll:true});skip.onclick=abort;
   try{context=options.getAudioContext?.()||ownAudio||(ownAudio=new (root.AudioContext||root.webkitAudioContext)());void context.resume().catch(()=>{});void root.RunaSfx?.preload(context);}catch{}
   sound.onclick=()=>{if(context?.state!=='running'){void context?.resume().catch(()=>{});muted=false;}else{muted=!muted;if(muted){stopVoice();stopEffects();}}sound.textContent=muted?'Som desligado':'Som ligado';sound.setAttribute('aria-pressed',String(!muted));};
   if(context?.state!=='running')sound.textContent='Ativar som';
   const portraits=new Map(),identities=new Map(),flightNodes=new Map();
   const self=players.find(p=>p.id===options.selfId)||players[0];
   for(const player of players){
    const home=options.getHome?.(player.id),homeRect=home?.getBoundingClientRect();if(homeRect?.width&&homeRect?.height){const socket=element('div','patron-socket intro-home-socket');socket.setAttribute('aria-hidden','true');Object.assign(socket.style,{left:(homeRect.left-6)+'px',top:(homeRect.top-6)+'px',width:(homeRect.width+12)+'px',height:(homeRect.height+12)+'px'});socket.dataset.player=player.id;scene.append(socket);}
    const char=characterByEnergy[player.patron.affinity],identity=data?.characters[char]||{name:player.patron.name};identities.set(player.id,identity);
    const container=element('div','intro-patron '+player.patron.affinity+(player.id===self.id?' intro-ally':' intro-rival'));container.dataset.player=player.id;
    const frame=element('div','intro-patron-frame'),portrait=element('img','intro-patron-art');portrait.src=new URL(player.patron.image||identity.image||'card-back.png',new URL(base,location.href)).href;portrait.alt=identity.name;
    frame.append(portrait,element('i','intro-frame-inlay'),element('span','intro-patron-sigil',player.patron.affinity==='forja'?'✦':player.patron.affinity==='ruptura'?'◆':'◇'));container.append(frame,element('strong','intro-patron-name',identity.name));scene.append(container);portraits.set(player.id,container);flightNodes.set(player.id,frame);
    if(!reduced)container.animate([{opacity:0,transform:'translateY(-25px) scale(.78)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:650,easing:'cubic-bezier(.17,.8,.22,1)'});
   }
   const loadClip=line=>{const key=base+line.audio;if(!line.audio||!context)return Promise.resolve(null);if(!buffers.has(key))buffers.set(key,fetch(key).then(r=>{if(!r.ok)throw Error('Áudio indisponível');return r.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).catch(()=>{buffers.delete(key);return null;}));return buffers.get(key);};
   for(const line of dialogue?.lines||[])void loadClip(line);
   await wait(reduced?100:700,signal);scene.dataset.phase='dialogue';
   for(const [index,line] of (options.arrivalOnly?[]:dialogue?.lines||[]).entries()){
    if(signal.aborted)break;stopVoice();const actor=actorForLine(line,players,firstId),identity=identities.get(actor?.id);
    scene.dataset.line=String(index+1);scene.dataset.speaker=line.speaker;portraits.forEach((node,id)=>node.classList.toggle('speaking',id===actor?.id));speaker.textContent=identity?.name||line.speaker;words.textContent=line.text;options.onLine?.(line,index);
    let buffer=null;if(!muted)buffer=await bounded(loadClip(line),4000,signal);if(signal.aborted)break;
    if(buffer&&!muted&&context?.state==='running'){
     sound.textContent='Som ligado';source=context.createBufferSource();source.buffer=buffer;const gain=context.createGain();gain.gain.value=.9;source.connect(gain).connect(context.destination);
     const ended=new Promise(resolve=>{source.onended=()=>{gain.disconnect();resolve();};});source.start();scene.dataset.audio='playing';await bounded(ended,buffer.duration*1000+1800,signal);stopVoice();
    }else{scene.dataset.audio=muted?'muted':'unavailable';await wait(Math.min(8000,Math.max(2200,(line.durationSeconds||3.5)*1000)),signal);}
    if(!signal.aborted)await wait(220,signal);
   }
   if(signal.aborted)return;scene.dataset.phase='settling';caption.style.opacity='0';heading.style.opacity='0';crest.style.opacity='0';portraits.forEach(n=>n.classList.remove('speaking'));
   await Promise.all(players.map(async player=>{
    const container=portraits.get(player.id),frame=flightNodes.get(player.id),home=options.getHome?.(player.id),start=frame.getBoundingClientRect(),end=home?.getBoundingClientRect();if(!end?.width||!end?.height){await wait(300,signal);return;}
    container.querySelector('.intro-patron-name').style.opacity='0';const arrival=player.patron.affinity==='forja'?forgeArrival:player.patron.affinity==='fluxo'?fluxArrival:chainArrival;
    await arrival(scene,frame,start,end,signal,context,muted,reduced,player.id===options.selfId?'self':'opponent');
   }));
   if(!signal.aborted)await wait(reduced?100:1050,signal);record.completed=!signal.aborted;
  }finally{
   controller.abort();stopVoice();scene?.getAnimations({subtree:true}).forEach(a=>a.cancel());scene?.remove();options.signal?.removeEventListener('abort',abort);signal.removeEventListener('abort',stopVoice);
   if(active===record){active=null;document.body.classList.remove('patron-intro-active');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  }
 }
 root.RunaPatronIntro={play,cancel,manifest,selectDialogue,actorForLine};
})(globalThis);
