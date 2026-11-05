import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const dir=path.resolve(process.argv[3]||'prototype-qa/simplificacao-etapa2-20261105'),mode=process.argv[2]||'arrivals';
fs.mkdirSync(dir,{recursive:true});
const env={...process.env,QA_BASE:'http://127.0.0.1:3095',PROTOTYPE_PORT:'3095',QA_BROWSER:process.env.QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',RUNAMARCA_FEEDBACK_DIR:path.join(dir,'store')};
const cases={incremental:['scripts/presentation-incremental-qa.mjs',dir+'/incremental'],geometry:['scripts/presentation-geometry-qa.mjs',dir+'/geometry'],transfers:['scripts/presentation-stage2-transfers.mjs',dir+'/transfers'],arrivals:['scripts/presentation-stage2-arrivals.mjs',dir+'/arrivals'],motion:['scripts/hybrid9-motion.mjs'],interaction:['scripts/hybrid10-interaction.mjs'],comparison:['scripts/presentation-stage2-compare.mjs',dir+'/comparison']};
if(!cases[mode])throw Error('Unknown QA mode');
const server=spawn(process.execPath,['--experimental-vm-modules','scripts/board-prototype-server.mjs'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
const log=fs.createWriteStream(path.join(dir,'server-'+mode+'.log'));server.stdout.pipe(log);server.stderr.pipe(log);
try{
 let ready=false;for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('QA server stopped');try{if((await fetch(env.QA_BASE+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('QA server not ready');
 fs.mkdirSync(path.join(dir,mode),{recursive:true});
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,cases[mode],{env:{...env,HYBRID_QA_OUT:path.join(dir,mode)},windowsHide:true,stdio:['ignore','pipe','pipe']});const output=fs.createWriteStream(path.join(dir,mode+'.log'));for(const stream of [child.stdout,child.stderr]){stream.pipe(output,{end:false});stream.pipe(process.stdout,{end:false});}child.on('error',reject);child.on('close',code=>{output.end();resolve(code);});});
 if(code!==0)process.exitCode=1;
}finally{server.kill();await new Promise(resolve=>server.exitCode!==null?resolve():server.once('close',resolve));log.end();}
