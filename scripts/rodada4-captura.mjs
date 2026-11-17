// Rodada 4 (11/11/2026) · capturas e medidas da mesa no tamanho da tela do dono (1907×945 por padrão), em preparação
// e na formação (zoom de combate): Emanação ocupada, Nartvanyr com 5 e 3 cartas, painéis laterais e espaços livres.
// Uso: node scripts/rodada4-captura.mjs <out-dir>   VIEWS="1907x945,1366x768,1920x1080"
import fs from 'node:fs';import path from 'node:path';
import {chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/rodada4-20261111/captura']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',views=(process.env.VIEWS||'1907x945').split(',').map(v=>v.split('x').map(Number));
const fill=phase=>{const s=setup();const {a,b,room}=s;room.matchId='rodada4';room.phase=phase;room.turn=a.id;room.round=2;
 a.hand=['FL10','RG07','FV08','FV14','FV03'].map(id=>card(id,a));b.hand=['FL06','FL01','FL06','FL01','FL06'].map(id=>card(id,b));
 for(const [p,ids] of [[a,['FV01','FV03','FV06','FV07']],[b,['FL01','FL02','FL04','FL05']]])for(const id of ids){try{p.reserve.push(card(id,p));}catch{}}
 for(const p of [a,b]){const em=p.reserve.filter(c=>c.type==='creature').slice(0,1);p.emanation=em.map(c=>c.uid);}
 a.discard=['FV10','FV11','FV12'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.discard=['FL07','FL08','FL09','FL10','FL11'].flatMap(id=>{try{return [card(id,b)];}catch{return [];}});
 // magias preparadas nos cantos das casas (uma sua à vista, uma do rival oculta)
 {const pool=['FV08','FV14','FL10','RG07','FV03','FL06'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});const sp=pool.find(c=>c.type!=='creature');if(sp){a.prepared=[{card:sp,lane:0,targetSide:a.id,paidRound:2,paid:1,hidden:false,sharedLane:false}];const sb=card(sp.id,b);b.prepared=[{card:sb,lane:2,targetSide:b.id,paidRound:2,paid:1,hidden:true,sharedLane:false}];}}
 // Registro com lances dos dois lados (nomes de cartas públicas viram miniaturas no Registro)
 const L=(round,phase,turn,actor,message)=>room.log.push({message,round,phase,turn,actor,at:Date.now()});const rn=c=>c?.name||'uma carta';
 L(1,'prep',a.id,a.id,'Você jogou '+rn(a.reserve[0])+'.');L(1,'prep',b.id,b.id,'O rival jogou '+rn(b.reserve[0])+'.');L(1,'vote',null,null,'Os dois votaram por combater.');L(1,'resolving',null,null,rn(a.reserve[1])+' venceu o confronto do centro.');L(2,'prep',a.id,a.id,'Você enviou '+rn(a.reserve[2])+' para a Emanação.');L(2,'prep',b.id,b.id,'O rival jogou '+rn(b.reserve[1])+'.');L(2,'prep',b.id,b.id,'O rival encerrou a vez.');
 return s;};
const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return r.width?{x:+r.x.toFixed(1),y:+r.y.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}:null;};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,ignoreDefaultArgs:process.env.SCROLLBARS?['--hide-scrollbars']:[]});const report=[];
try{for(const [vw,vh] of views)for(const phase of (process.env.PHASES||'prep,formation').split(',')){const tag=`${vw}x${vh}-${phase}`;
 const ctx=await browser.newContext({viewport:{width:vw,height:vh},deviceScaleFactor:Number(process.env.DSF||1)});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const s=fill(phase);await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1800);
 await page.screenshot({path:path.join(out,tag+'.png')});
 const m=await page.evaluate(src=>{const R=eval(src),q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
  const quad=n=>{const st=window.RunaHybrid?.stats;return null;};
  return {reg:R(q('#registro-pergaminho:not([hidden])')),nart:R(q('.nartvanyr')),nartKids:all('.nartvanyr>*').map(n=>({c:String(n.className).split(' ')[0]||n.tagName,...R(n)})),log:R(q('#camp-log')),actions:R(q('#center-actions')),actionsKids:all('#center-actions>*:not([hidden])').map(n=>({c:n.id||String(n.className).split(' ')[0]||n.tagName,...R(n)})).filter(k=>k.w),
   lanes:R(q('#lanes')),sides:all('#lanes .lane-side').map(R),emanaSlots:all('.emanation-column,#self-emana,#opponent-emana').map(n=>({c:n.id||String(n.className).split(' ')[0],...R(n)})),emanaCards:all('#self-emana .card,#opponent-emana .card').map(R),
   selfCamp:R(q('.reserve-camp.self-camp')),rivalCamp:R(q('.reserve-camp.opponent-camp')),hand:R(q('#hand')),focus:window.RunaHybridFocus?.stats?.value??null,client:document.documentElement.clientWidth,gutter:getComputedStyle(document.documentElement).scrollbarGutter,factor:window.RunaHybrid?.stats?.focus?.factor??null};},R.toString());
 const pad=(r,k=14)=>r&&{x:Math.max(0,r.x-k),y:Math.max(0,r.y-k),width:Math.min(vw,r.r+k)-Math.max(0,r.x-k),height:Math.min(vh,r.b+k)-Math.max(0,r.y-k)};
 const join=(...l)=>{l=l.filter(Boolean);return l.length?{x:Math.min(...l.map(r=>r.x)),y:Math.min(...l.map(r=>r.y)),r:Math.max(...l.map(r=>r.r)),b:Math.max(...l.map(r=>r.b))}:null;};
 for(const [name,box] of [['emanacao',join(...m.emanaSlots.filter(e=>/emanation-column/.test(e.c)).slice(0,1))],['nartvanyr',join(m.nart,m.log)],['rodada',m.actions],['registro',m.reg]])if(box)await page.screenshot({path:path.join(out,tag+'-'+name+'.png'),clip:pad(box)});
 if(process.env.HOVER){const t=await page.$('#registro-trilho .registro-pedra button');if(t){await t.hover();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,tag+'-registro-detalhe.png')});await page.mouse.move(vw/2,vh/2);}}
 report.push({tag,m,errors});console.log(tag,JSON.stringify({nart:m.nart,log:m.log,actions:m.actions,lanes:m.lanes,emanaCards:m.emanaCards,focus:m.focus,errors:errors.length}));await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'captura.json'),JSON.stringify(report,null,1));
