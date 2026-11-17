// Rodada 3 (11/11/2026) · mesa cheia para conferir encaixes: reservas dos dois lados com cartas, Emanação ocupada dos
// dois lados, mão rival com 7 cartas, Nartvanyr com cartas. Mede, no DOM, cada moldura contra o seu conteúdo e captura
// a tela. QA_BASE aponta a versão medida. Uso: node scripts/rodada3-layout.mjs <out-dir>  VIEWS="1920x1080,1366x768"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/rodada3-20261111/layout']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',views=(process.env.VIEWS||'1920x1080,1366x768').split(',').map(v=>v.split('x').map(Number)),expectNew=!process.env.BASELINE,tol=Number(process.env.TOL||1.5);
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const report={base,runs:[]};
const fill=()=>{const s=setup();const {a,b,room}=s;room.matchId='rodada3';room.phase='prep';room.turn=a.id;
 a.hand=['FL10','RG07','FV08','FV14','FV03'].map(id=>card(id,a));b.hand=['FL06','FL01','FL06','FL01','FL06','FL01','FL06'].map(id=>card(id,b));
 for(const [p,ids] of [[a,['FV01','FV03','FV06','FV07','FV15']],[b,['FL01','FL02','FL04','FL05','FL21','FL06']]])for(const id of ids){try{p.reserve.push(card(id,p));}catch{}}
 for(const p of [a,b]){const em=p.reserve.filter(c=>c.type==='creature').slice(0,2);p.emanation=em.map(c=>c.uid);}
 a.discard=['FV10','FV11'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.discard=['FL07','FL08','FL09'].flatMap(id=>{try{return [card(id,b)];}catch{return [];}});
 return s;};
try{for(const [vw,vh] of views){const tag=vw+'x'+vh;
 const ctx=await browser.newContext({viewport:{width:vw,height:vh}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const s=fill();await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1600);
 await page.screenshot({path:path.join(out,tag+'.png')});
 const m=await page.evaluate(()=>{const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return r.width?{x:+r.x.toFixed(1),y:+r.y.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}:null;},q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
  const camp=c=>{const n=q('.reserve-camp.'+c);return {frame:R(n),row:R(n?.querySelector('.card-row')),cards:all('.reserve-camp.'+c+' .card-row>.card').map(R)};};
  const nart=q('.nartvanyr');
  return {self:camp('self-camp'),rival:camp('opponent-camp'),
   rivalHand:all('#opponent-hand>*').map(R).filter(Boolean),
   nartvanyr:{frame:R(nart),children:[...(nart?.querySelectorAll('*')||[])].filter(n=>n.getBoundingClientRect().width).map(n=>({id:n.id||String(n.className).split(' ')[0]||n.tagName,...R(n)}))},
   emana:all('#self-emana .card,#opponent-emana .card').map(n=>({...R(n),text:!!n.querySelector('.card-rules,.rules,.card-text')})),
   lanes:R(q('#lanes')),fieldSides:all('#lanes .lane-side').map(R),hybridFrames:window.RunaHybrid?.stats?.metrics?.partition||null};});
 const inside=(o,i,t=tol)=>o&&i&&i.x>=o.x-t&&i.y>=o.y-t&&i.r<=o.r+t&&i.b<=o.b+t;
 const rc=m.rival.cards,sc=m.self.cards,avg=l=>l.length?l.reduce((n,c)=>n+c.h,0)/l.length:0;
 const visibleHand=m.rivalHand.map(c=>({h:c.h,visible:Math.max(0,Math.min(c.b,vh)-Math.max(c.y,0))})),handShown=visibleHand.length?Math.max(...visibleHand.map(c=>c.visible/c.h)):0;
 const fieldW=m.fieldSides.length?Math.max(...m.fieldSides.map(r=>r.r))-Math.min(...m.fieldSides.map(r=>r.x)):0,fieldL=m.fieldSides.length?Math.min(...m.fieldSides.map(r=>r.x)):0,fieldR=fieldL+fieldW;
 const nartOut=m.nartvanyr.children.filter(c=>!inside(m.nartvanyr.frame,c,/^(DIV|opponent-grave|self-grave|IMG|B)$/.test(c.id)?-3:1)).map(c=>({id:c.id,dx:+(Math.max(0,c.r-m.nartvanyr.frame.r,m.nartvanyr.frame.x-c.x)).toFixed(1),dy:+(Math.max(0,c.b-m.nartvanyr.frame.b,m.nartvanyr.frame.y-c.y)).toFixed(1)}));
 const summary={rivalCardH:+avg(rc).toFixed(1),selfCardH:+avg(sc).toFixed(1),rivalCardsOutside:rc.filter(c=>!inside(m.rival.frame,c)).length,selfCardsOutside:sc.filter(c=>!inside(m.self.frame,c)).length,rivalFrame:m.rival.frame,selfFrame:m.self.frame,
  rivalHandShown:+handShown.toFixed(3),rivalHandCardH:visibleHand[0]?.h??null,field:{left:fieldL,right:fieldR,w:+fieldW.toFixed(1)},reserveEdges:{left:m.self.frame?.x,right:m.self.frame?.r},nartvanyrOverflow:nartOut,emanaWithText:m.emana.filter(e=>e.text).length,emana:m.emana.length};
 report.runs.push({view:[vw,vh],summary,m});console.log(tag,JSON.stringify(summary));
 if(expectNew){
  check(tag+': cartas da reserva rival do mesmo tamanho das aliadas (±3%)',summary.rivalCardH&&summary.selfCardH&&Math.abs(summary.rivalCardH/summary.selfCardH-1)<=.03,{rival:summary.rivalCardH,self:summary.selfCardH});
  check(tag+': todas as cartas das duas reservas dentro das molduras',summary.rivalCardsOutside===0&&summary.selfCardsOutside===0,{rival:summary.rivalCardsOutside,self:summary.selfCardsOutside});
  check(tag+': mão rival mostra pelo menos 45% da altura das cartas',summary.rivalHandShown>=.45,{shown:summary.rivalHandShown});
  check(tag+': nada do Nartvanyr sai da sua janela',nartOut.length===0,nartOut);
  check(tag+': cartas da Emanação sem texto descritivo',summary.emana>0&&summary.emanaWithText===0,{emana:summary.emana,withText:summary.emanaWithText});
  check(tag+': bordas do campo alinhadas às bordas da reserva aliada (±12 px)',m.self.frame&&Math.abs(fieldL-m.self.frame.x)<=12&&Math.abs(fieldR-m.self.frame.r)<=12,{field:summary.field,reserve:summary.reserveEdges});}
 check(tag+': sem erros de página',!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify(report,null,1));finish(out,'rodada3-layout',H,{report});
