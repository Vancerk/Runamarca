// Drive only visible controls; no injected clicks / focus / values. Stop on the optional comment.
export const dialog='dialog.match-survey[open]';
export async function tap(page,node){
 await node.scrollIntoViewIfNeeded();const box=await node.boundingBox();
 if(!box)throw Error('Controle fora da tela');await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}
export async function tabTo(page,selector){
 for(let i=0;i<12;i++){
  if(await page.evaluate(s=>document.activeElement?.matches(s),selector))return;
  await page.keyboard.press('Tab');
 }
 throw Error('Tab não alcançou '+selector);
}
export async function answerSteps(page,{input='mouse',lastChoice=false}={}){
 const panel=page.locator(dialog),n=await panel.locator('fieldset').count(),picked={};
 for(let i=0;i<n;i++){
  const group=panel.locator('fieldset:visible');if(await group.count()!==1)throw Error('Esperava exatamente uma pergunta');
  const key=await group.getAttribute('data-question'),labels=group.locator('label'),label=lastChoice&&i===n-1?labels.last():labels.first();
  const next=panel.getByRole('button',{name:'Confirmar',exact:true});
  if(input==='keyboard'){
   if(!await group.evaluate(g=>g.contains(document.activeElement)))throw Error('Foco fora da pergunta '+key);
   await page.keyboard.press('ArrowRight');
  }else if(input==='touch')await tap(page,label);else await label.click();
  picked[key]=await group.locator('input:checked').inputValue();
  if(input==='keyboard'){await tabTo(page,dialog+' .survey-next');await page.keyboard.press('Enter');}
  else if(input==='touch')await tap(page,next);else await next.click();
 }
 if(!await panel.locator('textarea').isVisible())throw Error('Faltou o comentário opcional');
 return picked;
}
export function inspectStep(page){return page.locator(dialog).evaluate(d=>{
 const rect=d.getBoundingClientRect(),q=d.querySelector('fieldset:not([hidden])'),segments=[...d.querySelectorAll('.survey-progress li')];
 return {w:innerWidth,h:innerHeight,clientWidth:document.documentElement.clientWidth,gutter:getComputedStyle(document.documentElement).scrollbarGutter,rect:{x:rect.x,y:rect.y,w:rect.width,h:rect.height},
  offset:[rect.x+rect.width/2-innerWidth/2,rect.y+rect.height/2-innerHeight/2],visible:[...d.querySelectorAll('fieldset')].filter(n=>n.getClientRects().length).length,
  q:q?.dataset.question,value:q?.querySelector(':checked')?.value,current:segments.findIndex(n=>n.getAttribute('aria-current')==='step'),
  states:segments.map(n=>n.dataset.state),count:d.querySelector('.survey-count')?.textContent,
  focusInQuestion:!!q?.contains(document.activeElement),total:d.querySelectorAll('fieldset').length,
  animation:getComputedStyle(d).animationName,fade:getComputedStyle(document.querySelector('.capture-stage')).transitionDuration};
 });}
