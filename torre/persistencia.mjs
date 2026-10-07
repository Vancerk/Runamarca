import {mkdir,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';

const valid=key=>/^(relatorios\.json|personagens\.json|map-epoch\.txt|anexos\/[a-f0-9]{64}\.(png|jpe?g|pdf|docx)|character-assets\/assets\/personagens\/[a-f0-9]{64}\.(png|jpe?g|webp|gif))$/.test(key);
export async function createDurableFiles(pool,root,{limit=64*1024*1024}={}){
  await pool.query('CREATE TABLE IF NOT EXISTS elysium_torre_files (name TEXT PRIMARY KEY, body BYTEA NOT NULL, size INTEGER NOT NULL)');
  const {rows}=await pool.query('SELECT name,body,size FROM elysium_torre_files');
  const known=new Map();let total=0;
  for(const row of rows){if(!valid(row.name))throw Error('Arquivo do registro inválido no banco.');const bytes=Buffer.from(row.body);total+=bytes.length;const target=resolve(root,...row.name.split('/'));await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);const info=await stat(target);known.set(row.name,{hash:hash(bytes),size:bytes.length,mtime:info.mtimeMs});}
  function hash(bytes){return createHash('sha256').update(bytes).digest('hex');}
  async function scan(folder){let entries;try{entries=await readdir(folder,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return [];throw e;}const results=[];for(const entry of entries){const target=resolve(folder,entry.name);if(entry.isDirectory())results.push(...await scan(target));else if(entry.isFile()){const key=relative(root,target).split(sep).join('/');if(valid(key))results.push({target,key});}}return results;}
  return {async flush(){const changes=[];let nextTotal=total;for(const {target,key}of await scan(root)){const info=await stat(target),old=known.get(key);if(!key.endsWith('.json')&&old?.mtime===info.mtimeMs&&old.size===info.size)continue;const bytes=await readFile(target),digest=hash(bytes);if(old?.hash===digest){old.mtime=info.mtimeMs;continue;}changes.push({key,bytes,hash:digest,size:bytes.length,mtime:info.mtimeMs});nextTotal+=bytes.length-(old?.size||0);}
    if(!changes.length)return;
    if(nextTotal>limit)throw Object.assign(Error('O limite reservado aos anexos e registros foi atingido. Use links de documentos ou contate o administrador.'),{status:413});
    const client=await pool.connect();try{await client.query('BEGIN');for(const change of changes)await client.query("INSERT INTO elysium_torre_files(name,body,size) VALUES($1,decode($2,'base64'),$3) ON CONFLICT(name) DO UPDATE SET body=EXCLUDED.body,size=EXCLUDED.size",[change.key,change.bytes.toString('base64'),change.size]);await client.query('COMMIT');for(const change of changes)known.set(change.key,change);total=nextTotal;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }};
}
