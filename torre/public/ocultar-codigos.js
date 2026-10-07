// Máscaras vetoriais locais: não regenerar a geografia nem alterar os originais.
fetch('mascaras-codigos.json').then(r=>r.json()).then(cells=>{
 const svg=document.querySelector('#clean'),ns='http://www.w3.org/2000/svg';
 const defs=document.createElementNS(ns,'defs');svg.append(defs);
 const masks=document.createElementNS(ns,'g');masks.id='code-masks';svg.append(masks);
 cells.forEach((cell,index)=>{
  const clip=document.createElementNS(ns,'clipPath');clip.id='cell-clip-'+index;
  const polygon=document.createElementNS(ns,'polygon');polygon.setAttribute('points',Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return [cell.x+Math.cos(a)*18,cell.y+Math.sin(a)*18].join(',');}).join(' '));clip.append(polygon);defs.append(clip);
  const rect=document.createElementNS(ns,'rect');for(const [key,value]of Object.entries({x:cell.x-11,y:cell.y-17,width:22,height:11,fill:cell.color,'clip-path':'url(#'+clip.id+')'}))rect.setAttribute(key,value);masks.append(rect);
 });
 const labels=[['PASSAGEM DA ÁGUIA',561,139,135],['FLORESTA DE ECOS',905,226,146],['BLACKGARD',878,367,110],['AETHERFALL',1024,443,98],['MATA SUSSURRANTE',1030,630,143],['CICATRIZES BRANCAS',834,672,157],['DESFILADEIRO DE VELMOREN',1080,754,198]];
 labels.forEach(([name,x,y,width])=>{
  const backing=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:x-width/2,y:y-11,width,height:15,fill:'#1d1817',rx:3}))backing.setAttribute(k,v);masks.append(backing);
  const text=document.createElementNS(ns,'text');for(const [k,v]of Object.entries({x,y,'text-anchor':'middle','font-family':'Georgia,serif','font-size':11,fill:'#fff','font-weight':'bold',class:'region-name'}))text.setAttribute(k,v);text.textContent=name;masks.append(text);
 });
 // A limpeza dos marcadores é carregada separadamente; ocultar também seus textos.
});
