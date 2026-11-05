// S8: checks against the production entry point (npm start = node --experimental-vm-modules server.js)
// running locally on an isolated port, without NODE_ENV=test, database or test access session.
// Usage: node scripts/s8-prod-check.mjs <base-url> <out-dir>
import fs from 'node:fs';import path from 'node:path';
const [base='http://127.0.0.1:3191',outDir='prototype-qa/s8/prod-server']=process.argv.slice(2);fs.mkdirSync(outDir,{recursive:true});
const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log(pass?'ok  ':'FAIL',name,pass?'':JSON.stringify(detail).slice(0,300));};
const get=async(p,opts={})=>{const r=await fetch(base+p,{redirect:'manual',...opts});const text=await r.text();return {status:r.status,headers:Object.fromEntries(r.headers),text};};
for(let i=0;i<30;i++){try{if((await fetch(base+'/runamarca/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
const health=await get('/runamarca/health');check('saúde da mesa: /runamarca/health 200 {ok:true}',health.status===200&&JSON.parse(health.text).ok===true,health);
const entry=await get('/runamarca/');check('entrada sem sessão: 302 para /runamarca/access (código de acesso exigido)',entry.status===302&&entry.headers.location==='/runamarca/access',{status:entry.status,location:entry.headers.location});
const access=await get('/runamarca/access');check('página de acesso 200, sem cache',access.status===200&&/no-store/.test(access.headers['cache-control']||''),{status:access.status,cache:access.headers['cache-control']});
const asset=await get('/runamarca/app.js');check('assets da mesa também protegidos pelo acesso (302)',asset.status===302,{status:asset.status});
const version=await get('/api/runamarca/version');let v=null;try{v=JSON.parse(version.text);}catch{}
check('versão exposta pelo servidor (/api/runamarca/version)',version.status===200&&v,{status:version.status,body:version.text.slice(0,300)});
const fbGet=await get('/runamarca/api/rooms/ABCDEF/feedback'),fbPost=await get('/runamarca/api/rooms/ABCDEF/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({matchId:'x'.repeat(10),surveyVersion:'pos-partida-2',answers:{diversao:3}})});
check('feedback sem sessão de acesso: 403 ACCESS_REQUIRED (GET e POST), nada gravado',fbGet.status===403&&fbPost.status===403&&/ACCESS_REQUIRED/.test(fbPost.text)&&!fs.existsSync(path.join(outDir,'store','feedback')),{get:fbGet.status,post:fbPost.status});
const testAccess=await get('/runamarca/api/create',{method:'POST',headers:{'content-type':'application/json'},body:'{"name":"x"}'});
check('sem NODE_ENV=test: nenhuma sessão de teste implícita (create → 403)',testAccess.status===403,{status:testAccess.status});
const files=['mesa-nova/index.html','mesa-nova/hybrid/index.html','mesa-nova/app.js','mesa-nova/match-survey.js','mesa-nova/combat-record.js','mesa-nova/round-circuit.js','server.js','mesa-nova/server.mjs'];
const ref3086=files.filter(f=>fs.readFileSync(f,'utf8').includes('3086'));check('código publicado não referencia o servidor 3086',ref3086.length===0,{ref3086});
const vjson=JSON.parse(fs.readFileSync('mesa-nova/version.json','utf8'));check('identificação da versão preservada (V26 em desenvolvimento)',/V26/.test(JSON.stringify(vjson))&&/desenvolvimento/i.test(JSON.stringify(vjson)),vjson);
fs.writeFileSync(path.join(outDir,'s8-prod-check.json'),JSON.stringify({base,checks,version:v,versionJson:vjson},null,1));
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} checks`);process.exitCode=checks.every(c=>c.pass)?0:1;
