// V4 (item 19) · folhas de contato dos ataques: para uma cena, uma linha por versão (antes/depois da correção) com os
// três quadros da mesma jogada (antes do contato, contato, logo depois), recortados sem reamostrar além da escala dada.
// Sobre cada quadro, contornos medidos no DOM no instante da captura (dados de v4-strike-frames):
//   amarelo contínuo = cópia do atacante (onde a carta está na tela), ciano tracejado = alvo escolhido pelo motor,
//   magenta pontilhado = criatura igual ao lado. Abaixo, a vida mostrada no alvo e a folga cópia→alvo.
// Usage: node scripts/v4-strike-sheets.mjs <out.png> <scene> <crop x,y,w,h> <scale> <"Rótulo da linha=dir"> [...]
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME} from './hybrid12-lib.mjs';
const [out,scene,cropArg,scaleArg,...rows]=process.argv.slice(2),crop=cropArg.split(',').map(Number),scale=Number(scaleArg);
const data=rows.map(spec=>{const i=spec.indexOf('='),label=spec.slice(0,i),dir=spec.slice(i+1),r=JSON.parse(fs.readFileSync(path.join(dir,'ataques.json'),'utf8'))[scene];
 const mine=r.frames.filter(f=>f.file&&(f.strike?.sourceId===r.info.attacker||f.copies?.some(c=>c.uid===r.info.attacker)));
 const pick=l=>mine.find(f=>f.label===l);
 return {label,info:r.info,cells:['antes','contato','depois'].map(l=>{const f=pick(l);if(!f)return {label:l,missing:true};const copy=f.copies.find(c=>c.uid===r.info.attacker)||f.copies[0],tr=f.target?.rect,gap=copy?.rect&&tr?Math.hypot(Math.max(0,tr.x-(copy.rect.x+copy.rect.w),copy.rect.x-(tr.x+tr.w)),Math.max(0,tr.y-(copy.rect.y+copy.rect.h),copy.rect.y-(tr.y+tr.h))):null;
  return {label:l,b64:fs.readFileSync(path.join(dir,f.file)).toString('base64'),file:f.file,copy:copy?.rect||null,others:f.copies.filter(c=>c!==copy&&c.rect).map(c=>c.rect),target:tr||null,twin:f.twin?.rect||null,life:f.target?.life??null,twinLife:f.twin?.life??null,gap};})};});
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
try{const page=await (await browser.newContext({deviceScaleFactor:1})).newPage();
 const png=await page.evaluate(async([data,crop,scale,title])=>{
  const pad=14,head=34,cap=40,rowHead=26,cw=Math.round(crop[2]*scale),ch=Math.round(crop[3]*scale);
  const c=document.createElement('canvas');c.width=pad+3*(cw+pad);c.height=head+data.length*(rowHead+ch+cap+pad)+pad;const g=c.getContext('2d');
  g.fillStyle='#1d1d1d';g.fillRect(0,0,c.width,c.height);g.fillStyle='#f2f2f2';g.font='600 17px sans-serif';g.fillText(title,pad,24);
  const box=(r,color,dash,text,w=2)=>{if(!r)return;const x=(r.x-crop[0])*scale,y=(r.y-crop[1])*scale;g.save();g.strokeStyle=color;g.lineWidth=w;g.setLineDash(dash);g.strokeRect(x,y,r.w*scale,r.h*scale);g.setLineDash([]);if(text){g.font='600 12px sans-serif';const tw=g.measureText(text).width+8;g.fillStyle='#000c';g.fillRect(x,y-16,tw,15);g.fillStyle=color;g.fillText(text,x+4,y-4);}g.restore();};
  let y0=head;
  for(const row of data){g.fillStyle='#ffd27a';g.font='600 15px sans-serif';g.fillText(row.label,pad,y0+18);y0+=rowHead;
   for(const [k,cell] of row.cells.entries()){const x0=pad+k*(cw+pad);g.fillStyle='#000';g.fillRect(x0,y0,cw,ch);
    if(cell.missing){g.fillStyle='#ccc';g.font='14px sans-serif';g.fillText(cell.label+': quadro ausente',x0+10,y0+24);continue;}
    const im=new Image();im.src='data:image/png;base64,'+cell.b64;await im.decode();
    g.save();g.beginPath();g.rect(x0,y0,cw,ch);g.clip();g.translate(x0,y0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(im,crop[0],crop[1],crop[2],crop[3],0,0,cw,ch);
    box(cell.twin,'#ff5ad9',[2,4],'igual ao lado');box(cell.target,'#4fe3ff',[8,5],'alvo do motor');for(const o of cell.others)box(o,'#ffe14d',[],'',1.5);box(cell.copy,'#ffe14d',[],'atacante');g.restore();
    g.fillStyle='#f2f2f2';g.font='600 13px sans-serif';g.fillText(`${{antes:'1 · antes do contato (30 %)',contato:'2 · contato (42 %)',depois:'3 · logo depois (62 %)'}[cell.label]}`,x0,y0+ch+16);
    g.font='12px sans-serif';g.fillStyle='#cfcfcf';g.fillText(`vida no alvo: ${cell.life??'—'}${cell.twin?` · igual ao lado: ${cell.twinLife??'—'}`:''} · folga cópia→alvo: ${cell.gap==null?'—':cell.gap.toFixed(1)+' px'} · ${cell.file}`,x0,y0+ch+32);}
   y0+=ch+cap+pad;}
  return c.toDataURL('image/png').split(',')[1];},[data,crop,scale,data[0].info.label]);
 fs.writeFileSync(out,Buffer.from(png,'base64'));console.log('ok',out);
}finally{await browser.close();}
