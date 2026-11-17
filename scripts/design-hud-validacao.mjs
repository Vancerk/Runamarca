// Estudo de design (12/11/2026) · validação do ajuste coração × 1º poder, só leitura do produto.
// "antes" = rodada4.css servido sem o bloco do estudo (interceptação na página, checkout intacto); "depois" = CSS atual.
// Por cenário: hit-test (elementFromPoint) em TODO o disco do 1º poder das duas faixas; Vida Extra pelo fluxo real
// state → render (patron.extraLife); Tab/Shift+Tab reais até o 1º poder; em preparação, clique no centro e na borda
// mais próxima do coração de um poder habilitado, com /act interceptado localmente.
// Uso: node scripts/design-hud-validacao.mjs <out-dir>   QA_BASE=http://127.0.0.1:3086 VIEWS="1907x945,1366x768"
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/design-hud-objeto-20261112/hud/validacao']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3086',views=(process.env.VIEWS||'1907x945,1366x768').split(',').map(v=>v.split('x').map(Number));
const MARK='/* Estudo de design (12/11/2026)';
const stripStudy=css=>{const i=css.indexOf(MARK);if(i<0)return null;const m=css.indexOf('@media (min-width:901px){',i);const end=css.indexOf('\n}',m);return end<0?null:css.slice(0,i)+css.slice(end+2);};
const fill=(phase,extra)=>{const s=setup();const {a,b,room}=s;room.matchId='design-hud-val';room.phase=phase;room.turn=a.id;room.round=2;a.mana=a.manaMax=10;b.mana=b.manaMax=10;a.patron.hp=b.patron.hp=30;
 a.patron.extraLife=b.patron.extraLife=extra;
 a.hand=['FL10','RG07','FV08','FV14','FV03','FV01'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.hand=['FL06','FL01','FL06'].map(id=>card(id,b));
 for(const [p,ids] of [[a,['FV06','FV07']],[b,['FL01','FL02']]])for(const id of ids){try{p.reserve.push(card(id,p));}catch{}}
 a.study={seenIds:Array.from({length:28},(_,i)=>'s'+i),total:30,activated:[10,20],discount:false,sharing:false,centerNeighbor:2,positionEffects:[]};return s;};
// mede uma faixa: disco do 1º poder, coração, Vida Extra e quem recebe cada ponto do disco
const measure=()=>[...document.querySelectorAll('.player-band')].filter(b=>b.offsetWidth).map(band=>{
 const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),r:+r.right.toFixed(2),b:+r.bottom.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)};};
 const ov=(a,b)=>a&&b?+(Math.max(0,Math.min(a.r,b.r)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.y,b.y))).toFixed(2):0;
 const heart=band.querySelector('.patron-heart'),hp=heart?.querySelector('.patron-hp-value'),wrap=band.querySelector('.patron-power-wrap'),btn=wrap?.querySelector('.patron-power'),badge=band.querySelector('.patron-extra-life'),avatar=band.querySelector('.patron-avatar');
 const bb=btn.getBoundingClientRect(),cx=bb.x+bb.width/2,cy=bb.y+bb.height/2,rad=bb.width/2;
 const who=e=>!e?'nada':wrap.contains(e)?'poder':heart&&heart.contains(e)?'coracao':badge&&badge.contains(e)?'vida-extra':'outro:'+((e.className?.baseVal??e.className)||e.tagName).toString().split(' ')[0];
 const hits={},heartPts=[];let n=0;for(let y=Math.floor(bb.y);y<=bb.bottom;y+=.5)for(let x=Math.floor(bb.x);x<=bb.right;x+=.5){if(Math.hypot(x-cx,y-cy)>rad)continue;n++;const k=who(document.elementFromPoint(x,y));hits[k]=(hits[k]||0)+1;if(k==='coracao')heartPts.push([x,y]);}
 // o desenho visível do coração (centro do número e meio do lobo esquerdo) continua recebendo o ponteiro
 const hr=heart.getBoundingClientRect(),drawn={number:who(document.elementFromPoint(hr.x+hr.width/2,hr.y+hr.height*.45)),lobe:who(document.elementFromPoint(hr.x+hr.width*.25,hr.y+hr.height*.35)),title:heart.title,aria:heart.getAttribute('aria-label')};
 // ponto da borda do disco (r−2) mais próximo do desenho do coração
 const path=heart.querySelector('path'),svg=heart.querySelector('svg'),ctm=path.getScreenCTM().inverse(),pt=svg.createSVGPoint(),hb=heart.getBoundingClientRect(),hpts=[];
 for(let y=hb.y;y<=hb.bottom;y+=1)for(let x=hb.x;x<=hb.right;x+=1){pt.x=x;pt.y=y;const p=pt.matrixTransform(ctm);if(path.isPointInFill(p)||path.isPointInStroke(p))hpts.push([x,y]);}
 let edge=null;for(let a=0;a<360;a+=1){const t=a*Math.PI/180,x=cx+(rad-2)*Math.cos(t),y=cy+(rad-2)*Math.sin(t);let d=Infinity;for(const [hx,hy] of hpts)d=Math.min(d,Math.hypot(hx-x,hy-y));if(!edge||d<edge.dist)edge={angle:a,x:+x.toFixed(2),y:+y.toFixed(2),dist:+d.toFixed(2)};}
 edge.hit=who(document.elementFromPoint(edge.x,edge.y));
 const badgeRect=R(badge),badgeHit=badge?who(document.elementFromPoint(badgeRect.x+badgeRect.w/2,badgeRect.y+badgeRect.h/2)):null,vw=document.documentElement.clientWidth;
 let badgeDiskGap=null;if(badgeRect){const nx=Math.max(badgeRect.x,Math.min(cx,badgeRect.r)),ny=Math.max(badgeRect.y,Math.min(cy,badgeRect.b));badgeDiskGap=+(Math.hypot(nx-cx,ny-cy)-rad).toFixed(2);}
 return {side:band.classList.contains('lower-zone')?'baixo':'cima',power:btn.dataset.power,disabled:btn.disabled,disk:{cx:+cx.toFixed(2),cy:+cy.toFixed(2),rad:+rad.toFixed(2)},samples:n,hits,heartPts,drawn,edge,
  heart:R(heart),hpText:R(hp),hpValue:hp?.textContent,avatar:R(avatar),band:R(band),
  extraLife:badge?{rect:badgeRect,text:badge.textContent,visible:getComputedStyle(badge).visibility==='visible'&&badgeRect.w>0,inView:badgeRect.x>=0&&badgeRect.y>=0&&badgeRect.r<=vw&&badgeRect.b<=innerHeight,centerHit:badgeHit,
   overlapHeart:ov(badgeRect,R(heart)),overlapHpText:ov(badgeRect,R(hp)),overlapAvatar:ov(badgeRect,R(avatar)),diskGap:badgeDiskGap}:null};});
