// V3 (item 15) · mapa da sombra projetada pelas cartas da mesa, a partir de duas capturas da mesma cena:
// full.png (cartas presentes) e no-card.png (as mesmas cartas ocultas: sem face, sem corpo, sem sombra). Pixels fora
// das faces que ficaram mais escuros com as cartas presentes são a sombra que elas projetam. O mapa é pintado sobre a
// mesa inteira, com uma seta da vela até cada carta, e o script mede a direção média da sombra (do centro da face ao
// centroide da sombra) para comparar com a direção vela → carta.
// Usage: node scripts/v3-shadow-map.mjs <layers-dir> <out.png>
import fs from 'node:fs';import path from 'node:path';import {chromium,CHROME} from './hybrid12-lib.mjs';
const [dir,out]=process.argv.slice(2),info=JSON.parse(fs.readFileSync(path.join(dir,'camadas.json'),'utf8'));
const b64=f=>fs.readFileSync(path.join(dir,f)).toString('base64');
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true}),page=await (await browser.newContext({viewport:{width:1920,height:1080}})).newPage();
const res=await page.evaluate(async({full,none,info})=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+s;});const [A,B]=await Promise.all([load(full),load(none)]);
 const W=A.width,H=A.height,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(B,0,0);const nb=g.getImageData(0,0,W,H).data;g.drawImage(A,0,0);const fa=g.getImageData(0,0,W,H);const d=fa.data;
 const faces=info.cards.filter(k=>k.face).map(k=>k.face),inFace=(x,y)=>faces.some(f=>x>=f.x-1&&x<=f.x+f.w+1&&y>=f.y-1&&y<=f.y+f.h+1),L=(a,i)=>.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];
 const per=faces.map(f=>({f,n:0,sx:0,sy:0,dark:0}));
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;if(inFace(x,y))continue;const diff=L(nb,i)-L(d,i);if(diff>2.5){const k=per.reduce((best,p,j)=>{const cx=p.f.x+p.f.w/2,cy=p.f.y+p.f.h/2,dist=Math.hypot(x-cx,y-cy);return dist<best.d?{j,d:dist}:best;},{j:-1,d:1e9});if(k.d<260){const p=per[k.j];p.n++;p.sx+=x;p.sy+=y;p.dark+=diff;}
   d[i]=Math.min(255,d[i]+120);d[i+1]=d[i+1]*.4;d[i+2]=d[i+2]*.4;}}
 g.putImageData(fa,0,0);
 const candle=info.props.find(p=>p.id==='candle')?.pixel;g.lineWidth=3;g.font='600 16px Georgia';
 const arrow=(x0,y0,x1,y1,color)=>{g.strokeStyle=color;g.fillStyle=color;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();const a=Math.atan2(y1-y0,x1-x0);g.beginPath();g.moveTo(x1,y1);g.lineTo(x1-14*Math.cos(a-.4),y1-14*Math.sin(a-.4));g.lineTo(x1-14*Math.cos(a+.4),y1-14*Math.sin(a+.4));g.closePath();g.fill();};
 const out=per.map(p=>{const cx=p.f.x+p.f.w/2,cy=p.f.y+p.f.h/2,sx=p.n?p.sx/p.n:cx,sy=p.n?p.sy/p.n:cy,shadowDeg=Math.atan2(sy-cy,sx-cx)*180/Math.PI,lightDeg=candle?Math.atan2(cy-candle[1],cx-candle[0])*180/Math.PI:null;
  if(candle){g.setLineDash([8,6]);arrow(candle[0],candle[1],cx,cy,'#ffd36a');g.setLineDash([]);}
  arrow(cx,cy,cx+(sx-cx)*6,cy+(sy-cy)*6,'#ff5a4d');return {face:{x:Math.round(cx),y:Math.round(cy)},shadowPixels:p.n,meanDarkening:p.n?+(p.dark/p.n).toFixed(1):0,shadowCentroidOffset:{x:+(sx-cx).toFixed(1),y:+(sy-cy).toFixed(1)},shadowDirectionDeg:+shadowDeg.toFixed(1),candleToCardDeg:lightDeg&&+lightDeg.toFixed(1),angleDifferenceDeg:lightDeg==null?null:+Math.abs(((shadowDeg-lightDeg+540)%360)-180).toFixed(1)};});
 if(candle){g.fillStyle='#ffd36a';g.beginPath();g.arc(candle[0],candle[1],9,0,7);g.fill();g.fillStyle='#000c';g.fillRect(candle[0]-150,candle[1]+14,148,24);g.fillStyle='#ffd36a';g.fillText('vela (luz)',candle[0]-140,candle[1]+32);}
 g.fillStyle='#000c';g.fillRect(14,H-62,640,48);g.fillStyle='#fff';g.fillText('vermelho: sombra projetada pelas cartas (com cartas − sem cartas)',24,H-42);g.fillStyle='#ffd36a';g.fillText('tracejado: vela → carta   ',24,H-22);g.fillStyle='#ff5a4d';g.fillText('seta: direção da sombra (×6)',230,H-22);
 return {png:c.toDataURL('image/png'),cards:out};},{full:b64('full.png'),none:b64('no-card.png'),info});
fs.writeFileSync(out,Buffer.from(res.png.split(',')[1],'base64'));console.log(JSON.stringify({lamp:info.lamp,candle:info.props.find(p=>p.id==='candle'),cards:res.cards}));await browser.close();
