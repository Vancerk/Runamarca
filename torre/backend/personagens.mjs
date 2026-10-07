import {readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ReportError} from './relatorios-core.mjs';
const exec=promisify(execFile);
export function sheetId(value){let url;try{url=new URL(value);}catch{throw new ReportError('Cole o link de uma ficha do Google Planilhas.');}const match=url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);if(url.protocol!=='https:'||url.hostname!=='docs.google.com'||url.username||url.password||url.port||!match)throw new ReportError('Use um link https://docs.google.com/spreadsheets/d/...');return match[1];}
export function division(level){if(!Number.isInteger(level)||level<1||level>20)throw new ReportError('O nível deve ser um inteiro de 1 a 20.');return (level<=4?7:level<=7?6:level<=10?5:level<=13?4:level<=16?3:level<=19?2:1)+'ª Divisão';}
export function createCharacters({folder,root,python,extractor,dataFolder}){
 const data=dataFolder||resolve(folder,'data'),file=resolve(data,'personagens.json'),portraits=resolve(root,'assets/personagens');
 let cards=[];try{cards=JSON.parse(readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const previews=new Map(),pairings=new Map();
 function cardById(id){const card=cards.find(c=>c.id===id);if(!card)throw new ReportError('Personagem não encontrado.');return card;}
 function discordBinding(id,discordId,verified=false,username){const card=cardById(id);if(!/^\d{17,20}$/.test(discordId||''))throw new ReportError('Informe o ID numérico da conta Discord.');if(card.discordId&&card.discordId!==discordId)throw new ReportError('Esta carta já possui outra conta Discord. Peça ao responsável para corrigir o cadastro.',409);card.discordId=discordId;card.discordVerified=card.discordVerified||verified;if(username)card.discordUsername=username;save();return {...card};}
 function save(){mkdirSync(data,{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(cards,null,2));renameSync(file+'.tmp',file);}
 function validate(card){for(const field of ['name','player','class','virtue'])if(typeof card[field]!=='string'||!card[field].trim()||card[field].length>100)throw new ReportError('A ficha não contém '+field+' no local esperado. Confira o modelo.');card.division=division(Number(card.level));card.level=Number(card.level);}
 function portrait(bytes,suffix){if(!['.png','.jpg','.jpeg','.webp','.gif'].includes(suffix.toLowerCase()))throw new ReportError('Formato do retrato não suportado.');if(bytes.length>5000000)throw new ReportError('Retrato muito grande.');const name=createHash('sha256').update(bytes).digest('hex')+suffix.toLowerCase();mkdirSync(portraits,{recursive:true});writeFileSync(join(portraits,name),bytes);return 'assets/personagens/'+name;}
 function installSample(){if(cards.length)return;const source=resolve(folder,'../fichas/oberon/personagem.json');try{const sample=JSON.parse(readFileSync(source,'utf8'));validate(sample);sample.portrait=portrait(readFileSync(resolve(folder,'../fichas/oberon',sample.portrait)),extname(sample.portrait));cards.push({id:randomUUID(),sheetId:'1RMUQDSyEurI6WZFFgkiEHGggAwfLNrEbOBNXnWPbHJE',sourceUrl:'https://docs.google.com/spreadsheets/d/1RMUQDSyEurI6WZFFgkiEHGggAwfLNrEbOBNXnWPbHJE/edit',name:sample.name,player:sample.player,level:sample.level,division:sample.division,class:sample.class,virtue:sample.virtue,portrait:sample.portrait,updatedAt:new Date().toISOString()});save();}catch(e){if(e.code!=='ENOENT')throw e;}}
 installSample();
 return {
  list:()=>cards.map(c=>({...c})),
  ensureVisualTestAuthor(){
   const id='torre-visual-test-author',existing=cards.find(c=>c.id===id);if(existing)return {...existing};
   const card={id,name:'Personagem de teste visual',player:'van_renascido (teste)',level:1,division:division(1),class:'Teste',virtue:'Teste',portrait:null,discordId:'1080332488070672484',discordVerified:false,testFixture:true,updatedAt:new Date().toISOString()};cards.push(card);save();return {...card};
  },
  bindDiscord:discordBinding,
  adminDiscord(id,discordId){if(!/^\d{17,20}$/.test(discordId||''))throw new ReportError('Informe um ID válido.');const card=cardById(id);card.discordId=discordId;card.discordVerified=false;delete card.discordUsername;save();return {...card};},
  startPairing(id){cardById(id);for(const [code,p]of pairings)if(p.expires<Date.now())pairings.delete(code);if(pairings.size>=100)throw new ReportError('Muitos cadastros em andamento. Tente mais tarde.',429);const code=randomBytes(8).toString('hex').toUpperCase();pairings.set(code,{id,expires:Date.now()+600000});return {code,command:'/vincular codigo:'+code,expiresIn:600};},
  completePairing(code,user){const p=pairings.get(String(code||'').trim().toUpperCase());if(!p||p.expires<Date.now())throw new ReportError('Código expirado ou inválido. Gere outro no site.');const card=discordBinding(p.id,user.id,true,user.username);pairings.delete(String(code).trim().toUpperCase());return card;},
  snapshots(ids){if(!Array.isArray(ids)||ids.length<1||ids.length>50||new Set(ids).size!==ids.length)throw new ReportError('Selecione entre 1 e 50 personagens, sem repetições.');return ids.map(id=>{const card=cards.find(c=>c.id===id);if(!card)throw new ReportError('Personagem não encontrado. Atualize a biblioteca.');return {...card};});},
  async preview(link){
   const id=sheetId(link),existing=cards.find(c=>c.sheetId===id);
   for(const [key,p]of previews)if(p.expires<Date.now())previews.delete(key);
   if(previews.size>=50)throw new ReportError('Muitas fichas em conferência. Tente mais tarde.',429);
   const response=await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`,{signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw new ReportError('Não foi possível ler a ficha. Libere visualização pelo link e permita o download.');
   let length=0;const chunks=[];for await(const chunk of response.body){length+=chunk.length;if(length>15000000)throw new ReportError('Ficha muito grande para importar.');chunks.push(chunk);}const bytes=Buffer.concat(chunks);if(bytes[0]!==80||bytes[1]!==75)throw new ReportError('O Google não disponibilizou a ficha para leitura. Confira o compartilhamento.');
   const temporary=await mkdtemp(join(tmpdir(),'legion-ficha-'));
   try{const source=join(temporary,'ficha.xlsx'),out=join(temporary,'out');await writeFile(source,bytes);try{await exec(python,[extractor,source,out],{timeout:15000,maxBuffer:10000,windowsHide:true});}catch{throw new ReportError('Esta ficha não corresponde ao modelo Elysium esperado.');}
    const extracted=JSON.parse(await readFile(join(out,'personagem.json'),'utf8'));validate(extracted);
    const card={id:existing?.id||randomUUID(),sheetId:id,sourceUrl:`https://docs.google.com/spreadsheets/d/${id}/edit`,name:extracted.name,player:extracted.player,level:extracted.level,division:extracted.division,class:extracted.class,virtue:extracted.virtue,portrait:extracted.portrait?portrait(await readFile(join(out,extracted.portrait)),extname(extracted.portrait)):null};
    const previewId=randomUUID();previews.set(previewId,{card,expires:Date.now()+600000});return {previewId,card,existing:Boolean(existing),warnings:extracted.portrait?[]:['Retrato não encontrado na posição esperada. A carta usará as iniciais.']};
   }finally{await rm(temporary,{recursive:true,force:true});}
  },
  confirm(previewId){const preview=previews.get(previewId);if(!preview||preview.expires<Date.now())throw new ReportError('A prévia expirou. Leia a ficha novamente.');const {card}=preview;card.updatedAt=new Date().toISOString();const index=cards.findIndex(c=>c.sheetId===card.sheetId);if(index>=0){const previous=cards[index];card.id=previous.id;for(const key of ['discordId','discordVerified','discordUsername'])if(previous[key]!==undefined)card[key]=previous[key];cards[index]=card;}else cards.push(card);save();previews.delete(previewId);return {...card};}
 };
}
