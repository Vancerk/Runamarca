// Claude review (05/11/2026): integration run. Own server on 3101 with its own feedback store; the owner's 3086 is
// never used. Each command's real exit code and log go to a NEW folder. Usage: node scripts/claude-verify.mjs <label>
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const label=process.argv[2];if(!/^[\w-]+$/.test(label||''))throw Error('label');
const out=path.resolve(process.env.CLAUDE_QA_ROOT||'prototype-qa/claude-nitidez-provocar-20261105','verificacao',label);if(fs.existsSync(out))throw Error('exists '+out);fs.mkdirSync(out,{recursive:true});
const PORT=process.env.CLAUDE_QA_PORT||'3101';if(!/^\d+$/.test(PORT)||+PORT<1024||+PORT>65535)throw Error('Invalid CLAUDE_QA_PORT');
const env={...process.env,QA_BASE:'http://127.0.0.1:'+PORT,QA_BROWSER:process.env.QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',HYBRID_QA_OUT:path.join(out,'combat-duplicates')};
const server=spawn(process.execPath,['scripts/board-prototype-server.mjs'],{windowsHide:true,env:{...env,PROTOTYPE_PORT:PORT,RUNAMARCA_FEEDBACK_DIR:path.join(out,'store')},stdio:['ignore','pipe','pipe']});
const slog=fs.createWriteStream(path.join(out,'server.log'));server.stdout.pipe(slog);server.stderr.pipe(slog);
let serverReady=false,serverFailure=null;server.stdout.on('data',chunk=>{if(chunk.toString().includes('Prototype local: '+env.QA_BASE+'/'))serverReady=true;});server.on('error',error=>{serverFailure=error;});server.on('exit',(code,signal)=>{serverFailure=Error('QA server exited: '+(signal||code));});
const results=[];
const run=(name,cmd,args,opts={})=>{const t=Date.now();const r=spawnSync(cmd,args,{env:{...env,...opts.env},windowsHide:true,encoding:'utf8',maxBuffer:1<<28,timeout:opts.timeout||900000,shell:opts.shell||false});const diagnostic=r.error?String(r.error.stack||r.error):'';fs.writeFileSync(path.join(out,name+'.log'),(r.stdout||'')+'\n--- stderr ---\n'+(r.stderr||'')+(diagnostic?'\n--- runner ---\n'+diagnostic:''));const tail=((r.stdout||'')+(r.stderr||'')+diagnostic).trim().split('\n').slice(-2).join(' | ');results.push({name,cmd:[cmd,...args].join(' '),exit:r.status,signal:r.signal,error:r.error?.message||null,ms:Date.now()-t,tail});if(r.status!==0||r.signal||r.error)process.exitCode=1;console.log(name,'exit',r.status,tail.slice(0,160));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,1));};
try{
 let healthy=false;for(let i=0;i<150;i++){if(serverFailure)throw serverFailure;if(serverReady){try{if((await fetch(env.QA_BASE+'/health',{signal:AbortSignal.timeout(1000)})).ok){healthy=true;break;}}catch{}}await new Promise(r=>setTimeout(r,100));}if(!healthy)throw Error('QA server did not become healthy: '+env.QA_BASE);
 const only=process.env.CLAUDE_VERIFY_ONLY?.split(',');const want=n=>!only||only.includes(n);
 if(want('npm-test'))run('npm-test','npm',['test'],{shell:true,timeout:1500000});
 if(want('test-polish'))run('test-polish','npm',['run','test:polish'],{shell:true});
 if(want('taunt'))run('test-taunt-bonus',process.execPath,['mesa-nova/test-taunt-bonus.mjs']);
 for(const s of ['presentation-geometry-qa','presentation-recovery-qa','presentation-stage2-transfers','presentation-stage2-arrivals','presentation-incremental-qa'])if(want(s))run(s,process.execPath,['scripts/'+s+'.mjs',path.join(out,s)]);
 if(want('scene-cache'))run('scene-cache',process.execPath,['scripts/codex-scene-cache-qa.mjs',path.join(out,'scene-cache')]);
 if(want('cache-entry'))run('cache-entry',process.execPath,['scripts/codex-cache-entry-qa.mjs',path.join(out,'cache-entry')]);
 if(want('platinum'))run('s3-platinum',process.execPath,['scripts/s3-platinum.mjs'],{env:{HYBRID_QA_OUT:path.join(out,'platinum')}});
 if(want('veronica'))run('hybrid12-veronica',process.execPath,['scripts/hybrid12-veronica.mjs'],{env:{HYBRID_QA_OUT:path.join(out,'veronica')}});
 if(want('combat-duplicates'))run('hybrid12-combat-duplicates',process.execPath,['scripts/hybrid12-combat-duplicates.mjs']);
 for(const condition of ['before','after'])if(only?.includes('combat-crash-'+condition))run('combat-crash-'+condition,process.execPath,['scripts/codex-combat-baseline.mjs'],{env:{QA_FLIGHT_BASELINE:condition==='before'?'1':'0',COMBAT_KINDS:'golias-taunt',COMBAT_SEATS:'b',COMBAT_SCREENS:'1920x900',HYBRID_QA_OUT:path.join(out,'combat-crash-'+condition)}});
 if(!results.length)throw Error('No tests selected by CLAUDE_VERIFY_ONLY');
}finally{server.kill();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,1));}
