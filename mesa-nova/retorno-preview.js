(async function(){
 const $=id=>document.getElementById(id),data=await(await fetch('cartas.json')).json();let context,selected=[],owner,version=0;
 const clone=node=>{const copy=node.cloneNode(true);node.querySelectorAll('canvas').forEach((canvas,i)=>copy.querySelectorAll('canvas')[i].getContext('2d').drawImage(canvas,0,0));return copy;};
 async function card(model,combat){
  const node=document.createElement('div');node.className='card';node.dataset.uid=model.id;node.setAttribute('aria-label',model.name);
  const canvas=document.createElement('canvas');canvas.width=450;canvas.height=combat?410:630;node.append(canvas);
  const visual={...model,art:model.image,kind:model.type,themeEnergy:$('patron-choice').value,generic:model.cost,power:model.attack,rules:model.text,autoFitRules:true};
  await RunaCardVisual[combat?'drawCombat':'drawCard'](canvas,visual);return node;
 }
 async function setup(){
  const token=++version;RunaCombatReturn.cancel();RunaPatronVoice.cancel();document.querySelector('.preview-table').classList.toggle('rival',$('rival').checked);$('return').disabled=true;
  const deck=data.decks.find(d=>d.affinity===$('patron-choice').value);owner={id:'preview',patron:{...deck.patron,affinity:deck.affinity}};
  document.querySelector('.patron').innerHTML=`<img src="${deck.patron.image}" alt="${deck.patron.name}">`;
  const area=document.querySelector('.combat'),reserve=document.querySelector('.reserve');area.replaceChildren();reserve.replaceChildren();
  selected=deck.cards.filter(c=>c.type==='creature'&&c.image).slice(0,3);await Promise.all(selected.map(async c=>{
   const slot=document.createElement('div');slot.className='slot';area.append(slot);const dock=document.createElement('div');reserve.append(dock);
   const [source,target]=await Promise.all([card(c,true),card(c,false)]);if(token!==version)return;slot.append(source);dock.append(target);target.style.visibility='hidden';
  }));if(token===version){$('return').disabled=false;$('result').textContent='Pronto · '+deck.patron.name;}
 }
 $('patron-choice').onchange=setup;$('rival').onchange=setup;
 $('return').onclick=async()=>{
  context??=new AudioContext();await context.resume();await setup();const token=version;$('return').disabled=true;$('result').textContent='Recolhendo os sobreviventes…';
  const items=selected.map(c=>{const node=[...document.querySelectorAll('.combat .card')].find(n=>n.dataset.uid===c.id),rect=node.getBoundingClientRect(),face=clone(node);node.style.visibility='hidden';return {uid:c.id,rect,face,owner:owner.id,style:RunaCombatReturn.styleFor(owner.patron)};});
  const getTarget=uid=>[...document.querySelectorAll('.reserve .card')].find(n=>n.dataset.uid===uid);
  await RunaCombatReturn.play(items,{getTarget,clone,speed:$('slow').checked?.35:1,valid:()=>token===version,release:uid=>{const node=getTarget(uid);if(node)node.style.visibility='';},sound:(kind,options)=>RunaTableAudio.effect(context,kind,options)});
  if(token===version){$('return').disabled=false;$('result').textContent='Sobreviventes na reserva.';}
 };
 $('voice').onclick=async()=>{context??=new AudioContext();await context.resume();await RunaPatronVoice.play({base:'./',getAudioContext:()=>context,player:{patron:{affinity:'forja'}},kind:'power',powerId:'forjar-armadura',onCaption:RunaPatronCaptions.create(()=>document.querySelector('.patron'))});};
 await setup();
})();
