// V4 (itens 17–18) · mira de magia na mesa híbrida, Full HD, assento A na própria preparação.
// Real engine (r1-fixtures): every POST /act of the page is applied to seat A and answered with its view; views are
// pushed only when the room revision changes. Hand: two Estilhaço Elétrico (RG07, damage, any target), "Uma a mais..."
// (FV08, draw, no target) and Sono Profundo (FV14, prepared, position only, enemy positions).
//  1 · click RG07 → aim: source node, curve start, legal targets, title, tools; hover a rival creature; Esc cancels.
//  2 · click the second RG07 → aim → click a rival creature → command, engine target, damage on that uid, the node
//      the damage effect flies to (RunaDamageFX.play wrapped).
//  3 · click FV08 → what opens; confirm → command.
//  4 · click FV14 (position only) → no dialog/aim; then drag FV14 from the hand to a rival position → aim with positions,
//      release → command (mode lane), mark in that position.
// Usage: node scripts/v4-aim-probe.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME,captureTable,card,view} from './hybrid12-lib.mjs';
import {act,catalog} from '../mesa-nova/r1-fixtures.mjs';
const out=process.argv[2]||'prototype-qa/revisao-visual-20261103/v4/mira',H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const {room,a,b}=captureTable();const rg1=card('RG07',a),rg2=card('RG07',a),fv08=card('FV08',a),fv14=card('FV14',a);a.hand=[card('FL10',a),rg1,fv08,rg2,fv14,card('FV03',a)];a.mana=10;room.turn=a.id;
const json=()=>({...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()}),acts=[];
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true}),ctx=await browser.newContext({viewport:{width:1920,height:1080}});
await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(!['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.abort();
 if(/\/api\/rooms\/[^/]+\/act$/.test(u.pathname)&&r.request().method()==='POST'){const data=JSON.parse(r.request().postData()||'{}');try{act(room,a,data,catalog);acts.push({...data,ok:true});return r.fulfill({status:200,headers:{'content-type':'application/json'},body:JSON.stringify(json())});}catch(e){acts.push({...data,ok:false,error:e.message});return r.fulfill({status:400,headers:{'content-type':'application/json'},body:JSON.stringify({error:e.message})});}}
 return r.continue();});
