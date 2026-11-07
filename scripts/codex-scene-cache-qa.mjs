// Exercise the new scene cache itself, including the animated-node invalidation that was interrupted in round 4.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const out=process.argv[2];
if(!out||fs.existsSync(out))throw Error('Use a fresh output directory');
fs.mkdirSync(out,{recursive:true});
process.env.QA_BASE='http://127.0.0.1:3126';
process.env.HYBRID_VERIFY_INCREMENTAL='1';
const {launch,open,paint,captureTable,view,harness,finish}=await import('./hybrid12-lib.mjs');
const H=harness(out);
const server=spawn(process.execPath,['scripts/board-prototype-server.mjs'],{windowsHide:true,stdio:'ignore',env:{...process.env,PROTOTYPE_PORT:'3126',RUNAMARCA_FEEDBACK_DIR:path.resolve(out,'store')}});
let browser;
try{
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch(process.env.QA_BASE+'/health',{signal:AbortSignal.timeout(500)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('Isolated QA server failed to start');
 browser=await launch();const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors});
 const f=captureTable();await paint(page,view(f.room,f.a),1800);
 const counts=()=>page.evaluate(()=>({...RunaHybrid.stats.incremental}));
 const sync=()=>page.evaluate(async()=>{RunaHybrid.sync();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const initial=await counts();for(let i=0;i<4;i++)await sync();const idle=await counts();
 H.check('cena estável usa a reconstrução somente das cartas',idle.cards>initial.cards,{initial,idle});
 H.check('verificação executou a comparação contra a reconstrução completa',idle.verified>initial.verified,idle);
 H.check('cena estável não diverge em geometria nem estilos',idle.mismatches.length===0,idle);
 await page.evaluate(()=>{const n=document.querySelector('.patron-avatar');window.__cacheEntry=n.animate([{transform:'translateY(0px)'},{transform:'translateY(12px)'}],{duration:5000,iterations:Infinity});});
 const movingBefore=await counts();for(let i=0;i<3;i++)await sync();const moving=await counts();
 H.check('nó em animação invalida a parte estática',moving.full>movingBefore.full,moving);
 H.check('não reutiliza geometria estática durante a animação',moving.cards===movingBefore.cards,{movingBefore,moving});
 await page.evaluate(()=>__cacheEntry.cancel());await sync();const settledBefore=await counts();for(let i=0;i<3;i++)await sync();const settled=await counts();
 H.check('cache volta a funcionar quando a animação termina',settled.cards>settledBefore.cards,{settledBefore,settled});
 const beforeResize=await counts();await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(600);const resized=await counts();
 H.check('redimensionamento refaz a geometria completa',resized.full>beforeResize.full,{beforeResize,resized});
 await sync();const end=await counts();
 H.check('nenhuma divergência após animação e redimensionamento',end.mismatches.length===0,end);
 H.check('nenhum erro de página',H.errors.length===0,H.errors);
 fs.writeFileSync(path.join(out,'cache-counts.json'),JSON.stringify({initial,idle,movingBefore,moving,settledBefore,settled,beforeResize,resized,end},null,2));
 await context.close();
}finally{await browser?.close();server.kill();finish(out,'scene-cache',H);}
