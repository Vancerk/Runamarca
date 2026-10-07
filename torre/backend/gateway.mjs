import {authorNotice} from './avisos-autor.mjs';
import {createPublisher} from './publicacao.mjs';
import {createInteractionHandler} from './interacoes.mjs';
import {createCommandHandler,registerCommands} from './comandos.mjs';
export function createDiscord(token,onDecision,options={}){
  token=String(token||'').trim();
  let socket,sequence=null,session=null,resumeUrl=null,heartbeat,retry,stopped=false,connected=false,ack=true,attempt=0,lastError=null;
  async function api(path,body,method='POST'){
    const multipart=body instanceof FormData;
    const response=await fetch('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+token,...(multipart?{}:{'Content-Type':'application/json'})},body:body?(multipart?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(20000)});
    const data=response.status===204?{}:await response.json();
    if(!response.ok){const e=new Error('Discord HTTP '+response.status);e.definite=true;e.publicMessage=({401:'O token do bot não foi aceito.',50278:'O mestre precisa compartilhar um servidor com o bot.',50007:'O Discord bloqueou a mensagem privada para este mestre.'})[data.code]||(response.status===401?'O token do bot não foi aceito.':'O Discord recusou o envio. Confira o bot e as permissões de mensagens privadas.');throw e;}return data;
  }
  const push=(op,d)=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({op,d}));};
  const beat=()=>{if(!ack){socket.close();return;}ack=false;push(1,sequence);};
  const interaction=createInteractionHandler({api,onDecision,checkDecision:options.checkDecision,checkNotification:options.checkNotification,notify:options.notify,onApproved:options.onApproved});
  const command=createCommandHandler({api,pairAccount:options.pairAccount,authorizeAdmin:options.authorizeAdmin});
  function connect(){
    if(stopped)return;socket=new WebSocket((resumeUrl||'wss://gateway.discord.gg')+'/?v=10&encoding=json');
    socket.onmessage=e=>{let p;try{p=JSON.parse(e.data);}catch{return;}if(p.s!==null&&p.s!==undefined)sequence=p.s;
      if(p.op===10){ack=true;clearInterval(heartbeat);heartbeat=setInterval(beat,p.d.heartbeat_interval);if(session)push(6,{token,session_id:session,seq:sequence});else push(2,{token,intents:0,properties:{os:process.platform,browser:'legion',device:'legion'}});}
      if(p.op===11)ack=true;
      if(p.op===1){ack=true;beat();}
      if(p.op===7)socket.close();
      if(p.op===9){if(!p.d){session=null;sequence=null;resumeUrl=null;}socket.close();}
      if(p.t==='READY'){session=p.d.session_id;resumeUrl=p.d.resume_gateway_url;connected=true;attempt=0;lastError=null;console.log('Bot conectado. Aprovações pelo Discord disponíveis.');void options.onReady?.();void registerCommands(api,p.d.application.id).catch(()=>{lastError='Não foi possível registrar /vincular e /administrar no Discord.';console.error(lastError);});}
      if(p.t==='RESUMED'){connected=true;attempt=0;lastError=null;}
      if(p.t==='INTERACTION_CREATE')void (p.d.type===2?command(p.d):interaction(p.d)).catch(()=>console.error('Falha ao responder à interação do Discord.'));
    };
    socket.onerror=()=>{lastError='A conexão de rede com o Discord falhou. Confira o acesso à internet do servidor.';if(attempt===0)console.error(lastError);};
    socket.onclose=e=>{connected=false;clearInterval(heartbeat);if(stopped)return;if([4004,4010,4011,4013,4014].includes(e.code)){stopped=true;lastError=e.code===4004?'O Discord recusou o token do bot.':'O Discord recusou a configuração da conexão do bot.';console.error(lastError);return;}retry=setTimeout(connect,Math.min(30000,1000*2**attempt++));};
  }
  if(token)connect();
  return {publish:createPublisher({api,readAttachment:meta=>options.readAttachment(meta)}),ready:()=>connected,configured:()=>Boolean(token),state:()=>!token?'unconfigured':connected?'ready':stopped?'failed':'connecting',error:()=>lastError,async waitReady(timeout=10000){if(!token)throw Object.assign(new Error('Bot não configurado.'),{status:503,publicMessage:'O token do bot não foi configurado no servidor.'});const until=Date.now()+timeout;while(!connected&&!stopped&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,100));if(!connected)throw Object.assign(new Error('Bot indisponível.'),{status:503,publicMessage:lastError||'O bot está conectando ao Discord. Aguarde alguns segundos e tente novamente.'});},async notifyAuthor(r){
    if(!r.authorDiscordId)throw new Error('Relato antigo sem autor cadastrado.');
    const channel=await api('/users/@me/channels',{recipient_id:r.authorDiscordId});
    return api('/channels/'+channel.id+'/messages',authorNotice(r,options.siteUrl));
  },close(){stopped=true;clearTimeout(retry);clearInterval(heartbeat);socket?.close();},async send(r,{test=false}={}){
    const channel=await api('/users/@me/channels',{recipient_id:r.masterId});
    const text=`${r.title}\nData: ${r.date}\nAutor: ${r.authorCard?.player||r.authorCard?.name||'Não informado'}\nMestre: ${r.master}\nParticipantes:\n${r.participants.join('\n')}\n\n${r.narrative}\n\nDocumentos:\n${(r.documentLinks||[]).join('\n')}`;
    const payload={content:test?'Relatório fictício de teste de entrega da Torre de Comando. Nenhuma missão será publicada.':'Relatório de missão aguardando sua decisão. Leia o relato completo no arquivo anexado.',allowed_mentions:{parse:[]},embeds:[{title:r.title,description:r.narrative.slice(0,3000)+(r.narrative.length>3000?'\n\nContinuação no arquivo anexado.':''),fields:[{name:'Data da sessão',value:r.date},{name:'Participantes',value:r.participants.join('\n').slice(0,1000)}]}],components:[{type:1,components:[['approve','Aprovar',3],['correct','Recusar e pedir revisão',1],['close','Encerrar sem aprovação',4]].map(([action,label,style])=>({type:2,label,style,custom_id:`legion:${action}:${r.id}:${r.version}`}))}],attachments:[{id:0,filename:'relato.txt'}]};
    if(test)payload.components=[];
    for(const [index,file]of (r.attachments||[]).entries())payload.attachments.push({id:index+1,filename:file.name});
    const form=new FormData();form.append('payload_json',JSON.stringify(payload));form.append('files[0]',new Blob([text],{type:'text/plain;charset=utf-8'}),'relato.txt');
    for(const [index,file]of (r.attachments||[]).entries())form.append('files['+(index+1)+']',new Blob([options.readAttachment(file)],{type:file.type}),file.name);
    return api('/channels/'+channel.id+'/messages',form);
  }};
}

