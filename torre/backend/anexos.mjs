import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ReportError} from './relatorios-core.mjs';
export const FILE_LIMIT=2*1024*1024,TOTAL_LIMIT=5*1024*1024;
const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
export function createAttachments(folder){
 function prepare(files=[]){
  if(!Array.isArray(files)||files.length>3)throw new ReportError('Envie até 3 arquivos.');
  let total=0;return files.map(file=>{
   const name=typeof file.name==='string'?file.name.replace(/[\x00-\x1f\\/]/g,'_').slice(0,100):'',extension=name.split('.').pop().toLowerCase();
   if(!name||!types[extension]||typeof file.data!=='string'||file.data.length>Math.ceil(FILE_LIMIT/3)*4+4||file.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data))throw new ReportError('Use arquivos PNG, JPEG, PDF ou DOCX de até 2 MB.');
   const bytes=Buffer.from(file.data,'base64');total+=bytes.length;
   if(bytes.toString('base64')!==file.data)throw new ReportError('Conteúdo do arquivo inválido.');if(!bytes.length||bytes.length>FILE_LIMIT||total>TOTAL_LIMIT)throw new ReportError('Cada arquivo pode ter até 2 MB, com 5 MB no total.');
   const valid=extension==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):['jpg','jpeg'].includes(extension)?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:extension==='pdf'?bytes.subarray(0,5).toString()==='%PDF-':bytes[0]===80&&bytes[1]===75&&bytes.includes(Buffer.from('word/document.xml'))&&bytes.includes(Buffer.from('[Content_Types].xml'))&&!bytes.includes(Buffer.from('vbaProject'));
   if(!valid)throw new ReportError('O conteúdo de '+name+' não corresponde ao formato informado.');
   const id=createHash('sha256').update(bytes).digest('hex')+'.'+extension;return {id,name,size:bytes.length,type:types[extension],bytes};
  });
 }
 return {prepare,commit(prepared){mkdirSync(folder,{recursive:true});return prepared.map(({bytes,...meta})=>{writeFileSync(join(folder,meta.id),bytes);return meta;});},read(meta){if(!/^[a-f0-9]{64}\.(png|jpe?g|pdf|docx)$/.test(meta.id))throw new ReportError('Anexo inválido.',400);return readFileSync(join(folder,meta.id));}};
}
export function documentLinks(values=[]){if(!Array.isArray(values)||values.length>3)throw new ReportError('Adicione até 3 links de documentos.');return values.map(value=>{let url;try{url=new URL(value);}catch{throw new ReportError('Confira o link do documento.');}if(url.protocol!=='https:'||url.username||url.password||url.port||!['docs.google.com','drive.google.com'].includes(url.hostname))throw new ReportError('Use links HTTPS do Google Docs ou Drive.');return url.href;});}
