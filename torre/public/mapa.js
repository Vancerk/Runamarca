const viewport=document.querySelector('#viewport'),world=document.querySelector('#world'),simple=document.querySelector('#simple'),blend=document.querySelector('#blend'),toggle=document.querySelector('#toggle'),status=document.querySelector('#status');
document.querySelector('header strong').textContent='Torre de Comando';document.querySelector('header p').textContent='Scroll: zoom · Botão esquerdo + arraste: mover';
const reset=document.createElement('button');reset.textContent='Enquadrar mapa';document.querySelector('header').insertBefore(reset,document.querySelector('header p'));
let zoom=1,x=0,y=0,drag=null;
function render(){world.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;status.textContent=`Zoom ${Math.round(zoom*100)}%`;}
function fit(){zoom=Math.min(viewport.clientWidth/4096,viewport.clientHeight/3072)*.97;x=(viewport.clientWidth-4096*zoom)/2;y=(viewport.clientHeight-3072*zoom)/2;render();}
function update(value){blend.value=value;simple.style.opacity=value/100;world.querySelector(':scope > img').style.opacity=1-value/100;toggle.textContent=value===100?'Mostrar detalhado':'Mostrar simplificado';}
blend.oninput=()=>update(Number(blend.value));toggle.onclick=()=>update(Number(blend.value)===100?0:100);reset.onclick=fit;
viewport.addEventListener('wheel',e=>{e.preventDefault();const rect=viewport.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);const next=Math.max(.08,Math.min(3,zoom*Math.exp(-delta*.0015)));x=px-(px-x)*next/zoom;y=py-(py-y)*next/zoom;zoom=next;render();},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');e.preventDefault();});
viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;x+=e.clientX-drag.x;y+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;render();});
function release(){drag=null;viewport.classList.remove('dragging');}viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);viewport.addEventListener('lostpointercapture',release);
fetch('alinhamento.json').then(r=>r.json()).then(c=>{const reference=4096/c.reference_size[0],s=c.scale*(1400/5100)*reference;simple.style.transform=`translate(${c.translation[0]*reference}px,${c.translation[1]*reference}px) scale(${s})`;});
fetch('limpeza.json').then(r=>r.json()).then(c=>{const svg=document.querySelector('#clean'),ns='http://www.w3.org/2000/svg';function add(tag,attrs){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;}add('rect',{x:0,y:0,width:365,height:917,fill:'#1d1817'});add('rect',{x:0,y:0,width:1400,height:95,fill:'#1d1817'});for(const cell of c.cells){const radius=17.9;const points=Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return `${cell.x+Math.cos(a)*radius},${cell.y+Math.sin(a)*radius}`;}).join(' ');add('polygon',{points,fill:cell.color});if(cell.terrain){const color={snow:'#ffffff',forest:'#78955b',mountain:'#a5957f'}[cell.terrain];for(const offset of [-8,0,8]){const cx=cell.x+offset,cy=cell.y+5;add('polygon',{points:[(cx-4)+','+(cy+4),cx+','+(cy-5),(cx+4)+','+(cy+4)].join(' '),fill:color});}}const text=add('text',{x:cell.x,y:cell.y-10.5,'text-anchor':'middle','font-size':5.7,'font-family':'Georgia,serif',fill:cell.textColor||'#f2e4be'});text.textContent=cell.id;}add('circle',{cx:1022,cy:427,r:5.4,fill:c.dotColor});});
fit();window.addEventListener('resize',fit);




