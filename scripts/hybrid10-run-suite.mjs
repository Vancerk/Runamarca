// Executa individualmente cada comando de `npm test` e `npm run test:polish`,
// mais as regressões pedidas, para que uma falha anterior não esconda as demais.
// Uso: node scripts/hybrid10-run-suite.mjs <rótulo>   → prototype-qa/hybrid-10/suite-<rótulo>.json
import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const label=process.argv[2]||'run',pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
// O baseline registrado é evidência histórica e nunca é sobrescrito.
if(fs.existsSync('prototype-qa/hybrid-10/suite-'+label+'.json')&&label==='baseline')throw new Error('suite-baseline.json já existe; use outro rótulo');
// Contadores do node:test: "ℹ pass N" no reporter spec ou "# pass N" no TAP.
// Escapes Unicode evitam depender da codificação do arquivo.
const count=(out,word)=>out.match(new RegExp('^(?:\\u2139|#) '+word+' (\\d+)','gm'))?.map(s=>+s.split(' ').at(-1)).reduce((a,b)=>a+b,0)??null;
const commands=[...pkg.scripts.test.split('&&'),pkg.scripts['test:polish'],'node --test mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-progressive-reveal.mjs mesa-nova/test-targeting-polish.mjs','node --experimental-vm-modules --test bot/integration.test.mjs'].map(s=>s.trim()).filter(Boolean);
const results=[];
for(const command of commands){const started=Date.now(),r=spawnSync(command,{shell:true,encoding:'utf8',timeout:600000}),out=(r.stdout||'')+(r.stderr||''),pass=count(out,'pass'),fail=count(out,'fail');
 const firstError=r.status?out.split(/\r?\n/).find(l=>/AssertionError|Error:|not ok|✖/.test(l))?.trim().slice(0,300):null;
 results.push({command,status:r.status,ms:Date.now()-started,nodeTestPass:pass,nodeTestFail:fail,firstError});console.log((r.status===0?'PASS ':'FAIL ')+command+(firstError?'  → '+firstError:''));}
fs.mkdirSync('prototype-qa/hybrid-10',{recursive:true});fs.writeFileSync('prototype-qa/hybrid-10/suite-'+label+'.json',JSON.stringify({label,node:process.version,date:new Date().toISOString(),results},null,1));
const failed=results.filter(r=>r.status!==0);console.log(`\n${results.length-failed.length}/${results.length} comandos passaram`);process.exitCode=failed.length?1:0;
