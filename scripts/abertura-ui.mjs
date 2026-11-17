// Abertura (09/11/2026) · quadros determinísticos do hover dos botões e da entrada dos menus.
// As animações (CSS e Web Animations) são pausadas e posicionadas em instantes fixos; cada quadro é uma captura
// real da página naquele instante, para comparação lado a lado com os vídeos de referência.
// Uso: node scripts/abertura-ui.mjs <out-dir>   QA_BASE, VIEW=1920x1080, REDUCED=1
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,place,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/abertura-20261109/ui']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',[vw,vh]=(process.env.VIEW||'1920x1080').split('x').map(Number),reduced=!!process.env.REDUCED;
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const report={base,view:[vw,vh],reduced,scenes:{}};
// Pausa tudo o que estiver animando e devolve um controle para posicionar o tempo (ms desde o disparo).
const freeze=(page,scope)=>page.evaluate(scope=>{window.__anims=document.getAnimations().filter(a=>a.effect?.target?.closest?.(scope));for(const a of window.__anims)a.pause();return window.__anims.map(a=>({name:a.animationName||a.transitionProperty||a.id||'waapi',target:(a.effect?.target?.id||a.effect?.target?.className||a.effect?.target?.tagName||'')+(a.effect?.pseudoElement||''),duration:a.effect?.getComputedTiming().duration,delay:a.effect?.getComputedTiming().delay,end:a.effect?.getComputedTiming().endTime}));},scope);
const release=page=>page.evaluate(()=>{for(const a of window.__anims)try{a.finish();}catch{a.play();}});
// A cada instante a lista é refeita: um redesenho da mesa pode trocar o nó animado no meio da captura.
const at=(page,t,scope)=>page.evaluate(([t,scope])=>{const now=document.getAnimations().filter(a=>a.effect?.target?.closest?.(scope));for(const a of now){a.pause();if(!window.__anims.includes(a))window.__anims.push(a);}for(const a of now)a.currentTime=t;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},[t,scope]);
async function frames(page,name,scope,clip,times){const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});const anims=await freeze(page,scope),files=[];
 for(const t of times){await at(page,t,scope);const file=`${name}-${String(t).padStart(4,'0')}.png`;await page.screenshot({path:path.join(dir,file),clip,scale:'css'});files.push(file);}
 report.scenes[name]={clip,times,anims,files};return anims;}
