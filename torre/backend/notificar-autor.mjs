import {authorNotice} from './avisos-autor.mjs';
// A public ping must never contain the reason or the private editing capability.
export function channelNotice(report,siteUrl){
 if(!/^\d{17,20}$/.test(report.authorDiscordId||''))throw Error('Autor sem ID válido.');
 const link=new URL(siteUrl);link.hash='notice='+report.id;
 return {content:`<@${report.authorDiscordId}> Há uma atualização no seu relatório da Torre de Comando. Confira no site: ${link.href}`,allowed_mentions:{parse:[],users:[report.authorDiscordId]}};
}
export function createAuthorNotifier({api,dmFor,siteUrl,fallbackChannel=()=>null}){
 return async report=>{
  try{const channel=await dmFor(report.authorDiscordId),message=await api('/channels/'+channel.id+'/messages',authorNotice(report,siteUrl));return {method:'dm',channelId:channel.id,messageId:message.id,version:report.version};}
  catch(error){
   const channelId=fallbackChannel();
   if(![50007,50278].includes(error.discordCode)||!/^\d{17,20}$/.test(channelId||''))throw error;
   const old=report.notificationDelivery;
   if(old?.method==='channel'&&old.channelId===channelId&&old.version===report.version&&old.messageId)return old;
   const message=await api('/channels/'+channelId+'/messages',channelNotice(report,siteUrl));
   return {method:'channel',channelId,messageId:message.id,version:report.version};
  }
 };
}
