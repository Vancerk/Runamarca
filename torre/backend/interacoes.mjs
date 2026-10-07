import {randomUUID} from 'node:crypto';

// Modal contexts bind the original Discord message, master and version.
export function createInteractionHandler({api,onDecision,checkDecision,checkNotification,notify,onApproved}) {
  const modals=new Map();
  return async function interaction(i){
    if(![3,5].includes(i.type)||!i.data?.custom_id?.startsWith('legion:'))return;
    const userId=i.user?.id||i.member?.user?.id;
    let params;
    try{
      if(i.type===3){
        const [,rawAction,id,version]=i.data.custom_id.split(':');
        // Older messages used reject for the refusal button. Refusal now requests revision.
        const action=rawAction==='reject'?'correct':rawAction==='close'?'reject':rawAction;
        params={action,id,version:Number(version),userId,messageId:i.message?.id};
        if(action==='notify'){
          checkNotification(params);
          await api(`/interactions/${i.id}/${i.token}/callback`,{type:5,data:{flags:64}});
          let content='Aviso enviado ao privado do autor.';
          try{await notify(id);}catch{content='Não foi possível confirmar a entrega. Confira se o autor compartilha um servidor com o bot e permite mensagens privadas.';}
          await api(`/webhooks/${i.application_id}/${i.token}/messages/@original`,{content,allowed_mentions:{parse:[]}},'PATCH');return;
        }
        if(['correct','reject'].includes(action)){
          checkDecision(params);
          for(const [key,entry]of modals)if(entry.expires<Date.now())modals.delete(key);
          const nonce=randomUUID();modals.set(nonce,{...params,channelId:i.channel_id,expires:Date.now()+900000});
          await api(`/interactions/${i.id}/${i.token}/callback`,{type:9,data:{custom_id:'legion:reason:'+nonce,title:action==='correct'?'Recusar e pedir revisão':'Encerrar sem aprovação',components:[{type:18,label:action==='correct'?'O que precisa ser corrigido?':'Por que encerrar este relato definitivamente?',component:{type:4,custom_id:'reason',style:2,required:true,min_length:1,max_length:2000,placeholder:action==='correct'?'Informe data, participantes ou trechos que precisam de ajuste.':'O encerramento não libera revisão. Descreva o motivo.'}}]}});
          return;
        }
      }else{
        const nonce=i.data.custom_id.split(':')[2],entry=modals.get(nonce);
        if(!entry||entry.userId!==userId||entry.expires<Date.now())throw Object.assign(new Error('Este pedido expirou. Use novamente o botão da mensagem.'),{status:403});
        const inputs=i.data.components.flatMap(c=>c.component?[c.component]:(c.components||[]));
        params={...entry,reason:inputs.find(c=>c.custom_id==='reason')?.value};
        checkDecision(params);modals.delete(nonce);
      }
    }catch(e){await api(`/interactions/${i.id}/${i.token}/callback`,{type:4,data:{content:e.message,flags:64,allowed_mentions:{parse:[]}}});return;}
    await api(`/interactions/${i.id}/${i.token}/callback`,{type:5,data:{flags:64}});
    let content;
    try{
      const report=await onDecision(params);
      content=({approved:'Relato aprovado e publicado no mapa.',correction_requested:'Correção registrada. O relatório está reservado ao autor para ajuste.',rejected:'Relato rejeitado e bloqueado; não será publicado.'})[report.status];
      if(report.status==='approved'&&onApproved){try{const link=await onApproved(report.id);if(link?.url)content+=' Cópia no canal: '+link.url;else content+=' A cópia no canal ainda não foi confirmada.';}catch{content+=' A aprovação foi salva; a publicação no canal precisa ser conferida.';}}
      if(report.status!=='approved'){
        try{await notify(report.id);content+=' Pedido enviado ao privado do autor.';}
        catch{content+=' Não foi possível confirmar a DM do autor. A decisão foi salva; o autor também pode ver o motivo no histórico local. Use “Reenviar aviso ao autor” após conferir a DM.';}
      }
      try{await api(`/channels/${params.channelId||i.channel_id}/messages/${params.messageId}`,{components:report.status==='approved'?[]:[{type:1,components:[{type:2,style:2,label:'Reenviar aviso ao autor',custom_id:`legion:notify:${params.id}:${params.version}`}]}]},'PATCH');}catch{content+=' Não foi possível atualizar os botões; decisões antigas continuarão bloqueadas.';}
    }catch(e){content=e.status?e.message:'Não foi possível concluir a decisão. Confira o mapa antes de tentar novamente.';}
    await api(`/webhooks/${i.application_id}/${i.token}/messages/@original`,{content,allowed_mentions:{parse:[]}},'PATCH');
  };
}
