// Starts a disposable loopback server, then waits for every child test before shutdown.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// Usage: node scripts/presentation-stage1-qa.mjs <comparison|strikes|combat|interaction|motion|record> [out-dir]
const dir=process.argv[3]||'prototype-qa/simplificacao-etapa1';fs.mkdirSync(dir,{recursive:true});
const mode=process.argv[2]||'comparison';
const env={...process.env,S5_ONLY:'hybrid',QA_BASE:'http://127.0.0.1:3094',PROTOTYPE_PORT:'3094',QA_BROWSER:process.env.QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',RUNAMARCA_FEEDBACK_DIR:path.resolve(dir,'store')};
const server=spawn(process.execPath,['--experimental-vm-modules','scripts/board-prototype-server.mjs'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
const log=fs.createWriteStream(path.join(dir,'server-'+mode+'.log'));server.stdout.pipe(log);server.stderr.pipe(log);
const cases={comparison:[['scripts/presentation-stage1-probe.mjs',dir+'/comparison']],strikes:[['scripts/v4-strike-frames.mjs',dir+'/strikes']],combat:[['scripts/b-combat-focal.mjs',dir+'/combat','desktop','registro','resize','reduced','leave']],interaction:[['scripts/hybrid10-interaction.mjs']],motion:[['scripts/hybrid9-motion.mjs']],record:[['scripts/s5-record-timing.mjs',dir+'/record']]};
try{
 let ready=false;for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('QA server stopped');try{if((await fetch(env.QA_BASE+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('QA server not ready');
 fs.mkdirSync(path.join(dir,mode),{recursive:true});const selected=cases[mode];if(!selected)throw Error('Unknown mode');
 for(const args of selected){const result=await new Promise(resolve=>{const child=spawn(process.execPath,args,{env:{...env,HYBRID_QA_OUT:path.resolve(dir,mode)},windowsHide:true,stdio:['ignore','pipe','pipe']});const output=fs.createWriteStream(path.join(dir,mode+'.log'));for(const stream of [child.stdout,child.stderr]){stream.pipe(output,{end:false});stream.pipe(process.stdout,{end:false});}child.on('close',code=>{output.end();resolve(code);});});if(result!==0)process.exitCode=1;}
}finally{server.kill();log.end();}