const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const NATIVE=process.env.ROUTE==='native';await page.goto((process.env.QA_BASE||'http://127.0.0.1:3086')+(NATIVE?'/runamarca/':'/runamarca/hybrid/index.html'));await page.waitForFunction(()=>typeof render==='function');if(!NATIVE)await page.waitForFunction(()=>window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
let rev=-1;const push=async()=>{if(room.revision===rev)return;rev=room.revision;await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},json());};
await push();if(!NATIVE)await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1500);
const feed=setInterval(()=>{push().catch(()=>{});},150);
await page.evaluate(()=>{window.__fx=[];const fx=window.RunaDamageFX;if(fx&&!fx.__wrapped){const play=fx.play;fx.play=o=>{const R=n=>{const r=n?.getBoundingClientRect?.();return r?{x:+(r.x+r.width/2).toFixed(1),y:+(r.y+r.height/2).toFixed(1)}:null;};window.__fx.push({kind:o.kind,from:{uid:o.from?.dataset?.uid||null,cls:o.from?.className||null,c:R(o.from)},to:{uid:o.to?.dataset?.uid||o.to?.closest?.('[data-uid]')?.dataset.uid||null,cls:o.to?.className||null,c:R(o.to)}});return play(o);};fx.__wrapped=true;}});
const aim=()=>page.evaluate(()=>{const svg=document.querySelector('svg.target-aim'),tools=document.querySelector('.target-aim-tools');if(!svg)return null;const d=svg.querySelector('path')?.getAttribute('d')||'',m=d.match(/M\s*([\d.]+)\s+([\d.]+)/),start=m?{x:+m[1],y:+m[2]}:null;
 const near=start&&[...document.querySelectorAll('#game .patron-card,#game .card,#hand .card')].map(n=>{const r=n.getBoundingClientRect();return {n,r};}).filter(({r})=>start.x>=r.left&&start.x<=r.right&&start.y>=r.top&&start.y<=r.bottom).map(({n})=>n.dataset.uid?('card '+n.dataset.uid+' '+(n.querySelector('.card-title,.card-name')?.textContent||'')):n.className.split(' ')[0]+(n.closest('#self-head')?' (próprio)':n.closest('#opponent-head')?' (rival)':''));
 const legal=[...document.querySelectorAll('.aim-legal')].map(n=>{const uid=n.dataset.uid||n.closest('[data-uid]')?.dataset.uid||null,me=state.players.find(p=>p.id===state.you),card=[...state.players.flatMap(p=>p.reserve)].find(c=>c.uid===uid),owner=card?(card.owner===state.you?'próprio':'rival'):n.closest('#self-head')?'Patrono próprio':n.closest('#opponent-head')?'Patrono rival':n.matches('.lane-side')?('posição '+(n.dataset.owner===state.you?'própria':'rival')+' '+(+n.dataset.lane+1)):'?';return {uid,name:card?.name||null,owner,where:n.closest('.lane-side')?'campo':n.closest('.reserve-camp')?'reserva':n.closest('.combat-emanation')?'emanação':n.matches('.lane-side')?'posição':n.closest('.player-band')?'Patrono':'?',hover:n.classList.contains('aim-hover')};});
 return {start,startOn:near,title:tools?.querySelector('span')?.textContent||null,tools:[...(tools?.querySelectorAll('button')||[])].map(b=>b.textContent),legal,valid:svg.classList.contains('aim-valid')};});
