import {launch,open,paint,captureTable,view,harness,finish} from './hybrid12-lib.mjs';
const out=process.argv[2],H=harness(out),browser=await launch();
try{
 const {page,context}=await open(browser,{width:1920,height:1080},{errors:H.errors});
 const {room,a}=captureTable();await paint(page,view(room,a),800);
 const result=await page.evaluate(async()=>{
  const first=document.querySelector('#hand>.hand-card');first.focus();await new Promise(r=>setTimeout(r,200));
  const nodes=[...document.querySelectorAll('#hand>.hand-card')],backs=[...document.querySelectorAll('#opponent-hand>*')],intros=RunaHybridHand.stats.intros;
  for(let i=0;i<20;i++){rival().patron.hp--;state.revision++;render();await new Promise(requestAnimationFrame);}
  const same=nodes.every((n,i)=>n===document.querySelectorAll('#hand>.hand-card')[i]);
  const focus=document.activeElement===first,visible=!document.getElementById('hover-preview').hidden,afterIntros=RunaHybridHand.stats.intros;
  const sameBacks=backs.every((n,i)=>n===document.querySelectorAll('#opponent-hand>*')[i]);
  seat().mana=0;render();const payable=document.querySelectorAll('#hand>.payable').length;
  const card=seat().hand[0];card.name='Nome atualizado';render();const replacement=document.querySelector('#hand>.hand-card');
  const changed=replacement!==first&&replacement.getAttribute('aria-label').includes('Nome atualizado');
  const beforeNew=replacement;state.matchId+='-new';render();const next=document.querySelector('#hand>.hand-card');
  return {same,focus,visible,intros:afterIntros-intros,sameBacks,payable,changed,newMatch:next!==beforeNew};
 });
 H.check('vida do rival não recria nenhuma carta da mão',result.same,result);
 H.check('foco e consulta por teclado continuam abertos',result.focus&&result.visible,result);
 H.check('redesenhos não reiniciam a entrada do hover',result.intros===0,result);
 H.check('mão rival oculta é reaproveitada sem mudança de quantidade',result.sameBacks);
 H.check('mudança de Éter atualiza a disponibilidade',result.payable===0,result);
 H.check('dados alterados renovam a face e seus controles',result.changed);
 H.check('nova partida invalida nós mesmo com UID repetido',result.newMatch);
 const cancellation=await page.evaluate(async()=>{
  const seen=[];visualQueue.enqueue(async c=>{if(await c.wait(1000))seen.push('old');});visualQueue.enqueue(()=>seen.push('old-queued'));
  await Promise.resolve();state.matchId+='-again';render();await visualQueue.enqueue(()=>seen.push('new'));return {seen,stats:visualQueue.stats};
 });
 H.check('nova partida cancela a fila anterior e aceita eventos novos',cancellation.seen.join(',')==='new'&&cancellation.stats.timers===0,cancellation);
 H.check('nenhum erro de página',!H.errors.length,H.errors);await context.close();
}finally{await browser.close();finish(out,'incremental',H);}
