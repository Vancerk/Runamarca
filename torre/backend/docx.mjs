import {inflateRawSync,crc32} from 'node:zlib';

// Check the ZIP container before accepting a DOCX. This never extracts files to disk
// and is a format/resource check, not antivirus or a document-content sanitizer.
export function isDocx(bytes){
 try{
  if(bytes.length<22||bytes.readUInt32LE(0)!==0x04034b50)return false;
  let end=-1;
  for(let at=bytes.length-22;at>=Math.max(0,bytes.length-65557);at--){
   if(bytes.readUInt32LE(at)===0x06054b50&&at+22+bytes.readUInt16LE(at+20)===bytes.length){end=at;break;}
  }
  if(end<0||bytes.readUInt16LE(end+4)!==0||bytes.readUInt16LE(end+6)!==0)return false;
  const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16);
  if(count<3||count>512||bytes.readUInt16LE(end+8)!==count||offset+size!==end)return false;
  const names=new Set(),required=new Map();let at=offset,total=0;
  for(let i=0;i<count;i++){
   if(at+46>end||bytes.readUInt32LE(at)!==0x02014b50)return false;
   const flags=bytes.readUInt16LE(at+8),method=bytes.readUInt16LE(at+10),crc=bytes.readUInt32LE(at+16),packed=bytes.readUInt32LE(at+20),unpacked=bytes.readUInt32LE(at+24);
   const nameLength=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30),comment=bytes.readUInt16LE(at+32),local=bytes.readUInt32LE(at+42);
   if(at+46+nameLength+extra+comment>end||bytes.readUInt16LE(at+34)!==0||(flags&1)||![0,8].includes(method))return false;
   const nameBytes=bytes.subarray(at+46,at+46+nameLength),name=nameBytes.toString('utf8'),lower=name.toLowerCase();
   if(!name||/[\\\x00]/.test(name)||name.startsWith('/')||name.split('/').includes('..')||names.has(lower)||/vbaproject|activex/.test(lower))return false;
   names.add(lower);total+=unpacked;
   if(total>20*1024*1024||local+30>offset||bytes.readUInt32LE(local)!==0x04034b50)return false;
   const localNameLength=bytes.readUInt16LE(local+26),localExtra=bytes.readUInt16LE(local+28),start=local+30+localNameLength+localExtra;
   if(bytes.readUInt16LE(local+6)!==flags||bytes.readUInt16LE(local+8)!==method||!bytes.subarray(local+30,local+30+localNameLength).equals(nameBytes)||start+packed>offset)return false;
   const compressed=bytes.subarray(start,start+packed),content=method===0?compressed:inflateRawSync(compressed,{maxOutputLength:Math.max(1,unpacked)});
   if(content.length!==unpacked||crc32(content)!==crc)return false;
   if(['[Content_Types].xml','_rels/.rels','word/document.xml'].includes(name))required.set(name,content.toString('utf8'));
   at+=46+nameLength+extra+comment;
  }
  if(at!==end||required.size!==3)return false;
  const types=required.get('[Content_Types].xml'),rels=required.get('_rels/.rels'),document=required.get('word/document.xml');
  return !/macroenabled|vbaproject/i.test(types)&&types.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')&&/\bPartName\s*=\s*["']\/word\/document\.xml["']/.test(types)&&/\bofficeDocument["']/.test(rels)&&/\bTarget\s*=\s*["']\/?word\/document\.xml["']/.test(rels)&&/<(?:[A-Za-z_][\w.-]*:)?document\b/.test(document)&&document.includes('http://schemas.openxmlformats.org/wordprocessingml/2006/main');
 }catch{return false;}
}