const handCard=uid=>page.evaluate(uid=>{const n=document.querySelector(`#hand>.card[data-uid="${uid}"]`);if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:Math.min(innerHeight-6,r.y+r.height*.25)};},uid);
const nodeCentre=sel=>page.evaluate(sel=>{const n=document.querySelector(sel);if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,uid:n.dataset.uid};},sel);
const R={};
try{
 // 1 · click → aim, hover, Esc
 let p=await handCard(rg1.uid);await page.mouse.move(p.x,p.y);await page.waitForTimeout(300);await page.mouse.click(p.x,p.y);await page.waitForTimeout(500);
 R.aim1=await aim();await page.screenshot({path:path.join(out,'01-mira-aberta.png')});
 const targetSel=`#game .reserve-camp.opponent-camp .card[data-uid="${b.reserve[1].uid}"]`;const t=await nodeCentre(targetSel);await page.mouse.move(t.x,t.y,{steps:10});await page.waitForTimeout(400);R.aimHover=await aim();await page.screenshot({path:path.join(out,'02-mira-sobre-alvo.png')});
 await page.keyboard.press('Escape');await page.waitForTimeout(300);R.afterEsc={aim:await aim(),inHand:await page.evaluate(uid=>state.players.find(p=>p.id===state.you).hand.some(c=>c.uid===uid),rg1.uid),acts:acts.length};
 if(process.env.STEPS==='1'){await page.screenshot({path:path.join(out,'03-apos-esc.png')});throw Object.assign(new Error('stop'),{stop:true});}
 // 2 · click second copy → choose rival creature
 p=await handCard(rg2.uid);await page.mouse.move(p.x,p.y);await page.waitForTimeout(300);await page.mouse.click(p.x,p.y);await page.waitForTimeout(500);const before=b.reserve[1].damage;
 const t2=await nodeCentre(targetSel);await page.mouse.move(t2.x,t2.y,{steps:10});await page.waitForTimeout(300);R.chosen={uid:t2.uid,name:b.reserve[1].name};await page.mouse.click(t2.x,t2.y);
 await page.waitForTimeout(2600);await page.screenshot({path:path.join(out,'03-efeito-no-alvo.png')});
 R.cast={act:acts.find(x=>x.cardId===rg2.uid),damageBefore:before,damageAfter:b.reserve[1].damage,targetHealth:b.reserve[1].health,fx:await page.evaluate(()=>window.__fx),events:(room.events||[]).filter(e=>e.cardId===rg2.uid||e.card?.uid===rg2.uid).map(e=>({type:e.type,targetId:e.targetId,targetPatronId:e.targetPatronId}))};
 // 3 · direct spell without target
 p=await handCard(fv08.uid);await page.mouse.move(p.x,p.y);await page.waitForTimeout(300);await page.mouse.click(p.x,p.y);await page.waitForTimeout(500);
 R.direct=await page.evaluate(()=>{const d=document.getElementById('target-picker');return {dialogOpen:d?.open||false,title:d?.querySelector('h2')?.textContent||null,buttons:[...(d?.querySelectorAll('button')||[])].map(b=>b.textContent),aim:Boolean(document.querySelector('svg.target-aim'))};});await page.screenshot({path:path.join(out,'04-magia-direta-sem-alvo.png')});
 await page.locator('#target-picker button.primary').click();await page.waitForTimeout(1500);R.directAct=acts.find(x=>x.cardId===fv08.uid);R.drawLockSeen=await page.evaluate(()=>document.querySelector('.hybrid-draw-lock')?.hidden===false);await page.waitForFunction(()=>document.querySelector('.hybrid-draw-lock')?.hidden!==false&&!document.querySelector('#visual-layer .card-flight'),null,{timeout:15000});await page.waitForTimeout(400);
 // 4 · trap: click (no dialog), then drag to a rival position
 p=await handCard(fv14.uid);await page.mouse.move(p.x,p.y);await page.waitForTimeout(300);await page.mouse.click(p.x,p.y);await page.waitForTimeout(500);
 R.trapClick=await page.evaluate(()=>({dialogOpen:document.getElementById('target-picker')?.open||false,aim:Boolean(document.querySelector('svg.target-aim')),toast:document.querySelector('#toast,.toast')?.textContent?.trim()||null}));
 await page.mouse.move(5,5);await page.waitForTimeout(400);p=await handCard(fv14.uid);const lane=await nodeCentre('#lanes .lane-side:not(.own-drop)[data-lane="1"]');
 await page.mouse.move(p.x,p.y);await page.waitForTimeout(250);await page.mouse.down();await page.mouse.move((p.x+lane.x)/2,(p.y+lane.y)/2,{steps:10});await page.mouse.move(lane.x,lane.y,{steps:10});await page.waitForTimeout(400);
 R.trapDrag=await aim();await page.screenshot({path:path.join(out,'05-armadilha-arrastando.png')});await page.mouse.up();await page.waitForTimeout(1800);
 R.trapAct=acts.find(x=>x.cardId===fv14.uid);R.trapPrepared=room.players[0].prepared?.map(x=>({card:x.card?.name,lane:x.lane,side:x.targetSide===a.id?'própria':'rival'}))||null;R.trapMark=await page.evaluate(()=>[...document.querySelectorAll('#lanes .spell-mark')].map(n=>({lane:n.closest('.lane-side')?.dataset.lane??n.closest('.lane')?.dataset.lane??null,own:n.closest('.lane-side')?.dataset.owner===state.you})));await page.screenshot({path:path.join(out,'06-armadilha-preparada.png')});
}catch(e){if(!e.stop){R.error=e.message;console.log('ERROR',e.message);}}
clearInterval(feed);R.acts=acts;R.errors=errors;await browser.close();
const A1=R.aim1;if(process.env.STEPS==='1'){check('aim opens on the own Patron portrait',A1&&A1.startOn?.some(s=>/patron-card.*próprio/.test(s)),A1&&{start:A1.start,startOn:A1.startOn});check('legal targets lit (both sides and Patrons)',A1&&A1.legal.some(l=>l.owner==='rival')&&A1.legal.some(l=>/Patrono rival/.test(l.owner)),A1?.legal?.length);check('hover marks the target',R.aimHover?.legal.some(l=>l.hover),R.aimHover?.legal.filter(l=>l.hover));check('Esc cancels without command',!R.afterEsc?.aim&&R.afterEsc?.inHand&&R.afterEsc.acts===0,R.afterEsc);check('no page errors',!R.error&&!errors.length,errors);fs.writeFileSync(path.join(out,'mira.json'),JSON.stringify(R,null,1));finish(out,'v4-aim-native',H,{result:R});process.exit(H.checks.every(c=>c.pass)?0:1);}
check('click on a targeted spell (RG07) opens the aim; it starts on the own Patron portrait',A1&&A1.start&&A1.startOn?.some(s=>/patron-card.*próprio/.test(s)),A1&&{start:A1.start,startOn:A1.startOn,title:A1.title});
check('legal targets lit: creatures of both sides and both Patrons (spell target "any")',A1&&A1.legal.some(l=>l.owner==='rival')&&A1.legal.some(l=>l.owner==='próprio')&&A1.legal.some(l=>/Patrono rival/.test(l.owner)),A1?.legal);
check('tools: title and "Cancelar · Esc" only (no "Escolher por lista")',A1&&A1.tools.length===1&&/Esc/.test(A1.tools[0])&&!A1.tools.some(t=>/lista/i.test(t)),A1?.tools);
check('hovering the rival creature marks it (aim-hover) and the aim turns valid',R.aimHover?.legal.some(l=>l.hover&&l.uid===b.reserve[1].uid)&&R.aimHover.valid,R.aimHover&&{hover:R.aimHover.legal.filter(l=>l.hover),valid:R.aimHover.valid});
check('Esc cancels: aim gone, card still in hand, no command',!R.afterEsc?.aim&&R.afterEsc?.inHand&&R.afterEsc.acts===0,R.afterEsc);
check('choosing the rival creature sends play/direct with that target and the engine damages exactly that card',R.cast?.act?.mode==='direct'&&R.cast.act.targetId===R.chosen?.uid&&R.cast.act.ok&&R.cast.damageAfter>R.cast.damageBefore,R.cast&&{act:R.cast.act,chosen:R.chosen,damage:[R.cast.damageBefore,R.cast.damageAfter]});
check('the damage effect flies from the own Patron to the chosen card',R.cast?.fx?.length&&R.cast.fx.every(f=>f.to.uid===R.chosen.uid),R.cast?.fx);
check('direct spell without target (FV08): one confirmation dialog "Usar magia", no aim; confirm sends play/direct without target',R.direct?.dialogOpen&&!R.direct.aim&&R.directAct?.mode==='direct'&&!R.directAct.targetId&&R.directAct.ok,{direct:R.direct,act:R.directAct});
check('trap (FV14) by click: no dialog and no aim (the click option stays removed)',R.trapClick&&!R.trapClick.dialogOpen&&!R.trapClick.aim,R.trapClick);
check('trap dragged to a rival position: aim offers positions, release prepares it there (play/lane) and the mark appears',R.trapDrag?.legal.some(l=>/posição rival/.test(l.owner))&&R.trapAct?.mode==='lane'&&R.trapAct.ok&&R.trapAct.lane===1&&R.trapAct.targetSide===b.id,{drag:R.trapDrag&&{start:R.trapDrag.startOn,legal:R.trapDrag.legal.map(l=>l.owner)},act:R.trapAct,prepared:R.trapPrepared,mark:R.trapMark});
check('no page errors',!R.error&&!errors.length,{error:R.error,errors});
fs.writeFileSync(path.join(out,'mira.json'),JSON.stringify(R,null,1));finish(out,'v4-aim-probe',H,{result:R});
