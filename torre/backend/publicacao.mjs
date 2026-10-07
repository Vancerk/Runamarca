import {createHash} from 'node:crypto';
export function createPublisher({api,readAttachment}){
 return async function publish(r,channelId){
  if(!/^\d{17,20}$/.test(channelId||''))throw Object.assign(new Error('Configure o canal de relatórios aprovados.'),{definite:true});
  const channel=await api('/channels/'+channelId,undefined,'GET');
  if(!channel.guild_id||![0,5].includes(channel.type))throw Object.assign(new Error('Selecione um canal de texto de servidor.'),{definite:true});
  const text=`${r.title}\nLocal: ${r.hex}\nData: ${r.date}\nAutor: ${r.authorCard?.player||r.authorCard?.name}\nMestre: ${r.master}\nVersão: ${r.version}\nParticipantes:\n${r.participants.join('\n')}\n\n${r.narrative}\n\nDocumentos:\n${(r.documentLinks||[]).join('\n')}`;
  const payload={content:'Relatório aprovado · Torre de Comando',allowed_mentions:{parse:[]},embeds:[{title:r.title,description:r.narrative.slice(0,3000),color:13355917,fields:[{name:'Local',value:String(r.hex)},{name:'Data',value:r.date},{name:'Mestre',value:r.master},{name:'Participantes',value:r.participants.join('\n').slice(0,1000)}]}],attachments:[{id:0,filename:'relatorio-aprovado.txt'},...(r.attachments||[]).map((f,i)=>({id:i+1,filename:f.name}))]};
  const previous=r.discordArchive?.channelId===channelId?r.discordArchive.messageId:null;
  if(!previous){payload.nonce=createHash('sha256').update(r.id+':'+r.version).digest('hex').slice(0,24);payload.enforce_nonce=true;}
  const form=new FormData();form.append('payload_json',JSON.stringify(payload));form.append('files[0]',new Blob([text],{type:'text/plain;charset=utf-8'}),'relatorio-aprovado.txt');
  for(const [i,f]of (r.attachments||[]).entries())form.append(`files[${i+1}]`,new Blob([readAttachment(f)],{type:f.type}),f.name);
  const message=await api('/channels/'+channelId+'/messages'+(previous?'/'+previous:''),form,previous?'PATCH':'POST');
  return {channelId,guildId:channel.guild_id,messageId:message.id,version:r.version,url:`https://discord.com/channels/${channel.guild_id}/${channelId}/${message.id}`};
 };
}
