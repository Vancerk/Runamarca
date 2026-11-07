import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('Fresh evidence directory required');fs.mkdirSync(out,{recursive:true});
process.env.QA_BASE='http://127.0.0.1:3128';process.env.HYBRID_VERIFY_INCREMENTAL='1';process.env.HYBRID_VERIFY_LOG=path.resolve(out,'divergences.log');
const L=await import('./hybrid12-lib.mjs');
const server=spawn(process.execPath,['scripts/board-prototype-server.mjs'],{windowsHide:true,stdio:'ignore',env:{...process.env,PROTOTYPE_PORT:'3128',RUNAMARCA_FEEDBACK_DIR:path.resolve(out,'store')}});
let browser;const rows=[];
function scene(kind){const {room,a,b}=L.setup();for(const p of [a,b]){p.hand=[L.card('FV03',p)];p.patron.hp=60;}
const golias=L.card('FL09',a),bobo=L.card('FL16',a);
if(kind==='golias-taunt'){a.reserve=[L.card('FV03',a),golias,L.card('FV03',a)];a.formation=a.reserve.map(c=>c.uid);a.taunts={[golias.uid]:[0,2]};b.reserve=[L.card('FL09',b),L.card('FL11',b),L.card('FL09',b)];}
if(kind==='golias-attacks'){a.reserve=[golias];a.formation=[null,golias.uid,null];b.reserve=[L.card('FL16',b),L.card('FL11',b),L.card('FV03',b)];}
if(kind==='bobo-taunt'){a.reserve=[L.card('FL11',a),bobo,L.card('FL11',a)];a.formation=a.reserve.map(c=>c.uid);a.taunts={[bobo.uid]:[0,2]};b.reserve=[L.card('FL11',b),L.card('FL11',b),L.card('FL11',b)];}
if(kind==='control'){a.reserve=[L.card('FL11',a),L.card('FL11',a),L.card('FL11',a)];a.formation=a.reserve.map(c=>c.uid);b.reserve=[L.card('FL11',b),L.card('FL11',b),L.card('FL11',b)];}
b.formation=b.reserve.map(c=>c.uid);for(const p of [a,b]){p.ready=false;p.mana=0;for(const c of p.reserve)if(c.modelId==='FL11')c.protocolMode='assault';}room.phase='formation';return {room,a,b};}
try{
for(let i=0;i<150;i++){try{if((await fetch(process.env.QA_BASE+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
browser=await L.launch();
outer:for(let run=0;run<Number(process.env.CACHE_ENTRY_RUNS||2);run++)for(const kind of ['golias-taunt','golias-attacks','bobo-taunt','control'])for(const seat of ['a','b']){
 const errors=[],messages=[],f=scene(kind),{page,context}=await L.open(browser,{width:1280,height:720},{errors});
 page.on('console',m=>{if(m.text().includes('[hybrid-incremental]'))messages.push(m.text());});
 if(process.env.CACHE_ENTRY_REDUCED!=='0')await page.emulateMedia({reducedMotion:'reduce'});
 const formation=L.view(f.room,f[seat]);await L.paint(page,process.env.CACHE_ENTRY_TRANSITION!=='0'?{...formation,phase:'prep'}:formation,1000);
 if(process.env.CACHE_ENTRY_TRANSITION!=='0')await page.evaluate(v=>{state=v;render();RunaHybrid.sync();RunaHybrid.sync();},formation);
 await page.evaluate(async()=>{for(let i=0;i<3;i++){RunaHybrid.sync();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}});const stats=await page.evaluate(()=>RunaHybrid.stats.incremental);rows.push({run,kind,seat,stats,errors,messages});
 if(errors.length){await page.screenshot({path:path.join(out,'failure.png')});await context.close();break outer;}
 await context.close();
}
}finally{await browser?.close();server.kill();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));}
const expected=Number(process.env.CACHE_ENTRY_RUNS||2)*8;
const checks=[{name:'all requested scenarios completed',pass:rows.length===expected},...rows.flatMap(r=>[
 {name:`${r.run}/${r.kind}/${r.seat}: cache comparison actually ran`,pass:r.stats.verified>0},
 {name:`${r.run}/${r.kind}/${r.seat}: geometry and styles match the full build`,pass:r.stats.mismatches.length===0},
 {name:`${r.run}/${r.kind}/${r.seat}: no page error`,pass:r.errors.length===0}
])];
fs.writeFileSync(path.join(out,'assertions.json'),JSON.stringify(checks,null,2));
console.log(JSON.stringify({cases:rows.length,checks:checks.length,failed:checks.filter(c=>!c.pass),failures:rows.filter(r=>r.errors.length)}));if(checks.some(c=>!c.pass))process.exitCode=1;
