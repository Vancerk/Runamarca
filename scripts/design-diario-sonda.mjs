// Estudo de design S2 (12/11/2026) · diário de caça: captura repouso e formação com a fixture de abertura-campo,
// recorta o diário no tamanho de uso (DPR 1) e mede caixa, luminância/contato com o feltro e folga até obstáculos.
// Somente leitura. Uso: TAG=antes node scripts/design-diario-sonda.mjs <out-dir>   VIEWS="1907x945,1366x768"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,place,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/design-hud-objeto-20261112/objeto/sonda']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3086',tag0=process.env.TAG||'run',views=(process.env.VIEWS||'1907x945,1366x768').split(',').map(v=>v.split('x').map(Number));
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const report={base,tag:tag0,runs:[]};
const probe=page=>page.evaluate(()=>{const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return r.width?{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}:null;};
 const box=RunaHybridProps.stats.boxes.diary||null,btn=document.querySelector('.hybrid-prop[data-prop=diary]'),c=box&&{x:box.x+box.w/2,y:box.y+box.h/2};
 const obstacles={registro:R(document.getElementById('camp-log')),hand:R(document.getElementById('hand')),lanes:R(document.getElementById('lanes')),buttons:[...document.querySelectorAll('button:not(.hybrid-prop)')].filter(b=>b.offsetParent).map(b=>({id:b.id||b.className.split(' ')[0],r:R(b)})).filter(b=>b.r)};
 const gap=(a,b)=>!a||!b?null:+Math.max(b.x-(a.x+a.w),a.x-(b.x+b.w),b.y-(a.y+a.h),a.y-(b.y+b.h)).toFixed(1);
 const near=obstacles.buttons.map(b=>({id:b.id,gap:gap(box,b.r)})).sort((a,b)=>a.gap-b.gap).slice(0,3);
 const hit=c&&document.elementFromPoint(c.x,c.y);
 return {box,button:R(btn),label:btn?.getAttribute('aria-label'),visible:RunaHybridProps.stats.visible,hit:hit?(hit.dataset?.prop||hit.id||hit.className):null,gaps:{registro:gap(box,obstacles.registro),hand:gap(box,obstacles.hand),lanes:gap(box,obstacles.lanes)},near,obstacles:{registro:obstacles.registro,hand:obstacles.hand,lanes:obstacles.lanes}};});
// Luminância média (sRGB→Y) no retângulo do diário e num anel de feltro logo abaixo/à direita (contato/sombra) vs. feltro distante.
// O canvas WebGL não preserva o buffer, então a medida vem da própria captura (PNG decodificado na página).
// rosa: vermelho dominante e claro (franjas/bisel); azul: azul acima do vermelho (fita); croma = max-min.
const lum=async(page,rect)=>{const png=(await page.screenshot()).toString('base64');return page.evaluate(async([src,r])=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const off=new OffscreenCanvas(img.width,img.height),x=off.getContext('2d');x.drawImage(img,0,0);
 const Y=(a)=>{const d=x.getImageData(Math.max(0,Math.round(a.x)),Math.max(0,Math.round(a.y)),Math.max(1,Math.round(a.w)),Math.max(1,Math.round(a.h))).data;let s=0,n=0,ch=0,pink=0,blue=0;for(let i=0;i<d.length;i+=4){const [R,G,B]=[d[i],d[i+1],d[i+2]];s+=.2126*R+.7152*G+.0722*B;ch+=Math.max(R,G,B)-Math.min(R,G,B);if(R>110&&R>G*1.7&&R>B*1.3)pink++;if(B>R+12)blue++;n++;}return {Y:+(s/n).toFixed(1),croma:+(ch/n).toFixed(1),rosa:+(pink/n*100).toFixed(2),azul:+(blue/n*100).toFixed(2)};};
 return {objeto:Y(r),contato:Y({x:r.x,y:r.y+r.h,w:r.w,h:8}),feltroLonge:Y({x:r.x,y:r.y+r.h+34,w:r.w,h:8})};},[png,rect]);};
try{for(const [vw,vh] of views){
 const ctx=await browser.newContext({viewport:{width:vw,height:vh}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const paint=async prepare=>{const s=setup();s.a.hand=['FL10','RG07','FV08','FV14'].map(id=>card(id,s.a));place(s.a,card('FL06',s.a),1);place(s.b,card('FL06',s.b),1);s.room.matchId='campo';prepare?.(s);
  await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1500);};
 const tag=vw+'x'+vh,run={view:[vw,vh]};
 for(const [state,prep] of [['repouso',null],['formacao',s=>{s.room.phase='formation';s.room.turn=null;s.a.ready=false;s.b.ready=false;}]]){
  await paint(prep);if(state==='formacao')await page.waitForTimeout(700);const m=await probe(page);run[state]=m;
  await page.screenshot({path:path.join(out,`${tag}-${state}-${tag0}.png`)});
  if(m.box){const pad=70,clip={x:Math.max(0,m.box.x-pad),y:Math.max(0,m.box.y-pad),w:0,h:0};clip.width=Math.min(vw-clip.x,m.box.w+2*pad);clip.height=Math.min(vh-clip.y,m.box.h+2*pad);delete clip.w;delete clip.h;
   await page.screenshot({path:path.join(out,`${tag}-${state}-${tag0}-diario.png`),clip});run[state].lum=await lum(page,m.box);}
  check(`${tag} ${state}: diário visível e o centro da caixa é o botão do diário`,m.visible.includes('diary')&&m.hit==='diary',{visible:m.visible,hit:m.hit});
  check(`${tag} ${state}: caixa do diário não cruza Registro, mão, campo nem botões`,[m.gaps.registro,m.gaps.hand,m.gaps.lanes].every(g=>g===null||g>=0)&&m.near.every(b=>b.gap>=0),{gaps:m.gaps,near:m.near});}
 // teclado: Tab até o diário, Enter abre, virar página, Esc fecha e devolve o foco
 await paint();await page.focus('.hybrid-prop[data-prop=diary]');await page.keyboard.press('Enter');await page.waitForSelector('#diary-note[open]',{timeout:5000});const k1=await page.evaluate(()=>({name:document.querySelector('.diary-note-name').textContent,focus:document.activeElement?.className}));
 await page.keyboard.press('Shift+Tab');await page.keyboard.press('Enter');const k2=await page.evaluate(()=>document.querySelector('.diary-note-name').textContent);await page.keyboard.press('Escape');await page.waitForTimeout(250);const kc=await page.evaluate(()=>({open:document.getElementById('diary-note').open,focus:document.activeElement?.dataset?.prop}));
 check(`${tag}: teclado abre o diário, vira a página e Esc devolve o foco`,/diary-note-close/.test(k1.focus)&&k2!==k1.name&&!kc.open&&kc.focus==='diary',{k1,k2,kc});
 run.keyboard={k1,k2,kc};check(`${tag}: sem erros de página`,!errors.length,errors);report.runs.push(run);
 console.log(tag,JSON.stringify({repouso:{box:run.repouso.box,gaps:run.repouso.gaps,lum:run.repouso.lum},formacao:{box:run.formacao.box,gaps:run.formacao.gaps}}));await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,`diario-${tag0}.json`),JSON.stringify(report,null,1));finish(out,'design-diario-sonda',H,{report});
