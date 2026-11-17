// Rodada 3 (11/11/2026) · arquibancada com mãos visíveis, no navegador, com o motor real em processo.
// Uso: node scripts/rodada3-arquibancada.mjs <out-dir>   QA_BASE
import fs from 'node:fs';import path from 'node:path';
import {harness,finish,chromium,CHROME} from './hybrid12-lib.mjs';
import {makeRoom,join,act,view} from '../mesa-nova/game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../mesa-nova/cartas.json',import.meta.url)));
const [out='prototype-qa/rodada3-20261111/arquibancada']=process.argv.slice(2),H=harness(out),{check}=H;fs.mkdirSync(out,{recursive:true});
const base=process.env.QA_BASE||'http://127.0.0.1:3121',report={base,runs:[]};
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER||CHROME,headless:true});
try{for(const open of [true,false]){
 const room=makeRoom('ARQ'+(open?'111':'222'),'Ana'),a=room.players[0],b=join(room,'Beto'),s=join(room,'Plateia','spectator');act(room,a,{type:'spectatorHands',value:open},catalog);
 act(room,a,{type:'deck',deckId:catalog.decks[1].id},catalog);act(room,b,{type:'deck',deckId:catalog.decks[0].id},catalog);act(room,a,{type:'confirmMulligan'},catalog);act(room,b,{type:'confirmMulligan'},catalog);
 const ctx=await browser.newContext({viewport:{width:1920,height:1080}});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort('blockedbyclient'));
 await ctx.route(u=>/\/api\/rooms\/[^/]+\/state$/.test(u.pathname),r=>r.fulfill({json:{...view(room,s),serverNow:Date.now()}}));
 const acts=[];await ctx.route('**/api/rooms/*/act',r=>{acts.push(r.request().postDataJSON());return r.fulfill({status:400,json:{error:'arquibancada'}});});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(c=>{sessionStorage.setItem('runamarca-nova-seat',JSON.stringify({code:c,token:'probe'}));},room.code);
 await page.addInitScript(([c,m])=>sessionStorage.setItem('runamarca-intro:'+c+':'+m,'seen'),[room.code,room.matchId]);
 await page.goto(base+'/runamarca/');await page.waitForFunction(()=>typeof render==='function'&&state&&window.RunaHybrid?.ready,null,{timeout:20000});
 await page.waitForFunction(()=>!RunaCardArrivals.blocked,null,{timeout:20000}).catch(()=>{});await page.waitForTimeout(2200);
 const tag=open?'maos-visiveis':'maos-ocultas';await page.screenshot({path:path.join(out,tag+'.png')});
 const m=await page.evaluate(()=>({top:document.querySelectorAll('#opponent-hand .spectator-face').length,backs:document.querySelectorAll('#opponent-hand .rival-hand-back>img[alt="Carta oculta"]').length,bottom:document.querySelectorAll('#hand .card').length,label:document.getElementById('opponent-hand').getAttribute('aria-label'),
  topVisible:[...document.querySelectorAll('#opponent-hand .rival-hand-back')].map(n=>{const r=n.getBoundingClientRect();return Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0))/r.height;}).reduce((x,y)=>Math.max(x,y),0)}));
 // tentativa de arrastar uma carta de baixo: nada é enviado
 const c0=await page.locator('#hand .card').first().boundingBox().catch(()=>null);if(c0){await page.mouse.move(c0.x+c0.width/2,c0.y+20);await page.mouse.down();await page.mouse.move(960,450,{steps:10});await page.mouse.up();await page.waitForTimeout(400);}
 report.runs.push({open,m,acts});console.log(tag,JSON.stringify(m));
 if(open){check('mãos visíveis: a mão de cima mostra as faces das cartas do outro jogador',m.top===b.hand.length&&m.backs===0,m);check('mãos visíveis: a mão de baixo mostra as cartas do primeiro jogador',m.bottom===a.hand.length,m);check('mãos visíveis: pelo menos metade da mão de cima à vista',m.topVisible>=.45,m);}
 else{check('mãos ocultas: a mão de cima mostra só versos',m.top===0&&m.backs===b.hand.length,m);check('mãos ocultas: nenhuma carta de jogador na mão de baixo',m.bottom===0,m);}
 check(tag+': arrastar na arquibancada não envia nada',acts.length===0,acts);check(tag+': sem erros de página',!errors.length,errors);await ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'arquibancada.json'),JSON.stringify(report,null,1));finish(out,'rodada3-arquibancada',H,{report});