try{
 const {room,a,b}=setup();a.hand=['FL10','RG07','FV08','FV14','FV03'].map(id=>card(id,a));place(a,card('FL06',a),1);place(b,card('FL06',b),1);room.matchId='abertura-ui';
 const ctx=await browser.newContext({viewport:{width:vw,height:vh},reducedMotion:reduced?'reduce':'no-preference'});
 await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()});
 await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1200);
 const rectOf=sel=>page.evaluate(s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null;},sel);
 const pad=(r,p)=>({x:Math.max(0,Math.round(r.x-p)),y:Math.max(0,Math.round(r.y-p)),width:Math.round(r.width+p*2),height:Math.round(r.height+p*2)});
 // 1 · botão: repouso, hover (quadros), saída.
 const sel='#phase-actions button:not(:disabled)';const br=await rectOf(sel);check('o botão de fase existe e está habilitado',!!br,br);
 if(br){const clip=pad(br,26);await page.mouse.move(8,8);await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'botao-repouso.png'),clip});
  const before=await rectOf(sel),labelBefore=await page.evaluate(s=>document.querySelector(s).textContent,sel);await page.mouse.move(br.x+br.width/2,br.y+br.height/2);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  // Durante os quadros a mesa não é redesenhada (o relógio da vez redesenha o botão a cada segundo; isso é medido à parte, logo abaixo).
  await page.evaluate(()=>{window.__render=render;window.__renders=0;render=()=>{window.__renders++;};});
  const anims=await frames(page,'botao-hover','#phase-actions',clip,[0,33,67,100,133,167,200,233,267,300,333,367,400,433,500]);
  report.scenes['botao-hover'].rendersHeld=await page.evaluate(()=>{render=window.__render;const n=window.__renders;if(n)render();return n;});report.scenes['botao-hover'].statsAfterFrames=await page.evaluate(()=>(window.RunaButtonHover?.stats||{}));
  const after=await rectOf(sel);check('a estrutura externa do botão não muda de lugar nem de tamanho no hover',JSON.stringify(before)===JSON.stringify(after),{before,after});
  report.scenes['botao-hover'].longest=Math.max(0,...anims.map(x=>x.end||0));
  check(reduced?'movimento reduzido: o hover não cria oscilação':'a oscilação do hover dura entre 350 e 480 ms (pedido de 10/11: mais lenta) e é a animação mais longa do botão',reduced?!anims.some(x=>x.name==='wood-wobble'):anims.some(x=>x.name==='wood-wobble'&&x.duration>=350&&x.duration<=480)&&report.scenes['botao-hover'].longest<=480,anims);
  await release(page);await page.waitForTimeout(350);await page.screenshot({path:path.join(out,'botao-hover-assentado.png'),clip});
  const lit=await page.evaluate(()=>{const b=document.querySelector('#phase-actions button:not(:disabled)'),h=b.querySelector(':scope>.wood-hover');return {holder:!!h,ariaHidden:h?.getAttribute('aria-hidden'),text:b.textContent,children:b.childElementCount,running:h?h.getAnimations({subtree:true}).filter(a=>a.playState==='running').length:null,stats:window.RunaButtonHover?.stats};});
  report.scenes['botao-hover'].lit=lit;check('com o ponteiro parado a face fica acesa, sem animação em curso, e o texto do botão continua o mesmo',lit.holder&&lit.ariaHidden==='true'&&lit.running===0&&lit.stats?.wobbles===(reduced?0:1)&&lit.stats?.lit===1&&lit.text===labelBefore,{...lit,labelBefore});
  // mesma posição, novo render: o hover não pode repetir a oscilação
  const wobbles=()=>page.evaluate(()=>window.RunaButtonHover?.stats?.wobbles??null);const w0=await wobbles();
  await page.evaluate(async()=>{for(let i=0;i<12;i++){render();await new Promise(r=>setTimeout(r,60));}});const w1=await wobbles();
  check('12 redesenhos com o ponteiro parado não repetem a oscilação',w0===w1,{before:w0,after:w1});
  await page.mouse.move(8,8);await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'botao-apos-sair.png'),clip});
  const gone=await page.evaluate(()=>({holders:document.querySelectorAll('.wood-hover').length,position:document.querySelector('#phase-actions button')?.style.position||'',active:window.RunaButtonHover?.stats.active}));
  check('ao sair, a peça decorativa some e o botão volta ao estado original',gone.holders===0&&gone.position===''&&gone.active===false,gone);
  // clique com o ponteiro em cima: a ação do botão segue normalmente
  const clicks=await page.evaluate(()=>{window.__clicked=0;document.querySelector('#phase-actions button:not(:disabled)').addEventListener('click',()=>window.__clicked++,{once:true});return 0;});
  await page.mouse.move(br.x+br.width/2,br.y+br.height/2);await page.waitForTimeout(260);const hit=await page.evaluate(([x,y])=>{const n=document.elementFromPoint(x,y);return n?.closest('button')===document.querySelector('#phase-actions button:not(:disabled)');},[br.x+br.width/2,br.y+br.height/2]);
  check('com a face acesa, o ponto sob o ponteiro continua sendo o próprio botão (a peça não intercepta cliques)',hit,{hit});await page.mouse.move(8,8);await page.waitForTimeout(300);}
 // 2 · menu da sala: entrada em quadros, foco, Esc, reabertura.
 const trigger='.camp-menu-trigger';const tr=await rectOf(trigger);check('o gatilho do menu existe',!!tr,tr);
 if(tr){await page.click(trigger);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const clip={x:Math.round(vw/2-420),y:Math.round(vh/2-380),width:840,height:760};
  const anims=await frames(page,'menu-entrada','#room-menu',clip,[0,33,67,100,133,167,200,233,267,300,333,367,400,467,533]);
  report.scenes['menu-entrada'].longest=Math.max(0,...anims.map(x=>x.end||0));
  check(reduced?'movimento reduzido: o menu abre sem animação de entrada':'a entrada do menu é uma única animação de até 320 ms no próprio painel',reduced?!anims.some(x=>x.name==='popup-entrance'):anims.filter(x=>x.name==='popup-entrance').length===1&&anims.find(x=>x.name==='popup-entrance').duration<=320,anims);
  await release(page);await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'menu-assentado.png')});
  const menu=await page.evaluate(()=>{const m=document.getElementById('room-menu'),r=m.getBoundingClientRect();return {open:m.open,focus:document.activeElement?.className||document.activeElement?.tagName,rect:{x:r.x,y:r.y,w:r.width,h:r.height},transform:getComputedStyle(m).transform,opacity:getComputedStyle(m).opacity,backdrop:getComputedStyle(m,'::backdrop').backdropFilter};});
  report.scenes['menu-entrada'].settled=menu;
  check('menu aberto, sem transformação residual e com foco no botão de voltar',menu.open&&['none','matrix(1, 0, 0, 1, 0, 0)'].includes(menu.transform)&&menu.opacity==='1'&&/room-menu-close/.test(menu.focus),menu);
  // botão dentro do pop-up (camada superior do navegador): a face também acende ali, sem sair do diálogo
  const mb=await rectOf('#room-menu .room-menu-close'),w0=await page.evaluate(()=>(window.RunaButtonHover?.stats||{}));await page.mouse.move(mb.x+mb.width/2,mb.y+mb.height/2);await page.waitForTimeout(320);
  const inMenu=await page.evaluate(()=>{const b=document.querySelector('#room-menu .room-menu-close'),h=b.querySelector(':scope>.wood-hover');return {holder:!!h,text:b.textContent,focus:document.activeElement===b,stats:(window.RunaButtonHover?.stats||{})};});
  check('no menu, o botão "Voltar ao jogo" acende no hover e mantém texto e foco',inMenu.holder&&/Voltar ao jogo/.test(inMenu.text)&&inMenu.focus&&inMenu.stats.lit===w0.lit+1,{inMenu,w0});await page.screenshot({path:path.join(out,'menu-botao-aceso.png'),clip:pad(mb,30)});
  const tb=await rectOf('#room-menu #table-tools button');if(tb){await page.mouse.move(tb.x+tb.width/2,tb.y+tb.height/2);await page.waitForTimeout(320);await page.screenshot({path:path.join(out,'menu-botao-escuro-aceso.png'),clip:pad(tb,30)});}
  await page.mouse.move(8,8);await page.waitForTimeout(250);
  await page.keyboard.press('Escape');await page.waitForTimeout(350);
  const closed=await page.evaluate(()=>({open:document.getElementById('room-menu').open,focus:document.activeElement?.className}));
  check('Esc fecha o menu e devolve o foco ao gatilho',!closed.open&&/camp-menu-trigger/.test(closed.focus),closed);
  // cliques repetidos: abrir/fechar cinco vezes sem sobras
  for(let i=0;i<5;i++){await page.click(trigger);await page.waitForTimeout(40);await page.keyboard.press('Escape');await page.waitForTimeout(40);}
  await page.click(trigger);await page.waitForTimeout(700);
  const again=await page.evaluate(()=>{const m=document.getElementById('room-menu');return {open:m.open,transform:getComputedStyle(m).transform,opacity:getComputedStyle(m).opacity,running:m.getAnimations().length};});
  check('após abrir e fechar cinco vezes em sequência, o menu assenta inteiro',again.open&&['none','matrix(1, 0, 0, 1, 0, 0)'].includes(again.transform)&&again.opacity==='1'&&again.running===0,again);
  // confirmação de saída (pop-up sobre pop-up)
  await page.click('#leave-room');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await frames(page,'confirmacao-entrada','dialog.room-menu-dialog:not(#room-menu)',clip,[0,67,133,200,267,333,400]);await release(page);await page.waitForTimeout(250);
  const conf=await page.evaluate(()=>({open:!!document.querySelector('dialog.room-menu-dialog:not(#room-menu)[open]'),focus:document.activeElement?.textContent}));
  check('a confirmação de saída abre com foco em "Continuar na sala"',conf.open&&/Continuar/.test(conf.focus||''),conf);
  await page.keyboard.press('Escape');await page.waitForTimeout(250);await page.keyboard.press('Escape');await page.waitForTimeout(250);}
 check('sem erros de página',!errors.length,errors);
 await ctx.close();
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,1));finish(out,'abertura-ui',H,{report});
