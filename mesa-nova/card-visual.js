(()=>{
const energyNames = { ruptura: 'Ruptura', forja: 'Forja', fluxo: 'Fluxo' };
const energyColors = { ruptura: '#bd5847', forja: '#d0a44e', fluxo: '#568fc2' };
const energyIconIds = ['vazio', 'ruptura', 'forja', 'fluxo', 'eco', 'veu'];
const kindNames = { creature: 'Criatura', spell: 'Magia', rune: 'Essência', patron: 'Patrono' };

const imageCache=new Map();
let fontsReady;
function prepareFonts(){return fontsReady??=(document.fonts?Promise.all(['700 43px Cinzel','600 32px "EB Garamond"','italic 600 32px "EB Garamond"'].map(font=>document.fonts.load(font))).catch(()=>{}):Promise.resolve());}
function fitLabel(ctx,label,size,family,width){
 while(size>8){ctx.font=family.replace('{size}',size);if(ctx.measureText(label).width<=width)break;size-=.5;}
 return label;
}
function number(value, min, max, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : fallback;
}

function img(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) imageCache.set(src, new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível ler a ilustração.'));
    image.src = src;
  }));
  return imageCache.get(src);
}
function round(ctx, x, y, w, h, r, fill, stroke, line = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.stroke(); }
}

function formatRulesText(text){
 return String(text||'').replace(/(?<![\p{L}\p{N}_])(Ao entrar|Entrada|Revelação|Emanação|Direta|Preparada|Escolha um|Âncoragem|Ancoragem)\s*:/giu,(_,label)=>({ 'ao entrar':'Entrada','âncoragem':'Ancoragem' }[label.toLowerCase()]||label)+' —');
}
const mechanicPattern=/((?<![\p{L}\p{N}_])(?:Entrada|Revelação|Emanação|Iniciativa|Transpassar|Provocar|Adormecer|Ancoragem|Barreira)(?![\p{L}\p{N}_]))/giu;
function richRuns(text, allItalic = false) {
  const runs = []; let italic = allItalic; let part = '';
  for (const character of formatRulesText(text)) {
    if (character === '*') {
      if (part) runs.push({ text: part, italic });
      part = ''; italic = !italic;
    } else part += character;
  }
  if (part) runs.push({ text: part, italic });
  return runs.flatMap(run=>run.text.split(mechanicPattern).map((text,index)=>({text,italic:run.italic||index%2===1})).filter(part=>part.text));
}
function wrapRichLines(ctx, runs, width, size) {
  const font = italic => `${italic ? 'italic ' : ''}600 ${size}px "EB Garamond",Georgia,serif`;
  const lines = [[]]; let used = 0;
  const nextLine = () => { lines.push([]); used = 0; };
  const append = (text, italic, measured) => {
    const line = lines.at(-1), last = line.at(-1);
    if (last?.italic === italic) { last.text += text; last.width += measured; }
    else line.push({ text, italic, width: measured });
    used += measured;
  };
  for (const run of runs) for (const token of run.text.match(/\n|[^\S\n]+|[^\s]+/g) || []) {
    if (token === '\n') { nextLine(); continue; }
    ctx.font = font(run.italic);
    const tokenWidth = ctx.measureText(token).width;
    if (/^\s+$/.test(token)) {
      if (used && used + tokenWidth <= width) append(token, run.italic, tokenWidth);
      continue;
    }
    if (tokenWidth <= width) {
      if (used && used + tokenWidth > width) nextLine();
      append(token, run.italic, tokenWidth);
      continue;
    }
    // Palavras sem espaços também precisam quebrar, sem comprimir a fonte.
    for (const character of Array.from(token)) {
      const characterWidth = ctx.measureText(character).width;
      if (used && used + characterWidth > width) nextLine();
      append(character, run.italic, characterWidth);
    }
  }
  return lines;
}
function layoutRules(ctx,card,{width=650,top=884,bottom=1097}={}){
 const runs=richRuns(card.rules||'',Boolean(card.rulesItalic));let size=number(card.fontRules,16,52,31),lines,lineHeight,ascent,descent,total;
 do{
  lines=wrapRichLines(ctx,runs,width,size);lineHeight=size*1.2;ascent=0;descent=0;
  for(const line of lines)for(const run of line){ctx.font=(run.italic?'italic ':'')+'600 '+size+'px "EB Garamond",Georgia,serif';const m=ctx.measureText(run.text);ascent=Math.max(ascent,m.actualBoundingBoxAscent??size*.85);descent=Math.max(descent,m.actualBoundingBoxDescent??size*.25);}
  total=ascent+descent+Math.max(0,lines.length-1)*lineHeight;
  if(total<=bottom-top||size<=1)break;size--;
 }while(true);
 return {size,lines,lineHeight,y:top+(bottom-top-total)/2+ascent,total,fits:total<=bottom-top};
}

