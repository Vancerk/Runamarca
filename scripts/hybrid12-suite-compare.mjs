// Revisão 12: compara duas execuções de hybrid12-run-suite.mjs por comando, status,
// contagens do node:test e mensagens de erro (nunca por duração).
// Uso: node scripts/hybrid12-suite-compare.mjs [before] [after]
//   → prototype-qa/hybrid-12/suite-compare-<before>-<after>.json
import fs from 'node:fs';
const [a='before',b='after']=process.argv.slice(2),dir='prototype-qa/hybrid-12',load=l=>JSON.parse(fs.readFileSync(`${dir}/suite-${l}.json`,'utf8'));
const A=load(a),B=load(b),key=r=>r.command,index=new Map(A.results.map(r=>[key(r),r])),rows=[];
const norm=e=>(e||[]).map(s=>s.replace(/\(\d+(\.\d+)?ms\)/g,'').replace(/duration_ms:? ?[\d.]+/g,'').trim());
for(const r of B.results){const p=index.get(key(r));index.delete(key(r));
 const same=!!p&&p.status===r.status&&p.nodeTestPass===r.nodeTestPass&&p.nodeTestFail===r.nodeTestFail&&JSON.stringify(norm(p.errors))===JSON.stringify(norm(r.errors));
 rows.push({command:r.command,before:p?{status:p.status,pass:p.nodeTestPass,fail:p.nodeTestFail,firstError:p.firstError}:null,after:{status:r.status,pass:r.nodeTestPass,fail:r.nodeTestFail,firstError:r.firstError},identical:same,newFailure:r.status!==0&&(!p||p.status===0),fixed:r.status===0&&!!p&&p.status!==0});}
for(const p of index.values())rows.push({command:p.command,before:{status:p.status},after:null,identical:false,missingAfter:true});
const summary={before:{label:a,node:A.node,date:A.date,passed:A.results.filter(r=>r.status===0).length,total:A.results.length},after:{label:b,node:B.node,date:B.date,passed:B.results.filter(r=>r.status===0).length,total:B.results.length},identical:rows.filter(r=>r.identical).length,newFailures:rows.filter(r=>r.newFailure).map(r=>r.command),fixed:rows.filter(r=>r.fixed).map(r=>r.command),changed:rows.filter(r=>!r.identical).map(r=>({command:r.command,before:r.before,after:r.after}))};
fs.writeFileSync(`${dir}/suite-compare-${a}-${b}.json`,JSON.stringify({summary,rows},null,1));
console.log(JSON.stringify(summary,null,1));process.exitCode=summary.newFailures.length?1:0;
