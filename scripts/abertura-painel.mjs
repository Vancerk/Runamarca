// Painel de controle à direita do tabuleiro (10/11/2026) · captura e mede o painel nos estados de vez, voto, formação e combate.
// O eixo da moldura é achado pelos pixels da captura (a moldura de bronze é desenhada na mesa 3D): em cada linha da faixa
// do painel procura-se a borda clara da moldura à esquerda e à direita; o eixo é a mediana do ponto médio.
// Cada elemento (título, luzes, legenda, botões) é comparado com esse eixo.
// Uso: node scripts/abertura-painel.mjs <out-dir>   QA_BASE, VIEWS="1920x1080,1366x768"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,place,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/abertura-20261109/painel']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',views=(process.env.VIEWS||'1920x1080,1366x768,1600x900,2560x1440,1280x720').split(',').map(v=>{const [size,dpr='1']=v.split('@'),[w,h]=size.split('x').map(Number);return [w,h,Number(dpr)];});// LxA ou LxA@escala (escala do Windows/zoom)
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const report={base,runs:[]};
const states={
 'sua-vez':({room,a})=>{room.phase='prep';room.turn=a.id;},
 'vez-do-rival':({room,b})=>{room.phase='prep';room.turn=b.id;},
 'voto':({room,a,b})=>{room.phase='vote';room.turn=null;a.vote=null;b.vote=null;},
 'formacao':({room,a,b})=>{room.phase='formation';room.turn=null;a.ready=false;b.ready=false;},
};
try{for(const [vw,vh,dpr] of views){const tag=vw+"x"+vh+(dpr!==1?"@"+dpr:"");
 const ctx=await browser.newContext({viewport:{width:vw,height:vh},deviceScaleFactor:dpr});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 for(const [name,prepare] of Object.entries(states)){
  const s=setup();s.a.hand=['FL10','RG07','FV08'].map(id=>card(id,s.a));place(s.a,card('FL06',s.a),1);place(s.b,card('FL06',s.b),1);s.room.matchId='painel';prepare(s);
  await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
  await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.waitForTimeout(1300);
  // espera a placa parar (o foco da formação e o ajuste da composição podem mexer nela depois do primeiro quadro)
  await page.waitForFunction(()=>{const r=document.getElementById('center-actions')?.getBoundingClientRect();const k=r?[r.x,r.y,r.width,r.height].map(v=>Math.round(v)).join(','):'';const ok=k&&window.__panelKey===k;window.__panelKey=k;return ok;},null,{polling:250,timeout:8000}).catch(()=>{});
  const m=await page.evaluate(()=>{const box=n=>{if(!n)return null;const r=n.getBoundingClientRect();return r.width?{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}:null;},q=s=>document.querySelector(s),c=q('#round-circuit');
   return {panel:box(q('#center-actions')),title:box(q('.round-circuit-label')),svg:box(c?.querySelector('svg')),rival:box(c?.querySelector('.rc-rival')),ally:box(c?.querySelector('.rc-ally')),combat:box(c?.querySelector('.rc-combat')),caption:box(q('.round-circuit-state:not([hidden])')),buttons:[...document.querySelectorAll('#phase-actions button')].map(b=>({text:b.textContent.trim(),...box(b)})),
    active:c?.dataset.active,stage:c?.dataset.stage,fills:{rival:getComputedStyle(c.querySelector('.rc-rival')).fill,ally:getComputedStyle(c.querySelector('.rc-ally')).fill,combat:getComputedStyle(c.querySelector('.rc-combat')).fill},paths:[...c.querySelectorAll('.rc-path')].map(p=>({cls:p.getAttribute('class'),d:p.getAttribute('d'),stroke:getComputedStyle(p).stroke}))};});
  if(!m.panel){check(`${tag} ${name}: painel presente`,false,m);continue;}
  /* o recorte não pode passar da tela: senão a imagem sai menor que o recorte pedido e a escala do eixo erra (formação, painel encostado na borda) */const cx0=Math.max(0,Math.round(m.panel.x-46)),cy0=Math.max(0,Math.round(m.panel.y-40)),clip={x:cx0,y:cy0,width:Math.min(Math.round(m.panel.w+92),vw-cx0),height:Math.min(Math.round(m.panel.h+80),vh-cy0)};
  const file=`${tag.replace("@","-escala")}-${name}.png`;await page.screenshot({path:path.join(out,file),clip});
  // eixo da moldura pelos pixels: bordas claras (bronze) mais externas em cada linha do recorte
  const axis=await page.evaluate(async([b64,clip])=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const k=im.width/clip.width;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data,mids=[],bronze=(x,y)=>{const i=(y*c.width+x)*4,r=d[i],gg=d[i+1],b=d[i+2];return r>150&&gg>105&&b<140&&r-b>50;};
   // do centro do painel para fora, nas faixas sem conteúdo (acima do título e abaixo dos botões): primeira linha de bronze de cada lado
   const cx=Math.round(c.width/2),rows=[];for(let y=Math.round(c.height*.14);y<c.height*.2;y++)rows.push(y);for(let y=Math.round(c.height*.82);y<c.height*.87;y++)rows.push(y);
   /* só perto da moldura do próprio painel (o véu do foco clareia bordas vizinhas) */const reach=Math.round((clip.pw/2+24)*k);for(const y of rows){let l=-1,r=-1;for(let x=cx;x>=Math.max(0,cx-reach);x--)if(bronze(x,y)){l=x;break;}for(let x=cx;x<Math.min(c.width,cx+reach);x++)if(bronze(x,y)){r=x;break;}if(l>=0&&r>=0&&r-l>c.width*.4)mids.push((l+r)/2);}
   mids.sort((a,b)=>a-b);return mids.length>8?{x:clip.x+mids[mids.length>>1]/k,rows:mids.length}:null;},[fs.readFileSync(path.join(out,file)).toString('base64'),{...clip,pw:m.panel.w}]);
  const ref=axis?.x??m.panel.cx,off=b=>b?+(b.cx-ref).toFixed(1):null;
  const offsets={title:off(m.title),circuit:off(m.svg),combat:off(m.combat),lightsPair:m.rival&&m.ally?+(((m.rival.cx+m.ally.cx)/2)-ref).toFixed(1):null,caption:off(m.caption),buttons:m.buttons.map(off)};
  const vertical=m.rival&&m.ally?{rivalAbove:m.rival.cy<m.ally.cy-4,combatBetween:m.combat.cy>m.rival.cy&&m.combat.cy<m.ally.cy,combatAfter:m.combat.cx>Math.max(m.rival.cx,m.ally.cx)+4}:null;
  report.runs.push({view:[vw,vh],dpr,state:name,axis:axis?'pixels':'caixa do painel',axisX:+ref.toFixed(1),panelBoxOffset:+(m.panel.cx-ref).toFixed(1),offsets,vertical,active:m.active,stage:m.stage,fills:m.fills,paths:m.paths,file});
  const all=[offsets.title,offsets.circuit,offsets.caption,...offsets.buttons].filter(v=>v!=null);
  check(`${tag} ${name}: título, circuito, legenda e botões a no máximo 1,5 px do eixo da moldura`,all.length>=2&&all.every(v=>Math.abs(v)<=1.5),{axis:axis?'pixels':'caixa',offsets});
  check(`${tag} ${name}: luz do rival em cima, a do jogador embaixo e a de combate no ponto de chegada`,vertical&&vertical.rivalAbove&&vertical.combatBetween&&vertical.combatAfter,vertical);
  const lit={'sua-vez':'ally','vez-do-rival':'rival','voto':'none','formacao':'combat'}[name];check(`${tag} ${name}: luz acesa = ${lit}`,m.active===lit,{active:m.active,fills:m.fills});
 }
 check(`${tag}: sem erros de página`,!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'painel.json'),JSON.stringify(report,null,1));finish(out,'abertura-painel',H,{report});
