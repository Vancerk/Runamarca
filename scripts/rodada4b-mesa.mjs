// Rodada 4b (12/11/2026, dono) · verificação dos pedidos desta continuação, com a barra de rolagem visível:
// moeda com a lua em pé, Registro sem troca/compra, criatura da mão só por arrastar (clique não abre o menu), carta
// que encolhe sobre a reserva, faixa do Patrono mais justa com éter maior, contador dos Estudos dentro da faixa,
// magias preparadas proporcionais à casa (repouso e zoom) e pedra do Registro que não cresce para fora da calha.
// Uso: node scripts/rodada4b-mesa.mjs <out-dir>   VIEWS="1907x945,1366x768"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/rodada4-20261111/mesa-b']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',views=(process.env.VIEWS||'1907x945,1366x768').split(',').map(v=>v.split('x').map(Number));
const fill=phase=>{const s=setup();const {a,b,room}=s;room.matchId='rodada4b';room.phase=phase;room.turn=a.id;room.round=2;a.mana=a.manaMax=10;
 a.hand=['FL10','RG07','FV08','FV14','FV03','FV01'].flatMap(id=>{try{return [card(id,a)];}catch{return [];}});b.hand=['FL06','FL01','FL06'].map(id=>card(id,b));
 for(const [p,ids] of [[a,['FV06','FV07']],[b,['FL01','FL02']]])for(const id of ids){try{p.reserve.push(card(id,p));}catch{}}
 a.study={seenIds:Array.from({length:14},(_,i)=>'s'+i),total:30,activated:[10],discount:false,sharing:false,centerNeighbor:2,positionEffects:[]};
 const sp=a.hand.find(c=>c.type!=='creature');if(sp)a.prepared=[{card:sp,lane:0,targetSide:a.id,paidRound:2,paid:1,hidden:false,sharedLane:false}];
 const L=(round,ph,actor,message)=>room.log.push({message,round,phase:ph,turn:actor,actor,at:Date.now()});
 L(1,'mulligan',a.id,a.name+' trocou 2 carta(s) da mão inicial.');L(1,'mulligan',b.id,b.name+' confirmou a mão inicial.');L(1,'prep',a.id,'Preparação de '+a.name+': 1/1 mana e uma compra.');L(1,'prep',a.id,'Você jogou '+(a.reserve[0]?.name||'uma carta')+'.');L(2,'prep',b.id,'O rival jogou '+(b.reserve[0]?.name||'uma carta')+'.');
 return s;};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true,ignoreDefaultArgs:['--hide-scrollbars']});const report=[];
