import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {deflateRawSync,crc32} from 'node:zlib';
import {summarizeWagers,normalizeWager} from '../accounts.mjs';
import {createStore} from '../torre/backend/relatorios-core.mjs';
import {createAttachments} from '../torre/backend/anexos.mjs';
import {isDocx} from '../torre/backend/docx.mjs';

function zip(entries,{compressed=true}={}){
 const locals=[],directory=[];let offset=0;
 for(const [name,text]of Object.entries(entries)){
  const nameBytes=Buffer.from(name),raw=Buffer.from(text),packed=compressed?deflateRawSync(raw):raw,crc=crc32(raw),method=compressed?8:0;
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(nameBytes.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(nameBytes.length,28);central.writeUInt32LE(offset,42);
  locals.push(local,nameBytes,packed);directory.push(central,nameBytes);offset+=30+nameBytes.length+packed.length;
 }
 const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(entries).length,8);end.writeUInt16LE(Object.keys(entries).length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,central,end]);
}
const parts={
 '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
 'word/document.xml':'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Documento fictício</w:t></w:r></w:p></w:body></w:document>'
};
test('nomes reservados de itens permanecem dados e não modificam protótipos',()=>{
 const objectBefore=Object.getOwnPropertyDescriptors(Object.prototype),functionBefore=Object.getOwnPropertyDescriptors(Object);
 const wager=normalizeWager({items:['__proto__','constructor','toString','hasOwnProperty','Chave'].map(name=>({name,quantity:2}))});
 const summary=summarizeWagers([{wager,outcome:'win'}]);
 for(const item of wager.items){assert.equal(Object.hasOwn(summary.items,item.name),true);assert.deepEqual(summary.items[item.name],{bet:2,won:2,lost:0});}
 assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype),objectBefore);assert.deepEqual(Object.getOwnPropertyDescriptors(Object),functionBefore);
 assert.deepEqual(JSON.parse(JSON.stringify(summary)).items.__proto__,{bet:2,won:2,lost:0});
});
test('relatórios públicos preservam cartas, mas removem metadados internos de todos os snapshots',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'public-snapshots-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const card={id:'hero',name:'Heroi',player:'Pessoa',level:2,division:'7ª Divisão',class:'Druida',virtue:'Teste',portrait:null,discordId:'111111111111111111',discordVerified:true,discordUsername:'private-test',sheetId:'private-sheet',sourceUrl:'https://docs.google.com/spreadsheets/d/private-sheet/edit',futureSecret:'must-not-leak'};
 const store=createStore({file:join(dir,'reports.json'),masters:[{id:'master',name:'Mestre'}],zones:new Set(['1720']),characters:{snapshots:ids=>ids.map(id=>({...card,id})),bindDiscord:()=>{}},send:async()=>({id:'message',channel_id:'channel'})});
 const r=await store.submit({submissionKey:randomUUID(),hex:'1720',title:'Teste',date:'2026-10-15',authorCharacterId:'hero',participantIds:['ally'],masterId:'master',narrative:'Relato fictício suficientemente longo para o teste.'});
 store.decide({id:r.id,version:1,action:'approve',userId:'master',messageId:'message'});
 for(const view of [store.list()[0],store.detail(r.id)])for(const c of [view.authorCard,...view.participantCards]){assert.equal(c.name,card.name);assert.equal(c.class,card.class);for(const k of ['discordId','discordVerified','discordUsername','sourceUrl','sheetId','futureSecret'])assert.equal(Object.hasOwn(c,k),false);}
 assert.equal(store.adminList()[0].authorCard.discordId,card.discordId);assert.equal(store.own(r.id,r.receipt).authorCard.discordId,card.discordId);
});
test('DOCX normal compacto ou sem compressão é aceito pela interface de anexos',()=>{
 const attachments=createAttachments('unused-test-folder');
 for(const compressed of [true,false]){const bytes=zip(parts,{compressed});assert.equal(isDocx(bytes),true);assert.equal(attachments.prepare([{name:'ficticio.docx',data:bytes.toString('base64')}])[0].size,bytes.length);}
});
test('DOCX falso, truncado, com CRC inválido, macros ou caminho inválido é recusado',()=>{
 const valid=zip(parts),badCRC=Buffer.from(valid);badCRC.writeUInt32LE(1,badCRC.indexOf(Buffer.from('504b0102','hex'))+16);
 const examples=[Buffer.from('PK word/document.xml [Content_Types].xml'),valid.subarray(0,-1),badCRC,zip({...parts,'word/vbaProject.bin':'inert macro marker'}),zip({...parts,'../outside':'inert'}),zip({...parts,'[Content_Types].xml':parts['[Content_Types].xml'].replace('wordprocessingml.document.main','wordprocessingml.template.main')})];
 for(const bytes of examples)assert.equal(isDocx(bytes),false);
});
test('DOCX com tamanho descompactado declarado excessivo ou índices inválidos é recusado sem alocar esse tamanho',()=>{
 const valid=zip(parts),central=valid.indexOf(Buffer.from('504b0102','hex'));
 for(const [position,value]of [[central+24,21*1024*1024],[central+42,0xfffffff0]]){const invalid=Buffer.from(valid);invalid.writeUInt32LE(value,position);assert.equal(isDocx(invalid),false);}
});
