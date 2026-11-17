// Rodada 4 · sonda: posição do conteúdo do painel da rodada dentro da própria caixa (sem projeção), em estados variados.
import {chromium,CHROME} from './hybrid12-lib.mjs';
import {setup,card,view} from '../mesa-nova/r1-fixtures.mjs';
const base=process.env.QA_BASE||'http://127.0.0.1:3121';const b=await chromium.launch({executablePath:CHROME,headless:true});
for(const v of [{round:1,mana:1,deadline:true},{round:2,mana:10,deadline:false}]){
 const ctx=await b.newContext({viewport:{width:1907,height:945}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));const page=await ctx.newPage();
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&window.RunaHybridConfig);
 const s=setup(),{room,a,b:o}=s;room.phase='prep';room.turn=a.id;room.round=v.round;a.mana=v.mana;a.manaMax=v.mana;o.mana=0;o.manaMax=1;a.hand=['FL10','RG07','FV08'].map(id=>card(id,a));if(v.deadline)room.turnEndsAt=Date.now()+60000;
 await page.evaluate(st=>{state=st;serverClockOffset=Date.now()-st.serverNow;render();},{...JSON.parse(JSON.stringify(view(room,a))),serverNow:Date.now()});await page.waitForFunction(()=>window.RunaHybrid?.ready);await page.waitForTimeout(1200);
 console.log(JSON.stringify(v),JSON.stringify(await page.evaluate(()=>{const n=document.getElementById('center-actions'),cs=getComputedStyle(n);return {w:n.offsetWidth,pad:[cs.paddingLeft,cs.paddingRight,cs.borderLeftWidth,cs.borderRightWidth],display:cs.display,kids:[...n.querySelectorAll('*')].filter(k=>k.offsetWidth&&k.offsetParent).slice(0,30).map(k=>{let x=0,e=k;while(e&&e!==n){x+=e.offsetLeft;e=e.offsetParent;}return (k.id||String(k.className).split(' ')[0]||k.tagName)+':'+x+'+'+k.offsetWidth;})};})));await ctx.close();}
await b.close();
