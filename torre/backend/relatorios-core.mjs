import {randomUUID, randomBytes, timingSafeEqual} from 'node:crypto';
import {readFileSync, mkdirSync, writeFileSync, renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {documentLinks,TOTAL_LIMIT} from './anexos.mjs';

export class ReportError extends Error {
  constructor(message, status=400){super(message);this.status=status;}
}
export function createStore({file,masters,zones,send,ready=()=>true,characters,attachments,publish,archiveChannel=()=>null,durable=async()=>{}}) {
  let records=[];
  try {records=JSON.parse(readFileSync(file,'utf8'));} catch(e){if(e.code!=='ENOENT')throw e;}
  // A previous process may have stopped after Discord received the message.
  for(const r of records){if(r.status==='sending')r.status='delivery_unknown';if(r.archiveStatus==='sending')r.archiveStatus='delivery_unknown';}
  let revision=0;
  const save=()=>{mkdirSync(dirname(file),{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(records,null,2));renameSync(file+'.tmp',file);revision++;};
  const safe=r=>{const {receipt,editReceipt,submissionKey,masterId,authorDiscordId,channelId,messageId,versions,...view}=r;return structuredClone(view);};
  const matches=(provided,secret)=>{if(!secret)return false;const a=Buffer.from(String(provided||'')),b=Buffer.from(secret);return a.length===b.length&&timingSafeEqual(a,b);};
  function get(id,receipt){const r=records.find(r=>r.id===id);if(!r||r.archived)throw new ReportError('Relato não encontrado.',404);if(!matches(receipt,r.receipt)&&!matches(receipt,r.editReceipt))throw new ReportError('Acesso não autorizado.',403);return r;}
  function decisionRecord({id,version,userId,messageId}){const r=records.find(r=>r.id===id);if(!r||r.archived||r.masterId!==userId||r.messageId!==messageId)throw new ReportError('Somente o mestre designado pode decidir sobre este relato.',403);if(r.version!==version||r.status!=='pending')throw new ReportError('Essa versão já foi decidida ou substituída.',409);return r;}
  function validate(body,previous){
    const text=(value,min,max,label)=>{if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new ReportError('Confira o campo '+label+'.');return value.trim();};
    const master=masters.find(m=>m.id===body.masterId);if(!master)throw new ReportError('Selecione um mestre cadastrado.');
    if(!zones.has(body.hex))throw new ReportError('Local inválido.');
    const date=text(body.date,10,10,'data'),parsed=new Date(date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new ReportError('Data inválida.');
    let participantCards=[],participants;
    if(characters){if(!Array.isArray(body.participantIds)||body.participantIds.length>50)throw new ReportError('Confira os participantes.');participantCards=characters.snapshots([...new Set([body.authorCharacterId,...body.participantIds])]);participants=participantCards.map(c=>`${c.name} (${c.player}) — nível ${c.level}, ${c.division}, ${c.class}, ${c.virtue}`);}
    else{if(!Array.isArray(body.participants)||!body.participants.length||body.participants.length>50)throw new ReportError('Informe os participantes.');participants=body.participants.map(p=>text(p,1,200,'participantes'));if(participants.join('\n').length>2000)throw new ReportError('Lista de participantes muito longa.');}
    const authorCard=characters?characters.snapshots([body.authorCharacterId])[0]:{id:body.authorCharacterId||'author',name:text(body.authorName,1,100,'autor'),player:text(body.authorName,1,100,'autor')};
    const authorDiscordId=text(authorCard.discordId||body.authorDiscordId,17,20,'ID do Discord do autor');if(!/^\d{17,20}$/.test(authorDiscordId))throw new ReportError('Vincule o Discord do autor ou informe seu ID numérico.');if(authorCard.discordId&&body.authorDiscordId&&body.authorDiscordId!==authorCard.discordId)throw new ReportError('Use a conta Discord já cadastrada nesta carta.');
    const prepared=attachments?attachments.prepare(body.files||[]):[];
    if(!attachments&&body.files?.length)throw new ReportError('Anexos não disponíveis.');
    const ids=body.attachmentIds||[];if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw new ReportError('Anexos inválidos.');const kept=ids.map(id=>{const item=previous?.attachments?.find(a=>a.id===id);if(!item)throw new ReportError('Este anexo não pertence ao relatório.');return item;});
    const files=[...kept,...prepared.map(({bytes,...meta})=>meta)];if(new Set(files.map(f=>f.id)).size!==files.length)throw new ReportError('O mesmo arquivo foi selecionado mais de uma vez.');if(files.length>3||files.reduce((n,f)=>n+f.size,0)>TOTAL_LIMIT)throw new ReportError('Use até 3 anexos, com 5 MB no total.');
    const data={hex:body.hex,title:text(body.title,1,120,'título'),date,participants,...(characters?{participantCards}:{}),authorCard,authorDiscordId,attachments:files,documentLinks:documentLinks(body.documentLinks||[]),masterId:master.id,master:master.name,narrative:text(body.narrative,20,12000,'relato')};Object.defineProperty(data,'_files',{value:prepared});return data;
  }
  async function deliver(r){
    await durable();
    try{const message=await send(r);r.channelId=message.channel_id;r.messageId=message.id;r.status='pending';}
    catch(error){r.status=error.definite?'delivery_failed':'delivery_unknown';r.deliveryError=error.publicMessage||'Não foi possível confirmar o envio. Não reenvie antes de conferir o privado do mestre.';}
    save();await durable();return {...safe(r),receipt:r.receipt};
  }
  async function publishApproved(id){
    const r=records.find(r=>r.id===id);const channelId=archiveChannel();
    if(!r||r.archived||r.status!=='approved'||!publish||!channelId)return null;
    if(r.discordArchive?.version===r.version&&r.discordArchive.channelId===channelId)return r.discordArchive;
    if(['sending','delivery_unknown'].includes(r.archiveStatus))return null;
    r.archiveStatus='sending';save();await durable();
    try{r.discordArchive=await publish(structuredClone(r),channelId);r.archiveStatus='published';r.archiveError=undefined;}
    catch(e){r.archiveStatus=e.definite?'failed':'delivery_unknown';r.archiveError='Não foi possível confirmar a publicação no canal. Confira o Discord antes de reenviar.';}
    save();await durable();return r.discordArchive||null;
  }
  return {
    revision:()=>revision,
    publishApproved,
    async publishQueued(){for(const r of records.filter(r=>!r.archived&&r.status==='approved'))await publishApproved(r.id);},
    zoneCounts:()=>{const counts={};for(const r of records.filter(r=>!r.archived&&['pending','sending'].includes(r.status)))counts[r.hex]=(counts[r.hex]||0)+1;return counts;},
    list:()=>records.filter(r=>!r.archived&&r.status==='approved').map(r=>{const {audit,notificationError,archiveError,archiveStatus,...publicView}=safe(r);return publicView;}),
    index:()=>records.filter(r=>!r.archived&&r.status==='approved').map(r=>({...Object.fromEntries(['id','hex','title','date','master','status','version','createdAt','decisionAt','adminEditedAt'].map(k=>[k,r[k]])),...(r.authorCard?{authorCard:{name:r.authorCard.name,player:r.authorCard.player}}:{}),...(r.discordArchive?{discordArchive:structuredClone(r.discordArchive)}:{})})),
    detail(id,receipt){const r=records.find(r=>r.id===id&&!r.archived);if(!r)throw new ReportError('Relato não encontrado.',404);if(receipt)return this.own(id,receipt);if(r.status!=='approved')throw new ReportError('Acesso não autorizado.',403);const {audit,notificationError,archiveError,archiveStatus,...publicView}=safe(r);return publicView;},
    adminList:()=>records.map(r=>({...safe(r),audit:r.audit,versions:structuredClone(r.versions||[])})),
    archive(id,by,archived=true){const r=records.find(r=>r.id===id);if(!r)throw new ReportError('Relato não encontrado.',404);r.archived=archived;r.editReceipt=undefined;r.audit.push({action:archived?'archived':'restored',by,at:new Date().toISOString(),version:r.version});save();return safe(r);},
    attachment(id,attachmentId,receipt,admin=false){const r=records.find(r=>r.id===id);if(!r||r.archived&&!admin)throw new ReportError('Relato não encontrado.',404);if(!admin&&r.status!=='approved')get(id,receipt);const meta=r.attachments?.find(a=>a.id===attachmentId);if(!meta)throw new ReportError('Anexo não encontrado.',404);return meta;},
    async adminEdit(id,by,body){const r=records.find(r=>r.id===id);if(!r||r.archived)throw new ReportError('Relato não disponível.',404);if(body.expectedVersion!==r.version)throw new ReportError('Recarregue o relatório; há uma versão mais recente.',409);if(['sending','delivery_unknown'].includes(r.status))throw new ReportError('Confira a entrega antes de alterar este relatório.',409);const data=validate({...r,...body,files:[],authorName:r.authorCard?.player||r.authorCard?.name,authorCharacterId:r.authorCard?.id,authorDiscordId:r.authorDiscordId,masterId:r.masterId,hex:r.hex,attachmentIds:(r.attachments||[]).map(a=>a.id)},r);const pending=['pending','correction_requested','delivery_failed'].includes(r.status);if(pending&&!ready())throw new ReportError('Conecte o bot antes de reenviar ao mestre.',503);r.versions??=[];r.versions.push({...safe(r),audit:undefined});r.audit.push({action:'admin_edited',by,at:new Date().toISOString(),version:r.version});Object.assign(r,data,{version:r.version+1,editReceipt:undefined,adminEditedAt:new Date().toISOString()});if(pending){r.status='sending';save();return deliver(r);}save();if(r.status==='approved')await publishApproved(r.id);return safe(r);},
    own:(id,receipt)=>{const r=get(id,receipt);return {...safe(r),canEdit:r.status==='correction_requested'&&matches(receipt,r.editReceipt),...(matches(receipt,r.editReceipt)?{authorDiscordId:r.authorDiscordId}:{})};},
    checkDecision:params=>safe(decisionRecord(params)),
    checkNotification({id,version,userId,messageId}){const r=records.find(r=>r.id===id);if(!r||r.archived||r.masterId!==userId||r.messageId!==messageId||r.version!==version||!['correction_requested','rejected'].includes(r.status))throw new ReportError('Este aviso não está disponível para você.',403);return safe(r);},
    notification:id=>{const r=records.find(r=>r.id===id);if(!r)throw new ReportError('Relato não encontrado.',404);return {id:r.id,title:r.title,master:r.master,status:r.status,decisionReason:r.decisionReason,authorDiscordId:r.authorDiscordId,editReceipt:r.editReceipt,version:r.version};},
    notificationResult(id,error){const r=records.find(r=>r.id===id);if(!r)return;r.notificationError=error||undefined;save();},
    async submit(body){const data=validate(body);if(typeof body.submissionKey!=='string'||!/^[-a-f0-9]{36}$/.test(body.submissionKey))throw new ReportError('Identificador de envio inválido.');const existing=records.find(r=>r.submissionKey===body.submissionKey);if(existing){if(Object.entries(data).some(([k,v])=>JSON.stringify(existing[k])!==JSON.stringify(v)))throw new ReportError('O envio anterior já foi registrado. Recarregue o mapa antes de alterar este relato.',409);return {...safe(existing),receipt:existing.receipt};}if(!ready())throw new ReportError('O envio está temporariamente indisponível. Seu formulário foi mantido; tente novamente mais tarde.',503);attachments?.commit(data._files);characters?.bindDiscord?.(data.authorCard.id,data.authorDiscordId);const r={...data,submissionKey:body.submissionKey,id:randomUUID(),receipt:randomBytes(24).toString('hex'),version:1,status:'sending',createdAt:new Date().toISOString(),audit:[]};records.push(r);save();return deliver(r);},
    async revise(id,receipt,body){const r=get(id,receipt);if(r.status!=='correction_requested')throw new ReportError('A edição só é liberada quando o mestre solicita correção.',409);if(!matches(receipt,r.editReceipt))throw new ReportError('Abra o link reservado enviado ao Discord do autor para corrigir.',403);if(body.expectedVersion!==r.version)throw new ReportError('Esta versão foi substituída. Abra o pedido mais recente.',409);if(!ready())throw new ReportError('O envio está temporariamente indisponível.',503);const data=validate(body,r);if(data.hex!==r.hex||data.masterId!==r.masterId||data.authorCard.id!==r.authorCard?.id||data.authorDiscordId!==r.authorDiscordId)throw new ReportError('Local, mestre e autor permanecem os mesmos na correção.');attachments?.commit(data._files);r.versions??=[];r.versions.push({version:r.version,title:r.title,date:r.date,participants:r.participants,participantCards:r.participantCards,attachments:r.attachments,documentLinks:r.documentLinks,narrative:r.narrative,decisionReason:r.decisionReason});r.audit.push({action:'revised',at:new Date().toISOString(),version:r.version});Object.assign(r,data,{version:r.version+1,status:'sending',editReceipt:undefined,deliveryError:undefined,decisionAt:undefined,decisionReason:undefined,notificationError:undefined});save();return deliver(r);},
    decide({id,version,action,userId,messageId,reason}){
      const r=decisionRecord({id,version,userId,messageId});
      const states={approve:'approved',correct:'correction_requested',reject:'rejected'};if(!states[action])throw new ReportError('Decisão inválida.');
      if(action!=='approve'&&(typeof reason!=='string'||!reason.trim()||reason.trim().length>2000))throw new ReportError('Descreva o motivo em até 2000 caracteres.');
      r.status=states[action];r.decisionReason=action==='approve'?undefined:reason.trim();r.editReceipt=action==='correct'&&r.authorDiscordId?randomBytes(24).toString('hex'):undefined;r.decisionAt=new Date().toISOString();r.audit.push({action,by:userId,at:r.decisionAt,version,reason:r.decisionReason});save();return safe(r);
    }
  };
}



