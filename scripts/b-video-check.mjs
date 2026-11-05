// Bloco B · conferência do vídeo gerado: reproduz o arquivo do início (sem busca, porque o MediaRecorder não grava
// índice), em velocidade 2×, e salva o quadro mostrado quando o tempo de mídia passa por cada instante pedido, com o
// brilho médio (prova de que não é preto) e o tempo total reproduzido.
// Usage: node scripts/b-video-check.mjs <file.mp4|webm> <out-dir> <t1,t2,...>
import fs from 'node:fs';import path from 'node:path';import {chromium,CHROME} from './hybrid12-lib.mjs';
const [file,out,list='1,5,10,15,20,25']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true}),ctx=await browser.newContext({viewport:{width:960,height:560}});
await ctx.route('http://video.local/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/')return r.fulfill({status:200,headers:{'content-type':'text/html'},body:'<!doctype html><body style="margin:0;background:#000"><video id=v src="/v.media" muted playsinline style="position:absolute;left:-9999px"></video><canvas id=c width=960 height=540></canvas></body>'});return r.fulfill({status:200,headers:{'content-type':file.endsWith('.mp4')?'video/mp4':'video/webm'},body:fs.readFileSync(file)});});
const page=await ctx.newPage();await page.goto('http://video.local/');
const targets=list.split(',').map(Number);
const res=await page.evaluate(targets=>new Promise(resolve=>{const v=document.getElementById('v'),c=document.getElementById('c'),g=c.getContext('2d',{willReadFrequently:true}),shots=[];let i=0,last=0;
 const grab=t=>{g.drawImage(v,0,0,960,540);const d=g.getImageData(0,0,960,540).data;let s=0;for(let k=0;k<d.length;k+=16)s+=d[k]+d[k+1]+d[k+2];shots.push({target:t,mediaTime:+v.currentTime.toFixed(2),mean:+(s/(d.length/16)/3).toFixed(1),png:c.toDataURL('image/png')});};
 const tick=(now,meta)=>{last=meta.mediaTime;while(i<targets.length&&meta.mediaTime>=targets[i]){grab(targets[i]);i++;}if(!v.ended)v.requestVideoFrameCallback(tick);};
 v.onended=()=>resolve({shots,played:+last.toFixed(2),w:v.videoWidth,h:v.videoHeight});v.muted=true;v.playbackRate=2;v.requestVideoFrameCallback(tick);v.play();setTimeout(()=>resolve({shots,played:+last.toFixed(2),timeout:true,w:v.videoWidth,h:v.videoHeight}),120000);}),targets);
for(const s of res.shots){fs.writeFileSync(path.join(out,`t${String(s.target).padStart(2,'0')}.png`),Buffer.from(s.png.split(',')[1],'base64'));console.log('t',s.target,'at',s.mediaTime,'mean',s.mean);}
console.log(JSON.stringify({played:res.played,w:res.w,h:res.h,timeout:res.timeout||false}));await browser.close();
