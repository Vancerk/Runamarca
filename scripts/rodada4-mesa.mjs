// Rodada 4 (11/11/2026, dono) · verificação com a BARRA DE ROLAGEM VISÍVEL (como no Chrome do dono; o Playwright a
// esconde por padrão, e foi assim que a placa da Rodada saiu ~10 px fora do conteúdo sem nenhum teste acusar).
// Confere, em preparação e na formação: camadas de tela cheia na largura de innerWidth, carta da Emanação preenchendo
// a casa, Nartvanyr com miniatura + número (sem "carta(s)"), campo ocupando a altura entre as reservas em repouso,
// painéis laterais crescendo com o zoom do combate e dentro da tela.
// Uso: node scripts/rodada4-mesa.mjs <out-dir>   VIEWS="1907x945,1366x768,1920x1080,2560x1305"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/rodada4-20261111/mesa']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',views=(process.env.VIEWS||'1907x945,1366x768,1920x1080,2560x1305').split(',').map(v=>v.split('x').map(Number));
const fill=(phase,emptyRival)=>{const s=setup();const {a,b,room}=s;room.matchId='rodada4';room.phase=phase;room.turn=a.id;room.round=2;
 a.hand=['FL10','RG07','FV08','FV14','FV03'].map(id=>card(id,a));b.hand=['FL06','FL01','FL06','FL01','FL06'].map(id=>card(id,b));
 for(const [p,ids] of [[a,['FV01','FV03','FV06','FV07']],[b,['FL01','FL02','FL04','FL05']]])for(const id of ids){try{p.reserve.push(card(id,p));}catch{}}
 for(const p of [a,b]){const em=p.reserve.filter(c=>c.type==='creature').slice(0,1);p.emanation=em.map(c=>c.uid);}
 a.discard=['FV10','FV11','FV12'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.discard=emptyRival?[]:['FL07','FL08','FL09','FL10','FL11'].flatMap(id=>{try{return [card(id,b)];}catch{return [];}});
 // Registro com lances dos dois lados (nomes de cartas públicas viram miniaturas no Registro)
 const L=(round,phase,turn,actor,message)=>room.log.push({message,round,phase,turn,actor,at:Date.now()});const rn=c=>c?.name||'uma carta';
 L(1,'prep',a.id,a.id,'Você jogou '+rn(a.reserve[0])+'.');L(1,'prep',b.id,b.id,'O rival jogou '+rn(b.reserve[0])+'.');L(1,'vote',null,null,'Os dois votaram por combater.');L(1,'resolving',null,null,rn(a.reserve[1])+' venceu o confronto do centro.');L(2,'prep',a.id,a.id,'Você enviou '+rn(a.reserve[2])+' para a Emanação.');L(2,'prep',b.id,b.id,'O rival jogou '+rn(b.reserve[1])+'.');L(2,'prep',b.id,b.id,'O rival encerrou a vez.');
 return s;};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,ignoreDefaultArgs:['--hide-scrollbars']});const report=[];