try{for(const [vw,vh] of views)for(const phase of ['prep','formation']){const tag=`${vw}x${vh}-${phase}`;
 const ctx=await browser.newContext({viewport:{width:vw,height:vh}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const sent=[];await ctx.route('**/api/rooms/*/act',r=>{sent.push(r.request().postDataJSON());r.fulfill({status:409,json:{error:'teste'}});});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.addStyleTag({content:'html{overflow-y:scroll!important}'});await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const s=fill(phase);await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1600);
 await page.screenshot({path:path.join(out,tag+'.png')});
 const m=await page.evaluate(()=>{const R=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height};},q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
  const coin=window.RunaCoinVolume?.create({back:true});document.body.append(coin);const capT=new DOMMatrix(getComputedStyle(coin.querySelector('.coin-cap-back')).transform);coin.remove();
  const band=q('.player-band.lower-zone'),pt=band?.querySelector('.ether-point');
  const marks=all('#game .lane-side .spell-dock>.spell-mark').map(n=>{const side=n.closest('.lane-side');return {h:n.offsetHeight,sideH:side?.offsetHeight||0};});
  return {coinBack:{m11:capT.m11,m22:capT.m22},tiles:all('#registro-trilho .registro-pedra:not(.vazia) button').map(b=>b.getAttribute('aria-label')),
   band:{w:band?.offsetWidth,box:R(band),point:pt?.offsetWidth,ether:R(band?.querySelector('.patron-ether')),powers:R(band?.querySelector('.patron-equipment')),study:R(band?.querySelector('.study-progress'))},marks};});
 report.push({tag,m});
 check(tag+': moeda — a face da lua (verso) pousa em pé (giro só no eixo horizontal)',Math.abs(m.coinBack.m11-1)<1e-6&&Math.abs(m.coinBack.m22+1)<1e-6,m.coinBack);
 check(tag+': faixa do Patrono mais justa (≤ 370 px de CSS) e éter maior (pontos de 15 px)',m.band.w<=370&&m.band.point===15,{w:m.band.w,point:m.band.point});
 const inside=(o,i,t=2)=>o&&i&&i.x>=o.x-t&&i.y>=o.y-t&&i.r<=o.r+t&&i.b<=o.b+t;
 check(tag+': contador dos Estudos (X/30) dentro da faixa',inside(m.band.box,m.band.study),{band:m.band.box,study:m.band.study});
 check(tag+': magias preparadas proporcionais à casa (altura ≈ 29% da casa)',m.marks.length>0&&m.marks.every(x=>x.sideH&&Math.abs(x.h/x.sideH-.29)<=.035),m.marks);
 if(phase==='prep'){
  check(tag+': Registro sem troca de mão inicial nem compra automática; começa nas jogadas',m.tiles.length>0&&m.tiles.every(t=>!/mão inicial|uma compra/.test(t)),m.tiles);
  // clique do mouse numa criatura da mão: não abre menu nem envia comando
  const uid=s.a.hand.find(c=>c.type==='creature')?.uid;const handCard=page.locator(`#hand .card[data-uid="${uid}"]`).first();await handCard.click();await page.waitForTimeout(350);
  const picker=await page.evaluate(()=>Boolean(document.getElementById('target-picker')?.open));
  check(tag+': clicar numa criatura da mão não abre o menu de entrada nem joga (só arrastar)',!picker&&!sent.some(c=>c.type==='play'),{picker,sent});
  if(picker)await page.keyboard.press('Escape');await page.mouse.move(vw/2,40);await page.waitForTimeout(300);
  // arrastar até a reserva: a carta encolhe até o tamanho das cartas da reserva; longe dela volta ao tamanho
  const box=await handCard.boundingBox(),camp=await page.locator('.reserve-camp.self-camp').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-60,{steps:6});
  await page.mouse.move(vw*.9,camp.y-160,{steps:8});await page.waitForTimeout(250);const far=await page.evaluate(()=>{const g=document.querySelector('.drag-preview');return g?new DOMMatrix(getComputedStyle(g).transform).a:null;});
  await page.mouse.move(camp.x+camp.width/2,camp.y+camp.height/2,{steps:10});await page.waitForTimeout(300);
  const near=await page.evaluate(()=>{const g=document.querySelector('.drag-preview'),c=document.querySelector('.reserve-camp.self-camp .card-row>.card');if(!g)return null;const t=new DOMMatrix(getComputedStyle(g).transform);return {scale:Math.hypot(t.a,t.b),h:g.getBoundingClientRect().height,target:c?.getBoundingClientRect().height};});
  check(tag+': arrastando para a reserva a carta encolhe até o tamanho das cartas da estante (±15%)',Boolean(near&&near.scale<.8&&near.target&&Math.abs(near.h/near.target-1)<=.15),{near});
  check(tag+': longe da reserva a carta arrastada fica no tamanho normal',far!==null&&Math.abs(far-1)<.02,{far});
  await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(300);
  // pedra do Registro: ao passar o mouse não cresce para fora da calha
  const tile=page.locator('#registro-trilho .registro-pedra:not(.vazia) button').first();if(await tile.count()){await tile.hover();await page.waitForTimeout(250);
   const hov=await page.evaluate(()=>{const b=document.querySelector('#registro-trilho .registro-pedra:not(.vazia) button'),rail=document.getElementById('registro-trilho');const r=b.getBoundingClientRect(),rr=rail.getBoundingClientRect();return {transform:getComputedStyle(b).transform,inside:r.left>=rr.left-.5&&r.right<=rr.right+.5&&r.top>=rr.top-.5&&r.bottom<=rr.bottom+.5};});
   check(tag+': pedra do Registro sob o mouse não cresce para fora da calha',hov.transform==='none'&&hov.inside,hov);await page.mouse.move(vw/2,vh/2);}
 }
 check(tag+': sem erros de página',!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
const pm=report.filter(r=>/prep$/.test(r.tag)),fm=report.filter(r=>/formation$/.test(r.tag));
for(const p of pm){const f=fm.find(x=>x.tag.split('-')[0]===p.tag.split('-')[0]);if(f&&p.m.marks[0]&&f.m.marks[0])check(p.tag.split('-')[0]+': no zoom as magias preparadas crescem junto com a casa',f.m.marks[0].h>p.m.marks[0].h*1.15,{prep:p.m.marks[0],formation:f.m.marks[0]});}
fs.writeFileSync(path.join(out,'mesa-b.json'),JSON.stringify(report,null,1));finish(out,'rodada4b-mesa',H,{report});
