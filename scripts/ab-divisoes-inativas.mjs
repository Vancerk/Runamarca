// A/B local (12/11/2026, dono) · contorno das divisões internas INATIVAS do campo (#lanes > .lane > .lane-side).
// capture: mesma cena (fixture local), viewport, DPR 1, rolagem 0 e esperas fixas; repouso (preparação), formação com
// arrasto de uma carta da reserva (legal-drop / drop-ready) e cancelamento (Esc), e "provocar": preparação com uma casa
// provocada (taunted-space) e mira real de uma magia da mão (hover num alvo) seguida de cancelamento; e "ancorar":
// criatura própria ancorada (anchored-space aplicado pelo app), solta e reancorada (transição do cache).
// No repouso registra também o diagnóstico dos baralhos (cena projetada, rebuilds/desenhos e DOM de #self/#opponent-deck).
// Cada captura só é gravada quando dois quadros seguidos (400 ms) saem idênticos (imagens decodificadas antes).
// AB_BRIDGE=<arquivo> serve esse arquivo no lugar de /hybrid/bridge.js (A = bridge.js.antes, sem mexer no checkout).
// compare: diferença ref×teste por pixel, por casa (faixa da borda) e fora do campo, com amostras de cor e do feltro.
// Uso: node scripts/ab-divisoes-inativas.mjs <out-dir> capture <rótulo>   |   ... <out-dir> compare <ref=A> <teste=B>
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view,place,spell} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/ab-divisoes-inativas-20261112',mode='capture',label='A',label2='B']=process.argv.slice(2),H=harness(out),{check}=H;
const base=process.env.QA_BASE||'http://127.0.0.1:3086',views=(process.env.VIEWS||'1907x945,1366x768').split(',').map(v=>v.split('x').map(Number));
const phases=(process.env.PHASES||'prep,formation,provocar').split(',');
const ACTIVE=/^(drop-ready|legal-drop|aim-legal|aim-hover|taunted-space|anchored-space|sleeping-space|duel-stasis|lane-buffed|has-patron-binding|sealed-space|has-prepared-magic|effect-positive|effect-negative)$/;
const fill=phase=>{const s=setup();const {a,b,room}=s;room.matchId='ab-divisoes';room.phase=phase==='formation'?'formation':'prep';room.turn=a.id;room.round=2;a.mana=a.manaMax=10;
 a.hand=['FL10','RG07','FV08'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.hand=['FL06','FL01'].map(id=>card(id,b));
 for(const [p,ids] of [[a,['FV06','FV07']],[b,['FL01','FL02']]])for(const id of ids){try{p.reserve.push(card(id,p));}catch{}}
 // Provocar vem da criatura própria na posição 1 (a formação rival fica oculta na preparação): marca a casa rival 1.
 if(phase==='provocar'){s.taunter=place(a,a.reserve[0],1);a.taunts={[s.taunter.uid]:1};place(b,b.reserve[0],0);s.aim=spell(a,[{op:'damage',target:'any_creature',amount:1}],{name:'Faísca de teste'});a.hand.push(s.aim);}
 // Ancoragem real: a criatura própria na posição 1 recebe anchor (como o efeito 'anchor' do jogo) e o app marca a casa.
 if(phase==='ancorar'){s.anchored=place(a,a.reserve[0],1);s.anchored.anchor={lane:1,remaining:2,setAt:room.combatCount||0};place(b,b.reserve[0],0);}
 return s;};
// Diagnóstico dos baralhos no instante da captura: cena projetada, contadores de rebuild/desenho e o DOM de #self/#opponent-deck.
const deckDiag=()=>{const H=window.RunaHybrid,st=H.stats,el=id=>{const n=document.getElementById(id);if(!n)return null;const r=n.getBoundingClientRect(),cs=getComputedStyle(n);
  return {rect:[r.x,r.y,r.width,r.height].map(v=>+v.toFixed(2)),transform:cs.transform,opacity:cs.opacity,visibility:cs.visibility,filter:cs.filter,backgroundImage:cs.backgroundImage.slice(0,200),style:n.getAttribute('style'),cls:n.className,
   imgs:[...n.querySelectorAll('img')].map(i=>({src:(i.currentSrc||i.src).slice(-80),nw:i.naturalWidth,nh:i.naturalHeight,complete:i.complete})),children:n.children.length};};
 return {sceneDecks:JSON.parse(JSON.stringify(H.scene?.decks??null)),builds:st.builds,draws:st.draws,incremental:JSON.parse(JSON.stringify(st.incremental||{})),self:el('self-deck'),opponent:el('opponent-deck')};};
const sideInfo=re=>[...document.querySelectorAll('#lanes>.lane>.lane-side')].map((n,i)=>({i,owner:n.dataset.owner||'',cls:[...n.classList].filter(c=>new RegExp(re).test(c)),cards:n.querySelectorAll(':scope>.card').length,zone:window.RunaHybrid.zone(n)}));
const cls=list=>list.map(x=>x.cls);
async function capture(browser){const report=[],bridge=process.env.AB_BRIDGE&&fs.readFileSync(process.env.AB_BRIDGE);let served=0;
 for(const [vw,vh] of views)for(const phase of phases){const tag=`${vw}x${vh}-${phase}`;
  const ctx=await browser.newContext({viewport:{width:vw,height:vh},deviceScaleFactor:1,reducedMotion:'reduce'});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
  await ctx.route('**/api/rooms/*/act',r=>r.fulfill({status:409,json:{error:'teste'}}));
  if(bridge)await ctx.route(u=>/\/hybrid\/bridge\.js$/.test(new URL(u).pathname),r=>{served++;return r.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:bridge});});
  const page=await ctx.newPage();page.on('pageerror',e=>H.errors.push(tag+': '+e.message));
  // Só mensagens do console com WebGL/GPU entram em H.gpu (não há consulta ao contexto GL).
  page.on('console',m=>{if(/webgl|gl_|gpu|context lost|shader/i.test(m.text()))H.gpu.push(tag+' ['+m.type()+']: '+m.text().slice(0,300));});
  await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
  const s=fill(phase),v=JSON.parse(JSON.stringify(view(s.room,s.a)));
  await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...v,serverNow:Date.now()});
  await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(2,2);await page.waitForTimeout(1600);
  const shot=async name=>{const file=`${label}-${tag}-${name}.png`;let prev=null,tries=0,stable=false;
   for(;tries<8&&!stable;tries++){await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));const buf=await page.screenshot();stable=!!prev&&prev.equals(buf);prev=buf;if(!stable)await page.waitForTimeout(400);}
   fs.writeFileSync(path.join(out,file),prev);check(`${label} ${tag} ${name}: dois quadros seguidos idênticos antes de gravar`,stable,{tries});return {file,tries,stable};};
  const sides=()=>page.evaluate(sideInfo,ACTIVE.source);
  const d0=await page.evaluate(deckDiag),r0=await shot('repouso'),entry={tag,phase,viewport:[vw,vh],dpr:await page.evaluate(()=>devicePixelRatio),rest:{...r0,sides:await sides(),field:await page.evaluate(()=>window.RunaHybrid.scene.field.quad),partition:await page.evaluate(()=>window.RunaHybrid.scene.partition),decksBefore:d0,decks:await page.evaluate(deckDiag)}};
  if(phase==='ancorar'){check(`${label} ${tag}: repouso com exatamente uma casa ancorada (anchored-space, renderizada pelo app) e nenhum outro destaque`,JSON.stringify(cls(entry.rest.sides).filter(c=>c.length))==='[["anchored-space"]]',cls(entry.rest.sides));
   // Transição: o mesmo estado sem a âncora (casa volta a inativa) e de novo com ela; o cache precisa acompanhar as duas.
   const plain=JSON.parse(JSON.stringify(v)),me=plain.players?.find?.(p=>(p.reserve||[]).some(c=>c.uid===s.anchored.uid))||Object.values(plain.players||{}).find(p=>(p.reserve||[]).some(c=>c.uid===s.anchored.uid)),own=me?.reserve.find(c=>c.uid===s.anchored.uid);
   check(`${label} ${tag}: a vista do jogador expõe anchor na criatura (fixture removível)`,!!own?.anchor,{found:!!own});if(own)delete own.anchor;
   const swap=async st=>{await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...st,serverNow:Date.now()});await page.mouse.move(2,2);await page.waitForTimeout(1600);};
   await swap(plain);entry.loose={...await shot('solto'),sides:await sides(),lastReason:await page.evaluate(()=>window.RunaHybrid.stats.incremental.lastReason)};
   check(`${label} ${tag}: sem a âncora nenhuma casa fica destacada`,entry.loose.sides.every(x=>!x.cls.length),cls(entry.loose.sides));
   await swap(v);entry.reanchor={...await shot('reancorado'),sides:await sides(),lastReason:await page.evaluate(()=>window.RunaHybrid.stats.incremental.lastReason)};
   check(`${label} ${tag}: reancorado volta aos mesmos destaques do repouso`,JSON.stringify(cls(entry.reanchor.sides))===JSON.stringify(cls(entry.rest.sides)),cls(entry.reanchor.sides));}
  else if(phase==='provocar')check(`${label} ${tag}: repouso com exatamente uma casa provocada (taunted-space) e nenhum outro destaque`,JSON.stringify(cls(entry.rest.sides).filter(c=>c.length))==='[["taunted-space"]]',cls(entry.rest.sides));
  else check(`${label} ${tag}: repouso sem destaque nas casas`,entry.rest.sides.every(x=>!x.cls.length),cls(entry.rest.sides));
  if(phase==='formation'){const me=await page.evaluate(()=>seat()?.id),src=page.locator('.reserve-camp.self-camp .card-row>.card').first(),b=await src.boundingBox(),own=entry.rest.sides.find(x=>x.owner===me&&x.zone);
   if(b&&own){const c=own.zone.reduce((p,q)=>({x:p.x+q.x/4,y:p.y+q.y/4}),{x:0,y:0});await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y-40,{steps:5});await page.mouse.move(c.x,c.y,{steps:10});await page.waitForTimeout(1600);
    const before=await sides();entry.drag={...await shot('arrasto'),sides:await sides(),field:await page.evaluate(()=>window.RunaHybrid.scene.field.quad),stats:await page.evaluate(()=>({incremental:JSON.parse(JSON.stringify(window.RunaHybrid.stats.incremental||{})),gameClass:document.getElementById('game').className,bodyClass:document.body.className}))};
    check(`${label} ${tag}: destaques estáveis durante a captura do arrasto`,JSON.stringify(cls(before))===JSON.stringify(cls(entry.drag.sides)),{before:cls(before)});
    check(`${label} ${tag}: arrasto marca destinos legais (legal-drop) e a casa sob o cursor (drop-ready)`,entry.drag.sides.some(x=>x.cls.includes('legal-drop'))&&entry.drag.sides.some(x=>x.cls.includes('drop-ready')),cls(entry.drag.sides));
    await page.keyboard.press('Escape');await page.mouse.up();await page.mouse.move(2,2);await page.waitForTimeout(1600);
    entry.cancel={...await shot('cancelado'),sides:await sides(),lastReason:await page.evaluate(()=>window.RunaHybrid.stats.incremental.lastReason)};
    check(`${label} ${tag}: cancelamento remove todos os destaques`,entry.cancel.sides.every(x=>!x.cls.length),cls(entry.cancel.sides));}
   else check(`${label} ${tag}: carta da reserva e casa própria disponíveis para o arrasto`,false,{b,own});}
  if(phase==='provocar'){const src=page.locator(`#hand .card[data-uid="${s.aim.uid}"]`),b=await src.boundingBox(),t=await page.evaluate(uid=>{const r=tableCard(uid)?.getBoundingClientRect();return r&&r.width?{x:r.x+r.width/2,y:r.y+r.height/2}:null;},s.taunter.uid);
   if(b&&t){const top=await page.evaluate(()=>document.getElementById('hand').getBoundingClientRect().top);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,top-60,{steps:6});await page.mouse.move(t.x,t.y,{steps:10});await page.waitForTimeout(1600);
    const aimInfo=()=>page.evaluate(()=>({active:!!window.RunaTargeting?.active(),legal:document.querySelectorAll('.aim-legal').length,hover:document.querySelectorAll('.aim-hover').length,laneSideAim:document.querySelectorAll('.lane-side.aim-legal,.lane-side.aim-hover').length}));
    entry.aim={...await shot('mira'),sides:await sides(),aim:await aimInfo(),field:await page.evaluate(()=>window.RunaHybrid.scene.field.quad)};
    check(`${label} ${tag}: mira real ativa com um alvo sob o cursor (aim-hover) e alvos legais marcados`,entry.aim.aim.active&&entry.aim.aim.hover===1&&entry.aim.aim.legal>=2,entry.aim.aim);
    // A mira do app marca as próprias casas como alvo (aim-legal/aim-hover); registramos quais e conferimos Provocar.
    check(`${label} ${tag}: durante a mira a casa provocada mantém taunted-space`,entry.rest.sides.every((x,i)=>!x.cls.includes('taunted-space')||entry.aim.sides[i].cls.includes('taunted-space')),cls(entry.aim.sides));
    await page.keyboard.press('Escape');await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();await page.mouse.move(2,2);await page.waitForTimeout(1600);
    entry.cancel={...await shot('mira-cancelado'),sides:await sides(),aim:await aimInfo()};
    check(`${label} ${tag}: cancelar a mira limpa aim-legal/aim-hover e preserva Provocar`,!entry.cancel.aim.active&&!entry.cancel.aim.legal&&!entry.cancel.aim.hover&&JSON.stringify(cls(entry.cancel.sides))===JSON.stringify(cls(entry.rest.sides)),{aim:entry.cancel.aim,sides:cls(entry.cancel.sides)});}
   else check(`${label} ${tag}: magia da mão e alvo provocador disponíveis para a mira`,false,{b,t});}
  report.push(entry);await ctx.close();}
 if(bridge)check(`${label}: bridge.js servido a partir de ${process.env.AB_BRIDGE}`,served>0,{served});
 fs.writeFileSync(path.join(out,`${label}-cena.json`),JSON.stringify(report,null,1));finish(out,`${label}-capture`,H,{label,base,bridge:process.env.AB_BRIDGE||'checkout',served});}
