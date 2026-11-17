/* Match opening is purely presentation: no game commands and no timers on the server. */
(function(root){
 'use strict';const W=1600,H=1000,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},out=x=>1-(1-clamp(x))**3;
 let active=null,ownAudio=null;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text)e.textContent=text;return e;};
 const portraitFor=energy=>({forja:'patrons/bigorna-desperta-nova.png',fluxo:'patrons/olho-dos-pactos-novo.png',ruptura:'patrons/dom-maioral.png'})[energy]||'card-back.png';
 // One short-lived canvas and pre-rendered mist sprites; no live blur filters per particle.
 function evaporation(scene,capture){
  const ghosts=node('div','contract-deck-ghosts'),orbit=node('div','contract-orbit'),canvas=node('canvas','contract-evaporation');
  ghosts.setAttribute('aria-hidden','true');ghosts.inert=true;canvas.setAttribute('aria-hidden','true');ghosts.append(orbit);scene.append(ghosts,canvas);
  const frame=capture?.orbit,items=capture?.items||[],ctx=canvas.getContext('2d'),dpr=Math.min(devicePixelRatio||1,1.25),width=innerWidth,height=innerHeight;
  canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);
  if(frame)Object.assign(orbit.style,{left:frame.left+'px',top:frame.top+'px',width:frame.width+'px',height:frame.height+'px',perspective:frame.perspective});
  function sprite(chosen){const s=document.createElement('canvas');s.width=s.height=96;const c=s.getContext('2d'),g=c.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,chosen?'#9ce7ffd9':'#ffad99d9');g.addColorStop(.22,chosen?'#369ee897':'#d93c4697');g.addColorStop(.58,chosen?'#236a8e48':'#8a172b48');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(0,0,96,96);return s;}
  const blue=sprite(true),red=sprite(false),seed=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  for(const [index,item] of items.entries()){
   orbit.append(item.copy);item.top=item.copy.querySelector('.contract-pack-top');item.start=item.chosen?100:30;item.duration=item.chosen?1050:900;item.sprite=item.chosen?blue:red;item.mistGain=!item.chosen&&Number(item.copy.style.zIndex)<20?.3:1;
   item.particles=Array.from({length:100},(_,i)=>{const n=i+index*173;return {birth:item.start+seed(n+1)*item.duration,u:seed(n+5),life:340+seed(n+13)*260,size:13+seed(n+23)*25,drift:(seed(n+37)-.5)*58,rise:28+seed(n+59)*62,phase:seed(n+61)*6.28};});
  }
  return {paint(ms){
   ghosts.hidden=canvas.hidden=ms>=1750;if(ms>=1750)return;ctx?.clearRect(0,0,width,height);
   for(const item of items){
    const p=clamp((ms-item.start)/item.duration),cut=p*112;item.copy.style.setProperty('--evaporate-clear',(cut-12)+'%');item.copy.style.setProperty('--evaporate-solid',cut+'%');item.copy.style.visibility=p>=1?'hidden':'visible';if(item.top)item.top.style.visibility=p>0?'hidden':'visible';
    if(!ctx)continue;const r=item.rect;
    for(const particle of item.particles){const age=ms-particle.birth;if(age<0||age>=particle.life)continue;const t=age/particle.life,v=(particle.birth-item.start)/item.duration;const x=r.left+particle.u*r.width+particle.drift*t+Math.sin(t*5+particle.phase)*7*t,y=r.top+v*r.height-particle.rise*t,size=particle.size*(.7+t*1.3);ctx.globalAlpha=Math.sin(Math.PI*t)*.5*item.mistGain;ctx.drawImage(item.sprite,x-size*1.25,y-size*.6,size*2.5,size*1.2);
     if(particle.u>.55&&t<.7){ctx.globalAlpha=(1-t/.7)*.8*item.mistGain;ctx.fillStyle=item.chosen?'#b9f2ff':'#ffc2af';ctx.fillRect(x,y,1.4,2.4);}
    }
   }if(ctx)ctx.globalAlpha=1;
  }};
 }
 function paper(players,base){const sheet=node('article','contract-paper');const crest=node('span','contract-crest');crest.innerHTML='<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 2 26 14 38 20 26 26 20 38 14 26 2 20 14 14Z"/><path d="M5 20Q20 3 35 20Q20 37 5 20Z"/><path d="M20 10v20"/></svg>';sheet.append(crest,node('h2','','CONTRATO DE CAÇADA'),node('p','contract-subtitle','Duas marcas. Um destino a ser escrito.'));const parties=node('div','contract-parties');players.slice(0,2).forEach((p,i)=>{if(i)parties.append(node('span','contract-versus','×'));const party=node('div','contract-party'),frame=node('div','contract-portrait'),img=node('img');img.src=new URL(p.patron?.image||portraitFor(p.patron?.affinity),new URL(base,location.href)).href;img.alt='';frame.append(img);party.append(frame,node('strong','',p.patron?.name||'Patrono'),node('span','',p.name||''));parties.append(party);});sheet.append(parties);const signature=node('div','contract-signature');signature.append(node('span','','REGISTRADO EM ELYSIUM'),node('span','contract-wax','◈'),node('span','','ACEITO À MESA'));sheet.append(signature);return sheet;}
 function sound(ctx,kind,record){if(record.muted||ctx?.state!=='running')return;root.RunaSfx?.play(ctx,'contract_'+kind,{track:source=>record.sounds.add(source)});}
 function phaseAt(ms){return ms<900?'decks':ms<1600?'focus':ms<2300?'contract':ms<2630?'throw':ms<3370?'impact':ms<4100?'tear':'reveal';}
 function poseAt(ms){const t=clamp((ms-2300)/330),impact=ms>=2630,after=(ms-2630)/1000;return {tipX:800+(1-t)*830,tipY:278-(1-t)*500-100*Math.sin(t*Math.PI),angles:[.62+(1-t)*.48+(impact?Math.sin(after*39)*Math.exp(-after*8)*.075:0),.22+(1-t)*1.1,-.68-(1-t)*.72+(impact?Math.sin(after*47)*Math.exp(-after*7)*.055:0)],scale:68+(1-t)*43,opacity:smooth((ms-2280)/90)*(1-smooth((ms-4150)/450))};}
 function cancel(){active?.controller.abort();}
 async function play(options={}){
  cancel();const controller=new AbortController(),record={controller,sounds:new Set(),muted:false};active=record;const signal=controller.signal,abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
  const reduced=options.reducedMotion??matchMedia('(prefers-reduced-motion: reduce)').matches,base=options.base||'/runamarca/',players=options.players||[],previousFocus=document.activeElement;
  const heldFrame=Number.isFinite(options.previewFrameMs)?Math.max(0,Math.min(5099,options.previewFrameMs)):null;if(heldFrame!==null)record.muted=true;
  const scene=node('section','contract-opening-scene'),world=node('div','contract-world'),back=node('div','contract-backdrop'),heading=node('p','contract-heading','O CONTRATO ESTÁ FEITO'),host=node('div','contract-paper-host'),tear=node('div','contract-tear');
  scene.setAttribute('role','dialog');scene.setAttribute('aria-modal','true');scene.setAttribute('aria-label','Contrato de caçada');scene.dataset.phase='decks';
  const left=node('div','contract-paper-half is-left'),right=node('div','contract-paper-half is-right'),sheet=paper(players,base),intact=sheet.cloneNode(true);right.setAttribute('aria-hidden','true');intact.setAttribute('aria-hidden','true');left.append(sheet);right.append(sheet.cloneNode(true));host.append(left,right,intact,tear);
  const shadow=node('div','contract-dagger-shadow'),hole=node('div','contract-impact-hole'),dust=node('canvas','contract-dust');dust.width=W;dust.height=H;const ink=dust.getContext('2d');
  world.append(back,node('div','contract-vignette'),heading,host,shadow,hole,dust);scene.append(world);
  const controls=node('div','contract-opening-controls'),mute=node('button','',record.muted?'Som desligado':'Som ligado'),skip=node('button','','Pular abertura');mute.type=skip.type='button';mute.setAttribute('aria-pressed',String(!record.muted));controls.append(mute,skip);scene.append(controls);
  const evaporate=evaporation(scene,options.capture);
  document.body.classList.add('contract-opening-active');document.body.append(scene);const dagger=root.RunaContractDagger?.create(world);let raf=0,resolvePlay,finished=false,revealed=false,started=performance.now();
  const resize=()=>{const scale=Math.min(Math.max(innerWidth/W,innerHeight/H),innerWidth/920);world.style.transform=`translate(-50%,-50%) scale(${scale})`;};resize();root.addEventListener('resize',resize);
  let ctx;try{ctx=options.getAudioContext?.()||ownAudio||(ownAudio=new(root.AudioContext||root.webkitAudioContext)());void ctx.resume().catch(()=>{});}catch{}
  const stopSounds=()=>{for(const s of record.sounds){if(!root.RunaSfx?.release(s))try{s.stop();}catch{}}record.sounds.clear();};
  mute.onclick=()=>{record.muted=!record.muted;if(record.muted)stopSounds();else void ctx?.resume().catch(()=>{});mute.textContent=record.muted?'Som desligado':'Som ligado';mute.setAttribute('aria-pressed',String(!record.muted));};skip.onclick=abort;skip.focus({preventScroll:true});
  scene.addEventListener('keydown',e=>{if(e.key==='Escape')abort();if(e.key==='Tab'){if(e.shiftKey&&document.activeElement===mute){e.preventDefault();skip.focus();}else if(!e.shiftKey&&document.activeElement===skip){e.preventDefault();mute.focus();}}});
  const fired=new Set();function cue(at,name,ms){if(ms>=at&&!fired.has(name)){fired.add(name);sound(ctx,name,record);}}
  function reveal(){if(revealed)return;revealed=true;try{options.onReveal?.();}catch(e){console.error('Abertura da mesa:',e);}}
  function paint(ms){
   scene.dataset.phase=phaseAt(ms);const focus=smooth((ms-350)/1050),arrival=out((ms-1350)/670),rip=smooth((ms-3370)/720),exit=smooth((ms-4100)/950),impactAge=Math.max(0,(ms-2630)/1000),shake=ms>=2630&&ms<3010?Math.sin(impactAge*60)*Math.exp(-impactAge*12)*5:0;
   if(reduced){evaporate.paint(1750);left.style.visibility=right.style.visibility='hidden';heading.style.opacity='1';host.style.opacity=String(smooth(ms/140)*(1-smooth((ms-650)/250)));host.style.transform='none';back.style.filter='none';shadow.style.opacity='0';hole.style.opacity='0';dagger?.draw({...poseAt(2800),opacity:0});scene.style.opacity=String(1-smooth((ms-650)/250));if(ms>=650)reveal();return;}
   back.style.filter=`blur(${13*(1-focus)}px) brightness(${.43+.57*focus})`;back.style.transform=`translate(${shake}px,${-shake*.5}px) scale(${1.045+exit*.15})`;back.style.opacity=String(1-exit);
   heading.style.opacity=String(smooth((ms-900)/400)*(1-smooth((ms-3200)/400)));
   host.style.opacity=String(arrival*(1-exit));host.style.transform=`translate3d(${(1-arrival)*32+shake}px,${(1-arrival)*-155}px,${exit*200}px) rotateX(${(1-arrival)*-38}deg) rotateZ(${(1-arrival)*-5+shake*.06}deg) scale(${.88+.12*arrival})`;
   intact.style.visibility=ms<3370?'visible':'hidden';left.style.visibility=right.style.visibility=ms<3370?'hidden':'visible';
   const tension=ms>=2630?Math.sin(impactAge*30)*Math.exp(-impactAge*6)*1.4:0;left.style.transform=`translate3d(${-rip*200-exit*620}px,${rip*35+exit*140}px,${rip*80}px) rotateY(${-rip*36}deg) rotateZ(${-rip*11+tension}deg)`;right.style.transform=`translate3d(${rip*200+exit*620}px,${rip*35+exit*140}px,${rip*100}px) rotateY(${rip*36}deg) rotateZ(${rip*11+tension}deg)`;left.style.opacity=right.style.opacity=String(1-exit);
   // The cut belongs to the paper: it must disappear as the two halves part.
   tear.style.opacity=ms>=3370?String(1-smooth((ms-3430)/210)):'0';tear.style.transform=`scaleY(${smooth((ms-3370)/190)})`;tear.style.visibility=ms>=3640?'hidden':'visible';
   const pose=poseAt(ms);dagger?.draw(pose);hole.style.opacity=String(ms>=2630?1-exit:0);shadow.style.opacity=String(ms>=2300?smooth((ms-2300)/330)*.65*(1-exit):0);shadow.style.transform=`rotate(-35deg) scale(${ms<2630?1.7-smooth((ms-2300)/330)*.7:1})`;
   evaporate.paint(ms);
   ink.clearRect(0,0,W,H);if(ms>=2630&&impactAge<1.2){for(let i=0;i<34;i++){const a=i*2.399,r=40+(i%8)*13,t=impactAge;ink.globalAlpha=(1-clamp(t/1.2))*.65;ink.fillStyle=i%3?'#b99a65':'#eed6a0';const x=800+Math.cos(a)*r*t,y=278+Math.sin(a)*r*t+170*t*t;ink.save();ink.translate(x,y);ink.rotate(a+t);ink.fillRect(0,0,2+i%4,1.5);ink.restore();}}ink.globalAlpha=1;
   cue(60,'depart',ms);cue(1450,'paper',ms);cue(2300,'throw',ms);cue(2630,'impact',ms);cue(3370,'tear',ms);
   controls.style.opacity=String(1-exit);if(ms>=4100)reveal();if(exit>0)scene.style.pointerEvents='none';
  }
  function cleanup(){if(finished)return;finished=true;cancelAnimationFrame(raf);if(signal.aborted)stopSounds();dagger?.destroy();root.removeEventListener('resize',resize);options.signal?.removeEventListener('abort',abort);signal.removeEventListener('abort',cleanup);scene.remove();document.body.classList.remove('contract-opening-active');if(active===record)active=null;if(previousFocus?.isConnected&&!document.querySelector('.patron-intro-scene'))previousFocus.focus?.({preventScroll:true});resolvePlay?.();}
  return new Promise(resolve=>{resolvePlay=resolve;signal.addEventListener('abort',cleanup,{once:true});if(signal.aborted){cleanup();return;}if(heldFrame!==null){paint(heldFrame);return;}const duration=reduced?900:5100;function frame(now){if(signal.aborted)return;const elapsed=now-started;paint(Math.min(duration,elapsed));if(elapsed>=duration){reveal();cleanup();}else raf=requestAnimationFrame(frame);}paint(0);raf=requestAnimationFrame(frame);});
 }
 root.RunaContractOpening={play,cancel,phaseAt,poseAt};
})(globalThis);
