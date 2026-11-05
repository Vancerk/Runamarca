// S8: RUNAMARCA_ACCESS_CODE_SHA256 is optional. Absent → the built-in hash; empty or malformed → startup refused
// with a clear message that never echoes the value. Every case runs in a child process with isolated storage.
// Usage: node scripts/s8-access-config.mjs <out-dir>
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {randomBytes} from 'node:crypto';
const [out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'runamarca-access-config-')),node=process.execPath;
const results=[],check=(name,ok,detail)=>{results.push({name,ok:Boolean(ok),detail});console.log((ok?'PASS ':'FAIL ')+name,JSON.stringify(detail??''));};
const expectedDefault='d1278d1e774f8b0c27c166302871dd40ccea755f31738a8210d70de8c44a9fe5';
function baseEnv(extra){const env={...process.env};for(const k of ['NODE_ENV','DATABASE_URL','RUNAMARCA_ACCESS_CODE_SHA256','DISCORD_CLIENT_SECRET','DISCORD_CLIENT_ID','RUNAMARCA_SIMULATION'])delete env[k];return {...env,RUNAMARCA_FEEDBACK_DIR:path.join(tmp,'feedback'),RUNAMARCA_ACCESS_SECRET:randomBytes(32).toString('hex'),...extra};}
function run(args,env,{until,timeout=20000}={}){return new Promise(resolve=>{const child=spawn(node,args,{cwd:root,env});let stdout='',stderr='',done=false;const finish=code=>{if(done)return;done=true;clearTimeout(timer);resolve({code,stdout,stderr});};
 child.stdout.on('data',d=>{stdout+=d;if(until&&until.test(stdout)){child.kill();finish('ready');}});child.stderr.on('data',d=>stderr+=d);child.on('exit',code=>finish(code));const timer=setTimeout(()=>{child.kill();finish('timeout');},timeout);});}
try{
 // 1 · absent variable keeps the built-in hash (module function, with and without the variable)
 const probe=`const m=await import(${JSON.stringify('file:///'+root.replace(/\\/g,'/')+'/mesa-nova/server.mjs')});const upper='AB'.repeat(32);console.log(JSON.stringify({def:m.defaultAccessHash,absent:m.accessCodeHash({}),env:m.accessCodeHash(process.env),upper:m.accessCodeHash({RUNAMARCA_ACCESS_CODE_SHA256:upper})}));process.exit(0);`;
 const absent=await run(['--experimental-vm-modules','--input-type=module','-e',probe],baseEnv({}));const r=JSON.parse(absent.stdout.trim().split('\n').at(-1)||'{}');
 check('padrão é exatamente o hash anterior',r.def===expectedDefault,{def:r.def});
 check('variável ausente mantém o padrão',r.absent===expectedDefault&&r.env===expectedDefault,{absent:r.absent===expectedDefault,env:r.env===expectedDefault});
 check('hash válido em maiúsculas é aceito e normalizado',r.upper==='ab'.repeat(32));
 // 2 · production entry (server.js) without the variable starts normally
 const ok=await run(['--experimental-vm-modules','server.js'],baseEnv({PORT:'3194'}),{until:/Mesa disponível/});
 check('server.js sem a variável inicia',ok.code==='ready',{code:ok.code});
 // 3 · invalid configurations stop startup with a clear message and never echo the value
 const marker='f'.repeat(20)+'Q';
 const cases={vazio:'',curto:'a'.repeat(63),longo:'a'.repeat(65),'não hexadecimal':marker+'0'.repeat(64-marker.length),'com espaços':' '+'a'.repeat(64)+' ','texto puro':'codigo-secreto-teste'};
 for(const [name,value] of Object.entries(cases)){
  const res=await run(['--experimental-vm-modules','server.js'],baseEnv({PORT:'3194',RUNAMARCA_ACCESS_CODE_SHA256:value}),{until:/Mesa disponível/});
  const output=res.stdout+res.stderr,clear=/RUNAMARCA_ACCESS_CODE_SHA256 inválida/.test(output),echoed=value.trim().length>0&&output.includes(value.trim());
  check('inválida ('+name+') impede a inicialização com mensagem clara, sem mostrar o valor',res.code!=='ready'&&res.code!==0&&clear&&!echoed&&!/Mesa disponível/.test(res.stdout),{exit:res.code,clear,echoed});
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const passed=results.filter(r=>r.ok).length;fs.writeFileSync(out+'/s8-access-config.json',JSON.stringify({passed,total:results.length,results},null,2));console.log(JSON.stringify({passed,total:results.length}));process.exitCode=passed===results.length?0:1;
