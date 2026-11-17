// S7: post-match questionnaire UI. Opens only on 'runamarca:finale-complete' (dispatched when the
// finale presentation has really finished), once per matchId, for an eligible participant who has
// not answered yet (server says so). Non-modal: "Nova partida" stays usable. Success is shown only
// after the server stored the answers; on failure the filled answers stay and can be resent.
(function(root){
 const KEY=id=>'runamarca-survey:'+id,asked=new Set(),finaleDone=new Set(),attempts=new Map(),RETRY_MS=[1500,4000,9000];let current=null,notice=null;
 const remember=(id,v)=>{try{sessionStorage.setItem(KEY(id),v);}catch{}},recalled=id=>{try{return sessionStorage.getItem(KEY(id));}catch{return null;}};
 function el(tag,props={},...kids){const n=document.createElement(tag);for(const [k,v] of Object.entries(props))k==='class'?n.className=v:k in n?n[k]=v:n.setAttribute(k,v);n.append(...kids.filter(k=>k!=null));return n;}
 function close(reason){
  if(!current)return;
  const {dialog,matchId,scene}=current;current=null;
  if(reason==='dismiss')remember(matchId,'dismissed');
  dialog.close();dialog.remove();scene?.classList.remove('survey-present');
  if(reason!=='match-changed'&&live(matchId))scene?.querySelector('.capture-done')?.focus({preventScroll:true});
 }
 function build(info,code){
  const {survey,matchId}=info,questions=survey.questions,last=questions.length;
  const dialog=el('dialog',{class:'match-survey','aria-labelledby':'match-survey-title'}),form=el('form',{class:'match-survey-form',noValidate:true});
  const title=el('h2',{id:'match-survey-title'},'Sobre a partida'),skip=el('button',{type:'button',class:'survey-skip'},'Agora não');
  const progress=el('ol',{class:'survey-progress','aria-label':'Progresso do questionário'});
  const count=el('p',{class:'survey-count',id:'survey-count'}),pages=el('div',{class:'survey-pages'});
  const status=el('p',{class:'match-survey-status',role:'status','aria-live':'polite','aria-atomic':'true'});
  const back=el('button',{type:'button',class:'survey-back'},'Voltar'),next=el('button',{type:'submit',class:'primary survey-next'},'Confirmar');
  const steps=questions.map(q=>{
   const fs=el('fieldset',{class:'match-survey-q match-survey-'+q.kind,'data-question':q.id,'aria-describedby':'survey-count'});
   fs.append(el('legend',{},q.text));
   const options=el('div',{class:'match-survey-options'});
   for(const o of q.options){
    const input=el('input',{type:'radio',name:q.id,value:String(o.value)});
    if(q.kind==='scale')input.setAttribute('aria-label',o.label+' de 5'+(o.value===1?' — '+q.low:o.value===5?' — '+q.high:''));
    options.append(el('label',{},input,el('span',{},o.label)));
   }
   fs.append(options);
   if(q.kind==='scale')fs.append(el('div',{class:'match-survey-hint','aria-hidden':'true'},el('span',{},q.low),el('span',{},q.high)));
   return fs;
  });
  const comment=el('textarea',{id:'ms-comentario',name:'comentario',maxLength:survey.comment.maxLength,rows:3,placeholder:'O que ficou na sua memória?','aria-describedby':'survey-count'});
  steps.push(el('div',{class:'survey-comment-step'},el('label',{htmlFor:comment.id,class:'match-survey-comment'},survey.comment.label),el('p',{class:'survey-note'},'Você pode enviar sem escrever.'),comment));
  const segments=steps.map(()=>el('li',{},el('span',{class:'survey-sr'})));
  progress.append(...segments);pages.append(...steps);
  form.append(el('header',{class:'survey-header'},title,skip),progress,count,pages,el('footer',{class:'match-survey-actions'},status,el('div',{class:'match-survey-buttons'},back,next)));dialog.append(form);
  // Keep each question's native radio group intact when going back. Only the final step posts.
  const confirmed=new Set();let step=0,sending=false,sent=false;
  const focusStep=()=>{const active=steps[step];(active.querySelector('input:checked')||active.querySelector('input,textarea'))?.focus({preventScroll:true});pages.scrollTop=0;};
  function updateProgress(){
   count.textContent='Etapa '+(step+1)+' de '+steps.length;
   segments.forEach((mark,i)=>{
    const here=i===step,done=confirmed.has(i);mark.dataset.state=here?'current':done?'done':'pending';
    if(here)mark.setAttribute('aria-current','step');else mark.removeAttribute('aria-current');
    mark.firstChild.textContent=(i===last?'Comentário opcional':'Pergunta '+(i+1))+' — '+(here?'atual':done?'respondida':'pendente');
   });
  }
  function display(i,focus=true){
   step=i;steps.forEach((page,j)=>{page.hidden=j!==i;});
   back.hidden=i===0;next.textContent=i===last?'Enviar respostas':'Confirmar';status.textContent='';
   updateProgress();if(focus)focusStep();
  }
  function dismiss(){close(sent?'sent':'dismiss');}
  skip.onclick=dismiss;back.onclick=()=>{if(!sending&&step>0)display(step-1);};
  dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
  // show() keeps Nova partida usable. Escape on a non-modal dialog isn't a native cancel event.
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();}});
  form.onchange=()=>{confirmed.delete(step);status.textContent='';updateProgress();};
  form.onsubmit=async e=>{
   e.preventDefault();if(sending||sent)return;
   if(step<last){
    if(!steps[step].querySelector(':checked')){status.textContent='Escolha uma resposta para continuar.';focusStep();return;}
    confirmed.add(step);display(step+1);return;
   }
   const answers={};
   for(const [i,q] of questions.entries()){
    const picked=steps[i].querySelector(':checked'),option=q.options.find(o=>String(o.value)===picked?.value);
    if(!option){display(i);status.textContent='Escolha uma resposta para continuar.';return;}
    answers[q.id]=option.value;
   }
   sending=true;next.disabled=back.disabled=comment.disabled=true;next.textContent='Enviando…';skip.textContent='Fechar';status.textContent='Aguardando confirmação do envio.';
   try{
    const r=await api(`/api/rooms/${code}/feedback`,{matchId,surveyVersion:survey.version,answers,comment:comment.value},'POST');
    if(!['stored','duplicate'].includes(r?.status))throw Error('Resposta inesperada do servidor.');
    remember(matchId,'sent');if(current?.dialog!==dialog)return;
    sent=true;dialog.classList.add('survey-sent');title.textContent='Questionário enviado';
    progress.hidden=count.hidden=pages.hidden=next.hidden=back.hidden=true;
    form.querySelectorAll('input,textarea').forEach(n=>{n.disabled=true;});
    status.textContent='Respostas registradas. Obrigado!';skip.textContent='Fechar';skip.focus({preventScroll:true});
   }catch(error){
    if(current?.dialog!==dialog)return;
    next.disabled=back.disabled=comment.disabled=false;next.textContent='Tentar novamente';skip.textContent='Agora não';
    status.textContent=(error?.message||'Falha ao enviar.')+' Suas respostas foram mantidas.';next.focus({preventScroll:true});
   }finally{sending=false;}
  };
  display(0,false);return {dialog,focusStep};
 }
 // Recovery of the initial query: only while this match is finished and its finale has ended.
 // A transient failure (network, storage answer submitted:null) never marks the match as asked or
 // dismissed; bounded automatic retries, then an explicit "Tentar novamente". Definitive answers
 // (already sent, not eligible) stop. Changing match cancels everything.
 const live=id=>state?.matchId===id&&state?.phase==='finished'&&finaleDone.has(id);
 const DEFINITIVE=new Set(['SIMULATION','BOT_PARTICIPANT','NOT_A_PARTICIPANT']);
 function stop(id){const a=attempts.get(id);if(a)clearTimeout(a.timer);attempts.delete(id);if(notice?.dataset.match===id){notice.remove();notice=null;document.querySelector('.capture-scene')?.classList.remove('survey-present');}}
 function showRetry(code,id){notice=el('div',{class:'match-survey-retry',role:'group','aria-label':'Questionário indisponível'});notice.dataset.match=id;
  const retry=el('button',{type:'button',class:'primary'},'Tentar novamente'),hide=el('button',{type:'button'},'Fechar');
  notice.append(el('span',{},'Não foi possível carregar o questionário.'),retry,hide);document.body.append(notice);
  const scene=document.querySelector('.capture-scene');scene?.classList.add('survey-present');retry.focus({preventScroll:true});
  retry.onclick=()=>{stop(id);attempt(code,id);};hide.onclick=()=>{remember(id,'dismissed');stop(id);scene?.querySelector('.capture-done')?.focus({preventScroll:true});};}
 async function attempt(code,id){
  if(!live(id)||current||asked.has(id)||recalled(id))return;const a=attempts.get(id)||{count:0,timer:0};attempts.set(id,a);if(a.busy)return;a.busy=true;a.count++;
  let info=null;try{info=await api(`/api/rooms/${code}/feedback?matchId=${encodeURIComponent(id)}`,null,'GET');}catch{info=null;}
  a.busy=false;if(attempts.get(id)!==a)return;if(!live(id)){stop(id);return;}if(current||asked.has(id))return;
  if(info?.matchId===id&&info.eligible&&info.submitted===false&&info.survey){asked.add(id);stop(id);open(info,code);return;}
  if(info&&(info.submitted===true||(!info.eligible&&DEFINITIVE.has(info.reason)))){asked.add(id);stop(id);return;}
  if(a.count<=RETRY_MS.length)a.timer=setTimeout(()=>attempt(code,id),RETRY_MS[a.count-1]);else showRetry(code,id);}
 function open(info,code){
  const {dialog,focusStep}=build(info,code),scene=document.querySelector('.capture-scene');
  document.body.append(dialog);current={dialog,matchId:info.matchId,scene};
  scene?.classList.add('survey-present');dialog.show();focusStep();
 }
 function onFinale(e){const {code,matchId}=e.detail||{};if(!code||!matchId||attempts.has(matchId))return;finaleDone.add(matchId);attempt(code,matchId);}
 // On every server revision: a survey never outlives its match (reset / rematch → new matchId).
 function sync(){if(current&&(state?.matchId!==current.matchId||state?.phase!=='finished'))close('match-changed');for(const id of [...attempts.keys()])if(!live(id))stop(id);if(notice&&!live(notice.dataset.match)){notice.remove();notice=null;}}
 document.addEventListener('runamarca:finale-complete',onFinale);
 root.RunaMatchSurvey={sync,get open(){return current?.matchId||null;},get pending(){return [...attempts.entries()].map(([id,a])=>({id,count:a.count}));}};
})(globalThis);
