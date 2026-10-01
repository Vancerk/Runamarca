const $ = id => document.getElementById(id);
const energyIds = ['ruptura', 'forja', 'fluxo'];
const energyNames = { ruptura: 'Ruptura', forja: 'Forja', fluxo: 'Fluxo' };
const energyColors = { ruptura: '#bd5847', forja: '#d0a44e', fluxo: '#568fc2' };
const energyIconIds = ['vazio', 'ruptura', 'forja', 'fluxo', 'eco', 'veu'];
const kindNames = { creature: 'Criatura', spell: 'Magia', rune: 'Essência', patron: 'Patrono' };
const fields = { name: 'card-name', kind: 'card-kind', subtype: 'card-subtype', rarity: 'card-rarity', rules: 'card-rules', fontName: 'font-name', fontSubtype: 'font-subtype', fontRules: 'font-rules', quantity: 'card-quantity', power: 'card-power', health: 'card-health', generic: 'cost-generic', ruptura: 'cost-ruptura', forja: 'cost-forja', fluxo: 'cost-fluxo', artZoom: 'art-zoom', artX: 'art-x', artY: 'art-y' };
const blank = () => ({ id: crypto.randomUUID(), name: '', kind: 'creature', subtype: '', rules: '', rulesItalic: false, fontName: 43, fontSubtype: 21, fontRules: 36, themeEnergy: 'ruptura', spellMode:'direct_spell', patronHealth:20, attachmentType: '', attachmentPower: 0, attachmentHealth: 0, attachmentTap: false, attachmentLock: false, attachmentTrample: false, rarity:'padrao', quantity: 2, power: 1, health: 1, generic: 0, ruptura: 0, forja: 0, fluxo: 0, art: '', artZoom: 100, artX: 50, artY: 0, agile: false, quickAttack: false, drawTrigger: '', drawCount: 1, drawPowerFour: false, tokenTrigger: '', tokenAmount: 1, tokenName: '', tokenPower: 1, tokenHealth: 1, energyResource: '', energyAmount: 1, energyBoost: '', energyBoosted: 2, agileDiscount: 0, costAuraTarget: '', costAuraAmount: 1, patronFrame: '#65439d', patronOrnament: '#c9b1e8', patronAccent: '#e9d3fa', patronFont: 'display', patronOpacity: 72, patronFlourish: 'elaborate', patronAbilities: [{ cost: 2, title: '', effect: '' }, { cost: 3, title: '', effect: '' }, { cost: 5, title: '', effect: '' }] });
let draft = blank();
let project = [];
let db = null;
let renderSerial = 0;
let alertTimer = null;
const imageCache = new Map();