try{for(const [vw,vh] of views)for(const phase of ['prep','formation']){const tag=`${vw}x${vh}-${phase}`;
 const ctx=await browser.newContext({viewport:{width:vw,height:vh}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.addStyleTag({content:'html{overflow-y:scroll!important}'});// barra clássica de 15 px, como no Chrome do dono
 await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const s=fill(phase,vw===1366);await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1800);
 await page.screenshot({path:path.join(out,tag+'.png')});
 const m=await page.evaluate(()=>{const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height};},q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],bb=p=>({x:Math.min(...p.map(v=>v.x)),y:Math.min(...p.map(v=>v.y)),r:Math.max(...p.map(v=>v.x)),b:Math.max(...p.map(v=>v.y))}),sc=window.RunaHybrid?.scene||{};
  const sockets=(sc.emanaSockets||[]).filter(s=>s.uid).map(s=>{const node=document.querySelector(`#self-emana [data-uid="${s.uid}"],#opponent-emana [data-uid="${s.uid}"]`);const face=node?.querySelector('.hybrid-card-face')||node;return {id:s.id,inner:bb(s.inner),card:R(face)};});
  const graves=['opponent','self'].map(id=>{const g=q('#'+id+'-grave');return {id,text:g?.textContent||'',aria:g?.getAttribute('aria-label')||'',count:g?.querySelector('.grave-count')?R(g.querySelector('.grave-count')):null,countText:g?.querySelector('.grave-count')?.textContent||'',button:R(g),thumb:R(g?.querySelector('img,span'))};});
  return {inner:innerWidth,client:document.documentElement.clientWidth,layers:all('.hybrid-canvas,.hybrid-focus-veil').map(n=>({c:n.getAttribute('class'),w:n.getBoundingClientRect().width,shown:getComputedStyle(n).display!=='none'})),
   sockets,graves,nart:R(q('.nartvanyr')),actions:R(q('#center-actions')),log:R(q('#camp-log')),field:sc.field?bb(sc.field.quad):null,rival:R(q('.reserve-camp.opponent-camp')),own:R(q('.reserve-camp.self-camp')),
   panelScale:sc.panelScale??null,reg:(()=>{const n=q('#registro-trilho');if(!n||n.hidden)return null;const list=n.querySelector('.registro-trilho-lista');const tiles=[...n.querySelectorAll('.registro-pedra')];return {...R(n),tiles:tiles.length,fit:window.RunaRegistroTrilho?.tiles??null,firstLabel:tiles[0]?.querySelector('button')?.getAttribute('aria-label')||'',noScroll:list.scrollHeight<=list.clientHeight+1,lastTile:tiles.length?R(tiles.at(-1)):null,sides:tiles.map(t=>t.className.match(/lado-([a-z]+)/)?.[1])};})(),lights:['.rc-ally','.rc-rival'].map(k=>{const n=q('#round-circuit '+k);if(!n)return null;const m=getComputedStyle(n).fill.match(/[0-9]+([.][0-9]+)?/g)?.map(Number)||[];return {r:m[0],g:m[1],b:m[2]};}),seats:['self','opponent'].map(c=>{const camp=q('.reserve-camp.'+c+'-camp');const cards=[...camp.querySelectorAll('.card-row>.card')].map(R);return {c,campBottom:camp.getBoundingClientRect().bottom,campH:camp.getBoundingClientRect().height,cardBottoms:cards.map(x=>x.b)};}),stateLast:(state.log||[]).filter(e=>e&&e.phase!=='lobby'&&e.phase!=='coin').at(-1)?.message||'',logVisibility:getComputedStyle(q('#camp-log')).visibility,props:all('.hybrid-prop:not([hidden])').map(n=>({id:n.dataset.prop,...R(n)})),lastLog:q('#log')?.lastElementChild?.textContent||'',focus:sc.focus||null,restGap:window.RunaHybridConfig?.compose?.restGapPx??window.RunaHybridConfig?.HYBRID?.compose?.restGapPx??6};});
 report.push({tag,m,errors});
 check(tag+': tela 3D e véu na largura de innerWidth (com a barra visível)',m.layers.filter(l=>l.c.includes('hybrid-canvas')).every(l=>Math.abs(l.w-m.inner)<.6)&&m.client<m.inner,{inner:m.inner,client:m.client,layers:m.layers});
 check(tag+': carta da Emanação centrada na casa e preenchendo-a (margens iguais ±2 px — a perspectiva desloca ~1 px —, cada uma ≤ 7% da casa)',m.sockets.length>0&&m.sockets.every(s=>{if(!s.card)return false;const l=s.card.x-s.inner.x,r=s.inner.r-s.card.r,t=s.card.y-s.inner.y,b=s.inner.b-s.card.b,W=s.inner.r-s.inner.x,Hh=s.inner.b-s.inner.y;return Math.abs(l-r)<=2&&Math.abs(t-b)<=2&&[l,r].every(v=>v>=-1&&v<=W*.07)&&[t,b].every(v=>v>=-1&&v<=Hh*.07);}),m.sockets.map(s=>({id:s.id,l:+(s.card.x-s.inner.x).toFixed(1),r:+(s.inner.r-s.card.r).toFixed(1),t:+(s.card.y-s.inner.y).toFixed(1),b:+(s.inner.b-s.card.b).toFixed(1)})));
 check(tag+': Nartvanyr só com miniatura e número (sem "carta(s)", rótulo acessível completo)',m.graves.every(g=>!/carta/.test(g.text)&&/^\d+$/.test(g.countText)&&/\d+ cartas?$/.test(g.aria)),m.graves);
 check(tag+': caixinha do número e miniatura dentro do nicho',m.graves.every(g=>g.button&&g.count&&g.thumb&&[g.count,g.thumb].every(r=>r.y>=g.button.y-1&&r.b<=g.button.b+1&&r.x>=g.button.x-1&&r.r<=g.button.r+1)),m.graves);
 check(tag+': painéis laterais dentro da tela',[m.nart,m.actions,m.log].every(r=>r&&r.x>=0&&r.r<=m.client&&r.y>=0&&r.b<=vh),{nart:m.nart,actions:m.actions,log:m.log});
 if(phase==='prep'){
  const up=m.field.y-m.rival.b,down=m.own.y-m.field.b;
  check(tag+': em repouso o campo ocupa a altura entre as reservas (folga ≤ restGapPx + 4 px)',up<=m.restGap+4&&down<=m.restGap+4&&up>=-1&&down>=-1,{up:+up.toFixed(1),down:+down.toFixed(1),restGap:m.restGap,depth:m.focus?.depthFactor});
  check(tag+': painéis em tamanho normal fora do combate',Math.abs((m.panelScale??1)-1)<1e-3,{panelScale:m.panelScale});
 }else check(tag+': no zoom do combate Rodada, Nartvanyr e Registro crescem junto (×1,3)',Math.abs((m.panelScale??0)-1.3)<.01,{panelScale:m.panelScale});
 check(tag+': luzes da Rodada: aliado sempre azul, rival sempre vermelho',m.lights.every(Boolean)&&m.lights[0].b>m.lights[0].r&&m.lights[1].r>m.lights[1].b,m.lights);
 check(tag+': cartas das duas reservas assentadas no apoio (base da carta a ≤ 16% da altura da estante da borda de baixo)',m.seats.every(x=>x.cardBottoms.length&&x.cardBottoms.every(b=>x.campBottom-b>=0&&x.campBottom-b<=x.campH*.16)),m.seats.map(x=>({c:x.c,gaps:x.cardBottoms.map(b=>+(x.campBottom-b).toFixed(1)),limit:+(x.campH*.16).toFixed(1)})));
 // Registro vertical (calha à esquerda do Nartvanyr): em repouso, mais novo em cima, sem rolagem; some no zoom do combate
 const wantReg=phase==='prep';
 check(tag+(wantReg?': Registro vertical visível e gaveta antiga oculta':': zoom do combate: calha do Registro oculta (volta ao fim)'),wantReg?Boolean(m.reg)&&m.logVisibility==='hidden':!m.reg,{reg:m.reg,log:m.logVisibility});
 if(m.reg){
  check(tag+': calha dentro da tela, à esquerda do Nartvanyr, sem sobrepor a coluna nem os objetos da mesa',m.reg.x>=0&&m.reg.y>=0&&m.reg.b<=vh&&m.reg.r<=m.nart.x-8&&m.props.every(pr=>pr.r<=m.reg.x||pr.x>=m.reg.r||pr.b<=m.reg.y||pr.y>=m.reg.b),{reg:m.reg,nartLeft:m.nart.x,props:m.props});
  check(tag+': lance mais novo em cima, sem rolagem, pedras dentro da calha',m.reg.firstLabel.includes(m.stateLast)&&m.reg.noScroll&&m.reg.tiles>0&&m.reg.tiles<=m.reg.fit&&m.reg.lastTile.b<=m.reg.b+.5,{first:m.reg.firstLabel,last:m.stateLast,tiles:m.reg.tiles,fit:m.reg.fit,noScroll:m.reg.noScroll});
  check(tag+': cor de cada lado nas pedras (aliado/rival/mesa)',m.reg.sides.includes('aliado')&&m.reg.sides.includes('rival'),m.reg.sides);
  check(tag+': Nartvanyr mais alto que largo (ocupa o lugar da antiga gaveta)',m.nart.h>=m.nart.w*1.5,{nart:m.nart});
  const tile=await page.$('#registro-trilho .registro-pedra button');await tile.hover();await page.waitForTimeout(250);
  const tip=await page.evaluate(()=>{const t=document.getElementById('registro-trilho-detalhe');if(!t||t.hidden)return null;const r=t.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,text:t.querySelector('p')?.textContent||''};});
  check(tag+': passar o mouse mostra o lance ao lado da calha, dentro da tela',Boolean(tip&&tip.text===m.stateLast&&tip.x>=m.reg.r&&tip.r<=vw&&tip.y>=0&&tip.b<=vh),tip);await page.mouse.move(vw/2,vh/2);}
 check(tag+': sem erros de página',!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'mesa.json'),JSON.stringify(report,null,1));finish(out,'rodada4-mesa',H,{report});
