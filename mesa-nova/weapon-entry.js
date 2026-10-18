/* Presentation only: no room actions, targeting rules or combat mutations. */
(function(root){
 'use strict';const scenes=new Set(),clamp=t=>Math.max(0,Math.min(1,t));
 function clear(){for(const scene of [...scenes])scene.cancel();}
 async function play({weapon,from,to,context=null,keepAtTarget=true,onArrive=()=>{},onInspect=null}={}){
  const a=from?.getBoundingClientRect(),b=to?.getBoundingClientRect();if(!a?.width||!b?.width)return;
  const kind=root.RunaWeaponPresentation.kindFor(weapon),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?850:kind==='dagger'?2500:kind==='hammer'?3300:3500,land=reduced?.22:kind==='dagger'?.32:kind==='hammer'?.34:.36,depart=land+(reduced?.07:.10),arrive=reduced?.7:kind==='dagger'?.68:kind==='hammer'?.78:.80;
  const layer=document.createElement('div');layer.className='weapon-entry-scene wa-'+kind;layer.setAttribute('aria-hidden','true');layer.dataset.phase='launch';document.body.append(layer);
  const ax=a.left+a.width/2,ay=a.top+a.height/2,bx=b.left+b.width/2,by=b.top+b.height/2,dir=by<ay?1:-1,travel=Math.hypot(bx-ax,by-ay),weaponW=Math.min(130,Math.max(65,b.width*.42)),weaponH=weaponW*2;
  let raf=0,cancelled=false,finished=false,originalVisibility=from.style.visibility;const audio=[],outsideAnimations=[];
  const record={cancel(){cancelled=true;cancelAnimationFrame(raf);if(!finished)for(const source of audio)if(!root.RunaSfx?.release(source))try{source.stop();}catch{}outsideAnimations.forEach(n=>n.cancel());layer.getAnimations({subtree:true}).forEach(n=>n.cancel());layer.remove();from.style.visibility=originalVisibility;scenes.delete(record);}};scenes.add(record);
  const node=(tag,cls,x,y)=>{const n=document.createElement(tag);n.className=cls;n.style.left=x+'px';n.style.top=y+'px';layer.append(n);return n;};
  const animate=(n,frames,start=0,length=1,extra={})=>n.animate(frames,{duration:duration*length,delay:duration*start,easing:'linear',fill:'both',...extra});
  const sound=(name)=>root.RunaTableAudio?.effect(context,name,{track:s=>audio.push(s),from:name.endsWith("launch")?from:to,to:to,travelSeconds:name.endsWith("launch")?.7:.04});
  const floor=node('div','wa-ground',bx,by+Math.min(40,b.height*.32));floor.innerHTML='<svg viewBox="0 0 200 120"><ellipse cx="100" cy="60" rx="86" ry="42"/><ellipse cx="100" cy="60" rx="71" ry="34"/><path d="M100 10l12 30 47-5-28 24 27 28-47-7-11 30-12-30-47 5 28-24-27-28 47 7Z"/></svg>';floor.style.width=Math.min(b.width*.85,240)+'px';
  animate(floor,[{opacity:0,transform:'translate(-50%,-50%) scale(.25)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.12},{opacity:.65,offset:.6},{opacity:0,transform:'translate(-50%,-50%) scale(1.08)'}],land,1-land);
  if(kind==='hammer')animate(floor,[{color:'#ff5933'},{color:'#ffae6a',offset:.22},{color:'#9d5140',offset:.65},{color:'#453630'}],land,1-land);
  const shadow=node('i','wa-weapon-shadow',bx,by+Math.min(40,b.height*.32));animate(shadow,[{opacity:0,transform:'translate(-50%,-50%) scale(2.5)'},{opacity:.55,transform:'translate(-50%,-50%) scale(.7)',offset:land},{opacity:.25,offset:arrive},{opacity:0}]);
  const contactRatio=kind==='hammer'?.9:.965,weaponTop=by+40-weaponH*contactRatio;
  const sprite=node('div','wa-thrown-weapon',bx,weaponTop);sprite.innerHTML=root.RunaWeaponPresentation.art(kind);sprite.style.width=weaponW+'px';sprite.style.height=weaponH+'px';
  const dx=ax-bx,dy=ay-(weaponTop+weaponH/2),lift=reduced?0:Math.min(170,travel*.32),spin=kind==='dagger'?540:kind==='hammer'?-65:20;
  const travelFrames=Array.from({length:13},(_,i)=>{const t=i/12,u=kind==='hammer'?t*t:t,scale=.35+.65*u+Math.sin(Math.PI*u)*.42;return {opacity:Math.min(1,t*5),transform:`translate(calc(-50% + ${dx*(1-u)}px),${dy*(1-u)-4*lift*u*(1-u)}px) rotate(${spin*(1-u)}deg) scale(${scale})`,offset:land*t};});
  travelFrames.push({opacity:1,transform:'translate(-50%,0) rotate(-3deg) scale(1)',offset:land+.05},{opacity:1,transform:'translate(-50%,0) rotate(0deg) scale(1)',offset:arrive-.04},{opacity:0,transform:'translate(-18%,28px) rotate(-28deg) scale(.32)',offset:Math.min(.97,arrive+.15)},{opacity:0,transform:'translate(-18%,28px) rotate(-28deg) scale(.32)',offset:1});
  if(reduced)for(const f of travelFrames)f.transform='translate(-50%,0) scale(1)';
  const clock=animate(sprite,travelFrames);
  const sweep=node('div','wa-arrival-light',bx,by);animate(sweep,[{opacity:0,transform:'translate(-50%,-50%) scale(.3)'},{opacity:kind==='sword'?.85:.6,transform:'translate(-50%,-50%) scale(1)',offset:.2},{opacity:.4,offset:.55},{opacity:0,transform:'translate(-50%,-50%) scale(1.2)'}],land,.65);
  const count=reduced?4:kind==='hammer'?24:18;
  for(let i=0;i<count;i++){const angle=i*2.399,distance=25+i%5*16,p=node('i','wa-mote',bx,by+36);p.style.setProperty('--mote-size',(i%4===0?5:2)+'px');const upward=kind==='sword'?-distance*2:Math.sin(angle)*distance+25;animate(p,[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{opacity:.85,offset:.08},{opacity:0,transform:`translate(${Math.cos(angle)*distance}px,${upward}px) scale(.2)`}],land+i*.004,.38+i%4*.045,{easing:'cubic-bezier(.12,.7,.32,1)'});}
  if(kind==='hammer'){
   const shock=node('i','wa-impact-wave',bx,by+36);animate(shock,[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{opacity:1,offset:.04},{opacity:0,transform:'translate(-50%,-50%) scale(2.5)'}],land,.25);
   for(let i=0;i<4;i++){const smoke=node('i','wa-smoke',bx+(i-1.5)*28,by+20);animate(smoke,[{opacity:0,transform:'translate(-50%,-50%) scale(.3)'},{opacity:.4,offset:.2},{opacity:0,transform:`translate(${(i-1.5)*35}px,-95px) scale(1.6)`}],land+i*.01,.42);}
  }
  const width=Math.min(a.width*1.08,b.width*.65),height=Math.min(a.height*1.05,b.height*.95),px=bx-width/2,py=by-height/2;
  const patron=node('div','wa-patron',px,py);patron.style.width=width+'px';patron.style.height=height+'px';const image=from.querySelector('img');if(image){const img=document.createElement('img');img.src=image.src;img.alt='';patron.append(img);}else patron.style.backgroundImage=getComputedStyle(from).backgroundImage;
  const badge=root.RunaWeaponPresentation.token(weapon,{onOpen:onInspect});if(!onInspect){badge.tabIndex=-1;badge.removeAttribute('role');}patron.append(badge);animate(badge,[{opacity:0,transform:'translateY(-50%) scale(.5)'},{opacity:1,transform:'translateY(-50%) scale(1)'}],arrive,.17);
  const hp=from.parentElement?.querySelector('.patron-hp-value')?.textContent||from.dataset.hp;if(hp){const n=document.createElement('b');n.className='wa-patron-health';n.textContent=hp;patron.append(n);}
  const sx=a.left-px,sy=a.top-py,base=`translate(${sx}px,${sy}px) scale(${a.width/width},${a.height/height})`;
  let frames=kind==='dagger'?[{opacity:0,transform:base},{opacity:0,transform:'translate(0,12px) scale(.95)',offset:arrive-.09},{opacity:1,transform:'translate(0,0) scale(1)',offset:arrive},{opacity:1,transform:'translate(0,0) scale(1)',offset:1}]:[{opacity:0,transform:base},...Array.from({length:13},(_,i)=>{const t=i/12,u=.5-.5*Math.cos(t*Math.PI),scaleX=a.width/width+(1-a.width/width)*u,scaleY=a.height/height+(1-a.height/height)*u;return {opacity:Math.min(1,t*12),transform:`translate(${sx*(1-u)}px,${sy*(1-u)-dir*20*Math.sin(Math.PI*u)}px) scale(${scaleX},${scaleY})`,offset:depart+(arrive-depart)*t};}),{opacity:1,transform:'translate(0,0) scale(1)',offset:1}];
  if(reduced)frames=[{opacity:0},{opacity:0,offset:arrive-.1},{opacity:1,offset:arrive},{opacity:1}];animate(patron,frames);
  if(kind==='dagger'){outsideAnimations.push(animate(from,[{opacity:1},{opacity:0}],depart-.03,.04));for(const [x,y,start]of [[ax,ay,depart-.05],[bx,by,arrive-.1]]){const mist=node('i','wa-assassin-mist',x,y);animate(mist,[{opacity:0,transform:'translate(-50%,-50%) scale(.55)'},{opacity:.85,offset:.2},{opacity:0,transform:'translate(-50%,-50%) scale(1.35)'}],start,.24);}}
  sound(kind==='hammer'?'weapon_heavy_launch':kind==='sword'?'weapon_royal_launch':'weapon_shadow_launch');let landed=false,left=false,received=false;
  function tick(){if(cancelled)return;const t=clamp(Number(clock.currentTime||0)/duration);if(!landed&&t>=land){landed=true;layer.dataset.phase='landed';sound('weapon_'+kind+'_land');if(kind==='hammer'&&!reduced)to.animate([{transform:'translate(0,0)'},{transform:'translate(2px,3px)',offset:.22},{transform:'translate(-2px,-1px)',offset:.48},{transform:'translate(0,0)'}],{duration:230});}if(!left&&t>=depart){left=true;from.style.visibility='hidden';layer.dataset.phase='patron-travel';}if(!received&&t>=arrive){received=true;layer.dataset.phase='armed';onArrive();}if(!finished)raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);
  try{await clock.finished;finished=true;cancelAnimationFrame(raf);if(!received&&!cancelled){from.style.visibility='hidden';layer.dataset.phase='armed';onArrive();}if(!keepAtTarget)record.cancel();return record;}catch{record.cancel();}
 }
 root.RunaWeaponEntry={play,clear};
})(globalThis);