function number(value, min, max, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : fallback;
}
function status(message, error = false) {
  $('editor-status').textContent = message;
  $('editor-status').classList.toggle('error', error);
  const alert = $('editor-alert');
  clearTimeout(alertTimer);
  alert.hidden = !error;
  if (error) { alert.textContent = message; alertTimer = setTimeout(() => { alert.hidden = true; }, 6500); }
}
function validateDesign(card) {
  if (!card.name?.trim()) return ['Informe o nome da carta.', 'card-name'];
  if (!['creature','spell','rune','patron'].includes(card.kind)) return ['Escolha o tipo da carta.', 'card-kind'];
  if (card.kind === 'spell' && !card.rules?.trim()) return ['Escreva o efeito da Magia.', 'card-rules'];
  if (card.kind === 'rune' && !card.rules?.trim() && !runeTokens(card).length) return ['Informe a energia gerada pela Essência ou escreva seu efeito.', 'cost-forja'];
  if (card.kind !== 'patron' && card.rules?.trim() && rulesOverflow(card)) return ['O texto ultrapassa a altura da caixa. Reduza manualmente o tamanho da fonte ou encurte o texto.', 'card-rules'];
  if (card.tokenTrigger && !card.tokenName?.trim()) return ['Dê um nome à ficha criada por esta carta.', 'token-name'];
  if (!Number.isInteger(Number(card.quantity)) || Number(card.quantity) < 1 || Number(card.quantity) > (card.kind==='patron'?1:({lacaio:3,padrao:2,elite:1}[card.rarity]||2))) return ['Quantidade acima do limite da raridade (lacaio 3, padrão 2, elite 1).' , 'card-quantity'];
  return null;
}
function reportInvalid(result, focus = true) {
  if (!result) return false;
  status(result[0], true);
  if (focus) $(result[1])?.focus();
  return true;
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
function darken(hex, amount = .25) {
  return '#' + [1, 3, 5].map(index => Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - amount)).toString(16).padStart(2, '0')).join('');
}
function illustrationPath(ctx, top, bottom) {
  ctx.beginPath();
  ctx.moveTo(38, top);
  ctx.lineTo(862, top);
  ctx.lineTo(880, top + 38);
  ctx.lineTo(880, bottom - 70);
  ctx.lineTo(828, bottom);
  ctx.lineTo(72, bottom);
  ctx.lineTo(20, bottom - 70);
  ctx.lineTo(20, top + 38);
  ctx.closePath();
}
function cardTokens(card) { return [{id:card.themeEnergy || 'ruptura', count:number(card.generic,0,20)}]; }
function runeTokens(card) {
  const tokens = [];
  const generic = number(card.generic, 0, 20);
  if (generic) tokens.push({ id: 'generic', count: generic });
  for (const id of energyIds) {
    const count = number(card[id], 0, 12);
    for (let i = 0; i < count; i++) tokens.push({ id });
  }
  return tokens;
}
function drawEnergySymbol(ctx, icons, token, x, cy, size, showCount = false) {
  const icon = icons[token.id === 'generic' ? 'vazio' : token.id];
  if (icon) ctx.drawImage(icon, x, cy - size / 2, size, size);
  else { ctx.fillStyle = energyColors[token.id] || '#26323e'; ctx.beginPath(); ctx.arc(x + size / 2, cy, size / 2, 0, Math.PI * 2); ctx.fill(); }
  if (token.count !== undefined) {
    ctx.fillStyle = '#fff5e9'; ctx.strokeStyle='#111a22';ctx.lineWidth=Math.max(1.5,size*.07);ctx.font = `800 ${size * .48}px "Source Sans 3",Arial,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(String(token.count),x+size/2,cy+size*.025);ctx.fillText(String(token.count), x + size / 2, cy + size*.025);
    ctx.textAlign = 'left';
    return;
  }
  if (showCount && token.count > 1) {
    round(ctx, x + size * .49, cy + size * .2, size * .52, size * .31, size * .12, '#17110ef2', '#e2c58f', 1.5);
    ctx.fillStyle = '#fff1d2'; ctx.font = `700 ${size * .22}px "Source Sans 3",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`×${token.count}`, x + size * .75, cy + size * .36);
    ctx.textAlign = 'left';
  }
}
function fitLines(ctx, text, width, maxLines, start, minimum, family = '"Source Sans 3", sans-serif', weight = 600) {
  const paragraphs = String(text || '').split('\n');
  for (let size = start; size >= minimum; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = [];
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) { lines.push(''); continue; }
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= width || !line) line = candidate;
        else { lines.push(line); line = word; }
      }
      if (line) lines.push(line);
    }
    if (lines.length <= maxLines) return { lines, size };
  }
  const words = String(text || '').replace(/\n/g, ' ').split(/\s+/);
  const lines = []; let line = '';
  ctx.font = `${weight} ${minimum}px ${family}`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines) clipped[maxLines - 1] = clipped[maxLines - 1].replace(/\s+\S*$/, '') + '…';
  return { lines: clipped, size: minimum };
}
function richRuns(text, allItalic = false) {
  const runs = []; let italic = allItalic; let part = '';
  for (const character of String(text || '')) {
    if (character === '*') {
      if (part) runs.push({ text: part, italic });
      part = ''; italic = !italic;
    } else part += character;
  }
  if (part) runs.push({ text: part, italic });
  return runs;
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
function rulesOverflow(card){const size=number(card.fontRules,16,52,31),ctx=document.createElement('canvas').getContext('2d'),lines=wrapRichLines(ctx,richRuns(card.rules,Boolean(card.rulesItalic)),650,size),lineHeight=size*1.2;return Math.max(926,990-(lines.length-1)*lineHeight/2)+(lines.length-1)*lineHeight>1095;}
function drawRichRules(ctx, card, x, y, width, bottom) {
  const source = card.rules || 'Escreva aqui o efeito da carta.';
  const runs = richRuns(source, Boolean(card.rulesItalic));
  const size = number(card.fontRules, 16, 52, 31);
  const lines = wrapRichLines(ctx, runs, width, size);
  const lineHeight = size * 1.2;
  ctx.fillStyle = '#fff1dd'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (const line of lines) {
    if (y > bottom) break;
    let cursor = x;
    for (const run of line) {
      ctx.font = `${run.italic ? 'italic ' : ''}600 ${size}px "Source Sans 3",sans-serif`;
      ctx.fillText(run.text, cursor, y); cursor += run.width;
    }
    y += lineHeight;
  }
}
function patronFlourish(ctx, x, y, side, color, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(side * scale, scale);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4;
  for (const offset of [0, 20, 42]) {
    ctx.beginPath(); ctx.moveTo(0, offset); ctx.bezierCurveTo(32, offset - 27, 57, offset + 22, 83, offset - 11); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(35, offset - 15, 14, 5, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(68, offset + 7, 12, 5, .6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawPatronCard(ctx, card, art) {
  const frame = /^#[0-9a-f]{6}$/i.test(card.patronFrame || '') ? card.patronFrame : '#65439d';
  const ornament = /^#[0-9a-f]{6}$/i.test(card.patronOrnament || '') ? card.patronOrnament : '#c9b1e8';
  const accent = /^#[0-9a-f]{6}$/i.test(card.patronAccent || '') ? card.patronAccent : '#e9d3fa';
  const opacity = number(card.patronOpacity, 45, 95, 72) / 100;
  round(ctx, 17, 17, 866, 1226, 38, frame);
  ctx.save(); ctx.beginPath(); ctx.roundRect(40, 40, 820, 1180, 26); ctx.clip();
  if (art) {
    const zoom = number(card.artZoom, 100, 230, 100) / 100;
    const scale = Math.max(820 / art.width, 1180 / art.height) * zoom;
    const w = art.width * scale, h = art.height * scale;
    const x = 40 + (820 - w) * number(card.artX, 0, 100, 50) / 100;
    const y = 40 + (1180 - h) * number(card.artY, 0, 100, 50) / 100;
    ctx.drawImage(art, x, y, w, h);
  } else {
    const fill = ctx.createRadialGradient(450, 475, 60, 450, 475, 690);
    fill.addColorStop(0, frame); fill.addColorStop(1, '#15121d');
    ctx.fillStyle = fill; ctx.fillRect(40, 40, 820, 1180);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = accent;
    ctx.font = '125px Georgia,serif'; ctx.fillText('✦', 450, 500);
    ctx.font = '25px "EB Garamond",Georgia,serif'; ctx.fillText('ARTE DO PATRONO', 450, 595);
  }
  const shade = ctx.createLinearGradient(0, 40, 0, 1220);
  shade.addColorStop(0, '#08071175'); shade.addColorStop(.3, '#08071100'); shade.addColorStop(.63, '#08071100'); shade.addColorStop(1, '#0807119c');
  ctx.fillStyle = shade; ctx.fillRect(40, 40, 820, 1180); ctx.restore();
  round(ctx, 47, 47, 806, 1166, 24, null, '#eddbb0', 4);
  round(ctx, 60, 60, 780, 1140, 18, null, frame, 3);
  ctx.fillStyle = `rgba(10, 9, 17, ${Math.min(.85, opacity)})`;
  round(ctx, 78, 93, 744, 124, 14, ctx.fillStyle);
  const title = (card.name || 'Novo Patrono').trim();
  const font = card.patronFont === 'script' ? '"Great Vibes",cursive' : card.patronFont === 'classic' ? '"EB Garamond",Georgia,serif' : 'Cinzel,Georgia,serif';
  let titleSize = Math.round(number(card.fontName, 24, 72, 43) * (card.patronFont === 'script' ? 1.55 : 1));
  do { ctx.font = `${card.patronFont === 'script' ? 400 : 600} ${titleSize}px ${font}`; if (ctx.measureText(title).width <= 650 || titleSize <= 27) break; titleSize -= 2; } while (true);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = accent;
  ctx.shadowColor = '#000'; ctx.shadowBlur = 10; ctx.fillText(title, 450, 158, 660); ctx.shadowBlur = 0;
  if (card.patronFlourish !== 'none') {
    const size = card.patronFlourish === 'subtle' ? .42 : .63;
    patronFlourish(ctx, 84, 132, 1, ornament, size);
    patronFlourish(ctx, 816, 132, -1, ornament, size);
  }
  round(ctx, 83, 763, 734, 397, 18, `rgba(8, 8, 13, ${opacity})`);
  if (card.patronFlourish !== 'none') {
    const size = card.patronFlourish === 'subtle' ? .75 : 1;
    patronFlourish(ctx, 87, 788, 1, ornament, size);
    patronFlourish(ctx, 813, 788, -1, ornament, size);
    patronFlourish(ctx, 87, 1070, 1, ornament, size);
    patronFlourish(ctx, 813, 1070, -1, ornament, size);
  }
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=accent;
  ctx.font='600 38px Cinzel,Georgia,serif';
  ctx.fillText(energyNames[card.themeEnergy] || 'Ruptura',450,840);
  ctx.fillStyle='#fff9ec'; ctx.font='700 56px "Source Sans 3",sans-serif';
  ctx.fillText(String(card.patronHealth || 20)+' de vida',450,940);
  ctx.font='26px "EB Garamond",Georgia,serif';
  ctx.fillText('Seu deck usa cartas desta afinidade.',450,1030);
  ctx.fillText('Começa em jogo, fora das 24 cartas.',450,1070);

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
function drawHeart(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(0,47);ctx.bezierCurveTo(-19,29,-52,7,-52,-16);ctx.bezierCurveTo(-52,-49,-17,-55,0,-31);ctx.bezierCurveTo(17,-55,52,-49,52,-16);ctx.bezierCurveTo(52,7,19,29,0,47);ctx.closePath();ctx.strokeStyle='#3b2717';ctx.lineWidth=15;ctx.stroke();ctx.strokeStyle='#d7ad65';ctx.lineWidth=10;ctx.stroke();const g=ctx.createLinearGradient(-40,-40,40,45);g.addColorStop(0,'#4fbd86');g.addColorStop(.4,'#247049');g.addColorStop(1,'#0b3225');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#83ce96';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
async function drawCard(canvas,card){
 const [art,loadedIcons,attackIcon]=await Promise.all([img(card.art),Promise.all(energyIconIds.map(id=>img('energy-icons/'+id+'.png'))),img('attack-shield.png')]);
 const icons=Object.fromEntries(energyIconIds.map((id,i)=>[id,loadedIcons[i]])),ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/900,0,0,canvas.height/1260,0,0);ctx.clearRect(0,0,900,1260);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.globalAlpha=1;ctx.shadowBlur=0;
 const stone=ctx.createLinearGradient(0,0,900,1260);stone.addColorStop(0,'#8a7960');stone.addColorStop(.35,'#302c27');stone.addColorStop(.75,'#635641');stone.addColorStop(1,'#302c28');round(ctx,17,17,866,1226,25,stone,'#c5a572',3);ctx.save();ctx.beginPath();ctx.roundRect(17,17,866,1226,25);ctx.clip();grain(ctx,17,17,866,1226,.65);ctx.restore();
 const wine=ctx.createLinearGradient(40,40,850,1210);const palette={ruptura:['#55251b','#2a1210','#63281d','#26100f'],forja:['#75521c','#31220d','#8a6526','#261d0b'],fluxo:['#214966','#102332','#2d5f7c','#0b1c29']}[card.themeEnergy]||['#55251b','#2a1210','#63281d','#26100f'];palette.forEach((color,i)=>wine.addColorStop([0,.4,.7,1][i],color));framedPanel(ctx,40,35,820,1180,wine,25);grain(ctx,46,40,808,1170,.2);
 // Broad illustration with chamfered gold edges, matching the supplied reference.
 ctx.save();bevelPath(ctx,49,129,802,713,18);ctx.clip();if(art){const zoom=number(card.artZoom,100,230,100)/100,scale=Math.max(802/art.width,713/art.height)*zoom,w=art.width*scale,h=art.height*scale;ctx.drawImage(art,49+(802-w)*number(card.artX,0,100,50)/100,129+(713-h)*number(card.artY,0,100,50)/100,w,h);}else{const g=ctx.createRadialGradient(450,420,20,450,480,560);g.addColorStop(0,'#766448');g.addColorStop(1,'#1b2324');ctx.fillStyle=g;ctx.fillRect(49,129,802,713);ctx.textAlign='center';ctx.fillStyle='#dcc296';ctx.font='110px Georgia';ctx.fillText('◈',450,450);ctx.font='24px Cinzel,Georgia';ctx.fillText('INSIRA SUA ILUSTRAÇÃO',450,520);}ctx.restore();bevelPath(ctx,49,129,802,713,18);ctx.strokeStyle='#26190f';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#cda466';ctx.lineWidth=3;ctx.stroke();
 framedPanel(ctx,49,49,802,76,wine,15);grain(ctx,55,55,790,64,.18);
 let titleSize=number(card.fontName,24,72,43);const title=card.name||'Nova carta';do{ctx.font='700 '+titleSize+'px Cinzel,Georgia,serif';if(ctx.measureText(title).width<660||titleSize<=24)break;titleSize--;}while(true);ctx.fillStyle='#fff1d2';ctx.textAlign='left';ctx.textBaseline='middle';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText(title,76,88,660);ctx.shadowBlur=0;
 // Cost set into a gold medallion, instead of a detached label.
 const affinity=card.themeEnergy||'ruptura',cx=805,cy=87;ctx.beginPath();ctx.arc(cx,cy,31,0,Math.PI*2);ctx.fillStyle='#27170e';ctx.fill();ctx.strokeStyle='#f0ca82';ctx.lineWidth=5;ctx.stroke();if(icons[affinity])ctx.drawImage(icons[affinity],cx-27,cy-27,54,54);else{ctx.fillStyle=energyColors[affinity];ctx.fill();}ctx.fillStyle='#fff7dc';ctx.strokeStyle='#26160f';ctx.lineWidth=5;ctx.font='700 42px Georgia,serif';ctx.textAlign='center';const cost=card.kind==='patron'?'◈':String(number(card.generic,0,20));ctx.strokeText(cost,cx,cy+3);ctx.fillText(cost,cx,cy+3);
 const paper=ctx.createRadialGradient(450,970,10,450,995,470);paper.addColorStop(0,'#f4dfb7');paper.addColorStop(.7,'#dfbf8b');paper.addColorStop(1,'#aa7548');framedPanel(ctx,64,855,772,272,paper,20);ctx.save();bevelPath(ctx,69,860,762,262,17);ctx.clip();grain(ctx,64,855,772,272,.28);ctx.restore();
 const rules=card.rules||(card.kind==='patron'?'Seu deck usa cartas de '+(energyNames[affinity]||affinity)+'.\nComeça em jogo, fora das 24 cartas.':'Escreva aqui o efeito da carta.'),size=number(card.fontRules,16,52,31),lines=wrapRichLines(ctx,richRuns(rules,card.rulesItalic),650,size),lineHeight=size*1.2;let y=Math.max(926,990-(lines.length-1)*lineHeight/2);ctx.fillStyle='#281b10';ctx.textAlign='left';ctx.textBaseline='alphabetic';for(const line of lines){if(y>1095)break;let x=450-line.reduce((sum,run)=>sum+run.width,0)/2;for(const run of line){ctx.font=(run.italic?'italic ':'')+'600 '+size+'px "EB Garamond",Georgia,serif';ctx.fillText(run.text,x,y);x+=run.width;}y+=lineHeight;}
 framedPanel(ctx,150,1142,600,62,wine,12);ctx.fillStyle='#f6e5be';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+number(card.fontSubtype,14,38,21)+'px Cinzel,Georgia,serif';ctx.textAlign='left';ctx.font='700 25px Cinzel,Georgia,serif';ctx.fillText((kindNames[card.kind]||'Carta').toUpperCase(),174,1174,190);ctx.strokeStyle='#cda46699';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(374,1155);ctx.lineTo(374,1191);ctx.stroke();ctx.font='600 '+number(card.fontSubtype,14,38,21)+'px Cinzel,Georgia,serif';ctx.fillText((card.subtype||'').toUpperCase(),395,1174,325);
 for(const [x,y] of [[48,155],[852,155],[48,550],[852,550],[48,1004],[852,1004],[450,1216]])diamond(ctx,x,y,y===1216?15:9);
 if(card.kind==='creature'&&attackIcon)ctx.drawImage(attackIcon,5,1103,139,139);
 if(card.kind==='creature'||card.kind==='patron')drawHeart(ctx,805,1180);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 64px "EB Garamond",Georgia,serif';ctx.fillStyle='#fff9df';ctx.strokeStyle='#14231e';ctx.lineWidth=5;
 const stats=card.kind==='creature'?[[card.power,74],[card.health,805]]:card.kind==='patron'?[[card.patronHealth||20,805]]:[];for(const [value,x] of stats){ctx.strokeText(String(value),x,1180);ctx.fillText(String(value),x,1180);}ctx.textAlign='left';
}

function readForm() {
  for (const [key, id] of Object.entries(fields)) draft[key] = $(id).value;
  for (const key of ['quantity','power','health','generic','ruptura','forja','fluxo','artZoom','artX','artY']) draft[key] = number(draft[key], key === 'quantity' ? 1 : key === 'artZoom' ? 100 : 0, key === 'quantity' ? 60 : key === 'artZoom' ? 230 : key === 'power' || key === 'health' ? 30 : key.startsWith('art') ? 100 : key === 'generic' ? 20 : 12);
  draft.fontName = number(draft.fontName, 24, 72, 43);
  draft.fontSubtype = number(draft.fontSubtype, 14, 38, 21);
  draft.fontRules = number(draft.fontRules, 16, 52, 31);
  draft.name = draft.name.trim().slice(0, 60);
  draft.subtype = draft.subtype.trim().slice(0, 45);
  draft.rules = draft.rules.slice(0, 850);
  draft.themeEnergy = $('card-theme').value; draft.spellMode = $('spell-mode').value; draft.patronHealth = number($('patron-health').value,1,99,20);
  draft.attachmentType = $('attachment-type').value;
  draft.attachmentPower = number($('attachment-power').value, -20, 20);
  draft.attachmentHealth = number($('attachment-health').value, -20, 20);
  draft.attachmentTap = $('attachment-tap').checked;
  draft.attachmentLock = $('attachment-lock').checked;
  draft.attachmentTrample = $('attachment-trample').checked;
  draft.agile = $('card-agile').checked;
  draft.quickAttack = $('card-quick-attack').checked;
  draft.drawTrigger = $('draw-trigger').value;
  draft.drawCount = number($('draw-count').value, 1, 7, 1);
  draft.drawPowerFour = $('draw-power-four').checked && draft.drawTrigger === 'turnStart';
  draft.tokenTrigger = $('token-trigger').value;
  draft.tokenAmount = number($('token-amount').value, 1, 12, 1);
  draft.tokenName = $('token-name').value.trim().slice(0, 40);
  draft.tokenPower = number($('token-power').value, 0, 30, 1);
  draft.tokenHealth = number($('token-health').value, 0, 30, 1);
  draft.energyResource = $('energy-resource').value;
  draft.energyAmount = number($('energy-amount').value, 1, 5, 1);
  draft.energyBoost = $('energy-boost').value;
  draft.energyBoosted = number($('energy-boosted').value, 1, 5, 2);
  draft.agileDiscount = number($('agile-discount').value, 0, 5);
  draft.costAuraTarget = $('cost-aura-target').value;
  draft.costAuraAmount = number($('cost-aura-amount').value, -5, 5, 1);
  draft.patronFrame = $('patron-frame').value;
  draft.patronOrnament = $('patron-ornament').value;
  draft.patronAccent = $('patron-accent').value;
  draft.patronFont = $('patron-font').value;
  draft.patronOpacity = number($('patron-opacity').value, 45, 95, 72);
  draft.patronFlourish = $('patron-flourish').value;
  draft.patronAbilities = [0,1,2].map(index => ({
    cost: number($(`patron-cost-${index}`).value, 0, 20, 0),
    title: $(`patron-title-${index}`).value.trim().slice(0, 60),
    effect: $(`patron-effect-${index}`).value.trim().slice(0, 210)
  }));
  $('creature-stats').hidden = draft.kind !== 'creature';
  const rune = draft.kind === 'rune';
  const patron = draft.kind === 'patron';
  $('energy-fields').hidden = false;
  $('rules-field').hidden = patron;
  $('toggle-italic').hidden = patron;
  $('italic-hint').hidden = patron;
  $('patron-controls').hidden = !patron;
  $('auto-abilities').hidden = patron;
  $('energy-legend').textContent = rune ? 'Energia gerada pela Essência' : 'Custos de energia';
  $('energy-hint').textContent = rune
    ? 'Informe quanto a Essência produz ao girar. Os símbolos aparecem em destaque na área de texto.'
    : 'Cada símbolo é aplicado diretamente na faixa da carta.';
  syncAbilityUI();
  return draft;
}
function syncAbilityUI() {
  $('card-quantity').max=$('card-kind').value==='patron'?1:({lacaio:3,padrao:2,elite:1}[$('card-rarity').value]||2);
  if(Number($('card-quantity').value)>Number($('card-quantity').max)){$('card-quantity').value=$('card-quantity').max;draft.quantity=Number($('card-quantity').max);}
  $('spell-mode-field').hidden = $('card-kind').value !== 'spell';
  $('patron-health-field').hidden = $('card-kind').value !== 'patron';
  $('cost-generic').closest('label').hidden = $('card-kind').value === 'patron';
  $('energy-legend').textContent = 'Mana e afinidade';
  $('energy-hint').textContent = 'Um custo numérico na energia do Patrono. Emanação é um efeito descrito no texto da criatura.';
  const creature = $('card-kind').value === 'creature';
  $('card-agile').disabled = !creature;
  $('card-quick-attack').disabled = !creature;
  $('energy-resource').disabled = !creature;
  $('energy-amount').disabled = !creature || !$('energy-resource').value;
  $('energy-boost').disabled = !creature || !$('energy-resource').value;
  $('energy-boosted').disabled = !creature || !$('energy-resource').value || !$('energy-boost').value;
  $('cost-aura-target').disabled = !creature;
  $('cost-aura-amount').disabled = !creature || !$('cost-aura-target').value;
  $('draw-count').disabled = !$('draw-trigger').value;
  $('draw-power-four').disabled = $('draw-trigger').value !== 'turnStart';
  for (const id of ['token-amount','token-name','token-power','token-health']) $(id).disabled = !$('token-trigger').value;
}
function populate(card) {
  draft = {...blank(), ...structuredClone(card)};
  if (draft.rulesItalic && draft.rules && !draft.rules.includes('*')) {
    draft.rules = `*${draft.rules}*`;
    draft.rulesItalic = false;
  }
  for (const [key,id] of Object.entries(fields)) $(id).value = draft[key] ?? blank()[key];
  $('card-theme').value = draft.themeEnergy || 'ruptura'; $('spell-mode').value = draft.spellMode || 'direct_spell'; $('patron-health').value = draft.patronHealth || 20;
  $('attachment-type').value = draft.attachmentType || '';
  $('attachment-power').value = draft.attachmentPower ?? 0;
  $('attachment-health').value = draft.attachmentHealth ?? 0;
  $('attachment-tap').checked = Boolean(draft.attachmentTap);
  $('attachment-lock').checked = Boolean(draft.attachmentLock);
  $('attachment-trample').checked = Boolean(draft.attachmentTrample);
  $('card-agile').checked = Boolean(draft.agile);
  $('card-quick-attack').checked = Boolean(draft.quickAttack);
  $('draw-trigger').value = draft.drawTrigger || '';
  $('draw-count').value = draft.drawCount ?? 1;
  $('draw-power-four').checked = Boolean(draft.drawPowerFour);
  $('token-trigger').value = draft.tokenTrigger || '';
  $('token-amount').value = draft.tokenAmount ?? 1;
  $('token-name').value = draft.tokenName || '';
  $('token-power').value = draft.tokenPower ?? 1;
  $('token-health').value = draft.tokenHealth ?? 1;
  $('energy-resource').value = draft.energyResource || '';
  $('energy-amount').value = draft.energyAmount ?? 1;
  $('energy-boost').value = draft.energyBoost || '';
  $('energy-boosted').value = draft.energyBoosted ?? 2;
  $('agile-discount').value = draft.agileDiscount ?? 0;
  $('cost-aura-target').value = draft.costAuraTarget || '';
  $('cost-aura-amount').value = draft.costAuraAmount ?? 1;
  $('patron-frame').value = draft.patronFrame || '#65439d';
  $('patron-ornament').value = draft.patronOrnament || '#c9b1e8';
  $('patron-accent').value = draft.patronAccent || '#e9d3fa';
  $('patron-font').value = draft.patronFont || 'display';
  $('patron-opacity').value = draft.patronOpacity ?? 72;
  $('patron-flourish').value = draft.patronFlourish || 'elaborate';
  [0,1,2].forEach(index => {
    const ability = draft.patronAbilities?.[index] || blank().patronAbilities[index];
    $(`patron-cost-${index}`).value = ability.cost;
    $(`patron-title-${index}`).value = ability.title;
    $(`patron-effect-${index}`).value = ability.effect;
  });
  $('card-art').value = '';
  $('creature-stats').hidden = draft.kind !== 'creature';
  $('energy-fields').hidden = false;
  $('rules-field').hidden = draft.kind === 'patron';
  $('toggle-italic').hidden = draft.kind === 'patron';
  $('italic-hint').hidden = draft.kind === 'patron';
  $('patron-controls').hidden = draft.kind !== 'patron';
  $('auto-abilities').hidden = draft.kind === 'patron';
  $('energy-legend').textContent = draft.kind === 'rune' ? 'Energia gerada pela Essência' : 'Custos de energia';
  $('energy-hint').textContent = draft.kind === 'rune'
    ? 'Informe quanto a Essência produz ao girar. Os símbolos aparecem em destaque na área de texto.'
    : 'Cada símbolo é aplicado diretamente na faixa da carta.';
  syncAbilityUI();
  renderPreview();
}
function renderPreview() {
  const serial = ++renderSerial;
  const card = structuredClone(readForm());
  $('rules-fit-warning').hidden = card.kind === 'patron' || !card.rules?.trim() || !rulesOverflow(card);
  const isolated = document.createElement('canvas');
  isolated.width = 900; isolated.height = 1260;
  drawCard(isolated, card).then(() => {
    if (serial !== renderSerial) return;
    const target = $('card-canvas').getContext('2d', { alpha: true });
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.clearRect(0, 0, 900, 1260);
    target.drawImage(isolated, 0, 0);
  }).catch(error => { if (serial === renderSerial) status(error.message, true); });
}
async function shrinkArt(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Use PNG, JPG ou WebP para a ilustração.');
  if (file.size > 20_000_000) throw new Error('A ilustração deve ter até 20 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1500 / bitmap.width, 1200 / bitmap.height);
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  return canvas.toDataURL('image/jpeg', .86);
}
function openDatabase() {
  return new Promise((resolve,reject) => {
    const req = indexedDB.open('runamarca-prototipo-card-editor',1);
    req.onupgradeneeded = () => req.result.createObjectStore('cards',{keyPath:'id'});
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function transact(mode, callback) {
  return new Promise((resolve,reject) => {
    const transaction = db.transaction('cards',mode);
    const store = transaction.objectStore('cards');
    callback(store);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
function allCards() {
  return new Promise((resolve,reject) => {
    const req = db.transaction('cards').objectStore('cards').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function filename(name, extension) { return `${String(name || 'carta').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'carta'}.${extension}`; }
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function projectList() {
  const holder = $('project-list'); holder.replaceChildren();
  const quantity = project.reduce((sum,c) => sum + number(c.quantity,1,60,1), 0);
  $('project-count').textContent = `${project.length} modelo(s) · ${quantity} cópia(s) na coleção (inclui Patronos)`;
  $('download-deck').disabled = !project.length; $('download-project').disabled = !project.length;
  if (!project.length) { const p=document.createElement('p');p.className='empty-project';p.textContent='Guarde a primeira carta para montar seu deck.';holder.append(p);return; }
  for (const card of project) {
    const row=document.createElement('div');row.className=`project-card${card.id===draft.id?' active':''}`;
    const thumb=document.createElement('canvas');thumb.width=90;thumb.height=126;thumb.setAttribute('aria-hidden','true');drawCard(thumb,card).catch(()=>{});
    const main=document.createElement('button');main.type='button';main.className='project-card-main';
    const title=document.createElement('strong');title.textContent=card.name;
    const meta=document.createElement('span');meta.textContent=`${kindNames[card.kind]} · ×${card.quantity}`;main.append(title,meta);
    main.addEventListener('click',()=>{populate(card);projectList();status(`Editando ${card.name}. Guarde para registrar as alterações.`);});
    const remove=document.createElement('button');remove.type='button';remove.className='project-delete';remove.textContent='×';remove.title=`Excluir ${card.name}`;
    remove.addEventListener('click',async()=>{if(!confirm(`Excluir “${card.name}” do projeto?`))return;project=project.filter(c=>c.id!==card.id);if(db)await transact('readwrite',store=>store.delete(card.id));if(draft.id===card.id)populate(blank());projectList();status('Carta excluída do projeto.');});
    row.append(thumb,main,remove);holder.append(row);
  }
}
async function saveCard(event) {
  event.preventDefault(); readForm();
  if (reportInvalid(validateDesign(draft))) return;
  const copy=structuredClone(draft);const index=project.findIndex(c=>c.id===copy.id);
  if (index>=0) project[index]=copy; else project.push(copy);
  try { if(db) await transact('readwrite',store=>store.put(copy)); status(`${copy.name} guardada neste navegador.`); }
  catch(error){status(`Carta na lista, mas não persistida: ${error.message}`,true);}
  projectList();
}
async function pngCard() {
  readForm(); if (reportInvalid(validateDesign(draft))) return;
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1260;
  try {await document.fonts.ready;await drawCard(canvas,draft);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Falha ao gerar PNG.');download(blob,filename(draft.name,'png'));status(`PNG de ${draft.name} baixado.`);}catch(error){status(error.message,true);}
}
function exportSingleCard(){
  readForm(); if(reportInvalid(validateDesign(draft)))return;
  download(new Blob([JSON.stringify({format:'runamarca-prototipo-editor',version:1,cards:[draft]},null,2)],{type:'application/json'}),filename(draft.name,'json'));
  status('Carta editável exportada.');
}
function exportProject(){
  if(!project.length)return status('Guarde uma carta primeiro.',true);
  download(new Blob([JSON.stringify({format:'runamarca-prototipo-editor',version:1,cards:project},null,2)],{type:'application/json'}),'runamarca-prototipo-editavel.json');
  status('Coleção editável exportada.');
}
function exportDeck(){exportProject();}
async function importProject(file){
  try{
    const data=JSON.parse(await file.text());
    if(data.format!=='runamarca-prototipo-editor'||!Array.isArray(data.cards))throw Error('Escolha um JSON deste criador do novo protótipo.');
    if(project.length+data.cards.length>120)throw Error('Limite de 120 modelos por coleção.');
    const items=data.cards.map(raw=>({...blank(),...raw,id:crypto.randomUUID()}));
    for(const item of items){
      if(!['creature','spell','patron'].includes(item.kind))throw Error('Tipo de carta inválido.');
      if(!energyIds.includes(item.themeEnergy))throw Error('Afinidade inválida.');
      if(item.art&&!/^data:image\/(jpeg|png|webp);base64,/i.test(item.art))throw Error('Ilustração inválida.');
      const invalid=validateDesign(item);if(invalid)throw Error(item.name+': '+invalid[0]);
    }
    if(db)await transact('readwrite',store=>items.forEach(item=>store.put(item)));
    project.push(...items);await projectList();status('Cartas importadas.');
  }catch(error){status(error.message,true);}
}
let starterDecks=[];
fetch('prototipo.json').then(response=>{if(!response.ok)throw Error('Falha ao ler os decks.');return response.json();}).then(data=>{
  starterDecks=data.decks;
  starterDecks.forEach(deck=>{const option=document.createElement('option');option.value=deck.id;option.textContent=deck.name;$('starter-deck').append(option);});
}).catch(error=>status(error.message,true));
$('load-starter').addEventListener('click',async()=>{
  const deck=starterDecks.find(item=>item.id===$('starter-deck').value);if(!deck)return status('Escolha um deck.',true);
  if(project.some(card=>card.starterDeck===deck.id))return status('Este deck já está na coleção. Edite suas cartas na lista.',true);
  const cards=deck.cards.map(card=>({...blank(),id:crypto.randomUUID(),name:card.name,kind:card.type==='creature'?'creature':'spell',subtype:card.type==='creature'?card.subtype:card.type==='prepared_spell'?'Magia preparada':'Magia direta',spellMode:card.type,themeEnergy:deck.affinity,generic:card.cost,power:card.attack||0,health:card.health||0,rules:card.text,fontRules:36,artY:0,quantity:card.quantity,rarity:card.rarity||'padrao',starterDeck:deck.id,art:card.image&&location.pathname.startsWith('/runamarca/')?'../'+card.image:''}));
  const portrait={ruptura:'garra-vigilante',fluxo:'olho-dos-pactos',forja:'bigorna-desperta'};
  cards.push({...blank(),id:crypto.randomUUID(),name:deck.patron.name,kind:'patron',themeEnergy:deck.affinity,patronHealth:20,quantity:1,starterDeck:deck.id,art:location.pathname.startsWith('/runamarca/')?'../patrons/'+portrait[deck.affinity]+'.png':''});
  for(const card of cards)while(rulesOverflow(card)&&card.fontRules>16)card.fontRules--;
  await Promise.all(cards.map(async card=>{if(!card.art)return;try{const response=await fetch(card.art);if(!response.ok)throw Error('Arte indisponível');const blob=await response.blob();card.art=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}catch{card.art='';}}));

  if(project.length+cards.length>120)return status('Limite de 120 modelos.',true);
  try{if(db)await transact('readwrite',store=>cards.forEach(card=>store.put(card)));project.push(...cards);populate(cards[0]);await projectList();status('24 cartas e Patrono adicionados. Edite os campos ou substitua as ilustrações.');}catch(error){status(error.message,true);}
});

$('card-form').addEventListener('submit',saveCard);
$('card-form').addEventListener('input',renderPreview);
$('card-kind').addEventListener('change',renderPreview);
$('toggle-italic').addEventListener('click', () => {
  const input = $('card-rules');
  const { selectionStart: start, selectionEnd: end } = input;
  if (start === end) { status('Selecione primeiro o trecho que deseja deixar em itálico.', true); input.focus(); return; }
  const text = input.value;
  const wrapped = text[start - 1] === '*' && text[end] === '*';
  input.value = wrapped
    ? text.slice(0, start - 1) + text.slice(start, end) + text.slice(end + 1)
    : text.slice(0, start) + '*' + text.slice(start, end) + '*' + text.slice(end);
  input.focus(); input.setSelectionRange(wrapped ? start - 1 : start + 1, wrapped ? end - 1 : end + 1);
  renderPreview();
});
$('draw-trigger').addEventListener('change',syncAbilityUI);
$('token-trigger').addEventListener('change',syncAbilityUI);
$('energy-resource').addEventListener('change',syncAbilityUI);
$('energy-boost').addEventListener('change',syncAbilityUI);
$('card-art').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{draft.art=await shrinkArt(file);renderPreview();status(`Ilustração “${file.name}” carregada.`);}catch(error){status(error.message,true);}});
$('new-card').addEventListener('click',()=>{populate(blank());projectList();status('Nova carta iniciada.');});
$('download-png').addEventListener('click',pngCard);
$('download-card').addEventListener('click',exportSingleCard);
$('download-deck').addEventListener('click',exportDeck);
$('download-project').addEventListener('click',exportProject);
$('import-project').addEventListener('change',async event=>{if(event.target.files[0])await importProject(event.target.files[0]);event.target.value='';});
renderPreview();
document.fonts.ready.then(renderPreview);
syncAbilityUI();
(async()=>{try{db=await openDatabase();project=await allCards();projectList();status('Projeto carregado. Suas cartas guardadas ficam neste navegador.');}catch(error){projectList();status('Armazenamento local indisponível; exporte o projeto antes de sair.',true);}})();