// Diferença por pixel no navegador (sem dependência nova): limiar 12 na soma |ΔR|+|ΔG|+|ΔB|.
async function compare(browser){const ref=label,test=label2,A=JSON.parse(fs.readFileSync(path.join(out,`${ref}-cena.json`),'utf8')),B=JSON.parse(fs.readFileSync(path.join(out,`${test}-cena.json`),'utf8')),page=await browser.newPage(),result=[];
 const url=f=>'data:image/png;base64,'+fs.readFileSync(path.join(out,f)).toString('base64');
 const analyse=async(a,b,sides,field)=>{const r=await measure(url(a),url(b),sides,field),name=`mascara-${path.basename(a,'.png')}--${path.basename(b,'.png')}.png`;fs.writeFileSync(path.join(out,name),Buffer.from(r.maskPng,'base64'));delete r.maskPng;r.mask=name;return r;};
 const measure=(a,b,sides,field)=>page.evaluate(async({a,b,sides,field})=>{const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;}),[ia,ib]=await Promise.all([load(a),load(b)]),W=ia.width,Hh=ia.height,get=i=>{const c=new OffscreenCanvas(W,Hh),x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,W,Hh).data;},pa=get(ia),pb=get(ib),lum=(p,k)=>.2126*p[k]+.7152*p[k+1]+.0722*p[k+2];
  const box=q=>({x0:Math.min(...q.map(p=>p.x)),x1:Math.max(...q.map(p=>p.x)),y0:Math.min(...q.map(p=>p.y)),y1:Math.max(...q.map(p=>p.y))}),fb=box(field),bands=sides.map(s=>s.zone?box(s.zone):null);
  const near=(bb,x,y,m)=>bb&&x>=bb.x0-m&&x<=bb.x1+m&&y>=bb.y0-m&&y<=bb.y1+m&&!(x>bb.x0+m&&x<bb.x1-m&&y>bb.y0+m&&y<bb.y1-m);
  const per=sides.map(()=>({n:0,sa:[0,0,0],sb:[0,0,0],la:0,lb:0})),tot={changed:0,inField:0,outField:0,outBox:null},mc=new OffscreenCanvas(W,Hh),mx=mc.getContext('2d'),mask=mx.createImageData(W,Hh),mk=mask.data;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4,d=Math.abs(pa[k]-pb[k])+Math.abs(pa[k+1]-pb[k+1])+Math.abs(pa[k+2]-pb[k+2]);if(d<=12)continue;tot.changed++;const inF=x>=fb.x0-4&&x<=fb.x1+4&&y>=fb.y0-4&&y<=fb.y1+4;if(inF)tot.inField++;else{tot.outField++;const o=tot.outBox||={x0:x,x1:x,y0:y,y1:y};o.x0=Math.min(o.x0,x);o.x1=Math.max(o.x1,x);o.y0=Math.min(o.y0,y);o.y1=Math.max(o.y1,y);}
   // Cada pixel conta só para a casa cuja borda está mais perto (as casas de cima e de baixo ficam a ~4 px em 1366×768).
   let best=-1,bd=7;bands.forEach((bb,i)=>{if(!near(bb,x,y,6))return;const dd=Math.min(Math.abs(x-bb.x0),Math.abs(x-bb.x1),Math.abs(y-bb.y0),Math.abs(y-bb.y1));if(dd<bd){bd=dd;best=i;}});
   mk[k]=255;mk[k+3]=255;if(!inF){mk[k+1]=255;}
   bands.forEach((bb,i)=>{if(i!==best)return;const s=per[i];s.n++;for(let c=0;c<3;c++){s.sa[c]+=pa[k+c];s.sb[c]+=pb[k+c];}s.la+=lum(pa,k);s.lb+=lum(pb,k);});}
  // Feltro de referência: pixels do interior (12 px para dentro da borda) no meio de cada lado da casa, na referência.
  const felt=bands.map(bb=>{if(!bb)return null;const pts=[[(bb.x0+bb.x1)/2,bb.y0+12],[(bb.x0+bb.x1)/2,bb.y1-12],[bb.x0+12,(bb.y0+bb.y1)/2],[bb.x1-12,(bb.y0+bb.y1)/2]];const v=pts.map(([x,y])=>lum(pa,(Math.round(y)*W+Math.round(x))*4));return v.reduce((s,x)=>s+x,0)/v.length;});
  // Máscara: vermelho = mudou dentro do campo; amarelo = mudou fora do campo.
  mx.putImageData(mask,0,0);const blob=await mc.convertToBlob({type:'image/png'}),bytes=new Uint8Array(await blob.arrayBuffer());let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));const maskPng=btoa(bin);
  return {maskPng,size:[W,Hh],total:tot,sides:per.map((s,i)=>({i,cls:sides[i].cls,changed:s.n,meanA:s.n?s.sa.map(v=>+(v/s.n).toFixed(1)):null,meanB:s.n?s.sb.map(v=>+(v/s.n).toFixed(1)):null,lumA:s.n?+(s.la/s.n).toFixed(1):null,lumB:s.n?+(s.lb/s.n).toFixed(1):null,feltLum:felt[i]==null?null:+felt[i].toFixed(1),contrastRatio:s.n&&felt[i]!=null?+(((s.lb/s.n)-felt[i])/((s.la/s.n)-felt[i])).toFixed(3):null}))};},{a,b,sides,field});
 const strip=list=>JSON.stringify(list.map(({owner,...s})=>s));
 const keep=(tag,what,r)=>{for(const s of r.sides)if(s.cls.length)check(`${tag} ${what}: casa ${s.i} destacada (${s.cls}) mantém o contorno original (≤ 20 px alterados na faixa)`,s.changed<=20,s);};
 for(const ea of A){const eb=B.find(x=>x.tag===ea.tag);if(!eb)continue;const same=JSON.stringify(ea.rest.field)===JSON.stringify(eb.rest.field)&&JSON.stringify(ea.rest.sides.map(s=>s.zone))===JSON.stringify(eb.rest.sides.map(s=>s.zone))&&JSON.stringify(ea.rest.partition)===JSON.stringify(eb.rest.partition);
  check(`${ea.tag}: geometria idêntica ${ref}×${test} (campo, partição e as 6 casas)`,same,null);
  check(`${ea.tag}: mesmos destaques em repouso ${ref}×${test}`,strip(ea.rest.sides)===strip(eb.rest.sides),null);
  const r={tag:ea.tag,rest:await analyse(ea.rest.file,eb.rest.file,eb.rest.sides,eb.rest.field)};keep(ea.tag,'repouso',r.rest);
  for(const k of ['drag','aim'])if(ea[k]&&eb[k]){check(`${ea.tag}: ${k} com a mesma geometria e os mesmos destaques ${ref}×${test}`,JSON.stringify(ea[k].field)===JSON.stringify(eb[k].field)&&strip(ea[k].sides)===strip(eb[k].sides),null);
   r[k]=await analyse(ea[k].file,eb[k].file,eb[k].sides,eb[k].field);keep(ea.tag,k,r[k]);}
  if(ea.cancel&&eb.cancel){r.cancel=await analyse(ea.cancel.file,eb.cancel.file,eb.cancel.sides,eb.rest.field);r.cancelVsRest=await analyse(eb.rest.file,eb.cancel.file,eb.cancel.sides,eb.rest.field);
   check(`${ea.tag}: após cancelar, ${test} volta ao repouso de ${test} (sem cor presa no cache; ≤ 0,05% dos pixels no campo)`,r.cancelVsRest.total.inField<=.0005*r.rest.size[0]*r.rest.size[1],r.cancelVsRest.total);}
  if(ea.reanchor&&eb.reanchor){r.loose=await analyse(ea.loose.file,eb.loose.file,eb.loose.sides,eb.rest.field);r.reanchor=await analyse(ea.reanchor.file,eb.reanchor.file,eb.reanchor.sides,eb.rest.field);keep(ea.tag,'reancorado',r.reanchor);
   r.reanchorVsRest=await analyse(eb.rest.file,eb.reanchor.file,eb.reanchor.sides,eb.rest.field);
   check(`${ea.tag}: após soltar e reancorar, ${test} volta ao repouso de ${test} (sem cor presa no cache; ≤ 0,05% dos pixels no campo)`,r.reanchorVsRest.total.inField<=.0005*r.rest.size[0]*r.rest.size[1],r.reanchorVsRest.total);}
  // Baralhos (registro, sem assert): projeção da cena e DOM iguais em A e B indicam variação de amostragem, não de projeção.
  if(ea.rest.decks&&eb.rest.decks){const da=ea.rest.decks,db=eb.rest.decks,same=k=>JSON.stringify(da[k])===JSON.stringify(db[k]);
   r.decks={sameSceneDecks:same('sceneDecks'),sameSelfDom:same('self'),sameOpponentDom:same('opponent'),stableDuringShotRef:JSON.stringify(ea.rest.decksBefore?.sceneDecks)===JSON.stringify(da.sceneDecks),stableDuringShotTest:JSON.stringify(eb.rest.decksBefore?.sceneDecks)===JSON.stringify(db.sceneDecks),
    counters:{[ref]:{builds:da.builds,draws:da.draws,lastReason:da.incremental?.lastReason},[test]:{builds:db.builds,draws:db.draws,lastReason:db.incremental?.lastReason}},sceneDecks:same('sceneDecks')?null:{[ref]:da.sceneDecks,[test]:db.sceneDecks}};}
  check(`${ea.tag}: repouso — alterações concentradas nas faixas das casas (fora do campo ≤ 0,05%)`,r.rest.total.outField<=.0005*r.rest.size[0]*r.rest.size[1],r.rest.total);
  result.push(r);}
 fs.writeFileSync(path.join(out,`comparacao-${ref}-${test}.json`),JSON.stringify(result,null,1));finish(out,`compare-${ref}-${test}`,H);}
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
try{await (mode==='compare'?compare(browser):capture(browser));}finally{await browser.close();}
