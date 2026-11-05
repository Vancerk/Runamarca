// Revisão 12: bateria completa de navegador (as 22 execuções da revisão 11 mais as
// regressões da revisão 12), via hybrid10-qa.mjs, sem parar na primeira falha.
// Scripts ausentes são listados como MISSING, nunca omitidos em silêncio.
// Uso: node scripts/hybrid12-qa-all.mjs <pasta> [script...]
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const [dir,...only]=process.argv.slice(2);if(!dir)throw new Error('uso: hybrid12-qa-all.mjs <pasta> [script...]');
const ALL=[['hybrid9-geometry.mjs'],['hybrid9-limits.mjs'],['hybrid9-review.mjs'],['hybrid9-hands.mjs'],['hybrid9-viewport.cjs'],['hybrid9-startup.mjs'],['hybrid9-touch.mjs'],['hybrid9-emana.mjs'],['hybrid9-emana-interaction.mjs'],['hybrid9-flights.mjs'],['hybrid9-motion.mjs'],['hybrid9-sequence.mjs'],['hybrid9-probe.mjs'],['hybrid9-reveal.mjs'],['hybrid9-apprentice.mjs'],['hybrid9-gameplay.cjs'],['hybrid10-interaction.mjs'],['hybrid10-props.mjs'],['hybrid11-regressions.mjs'],['hybrid9-performance.mjs','1'],['hybrid9-performance.mjs','2'],['hybrid9-fog-performance.mjs'],
 ['hybrid12-regressions.mjs'],['hybrid12-combat-duplicates.mjs'],['hybrid12-veronica.mjs'],['hybrid12-camera.mjs']];
fs.mkdirSync(dir,{recursive:true});const list=only.length?ALL.filter(([s])=>only.includes(s)):ALL,summary=[];
for(const [script,...args] of list){if(!fs.existsSync('scripts/'+script)){summary.push({script:[script,...args].join(' '),status:'MISSING'});console.log('MISSING '+script);continue;}
 const started=Date.now(),r=spawnSync(process.execPath,['scripts/hybrid10-qa.mjs',dir,'scripts/'+script,...args],{encoding:'utf8',maxBuffer:64*1024*1024}),text=(r.stdout||'')+(r.stderr||''),line=text.split(/\r?\n/).filter(l=>/AssertionError|Error|passaram|passed|checks|pass|FAIL/i.test(l)).slice(-2).join(' | ').slice(0,400);
 summary.push({script:[script,...args].join(' '),status:r.status,seconds:+((Date.now()-started)/1000).toFixed(1),line});console.log((r.status===0?'PASS ':'FAIL ')+[script,...args].join(' ')+'  '+line);}
fs.writeFileSync(path.join(dir,'qa-summary.json'),JSON.stringify({date:new Date().toISOString(),summary},null,1));
console.log(`${summary.filter(s=>s.status===0).length}/${summary.length} scripts com saída 0`);process.exitCode=summary.some(s=>s.status!==0)?1:0;
