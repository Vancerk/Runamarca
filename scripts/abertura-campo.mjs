// Campo de combate (10/11/2026) · tamanho do campo em repouso, em foco (formação) e durante o arrasto de uma carta.
// Mede o retângulo das casas na tela e captura a mesa inteira em cada estado. QA_BASE aponta a versão medida.
// Uso: node scripts/abertura-campo.mjs <out-dir>   VIEWS="1920x1080,1366x768"
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,place,card,view} from '../mesa-nova/r1-fixtures.mjs';
const [out='prototype-qa/abertura-20261109/campo']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',views=(process.env.VIEWS||'1920x1080,1366x768').split(',').map(v=>v.split('x').map(Number)),expectNew=!process.env.BASELINE;
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});const report={base,runs:[]};
const measure=page=>page.evaluate(()=>{const sides=[...document.querySelectorAll('#lanes .lane-side')].map(n=>n.getBoundingClientRect()).filter(r=>r.width),l=Math.min(...sides.map(r=>r.left)),r=Math.max(...sides.map(r=>r.right)),t=Math.min(...sides.map(r=>r.top)),b=Math.max(...sides.map(r=>r.bottom)),one=sides[0];
 const focus=window.RunaHybrid?.stats?.focus||window.RunaHybrid?.stats?.metrics?.focus||null,card=document.querySelector('#lanes .lane-side .card')?.getBoundingClientRect();
 return {field:{x:Math.round(l),y:Math.round(t),w:Math.round(r-l),h:Math.round(b-t)},socket:{w:+one.width.toFixed(1),h:+one.height.toFixed(1)},card:card?{w:+card.width.toFixed(1),h:+card.height.toFixed(1)}:null,focus,api:window.RunaHybridFocus?.stats?{value:RunaHybridFocus.stats.value,approach:RunaHybridFocus.stats.approach??null}:null,overflowX:document.documentElement.scrollWidth>innerWidth+1};});
