// Estudo de design (12/11/2026) · sonda do HUD do Patrono (faixa de baixo e de cima), só leitura: captura a página e
// recortes em escala nativa e mede separações, sobreposições de texto e cortes, com a barra de rolagem visível.
// Variantes: éter baixo (1/10, vida 7) e cheio (10/10, vida 30); preparação e formação; hover e foco do 1º poder.
// Uso: node scripts/design-hud-sonda.mjs <out-dir>   QA_BASE=http://127.0.0.1:3086 VIEWS="1907x945,1366x768"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/design-hud-objeto-20261112/hud/sonda']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3086',views=(process.env.VIEWS||'1907x945,1366x768').split(',').map(v=>v.split('x').map(Number));
const fill=(phase,level)=>{const s=setup();const {a,b,room}=s;room.matchId='design-hud';room.phase=phase;room.turn=a.id;room.round=2;
 const full=level==='full';a.mana=full?10:1;a.manaMax=10;b.mana=full?10:0;b.manaMax=full?10:3;a.patron.hp=b.patron.hp=full?30:7;
 a.hand=['FL10','RG07','FV08','FV14','FV03','FV01'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.hand=['FL06','FL01','FL06'].map(id=>card(id,b));
 for(const [p,ids] of [[a,['FV06','FV07']],[b,['FL01','FL02']]])for(const id of ids){try{p.reserve.push(card(id,p));}catch{}}
 a.study={seenIds:Array.from({length:full?28:4},(_,i)=>'s'+i),total:30,activated:full?[10,20]:[],discount:false,sharing:false,centerNeighbor:2,positionEffects:[]};
 return s;};
const measure=()=>{const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};};
 const gapX=(a,b)=>a&&b?+(b.x-a.r).toFixed(1):null,ov=(a,b)=>a&&b?Math.max(0,Math.min(a.r,b.r)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.y,b.y)):0;
 const vw=document.documentElement.clientWidth,vh=innerHeight;
 return [...document.querySelectorAll('.player-band')].filter(b=>b.offsetWidth).map(band=>{const q=s=>band.querySelector(s),box=R(band);
  const heartText=q('.patron-heart .patron-hp-value'),powers=[...band.querySelectorAll('.patron-power-wrap')].map(w=>{const btn=w.querySelector('.patron-power'),cost=w.querySelector('.power-cost>b'),cs=getComputedStyle(btn);
   return {id:btn.dataset.power,disabled:btn.disabled,used:btn.classList.contains('used-power'),box:R(w),button:R(btn),cost:R(cost),costText:cost?.textContent,opacity:cs.opacity,filter:cs.filter,study:R(w.querySelector('.study-progress')),studyText:w.querySelector('.study-progress')?.firstChild?.textContent};});
  const ether=q('.patron-ether'),count=q('.ether-count'),avatar=q('.patron-avatar'),heart=q('.patron-heart'),points=[...band.querySelectorAll('.ether-point')].map(R);
  const texts=[['vida',R(heartText)],['eter',R(count)],...powers.flatMap((p,i)=>[['custo'+i,p.cost],['estudos'+i,p.study]])].filter(t=>t[1]);
  const textOverlaps=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=ov(texts[i][1],texts[j][1]);if(a>0.5)textOverlaps.push([texts[i][0],texts[j][0],+a.toFixed(1)]);}
  const clipped=texts.filter(([,r])=>r.x<0||r.y<0||r.r>vw||r.b>vh).map(t=>t[0]);
  // texto coberto por outro elemento no centro (elementFromPoint) — sinal de corte real, não só de proximidade
  const covered=[['vida',heartText],['eter',count],...powers.map((p,i)=>['custo'+i,band.querySelectorAll('.patron-power-wrap .power-cost>b')[i]]),...powers.map((p,i)=>['estudos'+i,band.querySelectorAll('.patron-power-wrap')[i]?.querySelector('.study-progress')])].filter(t=>t[1]).map(([k,n])=>{const r=n.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return [k,!e||n.contains(e)||e.contains(n)||n.closest('.patron-power-wrap,.patron-avatar,.patron-ether')?.contains(e)?'ok':(e.className?.baseVal??e.className)||e.tagName];}).filter(t=>t[1]!=='ok');
  const pts=points.length>1?points.slice(1).map((p,i)=>+(p.x-points[i].r).toFixed(1)).filter(g=>g>-20):[];
  return {side:band.classList.contains('lower-zone')?'baixo':'cima',box,trough:box&&{y:+(box.y+box.h/2-25).toFixed(1),b:+(box.y+box.h/2+25).toFixed(1)},
   ether:R(ether),count:R(count),countText:count?.textContent,countFont:count&&getComputedStyle(count).fontSize,pointSize:points[0]&&points[0].w,pointGaps:[...new Set(pts)],
   avatar:R(avatar),heart:R(heart),heartText:R(heartText),heartValue:heartText?.textContent,
   gaps:{eterAvatar:gapX(R(ether),R(avatar)),avatarPoderes:gapX(R(avatar),powers[0]?.box),poderes:powers.length>1?gapX(powers[0].box,powers[1].box):null,bandaViewportDir:box?+(vw-box.r).toFixed(1):null,
    eterForaBanda:R(ether)&&box?+(box.x-R(ether).x).toFixed(1):null,poderesForaBanda:powers.at(-1)&&box?+(powers.at(-1).box.r-box.r).toFixed(1):null},
   powers,textOverlaps,clipped,covered};});};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,ignoreDefaultArgs:['--hide-scrollbars']});const report=[];
