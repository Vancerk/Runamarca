const $ = id => document.getElementById(id);
const energyIds = ['ruptura', 'forja', 'fluxo'];
const energyNames = { ruptura: 'Ruptura', forja: 'Forja', fluxo: 'Fluxo' };
const energyColors = { ruptura: '#bd5847', forja: '#d0a44e', fluxo: '#568fc2' };
const energyIconIds = ['vazio', 'ruptura', 'forja', 'fluxo', 'eco', 'veu'];
const kindNames = { creature: 'Criatura', spell: 'Magia', rune: 'Essência', patron: 'Patrono' };
const fields = { name: 'card-name', kind: 'card-kind', subtype: 'card-subtype', rules: 'card-rules', fontName: 'font-name', fontSubtype: 'font-subtype', fontRules: 'font-rules', quantity: 'card-quantity', power: 'card-power', health: 'card-health', generic: 'cost-generic', ruptura: 'cost-ruptura', forja: 'cost-forja', fluxo: 'cost-fluxo', artZoom: 'art-zoom', artX: 'art-x', artY: 'art-y' };
const blank = () => ({ id: crypto.randomUUID(), name: '', kind: 'creature', subtype: '', rules: '', rulesItalic: false, fontName: 43, fontSubtype: 21, fontRules: 31, themeEnergy: 'auto', attachmentType: '', attachmentPower: 0, attachmentHealth: 0, attachmentTap: false, attachmentLock: false, attachmentTrample: false, quantity: 1, power: 1, health: 1, generic: 0, ruptura: 0, forja: 0, fluxo: 0, art: '', artZoom: 100, artX: 50, artY: 50, agile: false, quickAttack: false, drawTrigger: '', drawCount: 1, drawPowerFour: false, tokenTrigger: '', tokenAmount: 1, tokenName: '', tokenPower: 1, tokenHealth: 1, energyResource: '', energyAmount: 1, energyBoost: '', energyBoosted: 2, agileDiscount: 0, costAuraTarget: '', costAuraAmount: 1, patronFrame: '#65439d', patronOrnament: '#c9b1e8', patronAccent: '#e9d3fa', patronFont: 'display', patronOpacity: 72, patronFlourish: 'elaborate', patronAbilities: [{ cost: 2, title: '', effect: '' }, { cost: 3, title: '', effect: '' }, { cost: 5, title: '', effect: '' }] });
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
  if (!card.art) return ['Escolha uma ilustração para a carta.', 'card-art'];
  if (card.kind === 'patron' && !card.patronAbilities?.some(ability => ability.title?.trim() && ability.effect?.trim())) return ['Preencha o nome e o efeito de ao menos uma habilidade do Patrono.', 'patron-title-0'];
  if (card.kind === 'spell' && !card.rules?.trim()) return ['Escreva o efeito da Magia.', 'card-rules'];
  if (card.kind === 'rune' && !card.rules?.trim() && !runeTokens(card).length) return ['Informe a energia gerada pela Essência ou escreva seu efeito.', 'cost-forja'];
  if (card.kind !== 'patron' && card.rules?.trim() && rulesOverflow(card)) return ['O texto ultrapassa a altura da caixa. Reduza manualmente o tamanho da fonte ou encurte o texto.', 'card-rules'];
  if (card.tokenTrigger && !card.tokenName?.trim()) return ['Dê um nome à ficha criada por esta carta.', 'token-name'];
  if (!Number.isInteger(Number(card.quantity)) || Number(card.quantity) < 1 || Number(card.quantity) > 60) return ['A quantidade deve ficar entre 1 e 60.', 'card-quantity'];
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
function cardTokens(card) {
  const tokens = [];
  if (number(card.generic, 0, 20)) tokens.push({ id: 'generic', count: card.generic });
  for (const id of energyIds) {
    const count = number(card[id], 0, 12);
    for (let i = 0; i < count; i++) tokens.push({ id });
  }
  return tokens;
}
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
  if (token.id === 'generic') {
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
  const font = italic => `${italic ? 'italic ' : ''}600 ${size}px "Source Sans 3",sans-serif`;
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
function rulesOverflow(card) {
  const descriptionTop = card.kind === 'rune' ? 804 : card.kind === 'creature' ? 871 : 885;
  const y = card.kind === 'rune' && runeTokens(card).length ? 1050 : descriptionTop + 57;
  const size = number(card.fontRules, 16, 52, 31);
  const ctx = document.createElement('canvas').getContext('2d');
  const lines = wrapRichLines(ctx, richRuns(card.rules, Boolean(card.rulesItalic)), 680, size);
  return y + (lines.length - 1) * size * 1.2 > 1137;
}
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
  const abilities = Array.isArray(card.patronAbilities) ? card.patronAbilities : blank().patronAbilities;
  for (let index = 0; index < 3; index++) {
    const ability = abilities[index] || { cost: [2,3,5][index], title: '', effect: '' };
    const top = 795 + index * 116;
    ctx.beginPath(); ctx.arc(144, top + 30, 27, 0, Math.PI * 2);
    ctx.fillStyle = '#f2e9da'; ctx.fill(); ctx.strokeStyle = ornament; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#17111a'; ctx.font = '700 29px Cinzel,Georgia,serif';
    ctx.fillText(String(number(ability.cost, 0, 20, 0)), 144, top + 31);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = accent; ctx.font = 'italic 600 27px "EB Garamond",Georgia,serif';
    const label = ability.title?.trim() || `Habilidade ${['I','II','III'][index]}`;
    ctx.fillText(label, 184, top + 23, 555);
    const effect = fitLines(ctx, ability.effect?.trim() || 'Descreva o efeito desta habilidade.', 540, 2, 24, 19, '"EB Garamond",Georgia,serif', 500);
    ctx.font = `500 ${effect.size}px "EB Garamond",Georgia,serif`; ctx.fillStyle = '#fff9ec';
    effect.lines.forEach((line, lineIndex) => ctx.fillText(line, 184, top + 50 + lineIndex * (effect.size + 2), 540));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }
}
async function drawCard(canvas, card) {
  const [art, loadedIcons, attackIcon] = await Promise.all([img(card.art), Promise.all(energyIconIds.map(id => img(`/energy-icons/${id}.png`))), img(card.kind === 'creature' ? '/attack-shield.png?v=2' : null)]);
  const icons = Object.fromEntries(energyIconIds.map((id, index) => [id, loadedIcons[index]]));
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.setTransform(canvas.width / 900, 0, 0, canvas.height / 1260, 0, 0);
  // O canvas conserva alinhamento e fonte entre prévias; Patrono usa texto centralizado.
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.clearRect(0, 0, 900, 1260);
  if (card.kind === 'patron') { drawPatronCard(ctx, card, art); return; }
  const dominant = card.themeEnergy && card.themeEnergy !== 'auto' ? card.themeEnergy : ['generic', ...energyIds].reduce((best, id) => number(card[id], 0, 20) > number(card[best], 0, 20) ? id : best, 'generic');
  const theme = dominant === 'generic' ? 'vazio' : dominant;
  const palette = { vazio: ['#19242e','#273645','#8fabb4'], ruptura: ['#48231e','#64342a','#c97762'], forja: ['#493717','#665125','#d6ad5a'], fluxo: ['#1b314b','#294866','#73a9d1'] }[theme] || ['#19242e','#273645','#8fabb4'];
  const accent = palette[2];
  const darkTitle = darken(palette[1]);
  const darkText = darken(palette[0]);
  const essence = card.kind === 'rune';
  const artTop = 114;
  const descriptionTop = essence ? 804 : card.kind === 'creature' ? 871 : 885;
  const artHeight = descriptionTop - artTop;
  round(ctx, 17, 17, 866, 1226, 27, palette[0], accent, 6);
  // A ilustração afunila até a caixa de texto, deixando as laterais livres para os atributos.
  ctx.save(); illustrationPath(ctx, artTop, descriptionTop); ctx.clip();
  if (art) {
    const zoom = number(card.artZoom, 100, 230, 100) / 100;
    const scale = Math.max(860 / art.width, artHeight / art.height) * zoom;
    const w = art.width * scale, h = art.height * scale;
    const x = 20 + (860 - w) * number(card.artX, 0, 100, 50) / 100;
    const y = artTop + (artHeight - h) * number(card.artY, 0, 100, 50) / 100;
    ctx.drawImage(art, x, y, w, h);
  } else {
    const placeholder = ctx.createRadialGradient(450, 490, 10, 450, 490, 750);
    placeholder.addColorStop(0, '#65523b'); placeholder.addColorStop(1, '#111b1a');
    ctx.fillStyle = placeholder; ctx.fillRect(20, artTop, 860, artHeight);
    ctx.fillStyle = '#c6a777'; ctx.font = '130px Georgia,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('◈', 450, 510);
    ctx.font = '25px "Source Sans 3",sans-serif'; ctx.fillText('INSIRA UMA ILUSTRAÇÃO', 450, 610); ctx.textAlign = 'left';
  }
  ctx.restore();
  round(ctx, 38, 38, 824, 76, 12, darkTitle, accent, 4);
  const tokens = card.kind === 'rune' ? [] : cardTokens(card);
  const rows = Math.max(1, Math.ceil(tokens.length / 12));
  const columns = Math.ceil(tokens.length / rows);
  const chip = rows === 1 ? Math.min(52, Math.floor(335 / Math.max(1, columns))) : rows === 2 ? 25 : 18;
  const chipGap = rows === 1 ? Math.max(2, chip * .08) : 2;
  const costWidth = tokens.length ? columns * chip + (columns - 1) * chipGap + 18 : 0;
  const nameWidth = 758 - costWidth;
  let titleSize = number(card.fontName, 24, 72, 43);
  const title = (card.name || 'Nova carta').trim();
  do { ctx.font = `700 ${titleSize}px Cinzel, Georgia, serif`; if (ctx.measureText(title).width <= nameWidth || titleSize <= 24) break; titleSize -= 2; } while (true);
  ctx.fillStyle = '#fff1d9'; ctx.textBaseline = 'middle';
  if (ctx.measureText(title).width <= nameWidth) ctx.fillText(title, 73, 77);
  else {
    const limit = Math.max(7, Math.floor(title.length * nameWidth / ctx.measureText(title).width) - 1);
    ctx.fillText(title.slice(0, limit) + '…', 73, 77);
  }
  const chipStart = 825 - (columns * chip + Math.max(0, columns - 1) * chipGap);
  for (const [index, token] of tokens.entries()) {
    const row = Math.floor(index / columns), column = index % columns;
    const cy = rows === 1 ? 77 : rows === 2 ? 57 + row * 38 : 52 + row * 24;
    drawEnergySymbol(ctx, icons, token, chipStart + column * (chip + chipGap), cy, chip);
  }
  round(ctx, 72, descriptionTop, 756, 1227 - descriptionTop, 10, darkText, accent, 3);
  ctx.save(); illustrationPath(ctx, artTop, descriptionTop);
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  if (essence && runeTokens(card).length) {
    const produced = runeTokens(card);
    const columns = Math.min(6, produced.length), rows = Math.ceil(produced.length / columns);
    const symbolSize = produced.length === 1 ? (card.rules ? 176 : 204) : rows === 1 ? Math.min(162, Math.floor(650 / columns)) : rows === 2 ? 78 : rows === 3 ? 50 : 24;
    const gap = 8, rowWidth = columns * symbolSize + (columns - 1) * gap;
    const gridHeight = rows * symbolSize + (rows - 1) * gap;
    const startX = 450 - rowWidth / 2, startY = card.rules ? 835 : 985 - gridHeight / 2;
    for (const [index, token] of produced.entries()) {
      const row = Math.floor(index / columns), column = index % columns;
      drawEnergySymbol(ctx, icons, token, startX + column * (symbolSize + gap), startY + row * (symbolSize + gap) + symbolSize / 2, symbolSize, true);
    }
  }
  if (card.rules || !essence || !runeTokens(card).length) {
    const rulesY = essence && runeTokens(card).length ? 1050 : descriptionTop + 57;
    drawRichRules(ctx, card, 110, rulesY, 680, 1137);
  }
  // A classificação forma uma barra opaca entre o ataque e a vida.
  round(ctx, 145, 1155, 610, 72, 10, darkTitle, accent, 3);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const subtypeSize = number(card.fontSubtype, 14, 38, 21);
  ctx.font = `700 ${card.subtype && subtypeSize > 30 ? 21 : 25}px Cinzel,Georgia,serif`; ctx.fillStyle = '#f7e4bb';
  const kindY = card.subtype ? (subtypeSize > 34 ? 1177 : subtypeSize > 26 ? 1180 : 1182) : 1191;
  ctx.fillText(kindNames[card.kind] || 'Carta', 450, kindY, 565);
  if (card.subtype) {
    ctx.font = `600 ${subtypeSize}px "Source Sans 3",sans-serif`; ctx.fillStyle = '#e3d1b2';
    ctx.fillText(card.subtype.toUpperCase(), 450, 1210, 565);
  }
  if (card.kind === 'creature') {
    const statNumberY = 1196;
    if (attackIcon) ctx.drawImage(attackIcon, 4, 1126.5, 125, 125);
    // Coração opaco e plano, sem o brilho/volume do emoji do sistema.
    ctx.save(); ctx.translate(850, statNumberY);
    ctx.beginPath(); ctx.moveTo(0, 40);
    ctx.bezierCurveTo(-13, 27, -48, 4, -48, -17);
    ctx.bezierCurveTo(-48, -46, -14, -52, 0, -28);
    ctx.bezierCurveTo(14, -52, 48, -46, 48, -17);
    ctx.bezierCurveTo(48, 4, 13, 27, 0, 40);
    ctx.closePath(); ctx.fillStyle = '#48b96b'; ctx.fill();
    ctx.strokeStyle = '#1b6138'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fffbed'; ctx.strokeStyle = '#152018'; ctx.lineWidth = 6; ctx.font = '900 43px "Source Sans 3",sans-serif';
    for (const [value,x] of [[card.power,66.5],[card.health,850]]) { ctx.strokeText(String(number(value,0,30)), x, statNumberY); ctx.fillText(String(number(value,0,30)), x, statNumberY); }
  }
  ctx.textAlign = 'left';
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
  draft.themeEnergy = $('card-theme').value;
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
  $('energy-fields').hidden = patron;
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
  $('card-theme').value = draft.themeEnergy || 'auto';
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
  $('energy-fields').hidden = draft.kind === 'patron';
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
    const req = indexedDB.open('runamarca-card-editor',1);
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
  $('project-count').textContent = `${project.length} modelo(s) · ${quantity} carta(s) no deck`;
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
async function playableCard(design) {
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=840;
  await drawCard(canvas,design);
  const image=canvas.toDataURL('image/webp',.8);
  if(image.length>2_000_000)throw new Error(`${design.name} ficou acima de 2 MB na exportação.`);
  const energies=Object.fromEntries(energyIds.map(id=>[id,number(design[id],0,12)]));
  const colored=Object.values(energies).reduce((a,b)=>a+b,0);
  const card={name:design.name,kind:design.kind,subtype:design.subtype,rules:design.kind==='patron'?'':richRuns(design.rules).map(run=>run.text).join(''),cost:design.kind==='rune'?{generic:0,colored:0,energies:{ruptura:0,forja:0,fluxo:0}}:{generic:design.generic,colored,energies},power:design.kind==='creature'?design.power:0,health:design.kind==='creature'?design.health:0,agile:design.kind==='creature' && Boolean(design.agile),quickAttack:design.kind==='creature' && Boolean(design.quickAttack),image};
  if (design.kind==='rune') card.runeEnergy = {generic:number(design.generic,0,20),...energies};
  if (design.kind==='patron') {
    card.cost = {generic:0,colored:0,energies:{ruptura:0,forja:0,fluxo:0}};
    card.patronStyle = { frame: design.patronFrame, ornament: design.patronOrnament, accent: design.patronAccent, font: design.patronFont, opacity: design.patronOpacity, flourish: design.patronFlourish };
    card.patronAbilities = design.patronAbilities;
  }
  if (design.kind !== 'patron' && design.drawTrigger) card.drawEffect = { trigger: design.drawTrigger, count: number(design.drawCount,1,7,1), ...(design.drawTrigger==='turnStart' && design.drawPowerFour ? { condition: 'powerAtLeast4' } : {}) };
  if (design.kind !== 'patron' && design.tokenTrigger) card.tokenEffect = { trigger: design.tokenTrigger, count: number(design.tokenAmount,1,12,1), name: String(design.tokenName || 'Criatura').slice(0,40), power: number(design.tokenPower,0,30,1), health: number(design.tokenHealth,0,30,1) };
  if (design.kind==='creature' && design.energyResource) card.energyEffect = { trigger:'tap', amount:number(design.energyAmount,1,5,1),resource:design.energyResource,...(design.energyBoost==='powerAtLeast4' ? {condition:'powerAtLeast4',boostedAmount:number(design.energyBoosted,1,5,2)} : {}) };
  if (design.kind !== 'patron' && number(design.agileDiscount,0,5)) card.costDiscount = { condition:'agileCreature',amount:number(design.agileDiscount,0,5) };
  if (design.kind === 'creature' && design.costAuraTarget && number(design.costAuraAmount,-5,5)) card.costAura = { target: design.costAuraTarget, amount: number(design.costAuraAmount,-5,5) };
  if (design.kind === 'spell' && ['aura','artifact'].includes(design.attachmentType)) card.attachment = { type: design.attachmentType, powerDelta: number(design.attachmentPower,-20,20), healthDelta: number(design.attachmentHealth,-20,20), tapOnEnter: Boolean(design.attachmentTap), lockUntap: Boolean(design.attachmentLock), trample: Boolean(design.attachmentTrample) };
  return card;
}
async function exportSingleCard() {
  readForm(); if (reportInvalid(validateDesign(draft))) return;
  try {
    await document.fonts.ready;
    const design=structuredClone(draft);
    const card=await playableCard(design);
    const bundle={format:'runamarca-card',version:1,design,cards:[card]};
    download(new Blob([JSON.stringify(bundle)],{type:'application/json'}),filename(`${design.name}-completa`,'json'));
    status(`Carta completa de ${design.name} baixada com arte, dados editáveis e efeitos configurados.`);
  } catch(error) { status(error.message,true); }
}
async function exportDeck() {
  if(!project.length)return status('Guarde ao menos uma carta no projeto.',true);
  const count=project.reduce((sum,c)=>sum+number(c.quantity,1,60,1),0);
  if(count>120)return status('O deck aceita até 120 cartas. Reduza as quantidades.',true);
  const cards=[];let estimated=0;
  try{
    await document.fonts.ready;
    for(const design of project){
      const invalid = validateDesign(design);
      if (invalid) throw new Error(`${design.name || 'Carta sem nome'}: ${invalid[0]}`);
      const card=await playableCard(design);
      for(let i=0;i<design.quantity;i++){cards.push(card);estimated+=card.image.length+500;}
      if(estimated>23_000_000)throw new Error('O deck passou de 23 MB. Reduza a quantidade de cartas ou o tamanho das imagens.');
    }
    download(new Blob([JSON.stringify({format:'runamarca-deck',version:1,cards})],{type:'application/json'}),'runamarca-deck.json');
    status(`Deck com ${cards.length} cartas exportado. Importe o JSON na mesa.`);
  }catch(error){status(error.message,true);}
}
function exportProject(){if(!project.length)return status('Guarde ao menos uma carta.',true);download(new Blob([JSON.stringify({format:'runamarca-editor',version:1,cards:project})],{type:'application/json'}),'runamarca-projeto-editavel.json');status('Projeto editável baixado.');}
async function importProject(file){
  try{const data=JSON.parse(await file.text());
    const designs=data.format==='runamarca-card' && data.design ? [data.design] : data.format==='runamarca-editor' ? data.cards : null;
    if(!Array.isArray(designs))throw new Error('Use um projeto editável ou uma carta completa do RunaMarca.');
    if(project.length+designs.length>120)throw new Error('O projeto aceita até 120 modelos.');
    const items=designs.map(raw=>({...blank(),...raw,id:crypto.randomUUID()}));
    for(const item of items)if(!/^data:image\/(jpeg|png|webp);base64,/i.test(item.art||''))throw new Error(`Ilustração inválida em ${item.name||'uma carta'}.`);
    if(db)await transact('readwrite',store=>{for(const item of items)store.put(item);});
    project.push(...items);projectList();status(`${items.length} modelo(s) importado(s) ao projeto.`);
  }catch(error){status(error.message,true);}
}

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
