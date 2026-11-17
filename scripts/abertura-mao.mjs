// Abertura (09/11/2026) · troca inicial em uma etapa, no navegador, com o motor real em processo.
// Cobre: limite exibido (3 para quem começa, 4 para o segundo), marcar menos que o limite, recusa acima do limite sem
// enviar nada, cliques repetidos em "Confirmar mão", teclado e foco, reconexão no meio da escolha e depois da troca,
// recusa do motor a um pedido adulterado, movimento reduzido e ausência de sobras da apresentação.
// Uso: node scripts/abertura-mao.mjs <out-dir>     QA_BASE (padrão http://127.0.0.1:3121)
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {makeRoom,join,act,view} from '../mesa-nova/game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../mesa-nova/cartas.json',import.meta.url)));
const [out='prototype-qa/abertura-20261109/mao-inicial']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',report={base,scenes:{}};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
const newRoom=()=>{const room=makeRoom('MAO'+Math.floor(Math.random()*900+100),'Vanxf'),a=room.players[0],b=join(room,'Rival');act(room,a,{type:'deck',deckId:catalog.decks[1].id},catalog);return {room,a,b};};
// Abre a página no assento A já na mão inicial; `first` escolhe quem venceu a moeda (repete o sorteio do motor).
async function open(id,{first='a',reduced=false,viewport={width:1920,height:1080}}={}){
 let g=newRoom(),frozen=null;const acts=[],refused=[],errors=[],v=()=>frozen||{...view(g.room,g.a),serverNow:Date.now()};frozen=v();
 const context=await browser.newContext({viewport,reducedMotion:reduced?'reduce':'no-preference'});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await context.route(u=>/\/api\/rooms\/[^/]+\/state$/.test(u.pathname),async r=>{await new Promise(x=>setTimeout(x,80));await r.fulfill({json:v()});});
 await context.route('**/api/rooms/*/act',async r=>{const data=r.request().postDataJSON();try{act(g.room,g.a,data,catalog);acts.push(data);await r.fulfill({json:v()});}catch(e){refused.push({data,error:e.message});await r.fulfill({status:400,json:{error:e.message}});}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(id+': '+e.message));
 await page.addInitScript(()=>{if(!sessionStorage.getItem('runamarca-nova-seat'))sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:window.name||'',token:'probe'}));});
 const seat=code=>page.evaluate(c=>sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:'probe'})),code);
 await page.goto(base+'/runamarca/');await seat(g.room.code);await page.reload();
 await page.waitForFunction(()=>typeof render==='function'&&state&&visualBooted&&typeof RunaHybridFlights!=='undefined',null,{timeout:20000});
 for(let i=0;i<64;i++){act(g.room,g.b,{type:'deck',deckId:catalog.decks[0].id},catalog);if((g.room.first===g.a.id)===(first==='a'))break;
  g=newRoom();frozen=null;frozen=v();await page.evaluate(s=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:s.code,token:'probe'}));state=s;lastRevision=-1;serverClockOffset=Date.now()-s.serverNow;render();},frozen);}
 await page.evaluate(s=>sessionStorage.setItem('runamarca-intro:'+s.code+':'+s.matchId,'seen'),{code:g.room.code,matchId:g.room.matchId});frozen=null;
 const ready=()=>page.waitForFunction(()=>{const b=document.getElementById('mulligan-confirm');if(!b||b.disabled||document.querySelector('.opening-toss-stage')||RunaCardArrivals.blocked)return false;const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));},null,{timeout:15000});
 const panel=()=>page.evaluate(()=>{const o=document.getElementById('mulligan-overlay'),t=id=>document.getElementById(id)?.textContent.trim()??null,cards=[...document.querySelectorAll('#mulligan-cards .card')];
  return {hidden:o.hidden,role:o.getAttribute('role'),modal:o.getAttribute('aria-modal'),labelledby:t(o.getAttribute('aria-labelledby')),describedby:t(o.getAttribute('aria-describedby')),title:t('mulligan-title'),instruction:t('mulligan-instruction'),status:t('mulligan-status'),button:t('mulligan-confirm'),buttonDisabled:document.getElementById('mulligan-confirm')?.disabled??null,hint:t('mulligan-hint'),refusal:!!document.querySelector('#mulligan-hint.is-refusal'),
   cards:cards.map(n=>({uid:n.dataset.uid,tag:n.tagName,pressed:n.getAttribute('aria-pressed'),limited:n.classList.contains('at-limit'),ariaDisabled:n.getAttribute('aria-disabled'),label:n.getAttribute('aria-label'),pending:n.classList.contains('pending-arrival')})),focus:document.activeElement?.id||document.activeElement?.dataset?.uid||document.activeElement?.tagName,
   stage:document.querySelectorAll('.opening-toss-stage').length,carriers:document.querySelectorAll('.hybrid-flight-carrier').length,tossStarted:RunaOpeningToss.stats.started,blocked:RunaCardArrivals.blocked,toast:document.getElementById('toast')?.textContent||''};});
 // clique real do ponteiro no centro da carta (uma carta fora do limite tem aria-disabled, mas continua clicável)
 const clickCard=async i=>{const r=await page.locator('#mulligan-cards .card').nth(i).boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height*.3);};
 return {id,page,context,acts,refused,errors,get g(){return g;},ready,panel,clickCard,shot:name=>page.screenshot({path:path.join(out,id+'-'+name+'.png')})};
}
const mull=s=>s.acts.filter(a=>['mulligan','confirmMulligan'].includes(a.type));
try{
 // ── 1 · quem começa: limite 3, recusa da 4ª, teclado, cliques repetidos, confirmação automática ───────────────
 {const s=await open('primeiro',{first:'a'});await s.ready();let p=await s.panel();report.scenes.primeiro={inicio:p};
  check('primeiro · pergaminho com título, instrução curta com o limite 3 e botão "Confirmar mão"',p.title==='Mão inicial'&&p.instruction==='Selecione até 3 cartas para trocar.'&&p.button==='Confirmar mão'&&/Você joga primeiro · 0 de 3 marcadas/.test(p.status),p);
  check('primeiro · diálogo nomeado pelo título e descrito pela instrução; cartas são botões com nome e estado',p.role==='dialog'&&p.modal==='true'&&p.labelledby==='Mão inicial'&&p.describedby===p.instruction&&p.cards.length===5&&p.cards.every(c=>c.tag==='BUTTON'&&c.pressed==='false'&&c.label&&!c.pending),p.cards);
  check('primeiro · ao terminar a abertura o foco fica no botão de confirmar e nada da apresentação sobra',p.focus==='mulligan-confirm'&&p.stage===0&&p.carriers===0&&!p.blocked&&p.tossStarted===1,{focus:p.focus,stage:p.stage,carriers:p.carriers,toss:p.tossStarted});
  await s.shot('01-inicio');
  for(const i of [0,1,2])await s.clickCard(i);p=await s.panel();
  check('primeiro · três cartas marcadas; as outras duas ficam sinalizadas como fora do limite',p.cards.filter(c=>c.pressed==='true').length===3&&p.cards.slice(3).every(c=>c.limited&&c.ariaDisabled==='true')&&/3 de 3 marcadas/.test(p.status)&&/3 cartas serão trocadas ao confirmar/.test(p.hint),p);
  await s.shot('02-tres-marcadas');
  await s.clickCard(3);p=await s.panel();
  check('primeiro · a 4ª carta é recusada na interface, com aviso, e nada é enviado',p.cards.filter(c=>c.pressed==='true').length===3&&p.cards[3].pressed==='false'&&p.refusal&&/Limite de 3 cartas/.test(p.hint)&&s.acts.every(a=>a.type==='openingReady')&&!s.refused.length,{hint:p.hint,acts:s.acts,refused:s.refused});
  await s.shot('03-quarta-recusada');
  await s.clickCard(1);p=await s.panel();check('primeiro · desmarcar libera as demais',p.cards.filter(c=>c.pressed==='true').length===2&&p.cards.every(c=>!c.limited)&&!p.refusal&&/2 de 3 marcadas/.test(p.status),p);
  // teclado: Espaço na carta em foco alterna; um novo desenho do painel mantém o foco na mesma carta
  const uid3=p.cards[3].uid;await s.page.locator('#mulligan-cards .card').nth(3).focus();await s.page.keyboard.press('Space');await s.page.evaluate(()=>{render();render();});p=await s.panel();
  check('primeiro · teclado: Espaço marca a carta em foco e o foco continua nela depois de o painel ser refeito',p.cards[3].pressed==='true'&&p.focus===uid3&&/3 de 3 marcadas/.test(p.status),{focus:p.focus,uid3,cards:p.cards});
  await s.page.keyboard.press('Enter');p=await s.panel();check('primeiro · teclado: Enter desmarca',p.cards[3].pressed==='false'&&p.focus===uid3,p.cards[3]);
  await s.page.keyboard.press('Enter');
  const chosen=(await s.panel()).cards.filter(c=>c.pressed==='true').map(c=>c.uid),before=s.g.a.hand.map(c=>c.uid);
  // três cliques seguidos no botão: uma única troca
  await s.page.evaluate(()=>{const b=document.getElementById('mulligan-confirm');b.click();b.click();});await s.page.waitForTimeout(40);await s.page.evaluate(()=>document.getElementById('mulligan-confirm')?.click());
  await s.page.waitForFunction(()=>seat()?.mulligansLeft===0,null,{timeout:8000});
  const sent=mull(s);check('primeiro · três cliques seguidos em "Confirmar mão" enviam uma única troca, com exatamente as cartas marcadas',sent.filter(a=>a.type==='mulligan').length===1&&JSON.stringify([...sent[0].cardIds].sort())===JSON.stringify([...chosen].sort())&&chosen.length===3&&!s.refused.length,{sent,chosen,refused:s.refused});
  p=await s.panel();check('primeiro · depois da troca o painel informa a nova mão e não oferece outra troca',p.instruction==='Esta é a sua nova mão.'&&/troca concluída/.test(p.status)&&p.button===null&&p.cards.every(c=>c.pressed===null),p);
  await s.shot('04-nova-mao');
  await s.page.waitForFunction(()=>seat()?.mulliganReady===true,null,{timeout:15000});
  const all=mull(s),kept=before.filter(u=>!chosen.includes(u));
  check('primeiro · a confirmação final segue sozinha, uma única vez, e as cartas mantidas continuam na mão',all.length===2&&all[1].type==='confirmMulligan'&&s.g.a.mulliganReady&&s.g.a.hand.length===5&&kept.every(u=>s.g.a.hand.some(c=>c.uid===u))&&!s.refused.length,{all,refused:s.refused});
  act(s.g.room,s.g.b,{type:'confirmMulligan'},catalog);await s.page.waitForFunction(()=>state.phase==='prep'&&document.querySelectorAll('#hand .card').length>=6&&!RunaCardArrivals.blocked,null,{timeout:20000});await s.page.waitForTimeout(600);
  const end=await s.page.evaluate(()=>({overlay:document.getElementById('mulligan-overlay').hidden,hand:document.querySelectorAll('#hand .card').length,stage:document.querySelectorAll('.opening-toss-stage').length,carriers:document.querySelectorAll('.hybrid-flight-carrier').length,pending:document.querySelectorAll('.pending-arrival').length,obscured:document.getElementById('game').classList.contains('is-obscured')}));
  check('primeiro · com os dois prontos a partida segue: painel fechado, mesa nítida, seis cartas na mão e nenhuma sobra',end.overlay&&end.hand===6&&!end.stage&&!end.carriers&&!end.pending&&!end.obscured&&s.g.room.turn===s.g.a.id,end);
  await s.shot('05-preparacao');check('primeiro · sem erros de página',!s.errors.length,s.errors);report.scenes.primeiro.acts=s.acts;await s.context.close();}
 // ── 2 · segundo jogador: limite 4, 5ª recusada, confirmar sem marcar mantém a mão ───────────────────────────
 {const s=await open('segundo',{first:'b'});await s.ready();let p=await s.panel();report.scenes.segundo={inicio:p};
  check('segundo · instrução e contagem com o limite 4',p.instruction==='Selecione até 4 cartas para trocar.'&&/Você joga em segundo · 0 de 4 marcadas/.test(p.status)&&/Sem marcas, você mantém estas cartas/.test(p.hint),p);
  for(const i of [0,1,2,3,4])await s.clickCard(i);p=await s.panel();
  check('segundo · quatro marcadas, a 5ª recusada com aviso',p.cards.filter(c=>c.pressed==='true').length===4&&p.cards[4].pressed==='false'&&p.refusal&&/Limite de 4 cartas/.test(p.hint),p);
  await s.shot('01-quinta-recusada');
  for(const i of [0,1,2,3])await s.clickCard(i);p=await s.panel();const hand=s.g.a.hand.map(c=>c.uid);
  check('segundo · tudo desmarcado',p.cards.every(c=>c.pressed==='false')&&/0 de 4 marcadas/.test(p.status),p);
  await s.page.evaluate(()=>{const b=document.getElementById('mulligan-confirm');b.click();b.click();});
  await s.page.waitForFunction(()=>seat()?.mulliganReady===true,null,{timeout:8000});await s.page.waitForTimeout(1500);
  const sent=mull(s);check('segundo · confirmar sem marcas envia uma única confirmação e mantém as cinco cartas',sent.length===1&&sent[0].type==='confirmMulligan'&&JSON.stringify(s.g.a.hand.map(c=>c.uid))===JSON.stringify(hand)&&!s.refused.length,{sent,refused:s.refused});
  check('segundo · sem erros de página',!s.errors.length,s.errors);await s.context.close();}
 // ── 3 · reconexão: no meio da escolha e logo depois da troca ────────────────────────────────────────────────
 {const s=await open('reconexao',{first:'a'});await s.ready();await s.clickCard(0);await s.clickCard(4);
  await s.page.reload();await s.page.waitForFunction(()=>typeof render==='function'&&state?.phase==='mulligan'&&visualBooted,null,{timeout:20000});await s.ready();let p=await s.panel();
  check('reconexão · recarregar no meio da escolha reabre o painel pronto, com o limite, sem repetir moeda nem distribuição',p.tossStarted===0&&p.stage===0&&p.cards.length===5&&p.cards.every(c=>!c.pending&&c.pressed==='false')&&p.instruction==='Selecione até 3 cartas para trocar.'&&mull(s).length===0,p);
  await s.shot('01-apos-recarregar');
  await s.clickCard(2);const uid=(await s.panel()).cards[2].uid;await s.page.click('#mulligan-confirm');await s.page.waitForFunction(()=>seat()?.mulligansLeft===0,null,{timeout:8000});
  await s.page.reload();await s.page.waitForFunction(()=>typeof render==='function'&&state?.phase==='mulligan'&&visualBooted,null,{timeout:20000});
  await s.page.waitForFunction(()=>seat()?.mulliganReady===true,null,{timeout:15000});const sent=mull(s);
  check('reconexão · recarregar logo depois da troca não oferece outra troca e a confirmação pendente é concluída uma vez',sent.length===2&&sent[0].type==='mulligan'&&sent[0].cardIds.length===1&&sent[0].cardIds[0]===uid&&sent[1].type==='confirmMulligan'&&!s.refused.length&&s.g.a.hand.length===5,{sent,refused:s.refused});
  check('reconexão · sem erros de página',!s.errors.length,s.errors);await s.context.close();}
 // ── 4 · pedido adulterado: o motor recusa acima do limite e a interface mostra o motivo ─────────────────────
 {const s=await open('adulterado',{first:'a'});await s.ready();const hand=s.g.a.hand.map(c=>c.uid);
  await s.page.waitForFunction(()=>seat()?.mulliganStartedAt!=null&&!commandBusy,null,{timeout:8000});// openingReady concluído: command() não descarta o pedido
  await s.page.evaluate(ids=>command({type:'mulligan',cardIds:ids}),hand.slice(0,4));await s.page.waitForTimeout(500);let p=await s.panel();
  check('adulterado · quatro cartas enviadas por quem começa: o motor recusa, a mão não muda e o motivo aparece',s.refused.length===1&&/Quem começa pode trocar até 3 cartas/.test(s.refused[0].error)&&/até 3 cartas/.test(p.toast)&&JSON.stringify(s.g.a.hand.map(c=>c.uid))===JSON.stringify(hand)&&s.g.a.mulligansLeft===1&&p.button==='Confirmar mão'&&!p.buttonDisabled,{refused:s.refused,toast:p.toast});
  await s.page.evaluate(ids=>command({type:'mulligan',cardIds:[ids[0],ids[0]]}),hand);await s.page.evaluate(()=>command({type:'mulligan',cardIds:['nao-existe']}));await s.page.waitForTimeout(400);
  check('adulterado · carta repetida e carta inexistente também são recusadas pelo motor',s.refused.length===3&&s.refused.slice(1).every(r=>/Selecione cartas da sua mão inicial/.test(r.error))&&s.g.a.mulligansLeft===1,s.refused);
  check('adulterado · sem erros de página',!s.errors.length,s.errors);await s.context.close();}
 // ── 5 · movimento reduzido ──────────────────────────────────────────────────────────────────────────────────
 {const t0=Date.now(),s=await open('reduzido',{first:'b',reduced:true});await s.ready();const ms=Date.now()-t0;const p=await s.panel(),toss=await s.page.evaluate(()=>RunaOpeningToss.stats),moving=await s.page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&(a.effect?.getComputedTiming().duration||0)>200).map(a=>(a.animationName||a.transitionProperty||'waapi')+':'+(a.effect.target?.id||a.effect.target?.className)));
  check('reduzido · a abertura termina sem lançamento animado nem voo em curva, e a mão fica pronta',toss.last?.quiet===true&&toss.finished===1&&p.stage===0&&p.carriers===0&&p.cards.every(c=>!c.pending)&&p.instruction==='Selecione até 4 cartas para trocar.'&&p.focus==='mulligan-confirm',{toss,ms,p});
  check('reduzido · nenhuma animação longa em curso no painel pronto',moving.length===0,moving);
  await s.shot('01-pronto');await s.clickCard(0);await s.page.click('#mulligan-confirm');await s.page.waitForFunction(()=>seat()?.mulliganReady===true,null,{timeout:15000});
  check('reduzido · a troca de uma carta funciona e confirma',mull(s).length===2&&mull(s)[0].cardIds.length===1&&!s.refused.length,mull(s));
  check('reduzido · sem erros de página',!s.errors.length,s.errors);await s.context.close();}
 // ── 6 · janela menor (1366×768) e estreita (390×800): o painel cabe e o botão é clicável ───────────────────
 for(const [id,viewport] of [['1366',{width:1366,height:768}],['390',{width:390,height:800}]]){const s=await open('janela-'+id,{first:'a',viewport});await s.ready();
  const fit=await s.page.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),r:Math.round(r.right),b:Math.round(r.bottom)};},inside=b=>b.x>=0&&b.y>=0&&b.r<=innerWidth&&b.b<=innerHeight;const banner=box(document.querySelector('.mulligan-banner')),button=box(document.getElementById('mulligan-confirm')),cards=[...document.querySelectorAll('#mulligan-cards .card')].map(box);
   const extra=['mulligan-status','mulligan-hint','mulligan-timer'].map(id=>document.getElementById(id)).filter(n=>n&&!n.hidden).map(box),wide=[...document.querySelectorAll('#mulligan-overlay *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).slice(0,4).map(n=>n.id||n.className);
   return {banner,button,cards,extra,wide,bannerIn:inside(banner),buttonIn:inside(button),cardsIn:cards.every(inside),extraIn:extra.every(inside),scrollX:document.getElementById('mulligan-overlay').scrollWidth>innerWidth+1};});
  check('janela '+id+' · pergaminho, cartas e botão cabem na tela, sem rolagem horizontal',fit.bannerIn&&fit.buttonIn&&fit.cardsIn&&fit.extraIn&&!fit.scrollX,fit);await s.shot('01-pronto');
  check('janela '+id+' · sem erros de página',!s.errors.length,s.errors);await s.context.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'mao-inicial.json'),JSON.stringify(report,null,1));finish(out,'abertura-mao',H,{report});