try{for(const [vw,vh] of views){
 const ctx=await browser.newContext({viewport:{width:vw,height:vh}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);await page.evaluate(()=>document.fonts.ready);
 const paint=async prepare=>{const s=setup();s.a.hand=['FL10','RG07','FV08','FV14'].map(id=>card(id,s.a));place(s.a,card('FL06',s.a),1);place(s.b,card('FL06',s.b),1);s.room.matchId='campo';prepare?.(s);
  await page.evaluate(v=>{state=v;serverClockOffset=Date.now()-v.serverNow;render();},{...JSON.parse(JSON.stringify(view(s.room,s.a))),serverNow:Date.now()});await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.evaluate(()=>Promise.all([...document.querySelectorAll('#game .card')].map(n=>n.visualReady)));await page.waitForTimeout(1500);return s;};
 const tag=vw+'x'+vh;
 await paint();const rest=await measure(page);await page.screenshot({path:path.join(out,tag+'-1-repouso.png')});
 // objetos da mesa: visíveis, lanterna balança ao toque, diário abre e fecha uma página
 if(expectNew){const props=await page.evaluate(()=>({visible:RunaHybridProps.stats.visible,boxes:RunaHybridProps.stats.boxes}));
  check(tag+(vh<=820?': esfera e diário têm área de toque livre (tela baixa: a bússola e o toque da lanterna podem não caber)':': esfera, bússola, lanterna e diário têm área de toque livre'),(vh<=820?['armillary','diary']:['armillary','compass','lantern','diary']).every(id=>props.visible.includes(id)),props);
  if(props.visible.includes('lantern')){await page.click('.hybrid-prop[data-prop=lantern]');await page.waitForTimeout(260);const mid=await page.evaluate(()=>RunaHybridProps.stats.lanternAngle);await page.screenshot({path:path.join(out,tag+'-1b-lanterna-balancando.png')});await page.waitForTimeout(3000);const end=await page.evaluate(()=>({angle:RunaHybridProps.stats.lanternAngle,animating:RunaHybridProps.stats.animating}));
   check(tag+': a lanterna balança ao toque e volta ao repouso sozinha',Math.abs(mid)>.01&&end.angle===0&&!end.animating,{mid,end});}
  if(props.visible.includes('diary')){await page.click('.hybrid-prop[data-prop=diary]');await page.waitForSelector('#diary-note[open]',{timeout:5000});await page.waitForTimeout(450);const d1=await page.evaluate(()=>({name:document.querySelector('.diary-note-name').textContent,text:document.querySelector('.diary-note-text').textContent,foot:document.querySelector('.diary-note-foot').textContent,focus:document.activeElement?.className}));await page.screenshot({path:path.join(out,tag+'-1c-diario.png')});
   await page.click('.diary-note-next');const d2=await page.evaluate(()=>document.querySelector('.diary-note-name').textContent);await page.keyboard.press('Escape');await page.waitForTimeout(250);const closed=await page.evaluate(()=>({open:document.getElementById('diary-note').open,focus:document.activeElement?.dataset?.prop}));
   check(tag+': o diário abre uma anotação, vira a página e fecha com Esc devolvendo o foco',d1.name&&d1.text.length>10&&d2&&d2!==d1.name&&/diary-note-close/.test(d1.focus)&&!closed.open&&closed.focus==='diary',{d1,d2,closed});}}
 // arrasto: uma magia da mão levada até perto do campo (sem soltar)
 const hand=await page.evaluate(()=>[...document.querySelectorAll('#hand .card')].map(n=>{const r=n.getBoundingClientRect();return {uid:n.dataset.uid,x:r.x+r.width/2,y:r.y+Math.min(r.height*.3,60),label:n.getAttribute('aria-label')};}));
 let drag=null;for(const h of hand){await page.mouse.move(h.x,h.y);await page.mouse.down();await page.mouse.move(h.x,h.y-40,{steps:4});await page.mouse.move(rest.field.x+rest.field.w/2,rest.field.y+rest.field.h+60,{steps:14});await page.waitForTimeout(450);
  const legal=await page.evaluate(()=>({preview:!!document.querySelector('.drag-preview'),lanes:window.RunaHybridFocus?.stats?.approachTarget===1?1:0}));
  if(legal.preview&&legal.lanes){drag={card:h.label,...legal,near:await measure(page)};await page.screenshot({path:path.join(out,tag+'-2-arrastando.png')});
   await page.mouse.move(rest.field.x+rest.field.w/2,rest.field.y+rest.field.h*.75,{steps:6});await page.waitForTimeout(350);drag.inside=await measure(page);drag.target=await page.evaluate(([x,y])=>{const n=document.elementFromPoint(x,y);return !!n?.closest?.('#lanes');},[rest.field.x+rest.field.w/2,rest.field.y+rest.field.h*.75]);
   await page.mouse.move(40,vh-40,{steps:8});await page.waitForTimeout(450);drag.away=await measure(page);await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(500);drag.after=await measure(page);break;}
  await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(250);}
 await paint(s=>{s.room.phase='formation';s.room.turn=null;s.a.ready=false;s.b.ready=false;});await page.waitForTimeout(700);const focus=await measure(page);await page.screenshot({path:path.join(out,tag+'-3-foco.png')});
 report.runs.push({view:[vw,vh],rest,drag,focus});
 console.log(tag,'repouso',JSON.stringify(rest.field),'casa',JSON.stringify(rest.socket),'| foco',JSON.stringify(focus.field),'| arrasto',drag?JSON.stringify({perto:drag.near.field,longe:drag.away.field,depois:drag.after.field}):'sem carta arrastável para o campo');
 if(expectNew){
  check(tag+': em foco o campo é maior que em repouso',focus.field.w>rest.field.w*1.2&&focus.field.h>rest.field.h*1.2,{rest:rest.field,focus:focus.field});
  check(tag+': arrastar uma carta para perto amplia o campo (desde 11/11 o repouso já vai até a reserva: +5% no mínimo) e afastar ou soltar devolve o tamanho de repouso',!!drag&&drag.near.field.w>rest.field.w*1.05&&Math.abs(drag.away.field.w-rest.field.w)<=2&&Math.abs(drag.after.field.w-rest.field.w)<=2,drag&&{rest:rest.field,near:drag.near.field,away:drag.away.field,after:drag.after.field});
  check(tag+': com o campo ampliado o ponto sob o ponteiro continua sendo uma casa do campo',!!drag&&drag.target,drag&&{target:drag.target});
  check(tag+': sem rolagem horizontal em nenhum estado',!rest.overflowX&&!focus.overflowX,{rest:rest.overflowX,focus:focus.overflowX});}
 check(tag+': sem erros de página',!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'campo.json'),JSON.stringify(report,null,1));finish(out,'abertura-campo',H,{report});