// Acréscimo S2 (controle): QA_SERVE_SNAPSHOT=<pasta com cópia de mesa-nova> serve /runamarca/<arquivo> dessa cópia
// quando existir nela (com sha256 registrado em snapshot-servido.json); sem a variável, nada muda.
const SNAP=process.env.QA_SERVE_SNAPSHOT,snapServed={};
const snapFile=u=>{if(!SNAP||!u.pathname.startsWith('/runamarca/'))return null;const rel=decodeURIComponent(u.pathname.slice('/runamarca/'.length));if(!rel||rel.includes('..'))return null;
 const f=path.join(SNAP,rel);if(!fs.existsSync(f)||!fs.statSync(f).isFile())return null;snapServed[rel]??=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');return f;};
const effect=o=>JSON.stringify({sent:o.sent,picker:o.picker,dialogs:o.dialogs,bodyAdded:o.bodyAdded});
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,ignoreDefaultArgs:['--hide-scrollbars']});const report=[];
try{for(const [vw,vh] of views)for(const css of ['antes','depois'])for(const phase of ['prep','formation'])for(const extra of [0,5]){const tag=`${vw}x${vh}-${css}-${phase}-vx${extra}`;
 const ctx=await browser.newContext({viewport:{width:vw,height:vh},deviceScaleFactor:1});const sent=[];let served=null;
 await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort('blockedbyclient');
  if(/\/api\/rooms\/[^/]+\/act$/.test(u.pathname)){sent.push(r.request().postDataJSON());return r.fulfill({status:409,json:{error:'teste'}});}
  const snap=snapFile(u);if(snap&&!u.pathname.endsWith('/rodada4.css'))return r.fulfill({path:snap});
  if(u.pathname.endsWith('/rodada4.css')){const resp=await r.fetch(),body=snap?fs.readFileSync(snap,'utf8'):await resp.text();const hasStudy=body.includes(MARK);
   if(css==='antes'){const s=stripStudy(body);served={hasStudy,stripped:s!==null,removedBytes:s===null?0:body.length-s.length,keepsMinus14:s?.includes('patron-heart{right:-14px}')??null};return r.fulfill({response:resp,body:s??body});}
   served={hasStudy,stripped:false,removedBytes:0};return r.fulfill({response:resp,body});}
  return r.continue();});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.addStyleTag({content:'html{overflow-y:scroll!important}'});await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const s=fill(phase,extra);await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1800);
 await page.mouse.move(vw/2,vh/2);await page.waitForTimeout(200);
 const m=await page.evaluate(measure);
 // "depois" sem a correção da caixa (ponteiro devolvido à caixa do coração só nesta página): pontos do disco que o coração tomava
 let pre=null;if(css==='depois'){const h=await page.addStyleTag({content:'.patron-heart,.patron-heart *{pointer-events:auto!important}'});pre=(await page.evaluate(measure)).map(b=>({side:b.side,hits:b.hits,heartPts:b.heartPts}));await h.evaluate(n=>n.remove());}
 for(const b of m){const x=Math.max(0,Math.floor(Math.min(b.avatar.x,b.heart.x)-30)),y=Math.max(0,Math.floor(Math.min(b.avatar.y,b.disk.cy-b.disk.rad,b.extraLife?.rect.y??1e9)-16)),r=Math.min(vw,Math.ceil(b.disk.cx+b.disk.rad+30)),bt=Math.min(vh,Math.ceil(Math.max(b.heart.b,b.avatar.b,b.disk.cy+b.disk.rad)+16));
  await page.screenshot({path:path.join(out,`${tag}-${b.side}.png`),clip:{x,y,width:r-x,height:bt-y}});}
 // teclado real: Tab a partir do documento até o 1º poder da faixa de baixo, depois Shift+Tab e Tab
 await page.evaluate(()=>{document.activeElement?.blur?.();window.__seq=[];});
 const desc=()=>page.evaluate(()=>{const a=document.activeElement,w=document.querySelector('.player-band.lower-zone .patron-power-wrap');window.__seq.push(a);
  return {tag:a.tagName,cls:String(a.className?.baseVal??a.className).split(' ').slice(0,2).join(' '),power:a.dataset?.power||null,target:Boolean(w&&w.contains(a)),focusVisible:a.matches(':focus-visible'),zoom:Boolean(document.querySelector('.patron-power-zoom')),outline:getComputedStyle(a).outlineStyle+' '+getComputedStyle(a).outlineWidth,shadow:getComputedStyle(a).boxShadow!=='none'};});
 const seq=[];let reached=null;for(let i=1;i<=120;i++){await page.keyboard.press('Tab');const d=await desc();seq.push(d);if(d.target){await page.waitForTimeout(250);reached={...(await desc()),presses:i};break;}}
 let back=null,fwd=null;if(reached){await page.keyboard.press('Shift+Tab');await page.waitForTimeout(150);back=await page.evaluate(()=>{const a=document.activeElement,s=window.__seq;return {sameAsPrevious:a===s[s.length-3],tag:a.tagName,cls:String(a.className?.baseVal??a.className).split(' ')[0],zoomClosed:!document.querySelector('.patron-power-zoom')};});
  await page.keyboard.press('Tab');await page.waitForTimeout(250);fwd=await page.evaluate(()=>{const a=document.activeElement,w=document.querySelector('.player-band.lower-zone .patron-power-wrap');return {target:Boolean(w&&w.contains(a)),zoom:Boolean(document.querySelector('.patron-power-zoom'))};});}
 // sem Escape aqui: na mesa, Escape sem nada aberto abre o menu da sala e contaminaria o clique seguinte
 await page.evaluate(()=>document.activeElement?.blur?.());await page.mouse.move(vw/2,vh/2);await page.waitForTimeout(200);
 const anyOpen=()=>page.evaluate(()=>Boolean(document.getElementById('target-picker')?.open)||document.querySelectorAll('dialog[open]').length>0);
 // clique do mouse (preparação): centro e borda mais próxima do coração do 1º poder de baixo, se habilitado
 let clicks=null;const low=m.find(b=>b.side==='baixo');
 if(phase==='prep'&&low&&!low.disabled){const outcome=async(x,y)=>{sent.length=0;const openBefore=await anyOpen();const before=await page.evaluate(()=>document.body.className);await page.mouse.click(x,y);await page.waitForTimeout(400);
   const o=await page.evaluate(b=>({picker:Boolean(document.getElementById('target-picker')?.open),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id),bodyAdded:document.body.className.split(' ').filter(c=>c&&!b.split(' ').includes(c))}),before);
   const r={at:[x,y],sent:sent.map(c=>({type:c.type,power:c.power??c.powerId??null,keys:Object.keys(c)})),...o,openBefore};if(await anyOpen())await page.keyboard.press('Escape');await page.mouse.move(vw/2,vh/2);await page.waitForTimeout(300);return r;};
  const center=await outcome(low.disk.cx,low.disk.cy),edgeClick=await outcome(low.edge.x,low.edge.y);clicks={center,edge:{...edgeClick,hitBefore:low.edge.hit,distToHeart:low.edge.dist}};
  // clique real em pontos que a caixa do coração tomava antes da correção (até 6, espaçados na lista)
  const pts=pre?.find(b=>b.side==='baixo')?.heartPts||[];if(pts.length){const pick=[...new Set(Array.from({length:Math.min(6,pts.length)},(_,i)=>Math.round(i*(pts.length-1)/Math.max(1,Math.min(6,pts.length)-1))))].map(i=>pts[i]);
   clicks.heartBox=[];for(const [x,y] of pick)clicks.heartBox.push(await outcome(x,y));}}
 report.push({tag,served,m,pre,keyboard:{reached,back,fwd,seq:reached?seq.slice(-4):seq.slice(-6)},clicks,errors});
 check(`${tag}: rodada4.css servido como "${css}"`,css==='antes'?Boolean(served?.stripped&&served.keepsMinus14===false):Boolean(served?.hasStudy),served);
 if(css==='depois'){for(const b of m){const foreign=Object.entries(b.hits).filter(([k])=>k!=='poder');
   check(`${tag} ${b.side}: todo o disco do 1º poder entrega o clique ao próprio poder`,!foreign.length,{hits:b.hits,samples:b.samples});
   check(`${tag} ${b.side}: borda do 1º poder mais próxima do coração pertence ao poder`,b.edge.hit==='poder',b.edge);
   check(`${tag} ${b.side}: o coração não intercepta nenhum ponto do disco do 1º poder`,!b.hits.coracao,{coracao:b.hits.coracao||0,semCorrecaoDaCaixa:pre?.find(p=>p.side===b.side)?.hits.coracao||0,samples:b.samples});
   check(`${tag} ${b.side}: o desenho do coração recebe o ponteiro e mantém title/aria`,b.drawn.number==='coracao'&&b.drawn.lobe==='coracao'&&/ de \d+ de vida$/.test(b.drawn.title)&&b.drawn.aria===b.drawn.title,b.drawn);
   if(extra){const e=b.extraLife;check(`${tag} ${b.side}: Vida Extra renderizada, visível, na tela e sem cobrir o número da vida`,Boolean(e&&e.visible&&e.inView&&e.text==='5'&&e.overlapHpText===0&&e.centerHit==='vida-extra'),e);}}
  check(`${tag}: Tab real chega ao 1º poder e abre o detalhe; Shift+Tab volta ao anterior e Tab retorna`,Boolean(reached&&reached.zoom&&back?.sameAsPrevious&&fwd?.target),{reached,back,fwd});
  if(clicks)check(`${tag}: clique na borda junto ao coração tem o mesmo efeito do clique no centro`,effect(clicks.edge)===effect(clicks.center)&&effect(clicks.center)!==effect({sent:[],picker:false,dialogs:[],bodyAdded:[]}),clicks);
  if(clicks?.heartBox)check(`${tag}: clique real nos ${clicks.heartBox.length} pontos que a caixa do coração tomava tem o mesmo efeito do centro`,clicks.heartBox.every(o=>effect(o)===effect(clicks.center)),clicks.heartBox);}
 check(`${tag}: sem erros de página`,!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'validacao.json'),JSON.stringify(report,null,1));if(SNAP)fs.writeFileSync(path.join(out,'snapshot-servido.json'),JSON.stringify({snapshot:SNAP,files:snapServed},null,1));finish(out,'design-hud-validacao',H,{});