let grainTexture=null;
function grain(ctx,x,y,w,h,opacity=.15){
 if(!grainTexture){grainTexture=document.createElement('canvas');grainTexture.width=900;grainTexture.height=1260;const g=grainTexture.getContext('2d');let seed=39471;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<22000;i++){g.fillStyle=i%3?'#302010':'#ffedb1';g.globalAlpha=.15+random()*.5;g.fillRect(random()*900,random()*1260,random()*2+.5,random()*2+.5);}}
 ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(grainTexture,0,0,900,1260,x,y,w,h);ctx.restore();
}
function bevelPath(ctx,x,y,w,h,cut=15){ctx.beginPath();ctx.moveTo(x+cut,y);ctx.lineTo(x+w-cut,y);ctx.lineTo(x+w,y+cut);ctx.lineTo(x+w,y+h-cut);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x+cut,y+h);ctx.lineTo(x,y+h-cut);ctx.lineTo(x,y+cut);ctx.closePath();}
function framedPanel(ctx,x,y,w,h,fill,cut=16){bevelPath(ctx,x,y,w,h,cut);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#352015';ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle='#ba8848';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#f2d796';ctx.lineWidth=1.5;ctx.stroke();bevelPath(ctx,x+5,y+5,w-10,h-10,Math.max(5,cut-3));ctx.strokeStyle='#77512b';ctx.lineWidth=2;ctx.stroke();}
function diamond(ctx,x,y,size=8){ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.65,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size*.65,y);ctx.closePath();ctx.fillStyle='#5b351b';ctx.fill();ctx.strokeStyle='#dcb36b';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-size*.45);ctx.lineTo(x+size*.28,y);ctx.lineTo(x,y+size*.45);ctx.lineTo(x-size*.28,y);ctx.closePath();ctx.fillStyle='#f8e0a0';ctx.fill();}
function divider(ctx,y){const g=ctx.createLinearGradient(260,0,640,0);g.addColorStop(0,'#79512b00');g.addColorStop(.5,'#79512b');g.addColorStop(1,'#79512b00');ctx.strokeStyle=g;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(260,y);ctx.lineTo(640,y);ctx.stroke();diamond(ctx,450,y,10);}
function drawHeart(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.scale(1.15,1.15);ctx.beginPath();ctx.moveTo(0,47);ctx.bezierCurveTo(-19,29,-52,7,-52,-16);ctx.bezierCurveTo(-52,-49,-17,-55,0,-31);ctx.bezierCurveTo(17,-55,52,-49,52,-16);ctx.bezierCurveTo(52,7,19,29,0,47);ctx.closePath();ctx.strokeStyle='#3b2717';ctx.lineWidth=15;ctx.stroke();ctx.strokeStyle='#d7ad65';ctx.lineWidth=10;ctx.stroke();const g=ctx.createLinearGradient(-40,-40,40,45);g.addColorStop(0,'#4fbd86');g.addColorStop(.4,'#247049');g.addColorStop(1,'#0b3225');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#83ce96';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
function drawLiquidHeart(canvas,ratio=1,combat=false){
 const ctx=canvas.getContext('2d'),height=combat?820:1260;
 ctx.setTransform(canvas.width/900,0,0,canvas.height/height,0,0);ctx.clearRect(0,0,900,height);
 const y=combat?747:1180;drawHeart(ctx,826,y);
 ratio=Math.max(0,Math.min(1,ratio));if(ratio===1)return;
 ctx.save();ctx.translate(826,y);ctx.scale(1.15,1.15);
 ctx.beginPath();ctx.moveTo(0,47);ctx.bezierCurveTo(-19,29,-52,7,-52,-16);ctx.bezierCurveTo(-52,-49,-17,-55,0,-31);ctx.bezierCurveTo(17,-55,52,-49,52,-16);ctx.bezierCurveTo(52,7,19,29,0,47);ctx.closePath();ctx.clip();
 const level=48-96*ratio;
 ctx.beginPath();ctx.moveTo(-60,-60);ctx.lineTo(60,-60);ctx.lineTo(60,level);ctx.bezierCurveTo(20,level-3,-20,level+3,-60,level);ctx.closePath();ctx.fillStyle='#173329';ctx.fill();
 if(ratio>0){ctx.beginPath();ctx.moveTo(-60,level);ctx.bezierCurveTo(-20,level+3,20,level-3,60,level);ctx.strokeStyle='#8dd7b5';ctx.lineWidth=2;ctx.stroke();}
 ctx.restore();
}
function rarityFrame(ctx,card,height,radius,line){
 const rarity=String(card.rarity||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const metals={
  lacaio:['#d29a60','#80502d','#bb8450','#70442a','#e2b482'],
  padrao:['#e6e9ea','#737d84','#bac1c6','#626b73','#f0f1f2'],
  elite:['#ffe28a','#997017','#e5b942','#91691b','#ffe5a0'],
  soberano:['#edd3f5','#9bcff1','#b2edce','#f2dfa3','#efaed4','#b7a8ed','#95deeb','#efc5d5','#d8b8ed']
 };
 let colors=metals[rarity]||['#8a7960','#302c27','#635641','#302c28','#c5a572'];
 if(rarity==='lacaio'||rarity==='padrao'||rarity==='soberano'){
  const channels=colors.map(color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)));
  const averages=[0,1,2].map(index=>channels.reduce((sum,color)=>sum+color[index],0)/channels.length);
  // Silver retains softer reflections; bronze is dimmer and platinum preserves its iridescent hues.
  const exposure=rarity==='lacaio'?.75:.85*1.15;
  colors=channels.map(color=>'#'+color.map((value,index)=>Math.round(rarity==='padrao'?(averages[index]+(value-averages[index])*.75)*.75:value*exposure).toString(16).padStart(2,'0')).join(''));
 }
 const metal=ctx.createLinearGradient(17,17,883,height-17);
 colors.forEach((color,i)=>metal.addColorStop(i/(colors.length-1),color));
 ctx.save();round(ctx,17,17,866,height-34,radius,metal,colors[4],line);
 ctx.beginPath();ctx.roundRect(17,17,866,height-34,radius);ctx.clip();
 grain(ctx,17,17,866,height-34,.38);ctx.restore();
}
async function drawCard(canvas,card,{assets="",hideStats=false}={}){
 await prepareFonts();
 const [art,loadedIcons,attackIcon]=await Promise.all([img(card.art),Promise.all(energyIconIds.map(id=>img(assets+'energy-icons/'+id+'.png'))),img(assets+'attack-shield.png')]);
 const icons=Object.fromEntries(energyIconIds.map((id,i)=>[id,loadedIcons[i]])),ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/900,0,0,canvas.height/1260,0,0);ctx.clearRect(0,0,900,1260);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.globalAlpha=1;ctx.shadowBlur=0;
 rarityFrame(ctx,card,1260,25,3);
 const wine=ctx.createLinearGradient(40,40,850,1210);const palette={ruptura:['#55251b','#2a1210','#63281d','#26100f'],forja:['#89701f','#493e18','#ac8b2d','#4b401b'],fluxo:['#214966','#102332','#2d5f7c','#0b1c29']}[card.themeEnergy]||['#55251b','#2a1210','#63281d','#26100f'];palette.forEach((color,i)=>wine.addColorStop([0,.4,.7,1][i],color));framedPanel(ctx,40,35,820,1180,wine,25);grain(ctx,46,40,808,1170,.2);
 // Broad illustration with chamfered gold edges, matching the supplied reference.
 ctx.save();bevelPath(ctx,49,129,802,713,18);ctx.clip();if(art){const zoom=number(card.artZoom,100,230,100)/100,scale=Math.max(802/art.width,713/art.height)*zoom,w=art.width*scale,h=art.height*scale;ctx.drawImage(art,49+(802-w)*number(card.artX,0,100,50)/100,129+(713-h)*number(card.artY,0,100,50)/100,w,h);}else{const g=ctx.createRadialGradient(450,420,20,450,480,560);g.addColorStop(0,'#766448');g.addColorStop(1,'#1b2324');ctx.fillStyle=g;ctx.fillRect(49,129,802,713);ctx.textAlign='center';ctx.fillStyle='#dcc296';ctx.font='110px Georgia';ctx.fillText('◈',450,450);ctx.font='24px Cinzel,Georgia';ctx.fillText('INSIRA SUA ILUSTRAÇÃO',450,520);}ctx.restore();bevelPath(ctx,49,129,802,713,18);ctx.strokeStyle='#26190f';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#cda466';ctx.lineWidth=3;ctx.stroke();
 framedPanel(ctx,49,49,802,76,wine,15);grain(ctx,55,55,790,64,.18);
 let titleSize=number(card.fontName,24,72,43);const title=card.name||'Nova carta';do{ctx.font='700 '+titleSize+'px Cinzel,Georgia,serif';if(ctx.measureText(title).width<660||titleSize<=24)break;titleSize--;}while(true);ctx.fillStyle='#fff1d2';ctx.textAlign='left';ctx.textBaseline='middle';ctx.shadowColor='#000';ctx.shadowBlur=5;fitLabel(ctx,title,titleSize,'700 {size}px Cinzel,Georgia,serif',660);ctx.fillText(title,76,88);ctx.shadowBlur=0;
 // Cost set into a gold medallion, instead of a detached label.
 const affinity=card.themeEnergy||'ruptura',cx=805,cy=87;ctx.beginPath();ctx.arc(cx,cy,52.7,0,Math.PI*2);const orb=ctx.createRadialGradient(cx-17,cy-20.4,2,cx,cy,56.1);orb.addColorStop(0,energyColors[affinity]||'#bd5847');orb.addColorStop(1,{ruptura:'#702d23',forja:'#765013',fluxo:'#244e78'}[affinity]||'#702d23');ctx.fillStyle=orb;ctx.fill();ctx.strokeStyle='#f0ca82';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff7dc';ctx.strokeStyle='#26160f';ctx.lineWidth=5;ctx.font='700 54.6px Georgia,serif';ctx.textAlign='center';const cost=card.kind==='patron'?'◈':String(number(card.generic,0,20));ctx.textBaseline='alphabetic';const metrics=ctx.measureText(cost),costY=cy+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;ctx.strokeText(cost,cx,costY);ctx.fillText(cost,cx,costY);
 const paper=ctx.createRadialGradient(450,970,10,450,995,470);paper.addColorStop(0,'#f4dfb7');paper.addColorStop(.7,'#dfbf8b');paper.addColorStop(1,'#aa7548');framedPanel(ctx,64,855,772,272,paper,20);ctx.save();bevelPath(ctx,69,860,762,262,17);ctx.clip();grain(ctx,64,855,772,272,.28);if(icons[affinity]){ctx.globalAlpha=.12;ctx.drawImage(icons[affinity],329.25,870.25,241.5,241.5);}ctx.restore();
 const rules=card.rules||(card.kind==='patron'?'Seu deck usa cartas de '+(energyNames[affinity]||affinity)+'.\nComeça em jogo, fora do limite de 30 cartas.':'Escreva aqui o efeito da carta.'),layout=layoutRules(ctx,{...card,rules});let y=layout.y;ctx.fillStyle='#281b10';ctx.textAlign='left';ctx.textBaseline='alphabetic';for(const line of layout.lines){let x=450-line.reduce((sum,run)=>sum+run.width,0)/2;for(const run of line){ctx.font=(run.italic?'italic ':'')+'600 '+layout.size+'px "EB Garamond",Georgia,serif';ctx.fillText(run.text,x,y);x+=run.width;}y+=layout.lineHeight;}
 framedPanel(ctx,150,1142,600,62,wine,12);ctx.fillStyle='#f6e5be';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+number(card.fontSubtype,14,38,21)+'px Cinzel,Georgia,serif';ctx.textAlign='left';ctx.font='700 25px Cinzel,Georgia,serif';ctx.fillText(fitLabel(ctx,(kindNames[card.kind]||'Carta').toUpperCase(),25,'700 {size}px Cinzel,Georgia,serif',190),174,1174);ctx.strokeStyle='#cda46699';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(374,1155);ctx.lineTo(374,1191);ctx.stroke();ctx.font='600 '+number(card.fontSubtype,14,38,21)+'px Cinzel,Georgia,serif';ctx.fillText(fitLabel(ctx,(card.subtype||'').toUpperCase(),number(card.fontSubtype,14,38,21),'600 {size}px Cinzel,Georgia,serif',325),395,1174);
 for(const [x,y] of [[48,155],[852,155],[48,550],[852,550],[48,1004],[852,1004],[450,1216]])diamond(ctx,x,y,y===1216?15:9);
 if(card.kind==='creature'&&attackIcon)ctx.drawImage(attackIcon,5,1085,159.85,159.85);
 if(card.kind==='creature'||card.kind==='patron')drawHeart(ctx,826,1180);
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='700 64px "EB Garamond",Georgia,serif';ctx.fillStyle='#fff9df';ctx.strokeStyle='#14231e';ctx.lineWidth=5;
 const stats=hideStats?[]:card.kind==='creature'?[[card.power,83.3,1172,78],[card.health,826,1177.12,94]]:card.kind==='patron'?[[card.patronHealth||16,826,1177.12,94]]:[];for(const [value,x,centerY,maxWidth] of stats){const label=String(value);let fontSize=51.2;do{ctx.font='700 '+fontSize+'px "EB Garamond",Georgia,serif';if(ctx.measureText(label).width<=maxWidth)break;fontSize--;}while(fontSize>30);ctx.textAlign='left';const metric=ctx.measureText(label),baseline=centerY+(metric.actualBoundingBoxAscent-metric.actualBoundingBoxDescent)/2,originX=x+(metric.actualBoundingBoxLeft-metric.actualBoundingBoxRight)/2;ctx.strokeText(label,originX,baseline);ctx.fillText(label,originX,baseline);}ctx.textAlign='left';
}


