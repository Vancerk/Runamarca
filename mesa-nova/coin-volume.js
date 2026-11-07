/* Minted solid: two textured caps, bevels and 96 fluted edge faces.
   Procedural deterministic artwork, without a remote asset. */
(function(root){
 const textures=new Map(),SIZE=768;
 function faceTexture(back){
  if(textures.has(back))return textures.get(back);
  const c=document.createElement('canvas');c.width=c.height=SIZE;const x=c.getContext('2d');x.scale(SIZE/240,SIZE/240);
  const metal=x.createLinearGradient(22,12,212,234);for(const [p,color] of [[0,'#fff2b6'],[.17,'#d5a149'],[.33,'#f6d483'],[.48,'#b58232'],[.63,'#e8bd64'],[.84,'#ad792d'],[1,'#f8d987']])metal.addColorStop(p,color);
  x.beginPath();x.arc(120,120,117,0,Math.PI*2);x.fillStyle=metal;x.fill();x.save();x.clip();
  let seed=back?1847:9209;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<2500;i++){const px=rand()*240,py=rand()*240;x.strokeStyle=i%3?'#fff1b61c':'#57300b18';x.lineWidth=.18+rand()*.23;x.beginPath();x.moveTo(px,py);x.lineTo(px+1+rand()*5,py+.3+rand());x.stroke();}x.restore();
  for(const [r,line,color] of [[114,4,'#fff0ad'],[110,3,'#80521d'],[106,2,'#f8db8f'],[92,1.5,'#83521b'],[90,1,'#ffe7a5']]){x.beginPath();x.arc(120,120,r,0,Math.PI*2);x.strokeStyle=color;x.lineWidth=line;x.stroke();}
  for(let i=0;i<72;i++){const a=i*Math.PI/36,px=120+100*Math.cos(a),py=120+100*Math.sin(a);x.fillStyle='#81501a';x.beginPath();x.arc(px+.5,py+1,1.8,0,Math.PI*2);x.fill();x.fillStyle='#ffe8a0';x.beginPath();x.arc(px-.4,py-.5,1.4,0,Math.PI*2);x.fill();}
  function relief(draw){x.save();x.translate(1.4,2);x.fillStyle='#78501e';x.strokeStyle='#78501e';draw();x.restore();x.save();x.translate(-.7,-.9);x.fillStyle='#ffedb2';x.strokeStyle='#ffedb2';draw();x.restore();x.fillStyle='#c8943e';x.strokeStyle='#c8943e';draw();}
  relief(()=>{if(back){x.beginPath();x.arc(120,112,43,Math.PI*.2,Math.PI*1.8);x.bezierCurveTo(91,72,92,151,155,137);x.closePath();x.fill();for(const [a,b,r] of [[147,88,5],[153,110,3],[126,72,3]]){x.beginPath();for(let i=0;i<8;i++){const t=i*Math.PI/4,v=i%2?r*.32:r;x.lineTo(a+Math.sin(t)*v,b+Math.cos(t)*v);}x.closePath();x.fill();}}
   else{for(let i=0;i<12;i++){const a=i*Math.PI/6;x.save();x.translate(120,110);x.rotate(a);x.beginPath();x.moveTo(-4,-37);x.lineTo(0,-58);x.lineTo(4,-37);x.closePath();x.fill();x.restore();}x.beginPath();x.arc(120,110,30,0,Math.PI*2);x.fill();x.lineWidth=2;x.beginPath();x.arc(120,110,23,0,Math.PI*2);x.stroke();}});
  x.textAlign='center';x.textBaseline='middle';x.font='bold 15px Georgia';relief(()=>x.fillText(back?'ELYSIUM':'RUNAMARCA',120,181));x.font='bold 8px Georgia';x.fillStyle='#765020';x.fillText('✦  •  ✦',120,204);
  textures.set(back,c);return c;
 }
 function create({back=false}={}){
  const stage=document.createElement('div');stage.style.setProperty('--coin-final',back?'1980deg':'1800deg');stage.dataset.face=back?'back':'front';stage.className='coin-toss coin-volume';stage.setAttribute('role','img');stage.setAttribute('aria-label','Moeda de ouro lançada, com frente, verso e borda');
  const shadow=document.createElement('div');shadow.className='coin-ground-shadow';stage.append(shadow);
  const solid=document.createElement('div');solid.className='coin-solid';stage.append(solid);
  for(let i=0;i<96;i++){const edge=document.createElement('i');edge.className='coin-edge';edge.style.setProperty('--edge-angle',i*360/96+'deg');edge.style.setProperty('--edge-light',String(.52+.48*Math.max(0,Math.cos(i*Math.PI*2/96-2.2))));solid.append(edge);}
  for(const back of [false,true]){const cap=document.createElement('div');cap.className='coin-cap '+(back?'coin-cap-back':'coin-cap-front');const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;canvas.getContext('2d').drawImage(faceTexture(back),0,0);cap.append(canvas);solid.append(cap);}
  stage.dataset.geometry='96 fluted edge faces, radius 104, thickness 30';stage.dataset.texture='768px procedural minted metal';return stage;
 }
 root.RunaCoinVolume={create};
})(globalThis);
