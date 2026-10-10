/* Original effects drawn at display resolution. One canvas/RAF for all active effects. */
(function(root){
 const timing={shard:[180,540,480],fulgor:[650,650,650],forge:[640,620,420],axe:[180,520,350],ember:[100,500,420],kinetic:[0,350,350],cone:[0,400,300],brutal:[0,150,400],heavy:[0,0,700],hammer:[0,0,650]};
 let canvas,ctx,frame=0,noiseBuffer,audioMaster,audioOwner;const active=new Set();
 const point=node=>{const r=node?.getBoundingClientRect?.();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:innerWidth/2,y:innerHeight/2};};
 const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>n*n*(3-2*n),fract=n=>n-Math.floor(n),noise=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
 function duration(kind){return (timing[kind]||timing.shard).reduce((a,b)=>a+b,0);}
 function init(){if(canvas?.isConnected)return;canvas=document.createElement('canvas');canvas.className='damage-fx-canvas';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);ctx=canvas.getContext('2d');}
 function resize(){const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.ceil(innerWidth*dpr),h=Math.ceil(innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(dpr,0,0,dpr,0,0);}
 function line(points,color,width=2,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x,p.y));ctx.stroke();ctx.restore();}
 function halo(p,r,color,alpha=1){if(r<=0||alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,color);g.addColorStop(.25,color+'b0');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,2*r,2*r);ctx.restore();}
 function ring(p,r,color,alpha=1,squash=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(p.x,p.y,Math.max(1,r),Math.max(1,r*squash),0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 function bolt(a,b,seed,color='#ff5264',alpha=1){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,points=[];for(let i=0;i<=8;i++){const t=i/8,j=i&&i<8?(noise(seed+i)-.5)*24:0;points.push({x:a.x+dx*t-dy/len*j,y:a.y+dy*t+dx/len*j});}line(points,color,5,alpha*.4);line(points,'#ffe9e5',1.3,alpha);}
 function motes(p,t,seed,color,count=22,radius=110,gravity=55){for(let i=0;i<count;i++){const a=i*2.39996+noise(seed+i)*.4,dist=radius*(.2+noise(i+seed+20)*.8)*Math.pow(clamp(t),.65),x=p.x+Math.cos(a)*dist,y=p.y+Math.sin(a)*dist+gravity*t*t,alpha=(1-t)*(.4+noise(seed+i)*.6);ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(a+t*3);ctx.fillStyle=color;ctx.fillRect(-3,-1,6+noise(seed+i+50)*7,2+noise(i)*3);ctx.restore();}}
 function crystal(p,angle,size=1,color='#bd193e'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.scale(size,size);ctx.beginPath();ctx.moveTo(-22,-7);ctx.lineTo(12,-12);ctx.lineTo(29,0);ctx.lineTo(5,12);ctx.lineTo(-24,5);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#ffc4cb';ctx.lineWidth=1.5;ctx.stroke();line([{x:-17,y:-4},{x:21,y:0},{x:-8,y:7}],'#ffeff0',1.3);ctx.restore();}
 function flame(p,r,seed,color='#ff7a26'){halo(p,r*2.6,color,.46);for(let i=0;i<7;i++){const a=i*.9+seed*.008;halo({x:p.x+Math.cos(a)*r*.3,y:p.y+Math.sin(a)*r*.4},r*(.5+noise(i+seed)*.4),i%2?'#ffb849':color,.65);}halo(p,r*.65,'#fff0b7',.9);}
 function axe(p,angle){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.shadowColor='#ff8751';ctx.shadowBlur=9;ctx.fillStyle='#79502f';ctx.fillRect(-5,-34,10,80);ctx.strokeStyle='#d9ad71';ctx.lineWidth=2;ctx.strokeRect(-5,-34,10,80);ctx.beginPath();ctx.moveTo(1,-30);ctx.bezierCurveTo(22,-46,45,-36,40,-9);ctx.lineTo(16,3);ctx.lineTo(10,-13);ctx.lineTo(-12,-10);ctx.lineTo(-17,-21);ctx.closePath();const steel=ctx.createLinearGradient(0,-40,40,5);steel.addColorStop(0,'#f4e9d4');steel.addColorStop(.45,'#657781');steel.addColorStop(1,'#c1d4d8');ctx.fillStyle=steel;ctx.fill();ctx.strokeStyle='#fff0d3';ctx.stroke();ctx.fillStyle='#602623';ctx.fillRect(-6,10,12,4);ctx.fillRect(-6,19,12,4);ctx.restore();}
 function burst(e,t){const p=e.to,seed=e.seed;if(e.kind==='shard'){halo(p,85*(1+t),'#fd254e',(1-t)*.7);ring(p,12+70*t,'#ff9da8',1-t);for(let i=0;i<11;i++){const a=i*2.39996,r=(12+95*t)*(.5+noise(seed+i)*.5);crystal({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r},a+t*2,(1-t)*.45);if(i<5)bolt(p,{x:p.x+Math.cos(a)*r*1.25,y:p.y+Math.sin(a)*r*1.25},seed+i+Math.floor(t*15),'#ff4867',1-t);}return;}
 if(e.kind==='fulgor'||e.kind==='ember'){const big=e.kind==='fulgor',color=big?'#8b77ec':'#ff7c28';halo(p,(big?150:75)*(1+t),color,(1-t)*.7);ring(p,12+(big?145:65)*t,big?'#ddd2ff':'#ffc181',(1-t)*.9);motes(p,t,seed,'#ffb35b',big?46:20,big?175:90);if(big)for(let i=0;i<8;i++){const a=i*.78;bolt(p,{x:p.x+Math.cos(a)*85*(1+t),y:p.y+Math.sin(a)*85*(1+t)},seed+i,'#9c86f2',(1-t)*.5);}return;}
 if(e.kind==='axe'){ctx.save();ctx.globalAlpha=1-t;axe({x:p.x+Math.sin(t*50)*2*(1-t),y:p.y},-.5);ctx.restore();motes(p,t,seed,'#d7aa79',16,60);return;}
 if(e.kind==='forge'){halo(p,110*(1+t),'#ffab36',1-t);for(let i=0;i<3;i++)ring(p,12+(65+i*17)*t,'#ffe6a2',(1-t)*.7);motes(p,t,seed,'#ffe7b0',28,110);return;}
 if(['heavy','kinetic','cone','brutal','hammer'].includes(e.kind)){const heavy=e.kind==='heavy'||e.kind==='hammer',brutal=e.kind==='brutal';ring(p,8+(heavy?140:70)*t,brutal?'#eb6477':'#e8bb7d',(1-t)*.6,.45);motes(p,t,seed,brutal?'#b74052':'#c9a17b',heavy?35:18,heavy?150:80,90);if(heavy)for(let i=0;i<9;i++){const a=i*2.4,r=(30+90*t)*noise(seed+i);halo({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.5+16*t},(15+30*t),'#b08b66',(1-t)*.16);}if(brutal){for(let i=0;i<3;i++){const x=p.x-25+i*20;line([{x:x-9,y:p.y-35},{x:x+6,y:p.y+30}],'#f26566',3,1-t);}halo(p,60,'#cd2846',(1-t)*.4);}return;}}

 // A collector ahead of the Patron receives seven separate rays and launches one beam.
 function fulgorGeometry(from,to){
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy),ux=length?dx/length:0,uy=length?dy/length:-1,nx=-uy,ny=ux,reach=Math.min(82,length*.28);
  const focus={x:from.x+ux*reach,y:from.y+uy*reach};
  const emitters=Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7;return {x:from.x+ux*Math.cos(a)*18+nx*Math.sin(a)*44,y:from.y+uy*Math.cos(a)*18+ny*Math.sin(a)*44};});
  return {focus,emitters};
 }
 function energyRay(a,b,strength,width=7){
  line([a,b],'#7c57f4',width*3,strength*.18);
  line([a,b],'#b296ff',width,strength*.75);
  line([a,b],'#f5eaff',Math.max(1.2,width*.28),strength);
 }
 function paintFulgor(e,elapsed){
  const [charge,flight,tail]=timing.fulgor,hitAt=charge+flight,after=clamp((elapsed-hitAt)/tail),feed=elapsed<hitAt?1:1-clamp((elapsed-hitAt)/240),p=clamp(elapsed/charge),{focus,emitters}=fulgorGeometry(e.from,e.to);
  if(feed>0){
   for(const [i,origin] of emitters.entries()){
    const grow=clamp((p-i*.055)/.55),end={x:origin.x+(focus.x-origin.x)*grow,y:origin.y+(focus.y-origin.y)*grow},strength=grow*feed*(.83+.1*Math.sin(elapsed*.014+i));
    halo(origin,9+5*p,'#bca0ff',grow*feed*.5);energyRay(origin,end,strength,3.5);halo(origin,3,'#fff2ff',grow*feed);
   }
   halo(e.from,42+24*p,'#7458d9',p*feed*.2);halo(focus,16+21*p,'#aa8aff',p*feed*.65);halo(focus,5+9*p,'#fff2ff',p*feed);ring(focus,12+8*p,'#dccaff',p*feed*.65);
   if(elapsed>=charge){
    const progress=ease(clamp((elapsed-charge)/flight)),tip={x:focus.x+(e.to.x-focus.x)*progress,y:focus.y+(e.to.y-focus.y)*progress};
    energyRay(focus,tip,feed,12+2*Math.sin(elapsed*.027));halo(tip,25,'#c0a2ff',feed*.8);halo(tip,9,'#fff0ff',feed);
    if(progress>.1)for(let k=0;k<3;k++){const t=clamp(progress-k*.05),point={x:focus.x+(e.to.x-focus.x)*t,y:focus.y+(e.to.y-focus.y)*t};ring(point,14+k*4,'#d8c0ff',feed*(.35-k*.07),.6);}
   }
  }
  if(elapsed>=hitAt)burst(e,after);
 }
 function paint(e,elapsed){if(e.kind==='fulgor'){paintFulgor(e,elapsed);return;}const [charge,flight,tail]=timing[e.kind]||timing.shard,hitAt=charge+flight,after=clamp((elapsed-hitAt)/tail),phase=clamp((elapsed-charge)/Math.max(1,flight));if(elapsed<charge){const p=clamp(elapsed/charge),a=e.from;
  if(e.kind==='forge'&&e.donor){const drain=clamp(elapsed/480);for(let k=0;k<4;k++){const t=clamp(drain-k*.08),x=e.donor.x+(a.x-e.donor.x)*t,y=e.donor.y+(a.y-e.donor.y)*t+Math.sin(t*Math.PI)*22*(k%2?1:-1);halo({x,y},16,'#ffd273',.6);line([e.donor,{x,y}], '#f4b656',2,(1-drain)*.4);}ring(e.donor,12+38*drain,'#f7c56e',1-drain);halo(a,15+24*p,'#ffca6c',p);}
  else{const color=e.kind==='fulgor'?'#a99aff':e.kind==='ember'?'#ff9e39':'#ff3557';halo(a,22+(e.kind==='fulgor'?95:30)*p,color,p*.6);for(let i=0;i<7;i++){const angle=i*2.4+elapsed*.005,r=45*(1-p)+12;halo({x:a.x+Math.cos(angle)*r,y:a.y+Math.sin(angle)*r},3+6*p,color,.8);}if(e.kind==='fulgor'){ring(a,30+25*p,'#d9d0ff',p*.7);for(let i=0;i<4;i++){const angle=i*Math.PI/2+elapsed*.002;bolt(a,{x:a.x+Math.cos(angle)*(55+25*p),y:a.y+Math.sin(angle)*(55+25*p)},Math.floor(elapsed/65)+i,'#aa94ff',p*.65);}}}
  return;
 }
 if(elapsed<hitAt){const a=e.from,b=e.to,dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx),q=ease(phase),p={x:a.x+dx*q,y:a.y+dy*q};
  if(e.kind==='cone'){ctx.save();ctx.globalAlpha=(1-phase)*.5+.15;const nx=-Math.sin(angle),ny=Math.cos(angle),width=12+phase*54;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(p.x+nx*width,p.y+ny*width);ctx.lineTo(p.x-nx*width,p.y-ny*width);ctx.closePath();const g=ctx.createLinearGradient(a.x,a.y,p.x,p.y);g.addColorStop(0,'#fff2c800');g.addColorStop(.6,'#ffaf4b55');g.addColorStop(1,'#ffecb9');ctx.fillStyle=g;ctx.fill();ctx.restore();line([a,p],'#fff1c9',2,.7);}
  else if(e.kind==='axe'){for(let k=1;k<=4;k++){ctx.save();ctx.globalAlpha=.07*(5-k);axe({x:p.x-dx*k*.012,y:p.y-dy*k*.012},phase*12-k*.25);ctx.restore();}axe(p,phase*12);}
  else if(e.kind==='shard'){for(let k=1;k<=6;k++){const t=Math.max(0,q-k*.03),prev={x:a.x+dx*t,y:a.y+dy*t};halo(prev,18*(1-k/8),'#f93356',.45);}halo(p,45,'#ff304e',.6);crystal(p,angle,1);for(let k=0;k<3;k++)bolt({x:p.x-dx*.07,y:p.y-dy*.07},{x:p.x+Math.sin(angle)*(k-1)*16,y:p.y-Math.cos(angle)*(k-1)*16},Math.floor(elapsed/45)+k,'#ff345e',.8);}
  else if(e.kind==='kinetic'){ring(p,20+phase*35,'#efd3a2',(1-phase)*.8,.7);line([a,p],'#e4bb79',5,(1-phase)*.5);}
  else if(e.kind==='brutal'){line([a,p],'#e57870',3,.7);}
  else{const color=e.kind==='fulgor'?'#a88eff':e.kind==='forge'?'#ffad43':'#ff7c25';for(let k=1;k<=10;k++){const t=Math.max(0,q-k*.02),r=(e.kind==='fulgor'?26:14)*(1-k/12);halo({x:a.x+dx*t+Math.sin(k+elapsed*.02)*4,y:a.y+dy*t},r,color,.32);}flame(p,e.kind==='fulgor'?26:e.kind==='forge'?17:13,elapsed,color);if(e.kind==='fulgor')ring(p,32,'#eee2ff',.8);}
 }else burst(e,after);
 }
 function tick(now){frame=0;if(!active.size){canvas?.remove();canvas=null;return;}resize();ctx.clearRect(0,0,innerWidth,innerHeight);ctx.globalCompositeOperation='source-over';for(const e of [...active]){if(e.generation!==e.getGeneration()){active.delete(e);e.resolve(false);continue;}const elapsed=now-e.start,hitAt=e.charge+e.flight;if(!e.hit&&elapsed>=hitAt){e.hit=true;audio(e.kind,'impact',e.to);try{e.onHit?.();}catch(error){console.error("Damage presentation callback failed",error);active.delete(e);e.resolve(false);continue;}}paint(e,elapsed);if(elapsed>=e.total){active.delete(e);e.resolve(true);}}if(active.size)frame=requestAnimationFrame(tick);else{canvas.remove();canvas=null;}}
 function play({kind='shard',from,to,donor,onHit,getGeneration=()=>0}={}){init();const [charge,flight,tail]=timing[kind]||timing.shard,reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const e={kind,from:point(from),to:point(to),donor:donor?point(donor):null,charge,flight,total:charge+flight+tail,start:performance.now(),seed:Math.random()*1000,onHit,getGeneration,generation:getGeneration(),hit:false};if(reduced){e.start-=charge+flight; e.total=charge+flight+Math.min(200,tail);}audio(kind,'cast',e.from);return new Promise(resolve=>{e.resolve=resolve;active.add(e);if(!frame)frame=requestAnimationFrame(tick);});}
 function audio(kind,stage,p){try{const ac=typeof audioContext!=='undefined'?audioContext:null;if(!ac||ac.state!=='running')return;if(audioOwner!==ac){audioOwner=ac;noiseBuffer=null;const bus=ac.createGain(),compressor=ac.createDynamicsCompressor();bus.gain.value=.72;compressor.threshold.value=-15;compressor.knee.value=18;compressor.ratio.value=4;bus.connect(compressor).connect(ac.destination);audioMaster=bus;}
  const at=ac.currentTime,pan=ac.createStereoPanner();pan.pan.value=Math.max(-.7,Math.min(.7,(p.x/innerWidth-.5)*1.4));pan.connect(audioMaster);
  const tone=(type,f1,f2,seconds,volume,delay=0)=>{const o=ac.createOscillator(),g=ac.createGain(),t=at+delay;o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+seconds);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+seconds);o.connect(g).connect(pan);o.start(t);o.stop(t+seconds+.03);o.onended=()=>{o.disconnect();g.disconnect();};};
  const hiss=(filter,f1,f2,seconds,volume,delay=0)=>{if(!noiseBuffer){noiseBuffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const b=noiseBuffer.getChannelData(0);let brown=0;for(let i=0;i<b.length;i++){const white=Math.random()*2-1;brown=(brown+white*.02)/1.02;b[i]=white*.45+brown*3;}}const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),t=at+delay;s.buffer=noiseBuffer;f.type=filter;f.frequency.setValueAtTime(f1,t);f.frequency.exponentialRampToValueAtTime(f2,t+seconds);f.Q.value=1.1;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+seconds);s.connect(f).connect(g).connect(pan);s.start(t);s.stop(t+seconds);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};};
  if(stage==='cast'){if(kind==='fulgor'){tone('sine',75,220,.62,.14);tone('triangle',180,600,.6,.025);hiss('bandpass',300,1800,.6,.09);tone('sine',260,1100,.63,.045,.64);tone('triangle',520,780,.56,.022,.65);hiss('bandpass',1500,3600,.64,.12,.65);}else if(kind==='forge'){hiss('bandpass',1600,450,.45,.11);tone('sine',530,180,.43,.07);}else if(kind==='axe'){hiss('bandpass',500,3800,.35,.09,.12);}else if(kind==='shard'){for(let i=0;i<4;i++)tone('sawtooth',700+i*180,1800+i*250,.035,.035,i*.045);hiss('highpass',4000,900,.22,.06);}else if(kind==='ember'){hiss('lowpass',2200,500,.4,.08);} }
  else if(kind==='shard'){for(let i=0;i<6;i++)tone('square',1600+i*510,900+i*210,.04,.026,i*.018);hiss('highpass',8000,2200,.23,.14);tone('sine',130,48,.18,.16);}
  else if(kind==='fulgor'){tone('sine',90,28,.55,.25);tone('triangle',300,70,.32,.08);hiss('lowpass',4200,180,.65,.2);for(let i=0;i<9;i++)hiss('highpass',4500,1300,.035,.035,.08+i*.05);}
  else if(kind==='ember'){hiss('bandpass',2300,300,.34,.13);tone('sine',140,65,.16,.1);for(let i=0;i<4;i++)hiss('highpass',4400,1700,.03,.03,i*.07);}
  else if(kind==='forge'||kind==='hammer'){tone('sine',110,35,.2,.23);for(const [f,v] of [[530,.065],[1350,.033],[2530,.015]])tone('sine',f,f*.97,.5,v);hiss('highpass',7000,1400,.12,.08);}
  else if(kind==='axe'){tone('triangle',210,45,.16,.17);hiss('bandpass',2400,700,.1,.13);tone('sine',920,680,.28,.04);}
  else if(kind==='heavy'||kind==='kinetic'){tone('sine',75,25,.28,.22);hiss('lowpass',1700,180,.4,.15);hiss('highpass',3200,700,.13,.035);}
  else if(kind==='cone'){hiss('bandpass',550,2600,.32,.13);tone('triangle',210,80,.25,.07);}
  else if(kind==='brutal'){hiss('highpass',5500,1500,.15,.12);tone('sawtooth',380,120,.1,.03);tone('sine',80,40,.15,.12);}
  setTimeout(()=>pan.disconnect(),1800);
 }catch{} }
 root.RunaDamageFX={play,duration,timing,audio,point,fulgorGeometry};
})(globalThis);