async function drawCombat(canvas,card,{assets='',flat=false}={}){
 const [art,shield]=await Promise.all([img(card.art),img(assets+'attack-shield.png')]);
 const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/900,0,0,canvas.height/820,0,0);ctx.clearRect(0,0,900,820);
 rarityFrame(ctx,card,820,35,4);
 framedPanel(ctx,40,38,820,741,{forja:'#79621d',fluxo:'#214966',ruptura:'#55251b'}[card.themeEnergy]||'#79621d',20);
 ctx.save();bevelPath(ctx,49,49,802,713,18);ctx.clip();
 if(art){const source=flat?{x:art.width*49/900,y:art.height*129/1260,w:art.width*802/900,h:art.height*713/1260}:{x:0,y:0,w:art.width,h:art.height};const scale=Math.max(802/source.w,713/source.h)*(Number(card.artZoom||100)/100),w=source.w*scale,h=source.h*scale;ctx.drawImage(art,source.x,source.y,source.w,source.h,49+(802-w)*Number(card.artX??50)/100,49+(713-h)*Number(card.artY??0)/100,w,h);}else{ctx.fillStyle='#39392d';ctx.fillRect(49,49,802,713);}
 ctx.restore();if(shield)ctx.drawImage(shield,5,653,159.85,159.85);drawHeart(ctx,826,747);
}
window.RunaCardVisual={drawCard,drawCombat,drawLiquidHeart,formatRulesText,richRuns,layoutRules};
})();
