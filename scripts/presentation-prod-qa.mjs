// Isolated production entry: real form authentication and the real server bot.
// Credentials live only in child-process environments; never in output files.
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs';import path from 'node:path';
const out=path.resolve(process.argv[2]||'prototype-qa/simplificacao-final/prod');fs.mkdirSync(out,{recursive:true});
const code=String(10000000+randomBytes(4).readUInt32BE()%90000000),base='http://127.0.0.1:3194',store=path.join(out,'store');
const env={...process.env,QA_ACCESS_CODE:code,RUNAMARCA_ACCESS_CODE_SHA256:createHash('sha256').update(code).digest('hex'),RUNAMARCA_ACCESS_SECRET:randomBytes(32).toString('hex'),RUNAMARCA_FEEDBACK_DIR:store,QA_BROWSER:process.env.QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'};
for(const key of ['NODE_ENV','DATABASE_URL','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI','RUNAMARCA_FLOW_TEST'])delete env[key];
const server=spawn(process.execPath,['--experimental-vm-modules','--input-type=module','-e',"import {server} from './server.js';server.listen(3194,'127.0.0.1',()=>console.log('Isolated production QA ready'));"],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
const log=fs.createWriteStream(path.join(out,'server.log'));server.stdout.pipe(log);server.stderr.pipe(log);
try{
 let ready=false;for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('QA server stopped');try{if((await fetch(base+'/runamarca/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('QA server not ready');
 for(const [name,args] of [['auth',['scripts/s8-prod-auth.mjs',base,path.join(out,'auth')]],['bot',['scripts/s8-bot-finish.mjs',base,path.join(out,'bot'),store,'540']]]){
  const result=await new Promise((resolve,reject)=>{const file=fs.createWriteStream(path.join(out,name+'.log')),child=spawn(process.execPath,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});for(const stream of [child.stdout,child.stderr]){stream.pipe(file,{end:false});stream.pipe(process.stdout,{end:false});}child.on('error',reject);child.on('close',code=>{file.end();resolve(code);});});
  if(result!==0){process.exitCode=1;break;}
 }
}finally{server.kill();await new Promise(resolve=>server.exitCode!==null?resolve():server.once('close',resolve));log.end();}
