// Revisão 12: mesma separação do runner da revisão 11 (cada comando de `npm test`,
// test:polish, Aprendiz/revelação/targeting, Platina/Verônica e integração do bot,
// sem parar na primeira falha), com saída própria em prototype-qa/hybrid-12/.
// Uso: node scripts/hybrid12-run-suite.mjs <rótulo>   → prototype-qa/hybrid-12/suite-<rótulo>.json
import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const label=process.argv[2]||'run',pkg=JSON.parse(fs.readFileSync('package.json','utf8')),dir='prototype-qa/hybrid-12',file=dir+'/suite-'+label+'.json';
if(fs.existsSync(file)&&label==='before')throw new Error('suite-before.json já existe; use outro rótulo');
const count=(out,word)=>out.match(new RegExp('^(?:\\u2139|#) '+word+' (\\d+)','gm'))?.map(s=>+s.split(' ').at(-1)).reduce((a,b)=>a+b,0)??null;
const commands=[...pkg.scripts.test.split('&&'),pkg.scripts['test:polish'],'node --test mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-progressive-reveal.mjs mesa-nova/test-targeting-polish.mjs','node --test mesa-nova/test-platinum-manifestations.mjs mesa-nova/test-veronica-origin.mjs mesa-nova/test-veronica-markers.mjs','node --experimental-vm-modules --test bot/integration.test.mjs'].map(s=>s.trim()).filter(Boolean);
const results=[];
for(const command of commands){const started=Date.now(),r=spawnSync(command,{shell:true,encoding:'utf8',timeout:600000}),out=(r.stdout||'')+(r.stderr||''),pass=count(out,'pass'),fail=count(out,'fail');
 const errors=r.status?out.split(/\r?\n/).filter(l=>/AssertionError|Error:|not ok|✖/.test(l)).map(l=>l.trim().slice(0,300)).slice(0,8):[];
 results.push({command,status:r.status,ms:Date.now()-started,nodeTestPass:pass,nodeTestFail:fail,firstError:errors[0]||null,errors});console.log((r.status===0?'PASS ':'FAIL ')+command+(errors[0]?'  → '+errors[0]:''));}
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(file,JSON.stringify({label,node:process.version,date:new Date().toISOString(),results},null,1));
const failed=results.filter(r=>r.status!==0);console.log(`\n${results.length-failed.length}/${results.length} comandos passaram`);process.exitCode=failed.length?1:0;
