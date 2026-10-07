export function authorNotice(r,siteUrl='http://127.0.0.1:8767/preview.html'){
 const correcting=r.status==='correction_requested';
 if(!['correction_requested','rejected'].includes(r.status))throw new Error('Este relatório não tem um pedido de revisão ou encerramento.');
 let content;
 if(correcting){
  if(!r.editReceipt)throw new Error('O link reservado de revisão não está disponível.');
  const link=new URL(siteUrl);link.hash='correction='+r.id+'.'+r.editReceipt;
  const local=['127.0.0.1','localhost','[::1]'].includes(link.hostname);
  content=`O mestre ${r.master||'responsável'} não aprovou esta versão do relatório “${r.title}” e pediu uma revisão.\n\nAbra o site pelo link reservado, ajuste os pontos indicados e reenvie ao mestre:\n${link.href}\n\nNão compartilhe este link. Após o reenvio, o relatório ficará bloqueado até a nova decisão.`+(local?'\nNa prévia local, o link funciona somente no computador que executa o mapa.':'');
 }else content=`O mestre ${r.master||'responsável'} encerrou sem aprovação o relatório “${r.title}”.\n\nEste encerramento é definitivo e não libera edição.`;
 return {content,embeds:[{title:'Motivo informado pelo mestre · versão '+r.version,description:r.decisionReason,color:13149282}],allowed_mentions:{parse:[]}};
}
