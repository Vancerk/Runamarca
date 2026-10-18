import fs from 'node:fs/promises';
let app=await fs.readFile('mesa-nova/app.js','utf8');
app=app.replace("holder.append(picture);text(holder,'div',card.text||card.name,'hover-rule');","holder.append(picture);");
const start=app.indexOf("if(card.type==='creature'){const stats=text(el,'span','','numbers');");
const end=app.indexOf("if(card.rarity)",start);
if(start<0||end<0)throw Error('Bloco de atributos não encontrado');
app=app.slice(0,start)+`if(card.type==='creature'){const ns='http://www.w3.org/2000/svg',stats=document.createElementNS(ns,'svg');stats.classList.add('card-stats-svg');stats.setAttribute('viewBox',combat?'0 0 900 820':'0 0 900 1260');stats.setAttribute('aria-hidden','true');el.append(stats);const attack=displayedAttack.get(card.uid)??Math.max(0,card.attack+(card.attackMod||0)),health=displayedHealth.get(card.uid)??Math.max(0,card.health-card.damage);el.dataset.baseAttack=card.attack;for(const [value,x,y,klass] of [[attack,83.3,combat?739:1172,'attack-value'+(attack>card.attack?' attack-buffed':'')],[health,826,combat?744.12:1177.12,'health-value'+(health<card.health?' health-damaged':'')]]){const number=document.createElementNS(ns,'text');number.setAttribute('x',x);number.setAttribute('y',y);number.setAttribute('text-anchor','middle');number.setAttribute('dominant-baseline','central');number.setAttribute('class',klass);number.textContent=String(value);stats.append(number);}}`+app.slice(end);
// Ready promises keep a transfer from cloning an empty canvas before its art loads.
app=app.replace("const image=new Image();image.onload=()=>canvas.getContext('2d').drawImage(image,0,0,450,630);image.src=card.image;","const image=new Image();el.visualReady=new Promise(resolve=>{image.onload=()=>{canvas.getContext('2d').drawImage(image,0,0,450,630);resolve();};image.onerror=resolve;});image.src=card.image;");
app=app.replace("else render(canvas,design,{assets:'criador/',hideStats:true,flat:card.imageKind==='card'}).catch(console.error);","else el.visualReady=render(canvas,design,{assets:'criador/',hideStats:true,flat:card.imageKind==='card'}).catch(console.error);");
const from=app.indexOf('async function animateTransfer('),to=app.indexOf('async function animateOpeningToHand',from);
app=app.slice(0,from)+`async function animateTransfer({uid,copy,rect,card,duration:customDuration,delay=0,destination=null}){
 let arrival=null,flight=null;
 try{
  const target=destination?document.querySelector(destination):tableCard(uid);if(!target||!rect)return;
  await target.visualReady;
  const end=target.getBoundingClientRect(),bounds=$('visual-layer').getBoundingClientRect();if(!end.width||!end.height)return;
  movingCards.add(uid);target.style.visibility='hidden';pendingArrival=pendingArrival.filter(id=>id!==uid);
  const dx=end.left+end.width/2-rect.left-rect.width/2,dy=end.top+end.height/2-rect.top-rect.height/2;
  const make=(face,w,h)=>{const wrapper=document.createElement('div');wrapper.className='card-flight';Object.assign(wrapper.style,{left:(rect.left+rect.width/2-w/2-bounds.left)+'px',top:(rect.top+rect.height/2-h/2-bounds.top)+'px',width:w+'px',height:h+'px'});face.classList.remove('hand-card','opening-card','dragging-source','drag-preview','pending-arrival','selected','arrived','snapping','visual-hit','payable');face.classList.add('flight-face');face.removeAttribute('style');wrapper.append(face);$('visual-layer').append(wrapper);return wrapper;};
  flight=make(copy,rect.width,rect.height);arrival=make(cloneVisual(target),end.width,end.height);
  document.querySelectorAll('.release-ghost').forEach(node=>node.remove());
  const duration=customDuration??(720+weightOf(card)*180),options={duration,delay,easing:'cubic-bezier(.22,.65,.22,1)',fill:'both'};
  const oldScale=end.width/rect.width,newScale=rect.width/end.width;
  const departing=flight.animate([{transform:'translate(0,0) scale(1)',opacity:1},{opacity:1,offset:.15},{opacity:0,offset:.7},{transform:'translate('+dx+'px,'+dy+'px) scale('+oldScale+')',opacity:0}],options);
  const arriving=arrival.animate([{transform:'translate(0,0) scale('+newScale+')',opacity:0},{opacity:0,offset:.15},{opacity:1,offset:.7},{transform:'translate('+dx+'px,'+dy+'px) scale(1)',opacity:1}],options);
  await Promise.all([departing.finished,arriving.finished]);sound('place');
 }catch(error){console.error(error);}finally{flight?.remove();finishVisual(uid,arrival);if(!flight)copy?.remove();}
}
`+app.slice(to);
app=app.replace("document.querySelectorAll('.release-ghost').forEach(node=>node.remove());render();","render();");
app=app.replace("held.classList.add('release-ghost');held.style.pointerEvents='none';","held.classList.remove('drag-preview');held.classList.add('release-ghost');const heldRect=ghost.getBoundingClientRect();held.style.width=heldRect.width+'px';held.style.height=heldRect.height+'px';held.style.pointerEvents='none';");
await fs.writeFile('mesa-nova/app.js',app);
await fs.appendFile('mesa-nova/style.css',`
/* Attribute positions use the same coordinate system as the printed frame. */
.card .card-stats-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:3}
.card.styled-card .card-stats-svg text{position:static;transform:none;font:700 51.2px 'EB Garamond',Georgia,serif;fill:#fff9df;stroke:#14231e;stroke-width:5;paint-order:stroke fill;text-shadow:none}
.card.styled-card .card-stats-svg .attack-buffed{fill:#8ef3a2}.card.styled-card .card-stats-svg .health-damaged{fill:#ff7771}
.card-flight{will-change:transform,opacity;transform-origin:center}.release-ghost{transform:translate(-50%,-50%);animation:none!important}
.final-patron.capture-hit{animation:capture-impact-red .45s ease-out!important;filter:none!important}
.final-patron.capture-hit:before{content:'';position:absolute;inset:0;background:#e32c26;z-index:5;pointer-events:none;animation:capture-red-tint .45s ease-out both}
@keyframes capture-impact-red{0%{transform:translateX(0) rotate(0)}35%{transform:translateX(10px) rotate(4deg)}100%{transform:translateX(0) rotate(0)}}
@keyframes capture-red-tint{0%,100%{opacity:0}35%{opacity:.65}}
`);
let css=await fs.readFile('mesa-nova/style.css','utf8');css=css.replace('family=Cinzel:wght@400;600;700','family=EB+Garamond:wght@600;700&family=Cinzel:wght@400;600;700');await fs.writeFile('mesa-nova/style.css',css);
let html=await fs.readFile('mesa-nova/index.html','utf8');html=html.replaceAll('20261003-combate','20261003-atributos');await fs.writeFile('mesa-nova/index.html',html);