try{for(const [vw,vh] of views)for(const phase of ['prep','formation'])for(const level of ['low','full']){const tag=`${vw}x${vh}-${phase}-${level}`;
 const ctx=await browser.newContext({viewport:{width:vw,height:vh}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await ctx.route('**/api/rooms/*/act',r=>r.fulfill({status:409,json:{error:'teste'}}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.addStyleTag({content:'html{overflow-y:scroll!important}'});await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const s=fill(phase,level);await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1600);
 await page.mouse.move(vw/2,vh/2);await page.waitForTimeout(200);
 await page.screenshot({path:path.join(out,tag+'.png')});const m=await page.evaluate(measure);
 for(const b of m)if(b.box){const pad=40,x=Math.max(0,Math.floor(Math.min(b.box.x,b.ether?.x??b.box.x)-pad)),r=Math.min(vw,Math.ceil(Math.max(b.box.r,b.powers.at(-1)?.box.r??b.box.r)+pad)),y=Math.max(0,Math.floor(b.box.y-pad)),bb=Math.min(vh,Math.ceil(b.box.b+pad));
  await page.screenshot({path:path.join(out,`${tag}-${b.side}.png`),clip:{x,y,width:r-x,height:bb-y}});}
 // hover e foco do 1º poder da faixa de baixo
 const wrap=page.locator('.player-band.lower-zone .patron-power-wrap').first();let hover=null,focus=null;
 if(await wrap.count()){await wrap.hover();await page.waitForTimeout(250);hover=await page.evaluate(()=>{const z=document.querySelector('.patron-power-zoom');if(!z)return null;const r=z.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,inView:r.x>=0&&r.y>=0&&r.right<=document.documentElement.clientWidth&&r.bottom<=innerHeight};});
  const lb=m.find(b=>b.side==='baixo');await page.screenshot({path:path.join(out,tag+'-hover.png'),clip:{x:Math.max(0,lb.box.x-120),y:Math.max(0,Math.min(lb.box.y,hover?.y??lb.box.y)-20),width:Math.min(vw-Math.max(0,lb.box.x-120),Math.max(lb.box.w+240,(hover?.r??0)-lb.box.x+160)),height:Math.min(vh-Math.max(0,Math.min(lb.box.y,hover?.y??lb.box.y)-20),Math.max(lb.box.b,hover?.b??0)-Math.min(lb.box.y,hover?.y??lb.box.y)+40)}});
  await page.mouse.move(vw/2,vh/2);await page.waitForTimeout(200);
  await page.keyboard.press('Tab');await page.evaluate(()=>{const w=document.querySelector('.player-band.lower-zone .patron-power-wrap'),b=w.querySelector('.patron-power');(b.disabled?w:b).focus();});await page.waitForTimeout(250);
  focus=await page.evaluate(()=>{const a=document.activeElement,cs=getComputedStyle(a);return {tag:a.tagName,cls:a.className,outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor,boxShadow:cs.boxShadow.slice(0,120),zoom:Boolean(document.querySelector('.patron-power-zoom')),focusVisible:a.matches(':focus-visible')};});
  await page.screenshot({path:path.join(out,tag+'-foco.png'),clip:{x:Math.max(0,lb.box.x-60),y:Math.max(0,lb.box.y-40),width:Math.min(vw-Math.max(0,lb.box.x-60),lb.box.w+200),height:Math.min(vh-Math.max(0,lb.box.y-40),lb.box.h+80)}});}
 report.push({tag,bands:m,hover,focus,errors});
 for(const b of m){check(`${tag} ${b.side}: nenhum texto do HUD (vida, éter, custos, X/30) sobreposto a outro texto`,!b.textOverlaps.length,b.textOverlaps);
  check(`${tag} ${b.side}: nenhum texto do HUD fora da tela`,!b.clipped.length,b.clipped);
  check(`${tag} ${b.side}: nenhum texto do HUD coberto no centro por outro elemento`,!b.covered.length,b.covered);}
 if(hover)check(`${tag}: detalhe do poder ao passar o mouse dentro da tela`,hover.inView,hover);
 if(focus)check(`${tag}: foco do teclado chega ao poder e abre o detalhe`,focus.zoom,focus);
 check(`${tag}: sem erros de página`,!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'hud.json'),JSON.stringify(report,null,1));finish(out,'design-hud-sonda',H,{});
