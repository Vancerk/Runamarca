/* The card is the actor. Only the server chooses positions and applies effects. */
(function(root){
 'use strict';
 const active=new Set(),seen=new Set(),pending=new Set(),TAU=Math.PI*2;
 const clamp=t=>Math.max(0,Math.min(1,t)),out=t=>1-(1-clamp(t))**3,smooth=t=>{t=clamp(t);return t*t*(3-2*t);},mix=(a,b,t)=>a+(b-a)*t,range=(t,a,b)=>clamp((t-a)/(b-a));
 const get=n=>typeof n==='function'?n():n,center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
 function profile(card){
  if(card?.type==='patron')return {forja:'forge',fluxo:'arcane',ruptura:'rupture'}[card.affinity]||'arcane';
  const ops=new Set((card?.effects||[]).map(e=>e.op));
  return ops.has('combat_protocol')?'protocol':ops.has('adjacent_damage')?'artillery':ops.has('paired_seals')?'seals':ops.has('force_opponent')?'hunt':null;
 }
 const palettes={protocol:['#f6c381','#e45b26','#576166'],artillery:['#d6b797','#984a2c','#383c40'],seals:['#99e9dc','#3aa99f','#caae7f'],hunt:['#d99d67','#743544','#202b32']};
 function definition(card,phase='reserve'){
  const kind=profile(card),combat=phase==='combat';
  const cues={protocol:[[.08,'entry_assembly'],[.47,'entry_lock'],[.68,'entry_lock']],artillery:[[.1,'entry_pressure'],[.34,'entry_mace'],[.63,'entry_armor']],seals:[[.1,'entry_seal_open'],[.43,'entry_seal_pass'],[.66,'entry_seal_open']],hunt:[[.1,'entry_hook'],[.42,'entry_tether'],[.7,'entry_anchor']]};
  return {kind,phase:combat?'combat':'reserve',duration:combat?2600:3400,palette:palettes[kind],cues:cues[kind]||[]};
 }
 async function texture(node){
  let timer;try{if(node.visualReady)await Promise.race([node.visualReady,new Promise(r=>timer=setTimeout(r,4000))]);}catch{}finally{clearTimeout(timer);}
  const original=node.querySelector('canvas');if(!original?.width||!original?.height)return null;
  const c=document.createElement('canvas');c.width=original.width;c.height=original.height;c.getContext('2d').drawImage(original,0,0);return c;
 }
 function clear(){for(const finish of [...active])finish(false);seen.clear();}
 async function play({card,source,phase='reserve',key,context,valid=()=>true,signal,duration,elapsedMs=0,reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches}={}){
  const spec=definition(card,phase),anchor=get(source);
  if(card?.type!=='creature'||card.rarity!=='soberano'||!spec.palette||!anchor?.getBoundingClientRect().width||!valid()||signal?.aborted||(key&&(seen.has(key)||pending.has(key))))return false;
  if(key)pending.add(key);
  const requestedAt=performance.now();let cancelled=false;const pendingClose=()=>{cancelled=true;};active.add(pendingClose);
  const image=await texture(anchor);active.delete(pendingClose);if(key)pending.delete(key);if(!image||cancelled||!valid()||signal?.aborted)return false;if(key){seen.add(key);if(seen.size>300)seen.delete(seen.values().next().value);}
  if(spec.phase==='combat')elapsedMs+=performance.now()-requestedAt;
  return new Promise(resolve=>{
   const layer=document.createElement('div'),canvas=document.createElement('canvas');layer.className='platinum-entry-scene';layer.dataset.profile=spec.kind;layer.dataset.stage=spec.phase;layer.dataset.card=card.modelId||card.id;layer.setAttribute('aria-hidden','true');layer.append(canvas);document.body.append(layer);
   const ctx=canvas.getContext('2d'),w=innerWidth,h=innerHeight,dpr=Math.min(root.devicePixelRatio||1,1.5);canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);ctx.scale(dpr,dpr);
   const length=reduced?260:Math.max(600,duration||spec.duration),start=performance.now()-Math.max(0,elapsedMs),marked=new Set(),sounds=new Set(),triggered=new Set();let raf=0,closed=false;
   function finish(completed=true){if(closed)return;closed=true;cancelAnimationFrame(raf);for(const n of marked)n.classList.remove('platinum-actor-masked');layer.remove();if(!completed)for(const sound of sounds){if(!root.RunaSfx?.release(sound,.08))try{sound.stop();}catch{}}signal?.removeEventListener('abort',abort);root.removeEventListener('resize',abort);active.delete(finish);resolve(completed);}
   const abort=()=>finish(false);active.add(finish);signal?.addEventListener('abort',abort,{once:true});root.addEventListener('resize',abort,{once:true});
   const rect=anchor.getBoundingClientRect(),end=center(rect),cw=Math.min(spec.phase==='combat'?Math.max(rect.width,Math.min(224,rect.width*1.3)):278,w*(w<600?.27:.4),h*.34),ch=cw*rect.height/rect.width;
   const focus={x:Math.max(cw*1.1,Math.min(w-cw*1.1,end.x)),y:Math.max(ch*.8,Math.min(h-ch*.85,spec.phase==='combat'?end.y:end.y-ch*.48))};
   function ellipse(x,y,rx,ry,color,alpha=1,width=2){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);ctx.stroke();ctx.restore();}
   function poly(points,fill,stroke,width=1){ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
   function metal(x,y,width,height,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);const g=ctx.createLinearGradient(-width/2,-height/2,width/2,height/2);g.addColorStop(0,'#b8b6a5');g.addColorStop(.25,'#525455');g.addColorStop(.5,'#888a80');g.addColorStop(.56,'#35393b');g.addColorStop(1,'#1c2124');poly([[-width/2,-height/2],[width*.37,-height/2],[width/2,-height*.3],[width/2,height/2],[-width*.4,height/2],[-width/2,height*.3]],g,'#b7a691',1.3);for(const sign of [-1,1]){ctx.fillStyle='#12191d';ctx.beginPath();ctx.arc(sign*width*.32,0,Math.max(1.5,Math.min(width,height)*.08),0,TAU);ctx.fill();}ctx.restore();}
   function drawCard(x,y,width,height,{angle=0,sx=1,alpha=1,clip=null,shadow=true}={}){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx,1);ctx.globalAlpha=alpha;
    if(clip){ctx.beginPath();clip.forEach(([u,v],i)=>ctx[i?'lineTo':'moveTo']((u-.5)*width,(v-.5)*height));ctx.closePath();ctx.clip();}
    if(shadow){ctx.shadowColor='#000c';ctx.shadowBlur=15;ctx.shadowOffsetY=12;}ctx.drawImage(image,-width/2,-height/2,width,height);ctx.restore();
   }
   function sparks(x,y,t,amount=22,color='#f9b46d',reach=cw){if(t<=0||t>=1)return;ctx.save();ctx.globalAlpha=(1-t)**1.3;ctx.strokeStyle=color;ctx.lineWidth=1.7;for(let i=0;i<amount;i++){const a=i*2.39996,v=reach*(.3+(i%7)/8),px=x+Math.cos(a)*v*t,py=y+Math.sin(a)*v*t*.65+70*t*t;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-Math.cos(a)*(4+8*(1-t)),py-Math.sin(a)*6);ctx.stroke();}ctx.restore();}
   function dust(x,y,t,scale=1){if(t<=0||t>=1)return;ctx.save();for(let i=0;i<16;i++){const a=i*2.4,travel=cw*(.3+(i%5)*.13)*scale*t,px=x+Math.cos(a)*travel,py=y+Math.sin(a)*travel*.25-18*t;ctx.globalAlpha=(1-t)*.18;const r=(8+t*28)*scale,g=ctx.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'#b4a18a');g.addColorStop(1,'#b4a18a00');ctx.fillStyle=g;ctx.fillRect(px-r,py-r,r*2,r*2);}ctx.restore();}
   function crack(x,y,t,size=cw){ctx.save();ctx.globalAlpha=clamp(t*5)*(1-range(t,.65,1));for(let i=0;i<9;i++){const a=i*2.399,dx=Math.cos(a)*size,dy=Math.sin(a)*size*.42;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*.3+10*Math.sin(i),y+dy*.3);ctx.lineTo(x+dx*.65,y+dy*.7+5);ctx.lineTo(x+dx*clamp(t*2),y+dy*clamp(t*2));ctx.strokeStyle='#0c0e0f';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#ad85604d';ctx.lineWidth=1;ctx.stroke();}ctx.restore();}
   function settle(t,at){const p=smooth(range(t,at,1)),r=get(source)?.getBoundingClientRect()||rect,final=center(r);return {x:mix(focus.x,final.x,p),y:mix(focus.y,final.y,p),cw:mix(cw,r.width,p),ch:mix(ch,r.height,p)};}
   function assembly(t){
    const combat=spec.phase==='combat',p=settle(t,.79),rise=out(range(t,.02,.22)),ground=focus.y+ch*.43;
    ctx.save();ctx.globalAlpha=(1-smooth(range(t,.65,.83)))*rise;
    for(const sign of [-1,1]){const x=focus.x+sign*cw*.66;metal(x,focus.y,18,ch*1.18);metal(x-sign*cw*.12,ground,cw*.38,18);for(let i=0;i<3;i++)metal(x-sign*(18+16*smooth(range(t,.2,.65))),focus.y+(i-1)*ch*.32,60,10);}ctx.restore();
    const cols=combat?2:3,rows=combat?3:4;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
     const i=row*cols+col,delay=combat?.07+(i%2)*.06:.06+((rows-1-row)*cols+col)*.024,progress=out(range(t,delay,delay+.27));
     const direction=col<cols/2?-1:1,dx=(1-progress)*direction*cw*(combat?1.55:1.1),dy=(1-progress)*(row-(rows-1)/2)*ch*.9,u=col/cols,v=row/rows;
     drawCard(p.x+dx,p.y+dy,p.cw,p.ch,{angle:(1-progress)*direction*(combat?.13:.3),alpha:clamp(progress*4),clip:[[u,v],[u+1/cols,v],[u+1/cols,v+1/rows],[u,v+1/rows]],shadow:false});
     if(t>delay+.24&&t<delay+.42)sparks(p.x+(u+.5/cols-.5)*p.cw,p.y+(v+.5/rows-.5)*p.ch,range(t,delay+.24,delay+.42),8,'#ffd08b',cw*.3);
    }
    if(t>.55&&t<.8){const pulse=range(t,.55,.8);for(const sign of [-1,1])metal(focus.x+sign*(cw*.48+(1-out(pulse))*50),focus.y,17,ch*.88);sparks(focus.x,ground,pulse,24,'#f19650');}
    if(combat){const a=range(t,.5,.85);ctx.save();ctx.globalAlpha=Math.sin(a*Math.PI)*.9;for(const sign of [-1,1]){const x=focus.x+sign*cw*.74;poly([[x,ground-35],[x+sign*32,ground-15],[x,ground+5]],'#cb5825','#ffb56d',2);}ctx.restore();}dust(focus.x,ground,range(t,.58,1),.7);
   }
   function mace(x,y,size,angle,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.shadowColor='#000b';ctx.shadowBlur=12;
    metal(0,-size*1.65,size*.22,size*2.7);for(let i=0;i<7;i++)metal(0,-size*(.8+i*.26),size*.31,size*.12);
    const g=ctx.createRadialGradient(-size*.3,-size*.35,2,0,0,size);g.addColorStop(0,'#b6a491');g.addColorStop(.32,'#726458');g.addColorStop(.75,'#3c3530');g.addColorStop(1,'#161b1e');
    poly(Array.from({length:10},(_,i)=>[Math.cos(i*TAU/10)*size,Math.sin(i*TAU/10)*size]),g,'#aa9280',2);
    for(let i=0;i<7;i++){const a=i*2.399,rad=i?size*.61:0,cx=Math.cos(a)*rad,cy=Math.sin(a)*rad,pts=Array.from({length:6},(_,j)=>[cx+Math.cos(j*TAU/6)*size*.21,cy+Math.sin(j*TAU/6)*size*.21]);poly(pts,'#554b43','#b2a392',1.5);poly(pts.map(([px,py])=>[px-size*.05,py-size*.08]),'#76685a',null);}ctx.restore();
   }
   function cataclysm(t){
    const combat=spec.phase==='combat',p=settle(t,.8),ground=focus.y+ch*.37,hit=range(t,.34,.85),fall=range(t,.06,.34),retract=smooth(range(t,.65,.87)),headX=focus.x-cw*.55;
    const headY=mix(ground-ch*2.1,ground,fall*fall),weaponX=mix(headX,p.x-p.cw*.4,retract),weaponY=mix(headY,p.y-p.ch*.09,retract);
    if(t>.34){crack(headX,ground,range(t,.34,1),cw*(combat?1.7:1.4));dust(headX,ground,hit,1.6);sparks(headX,ground,hit,38,'#bba084',cw*1.4);ellipse(headX,ground,cw*hit*1.8,cw*hit*.42,'#cdb69b',(1-hit)*.65,3);}
    if(t>.43){const arrival=range(t,.43,.66),bounce=arrival<1?(1-arrival)**2*ch*1.35:Math.sin(range(t,.66,.76)*Math.PI)*7;
     if(combat){ctx.save();ctx.beginPath();ctx.rect(p.x-cw,p.y-ch*1.5,cw*2,ch*1.92);ctx.clip();drawCard(p.x,p.y+(1-out(arrival))*ch,p.cw,p.ch,{alpha:clamp(arrival*5),angle:(1-arrival)*.08});ctx.restore();}
     else drawCard(p.x,p.y-bounce,p.cw*(1+(1-arrival)*.22),p.ch,{alpha:clamp(arrival*5),angle:(1-arrival)*-.13});
     if(t>.63)dust(p.x,p.y+p.ch*.4,range(t,.63,1),1.2);
    }
    if(t>.04)mace(combat&&t<.34?headX+cw*(1-fall)*1.7:weaponX,combat&&t<.34?ground-ch*.25-Math.sin(fall*Math.PI)*ch*.4:weaponY,cw*.24*(1-retract*.23),mix(combat?-.48:.42,-.27,retract)+(1-fall)*-.75,1-range(t,.87,1));
   }
   function portal(x,y,r,open,rotation,colour){
    if(open<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(Math.max(.04,open)*.45,1);ctx.rotate(rotation*.12);const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'#071619');g.addColorStop(.75,'#071619');g.addColorStop(.89,colour+'99');g.addColorStop(1,colour+'00');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r,r,0,0,TAU);ctx.fill();ellipse(0,0,r*.9,r*.9,colour,.95,3);ellipse(0,0,r*1.04,r*1.04,'#c6ad80',.7,1.5);
    for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*TAU/12+rotation);ctx.strokeStyle=colour;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r*.9,-3);ctx.lineTo(r*1.12,-3);ctx.lineTo(r*1.06,4);ctx.stroke();ctx.restore();}ctx.restore();
   }
   function seals(t){
    const combat=spec.phase==='combat',p=settle(t,.83),left={x:focus.x-cw*(combat?.7:1.15),y:focus.y+(combat?-ch*.25:ch*.12)},right={x:focus.x+cw*.35,y:focus.y},open=smooth(range(t,.01,.16))*(1-smooth(range(t,.77,.96))),colour=spec.palette[0];
    portal(left.x,left.y,ch*.76,open,-t*3,colour);portal(right.x,right.y,ch*.76,open,t*3,colour);
    if(t>=.13&&t<.48){const material=range(t,.13,.3),vanish=range(t,.32,.48);drawCard(left.x+cw*.26*(1-material),left.y,cw,ch,{sx:Math.max(.02,1-vanish),alpha:material*(1-vanish),angle:(1-material)*.18});}
    if(t>=.41&&t<.7){const pass=range(t,.41,.7);ctx.save();ctx.strokeStyle='#b5e9da';ctx.globalAlpha=Math.sin(pass*Math.PI);ctx.lineWidth=2;ctx.setLineDash([7,10]);ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.bezierCurveTo(left.x,left.y-ch,right.x,right.y+ch,right.x,right.y);ctx.stroke();ctx.restore();for(let i=0;i<9;i++){const u=clamp(pass*1.7-i*.055),xx=mix(left.x,right.x,u),yy=mix(left.y,right.y,u)-Math.sin(u*Math.PI)*ch*.4;drawCard(xx,yy,cw*.23,ch*.23,{alpha:Math.sin(u*Math.PI)*.38,sx:.3+i*.035,angle:u*.8});}}
    if(t>=.57){const appear=out(range(t,.57,.77)),travel=smooth(range(t,.68,.87));drawCard(mix(right.x,p.x,travel),mix(right.y,p.y,travel),p.cw,p.ch,{sx:Math.max(.015,appear),alpha:clamp(appear*2)});}sparks(left.x,left.y,range(t,.32,.65),12,colour,cw*.6);sparks(right.x,right.y,range(t,.58,.94),16,'#b8decf',cw*.6);
   }
   function hook(x,y,angle,scale=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.strokeStyle='#171e22';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(10,0);ctx.lineTo(24,-14);ctx.lineTo(30,-8);ctx.moveTo(10,0);ctx.lineTo(23,14);ctx.lineTo(29,8);ctx.stroke();ctx.strokeStyle='#b8a18b';ctx.lineWidth=4;ctx.stroke();ctx.restore();}
   function hunt(t){
    const combat=spec.phase==='combat',p=settle(t,.82),peg={x:focus.x+cw*.57,y:focus.y+ch*.31},startPoint={x:focus.x-cw*(combat?1.25:1.7),y:focus.y+ch*(combat?-.85:.5)},shot=out(range(t,.04,.26)),pull=range(t,.32,.69),travel=pull*pull,brake=out(range(t,.69,.8));
    let x=mix(startPoint.x,p.x,travel),y=mix(startPoint.y,p.y,travel)-Math.sin(travel*Math.PI)*ch*.33;if(t>.69){x=p.x+Math.sin(brake*Math.PI)*cw*.12;y=p.y;}
    const hx=mix(startPoint.x,peg.x,shot),hy=mix(startPoint.y,peg.y,shot),fade=1-range(t,.8,.96);ctx.save();ctx.globalAlpha=fade;ctx.lineWidth=3;ctx.strokeStyle='#10191e';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+hx)/2,(y+hy)/2+(1-shot)*80,hx,hy);ctx.stroke();ctx.strokeStyle='#b69d83';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    if(t>.24){metal(peg.x,peg.y,40,14,-.16);sparks(peg.x,peg.y,range(t,.24,.48),13,'#e9b483',cw*.45);}if(t>.03){ctx.save();ctx.globalAlpha=fade;hook(hx,hy,Math.atan2(peg.y-startPoint.y,peg.x-startPoint.x),cw/240);ctx.restore();}
    if(t>.29){for(let i=4;i>0;i--){const ghost=clamp(travel-i*.035);drawCard(mix(startPoint.x,p.x,ghost),mix(startPoint.y,p.y,ghost)-Math.sin(ghost*Math.PI)*ch*.33,p.cw,p.ch,{alpha:Math.sin(pull*Math.PI)*.075,angle:-.2*(1-ghost),shadow:false});}drawCard(x,y,p.cw,p.ch,{alpha:clamp(range(t,.29,.39)*2),angle:t<.69?mix(-.32,.07,travel):(1-brake)*.07});}
    if(t>.69){dust(p.x,p.y+p.ch*.4,range(t,.69,1),.75);sparks(p.x,p.y+p.ch*.4,range(t,.69,.93),18,'#ae8764',cw*.7);}
   }
   const paint={protocol:assembly,artillery:cataclysm,seals,hunt};
   function draw(now){
    if(closed)return;if(!valid()||signal?.aborted||!get(source)?.isConnected){finish(false);return;}
    const t=clamp((now-start)/length),node=get(source);node.classList.add('platinum-actor-masked');marked.add(node);layer.dataset.phase=t<.3?'anticipation':t<.78?'manifest':'settle';layer.dataset.progress=t.toFixed(3);ctx.clearRect(0,0,w,h);
    if(reduced){const r=node.getBoundingClientRect(),p=center(r);drawCard(p.x,p.y,r.width,r.height,{alpha:out(t),shadow:false});}
    else{ctx.save();ctx.fillStyle='#0a0b0c';ctx.globalAlpha=Math.sin(t*Math.PI)*(spec.phase==='combat'?0:.32);ctx.fillRect(0,0,w,h);ctx.restore();paint[spec.kind](t);}
    for(const [at,cue]of spec.cues)if(t>=at&&!triggered.has(cue+at)){triggered.add(cue+at);if(!reduced&&elapsedMs/length<at+.08)root.RunaSfx?.play(context,cue,{to:node,level:.7,track:s=>{sounds.add(s);s.addEventListener('ended',()=>sounds.delete(s),{once:true});}});}
    if(t>=1)finish();else raf=requestAnimationFrame(draw);
   }
   raf=requestAnimationFrame(draw);
  });
 }
 function empower({source,targets=[],mode='assault',context,valid=()=>true,duration=950}={}){
  const from=get(source);if(!from||!valid())return Promise.resolve(false);const layer=document.createElement('div');layer.className='platinum-protocol-scene';layer.setAttribute('aria-hidden','true');document.body.append(layer);const animations=[],links=[],a=center(from.getBoundingClientRect()),reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  root.RunaSfx?.play(context,mode==='escort'?'entry_escort':'entry_assault',{to:from,level:.65});
  for(const target of targets){const node=get(target);if(!node)continue;const r=node.getBoundingClientRect(),b=center(r),dx=b.x-a.x,dy=b.y-a.y;
   const link={target,plates:[]};links.push(link);
   if(!reduced){const rail=document.createElement('i');link.rail=rail;rail.className='protocol-link';Object.assign(rail.style,{left:a.x+'px',top:(a.y-2.5)+'px',width:Math.hypot(dx,dy)+'px',transform:`rotate(${Math.atan2(dy,dx)}rad)`});layer.append(rail);animations.push(rail.animate([{clipPath:'inset(0 100% 0 0)',opacity:0},{clipPath:'inset(0)',opacity:1,offset:.42},{opacity:0}],{duration,fill:'both'}));}
   for(const side of [-1,1]){const plate=document.createElement('i');link.plates.push({plate,side});plate.className='protocol-plate '+(mode==='escort'?'protocol-shield':'protocol-arrow');Object.assign(plate.style,{left:(b.x+side*(r.width*.5+7))+'px',top:b.y+'px'});layer.append(plate);animations.push(plate.animate([{transform:`translate(${side*40}px,-50%) scale(.45)`,opacity:0},{transform:'translate(0,-50%) scale(1)',opacity:1,offset:.48},{transform:'translate(0,-50%) scale(1)',opacity:1,offset:.76},{transform:'translate(0,-50%) scale(.9)',opacity:0}],{duration:reduced?240:duration,fill:'both'}));}
  }
  return new Promise(resolve=>{let done=false,raf=0;const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);animations.forEach(a=>a.cancel());layer.remove();active.delete(finish);resolve(true);};active.add(finish);const check=()=>{const current=get(source);if(!valid()||!current?.isConnected){finish();return;}const origin=center(current.getBoundingClientRect());for(const link of links){const node=get(link.target);if(!node?.isConnected){if(link.rail)link.rail.style.visibility='hidden';for(const {plate} of link.plates)plate.style.visibility='hidden';continue;}const r=node.getBoundingClientRect(),to=center(r),dx=to.x-origin.x,dy=to.y-origin.y;if(link.rail)Object.assign(link.rail.style,{left:origin.x+'px',top:(origin.y-2.5)+'px',width:Math.hypot(dx,dy)+'px',transform:`rotate(${Math.atan2(dy,dx)}rad)`});for(const {plate,side} of link.plates)Object.assign(plate.style,{left:(to.x+side*(r.width*.5+7))+'px',top:to.y+'px'});}if(!done)raf=requestAnimationFrame(check);};raf=requestAnimationFrame(check);Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(finish);});
 }
 root.RunaPlatinumEntry={profile,definition,play,empower,clear};root.addEventListener?.('pagehide',clear);
})(globalThis);
