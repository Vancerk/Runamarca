import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
test('imported server with idle bot worker exits without forced shutdown',async()=>{
 const target=new URL('../server.js',import.meta.url).href;
 const result=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--input-type=module','--eval',`await import(${JSON.stringify(target)});console.log('IMPORT_READY');`],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';let expired=false;
  child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
  const timer=setTimeout(()=>{expired=true;child.kill();},15000);
  child.on('error',e=>{clearTimeout(timer);reject(e);});
  child.on('exit',code=>{clearTimeout(timer);resolve({code,stdout,stderr,expired});});
 });
 assert.equal(result.expired,false,result.stderr);assert.equal(result.code,0,result.stderr);assert.match(result.stdout,/IMPORT_READY/);
});
