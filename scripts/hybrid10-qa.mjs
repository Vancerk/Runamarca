// Executa um script de QA de navegador gravando evidências em pasta própria,
// sem sobrescrever prototype-qa/hybrid-9. Uso:
//   node scripts/hybrid10-qa.mjs <pasta-de-saída> <script> [argumentos...]
// A saída padrão/erro também é registrada em <pasta>/logs/<script>[-args].log.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const [out,script,...args]=process.argv.slice(2);if(!out||!script)throw new Error('uso: hybrid10-qa.mjs <saída> <script> [args]');
fs.mkdirSync(path.join(out,'logs'),{recursive:true});fs.mkdirSync(path.join(out,'atomic'),{recursive:true});
const started=Date.now(),r=spawnSync(process.execPath,[script,...args],{env:{...process.env,HYBRID_QA_OUT:out},encoding:'utf8',maxBuffer:64*1024*1024});
const log=path.join(out,'logs',path.basename(script).replace(/\.[cm]?js$/,'')+(args.length?'-'+args.join('-'):'')+'.log'),text=(r.stdout||'')+(r.stderr||'');
fs.writeFileSync(log,text+`\nEXIT ${r.status} em ${((Date.now()-started)/1000).toFixed(1)} s\n`);
process.stdout.write(text.split(/\r?\n/).slice(-12).join('\n')+`\nEXIT ${r.status} · log ${log}\n`);process.exitCode=r.status??1;
