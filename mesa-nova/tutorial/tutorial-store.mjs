import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest('hex');
const invalid=message=>{throw Object.assign(Error(message),{code:'SAVE_INVALID'});};
// All snapshots originate in the server. This directory is never served over HTTP.
export function openTutorialStore(directory,{build,io=fs}={}){
 const root=path.resolve(directory);io.mkdirSync(root,{recursive:true});
 const lock=path.join(root,'writer.lock'),owner=randomBytes(12).toString('hex');
 try{io.writeFileSync(lock,JSON.stringify({pid:process.pid,owner}),{flag:'wx'});}catch(error){
  if(error.code!=='EEXIST')throw error;
  let previous;try{previous=JSON.parse(io.readFileSync(lock,'utf8'));}catch{invalid('O registro do salvamento precisa ser conferido.');}
  if(!Number.isInteger(previous.pid)||previous.pid<=0)invalid('Registro de processo inválido.');
  let dead=false;try{process.kill(previous.pid,0);}catch(e){if(e.code==='ESRCH')dead=true;else throw e;}
  if(!dead)throw Object.assign(Error('Outro servidor já usa este salvamento.'),{code:'SAVE_BUSY'});
  // Remove only this known stale lock, never a directory or another process.
  io.unlinkSync(lock);io.writeFileSync(lock,JSON.stringify({pid:process.pid,owner}),{flag:'wx'});
 }
 const file=id=>{if(!/^[a-f0-9]{24}$/.test(id))invalid('Identificador de salvamento inválido.');return path.join(root,id+'.json');};
 function validate(data){
  if(data?.schema!==1||data.build!==build||!/^[a-f0-9]{24}$/.test(data.id)||!/^[a-f0-9]{64}$/.test(data.tokenHash)||![1,2,3].includes(data.activeDuel)||!data.duels||!data.progress)invalid('Salvamento incompatível com esta versão.');
  for(const [duel,s] of Object.entries(data.duels)){
   if(!['1','2','3'].includes(duel)||s?.schema!==2||s.duel!==Number(duel)||s.control?.schema!==1||s.control.duel!==s.duel||!Number.isFinite(s.control.clock?.now)||!Number.isInteger(s.control.clock?.epoch)||s.room?.simulation!=='tutorial'||!/^[A-Z0-9]{6}$/.test(s.room.code)||s.room.players?.length!==2||!Array.isArray(s.receipts)||s.receipts.length>128)invalid('Estado do treino inválido.');
  }
  if(!data.duels[data.activeDuel])invalid('Duelo ativo ausente.');
 }
 let closed=false;
 return {directory:root,readAll(){
  const names=io.readdirSync(root).filter(name=>/^[a-f0-9]{24}\.json$/.test(name));if(names.length>32)invalid('Muitos salvamentos nesta prévia.');
  return names.map(name=>{const p=path.join(root,name);if(io.statSync(p).size>8*1024*1024)invalid('Salvamento grande demais.');let envelope;try{envelope=JSON.parse(io.readFileSync(p,'utf8'));}catch{invalid('Salvamento não pôde ser lido.');}
   if(envelope?.checksum!==digest(JSON.stringify(envelope?.data)))invalid('O salvamento está incompleto ou foi alterado.');validate(envelope.data);if(name!==envelope.data.id+'.json')invalid('Arquivo de salvamento incompatível.');return envelope.data;});
 },write(data){
  if(closed)throw Error('Salvamento fechado.');validate(data);const payload=JSON.stringify({checksum:digest(JSON.stringify(data)),data});if(Buffer.byteLength(payload)>8*1024*1024)invalid('Salvamento grande demais.');
  const destination=file(data.id),temp=destination+'.'+owner+'.tmp';let fd;
  try{fd=io.openSync(temp,'w');io.writeFileSync(fd,payload);io.fsyncSync(fd);io.closeSync(fd);fd=undefined;io.renameSync(temp,destination);}
  finally{if(fd!==undefined)io.closeSync(fd);if(io.existsSync(temp))io.unlinkSync(temp);}
 },close(){if(closed)return;closed=true;try{const found=JSON.parse(io.readFileSync(lock,'utf8'));if(found.owner===owner)io.unlinkSync(lock);}catch{}}};
}
