// Bloco B · gravação de vídeo sem ffmpeg: quadros reais da página pelo screencast do DevTools (CDP, JPEG, com o
// horário de cada quadro), gravados em disco; depois um canvas os reproduz no ritmo original e o MediaRecorder do
// próprio navegador codifica o WebM. Nenhum download ou binário extra.
import fs from 'node:fs';import path from 'node:path';
export async function startCapture(ctx,page,dir,{quality=82,max={width:1920,height:1080}}={}){
 fs.mkdirSync(dir,{recursive:true});const cdp=await ctx.newCDPSession(page),frames=[];let n=0,stopped=false;
 cdp.on('Page.screencastFrame',async f=>{if(stopped)return;const file=path.join(dir,String(++n).padStart(5,'0')+'.jpg');fs.writeFileSync(file,Buffer.from(f.data,'base64'));frames.push({file,ts:f.metadata.timestamp});try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});}catch{}});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality,maxWidth:max.width,maxHeight:max.height,everyNthFrame:1});
 return {async stop(){stopped=true;try{await cdp.send('Page.stopScreencast');}catch{}return frames;}};
}
// Plays the frames on a canvas at their recorded timing (gaps longer than maxGapMs are shortened) and records it
// (MP4/H.264 when the browser offers it: the MediaRecorder WebM has no index and cannot be scrubbed).
export async function encode(browser,frames,outFile,{width=1920,height=1080,fps=30,maxGapMs=1500,bitrate=8e6,types=['video/mp4;codecs=avc1.640028','video/webm;codecs=vp9'],cpu=true}={}){
 if(!frames.length)throw Error('no frames');const ctx=await browser.newContext({viewport:{width:Math.min(width,1920),height:Math.min(height,1080)}});
 // frames and the encoder page share one origin, so the canvas is not tainted and can be captured
 await ctx.route('http://frames.local/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/encoder')return r.fulfill({status:200,headers:{'content-type':'text/html'},body:'<!doctype html><body style="margin:0;background:#000"></body>'});const i=Number(p.slice(1));return r.fulfill({status:200,headers:{'content-type':'image/jpeg'},body:fs.readFileSync(frames[i].file)});});
 const page=await ctx.newPage();const fd=fs.openSync(outFile,'w');let bytes=0;
 await page.exposeFunction('pushChunk',b64=>{const b=Buffer.from(b64,'base64');fs.writeSync(fd,b);bytes+=b.length;});
 await page.goto('http://frames.local/encoder');
 const t=[0];for(let i=1;i<frames.length;i++)t.push(t[i-1]+Math.min(maxGapMs,Math.max(0,(frames[i].ts-frames[i-1].ts)*1000)));
 const info=await page.evaluate(async({count,t,width,height,fps,bitrate,types,cpu})=>{
  const c=document.createElement('canvas');c.width=width;c.height=height;document.body.append(c);const g=c.getContext('2d',{willReadFrequently:cpu});g.fillStyle='#000';g.fillRect(0,0,width,height);
  const stream=c.captureStream(0),track=stream.getVideoTracks()[0],type=[...types,'video/webm'].find(t=>MediaRecorder.isTypeSupported(t)),rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:bitrate}),pending=[];
  rec.ondataavailable=e=>{if(e.data.size)pending.push(e.data.arrayBuffer().then(buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode(...u.subarray(i,i+32768));return window.pushChunk(btoa(s));}));};
  const load=i=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src='http://frames.local/'+i;});
  let next=load(0);rec.start(1000);const start=performance.now();
  for(let i=0;i<count;i++){const im=await next;if(i+1<count)next=load(i+1);const wait=t[i]-(performance.now()-start);if(wait>0)await new Promise(r=>setTimeout(r,wait));g.drawImage(im,0,0,width,height);track.requestFrame?.();}
  for(let k=0;k<12;k++){await new Promise(r=>setTimeout(r,1000/fps));track.requestFrame?.();}const done=new Promise(r=>rec.onstop=r);rec.stop();await done;await Promise.all(pending);return {type,durationMs:Math.round(performance.now()-start)};},{count:frames.length,t,width,height,fps,bitrate,types,cpu});
 fs.closeSync(fd);await ctx.close();return {...info,frames:frames.length,bytes,file:outFile};
}
