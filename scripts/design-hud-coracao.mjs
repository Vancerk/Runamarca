// Estudo de design (12/11/2026) · coração do Patrono x 1º poder: mede, por amostragem, quanto do disco do 1º poder
// fica sob o coração (desenho e clique) e grava recortes ampliados (×3) da junção, nas duas faixas.
// Uso: node scripts/design-hud-coracao.mjs <out-dir>   QA_BASE=http://127.0.0.1:3086 VIEWS="1907x945,1366x768"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/design-hud-objeto-20261112/hud/coracao']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3086',views=(process.env.VIEWS||'1907x945,1366x768').split(',').map(v=>v.split('x').map(Number));
const fill=phase=>{const s=setup();const {a,b,room}=s;room.matchId='design-hud';room.phase=phase;room.turn=a.id;room.round=2;a.mana=a.manaMax=10;b.mana=b.manaMax=10;a.patron.hp=b.patron.hp=30;
 a.hand=['FL10','RG07','FV08'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.hand=['FL06','FL01'].map(id=>card(id,b));
 a.study={seenIds:Array.from({length:28},(_,i)=>'s'+i),total:30,activated:[10,20],discount:false,sharing:false,centerNeighbor:2,positionEffects:[]};return s;};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,ignoreDefaultArgs:['--hide-scrollbars']});const report=[];
try{for(const [vw,vh] of views)for(const phase of ['prep','formation']){const tag=`${vw}x${vh}-${phase}`;
 const ctx=await browser.newContext({viewport:{width:vw,height:vh},deviceScaleFactor:3});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await ctx.route('**/api/rooms/*/act',r=>r.fulfill({status:409,json:{error:'teste'}}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.addStyleTag({content:'html{overflow-y:scroll!important}'});await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const s=fill(phase);await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.waitForTimeout(1600);await page.mouse.move(vw/2,vh/2);
 const m=await page.evaluate(()=>[...document.querySelectorAll('.player-band')].filter(b=>b.offsetWidth).map(band=>{
  const heart=band.querySelector('.patron-heart'),path=heart?.querySelector('path'),btn=band.querySelector('.patron-power'),wrap=btn?.closest('.patron-power-wrap');if(!heart||!btn)return null;
  const hb=heart.getBoundingClientRect(),bb=btn.getBoundingClientRect(),cx=bb.x+bb.width/2,cy=bb.y+bb.height/2,rad=bb.width/2;
  // desenho: pontos do disco do poder que caem dentro do caminho do coração (geometria SVG, inclui o contorno)
  const svg=heart.querySelector('svg'),ctm=path.getScreenCTM().inverse(),pt=svg.createSVGPoint();let inDisk=0,underHeart=0,hitHeart=0,minGap=Infinity;
  for(let y=Math.floor(bb.y);y<=bb.bottom;y+=.5)for(let x=Math.floor(bb.x);x<=bb.right;x+=.5){const d=Math.hypot(x-cx,y-cy);pt.x=x;pt.y=y;const p=pt.matrixTransform(ctm);
   const inHeart=path.isPointInFill(p)||path.isPointInStroke(p);if(inHeart)minGap=Math.min(minGap,d-rad);if(d>rad)continue;inDisk++;if(inHeart){underHeart++;const e=document.elementFromPoint(x,y);if(e&&heart.contains(e))hitHeart++;}}
  // folga mínima: varre o contorno do coração e mede a distância até a borda do disco
  if(minGap===Infinity){for(let y=hb.y;y<=hb.bottom;y+=.5)for(let x=hb.x;x<=hb.right;x+=.5){pt.x=x;pt.y=y;const p=pt.matrixTransform(ctm);if(path.isPointInFill(p)||path.isPointInStroke(p))minGap=Math.min(minGap,Math.hypot(x-cx,y-cy)-rad);}}
  const hs=getComputedStyle(heart);return {side:band.classList.contains('lower-zone')?'baixo':'cima',heart:{x:hb.x,y:hb.y,r:hb.right,b:hb.bottom,pointerEvents:hs.pointerEvents,z:hs.zIndex},disk:{cx,cy,rad},
   inDisk,underHeart,pctUnder:+(100*underHeart/inDisk).toFixed(2),hitHeart,minGapPx:+minGap.toFixed(2),wrap:{x:wrap.getBoundingClientRect().x}};}).filter(Boolean));
 for(const b of m){const x=Math.max(0,b.heart.x-20),y=Math.max(0,Math.min(b.heart.y,b.disk.cy-b.disk.rad)-12);await page.screenshot({path:path.join(out,`${tag}-${b.side}-juncao-x3.png`),clip:{x,y,width:b.disk.cx+b.disk.rad+20-x,height:Math.max(b.heart.b,b.disk.cy+b.disk.rad)+12-y}});
  check(`${tag} ${b.side}: coração não cobre o disco do 1º poder (desenho)`,b.underHeart===0,b);}
 report.push({tag,m,errors});check(`${tag}: sem erros de página`,!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'coracao.json'),JSON.stringify(report,null,1));finish(out,'design-hud-coracao',H,{});
