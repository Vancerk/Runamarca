const $ = id => document.getElementById(id);
const energyIds = ['ruptura', 'forja', 'fluxo'];
const energyNames = { ruptura: 'Ruptura', forja: 'Forja', fluxo: 'Fluxo' };
const energyColors = { ruptura: '#bd5847', forja: '#d0a44e', fluxo: '#568fc2' };
// Os símbolos no atlas têm tamanhos e centros ligeiramente diferentes.
// Cada recorte é normalizado para o mesmo diâmetro no custo da carta.
const energyCrops = {
  ruptura: { x: 19, y: 47, size: 82 },
  fluxo: { x: 19, y: 197, size: 82 },
  forja: { x: 20, y: 496, size: 74 }
};
const kindNames = { creature: 'Criatura', spell: 'Magia', rune: 'Terreno · Runa', patron: 'Patrono' };
const fields = { name: 'card-name', kind: 'card-kind', subtype: 'card-subtype', rules: 'card-rules', quantity: 'card-quantity', power: 'card-power', health: 'card-health', generic: 'cost-generic', ruptura: 'cost-ruptura', forja: 'cost-forja', fluxo: 'cost-fluxo', artZoom: 'art-zoom', artX: 'art-x', artY: 'art-y' };
const blank = () => ({ id: crypto.randomUUID(), name: '', kind: 'creature', subtype: '', rules: '', quantity: 1, power: 1, health: 1, generic: 0, ruptura: 0, forja: 0, fluxo: 0, art: '', artZoom: 100, artX: 50, artY: 50, agile: false, drawTrigger: '', drawCount: 1, drawPowerFour: false, energyResource: '', energyAmount: 1, energyBoost: '', energyBoosted: 2, agileDiscount: 0, patronFrame: '#65439d', patronOrnament: '#c9b1e8', patronAccent: '#e9d3fa', patronFont: 'display', patronOpacity: 72, patronFlourish: 'elaborate', patronAbilities: [{ cost: 2, title: '', effect: '' }, { cost: 3, title: '', effect: '' }, { cost: 5, title: '', effect: '' }] });
let draft = blank();
let project = [];
let db = null;
let renderSerial = 0;
const imageCache = new Map();

function number(value, min, max, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : fallback;
}
function status(message, error = false) { $('editor-status').textContent = message; $('editor-status').classList.toggle('error', error); }
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
function cardTokens(card) {
  const tokens = [];
  if (number(card.generic, 0, 20)) tokens.push({ id: 'generic', count: card.generic });
  for (const id of energyIds) {
    const count = number(card[id], 0, 12);
    if (count <= 3) for (let i = 0; i < count; i++) tokens.push({ id });
    else if (count) tokens.push({ id, count });
  }
  return tokens;
}
function runeTokens(card) {
  return ['generic', ...energyIds]
    .map(id => ({ id, count: number(card[id], 0, id === 'generic' ? 20 : 12) }))
    .filter(token => token.count > 0);
}
function drawEnergySymbol(ctx, atlas, token, x, cy, size, showCount = false) {
  if (token.id === 'generic') {
    ctx.beginPath(); ctx.arc(x + size / 2, cy, size / 2 - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#e7ddc7'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a58a60'; ctx.stroke();
    ctx.fillStyle = '#241b17'; ctx.font = `700 ${size * .58}px Cinzel, Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(showCount ? String(token.count) : String(token.count), x + size / 2, cy + 1);
    ctx.textAlign = 'left';
    return;
  }
  if (atlas) {
    const crop = energyCrops[token.id];
    ctx.save(); ctx.beginPath(); ctx.arc(x + size / 2, cy, size / 2 - 1, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(atlas, crop.x, crop.y, crop.size, crop.size, x, cy - size / 2, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = energyColors[token.id]; ctx.beginPath();
    ctx.arc(x + size / 2, cy, size / 2 - 1, 0, Math.PI * 2); ctx.fill();
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
  ctx.fillStyle = '#100e17'; ctx.fillRect(0, 0, 900, 1260);
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
  let titleSize = card.patronFont === 'script' ? 70 : 44;
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
  const [art, atlas] = await Promise.all([img(card.art), img('/energies.png')]);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.setTransform(canvas.width / 900, 0, 0, canvas.height / 1260, 0, 0);
  ctx.clearRect(0, 0, 900, 1260);
  if (card.kind === 'patron') { drawPatronCard(ctx, card, art); return; }
  const dominant = energyIds.reduce((best, id) => number(card[id], 0, 12) > number(card[best], 0, 12) ? id : best, 'forja');
  const accent = energyColors[dominant];
  ctx.fillStyle = '#1c1510'; ctx.fillRect(0, 0, 900, 1260);
  round(ctx, 17, 17, 866, 1226, 27, '#34261a', '#b99560', 6);
  // A arte ocupa toda a área interna, inclusive atrás do título e das regras.
  ctx.save(); ctx.beginPath(); ctx.roundRect(38, 38, 824, 1184, 17); ctx.clip();
  if (art) {
    const zoom = number(card.artZoom, 100, 230, 100) / 100;
    const scale = Math.max(824 / art.width, 1184 / art.height) * zoom;
    const w = art.width * scale, h = art.height * scale;
    const x = 38 + (824 - w) * number(card.artX, 0, 100, 50) / 100;
    const y = 38 + (1184 - h) * number(card.artY, 0, 100, 50) / 100;
    ctx.drawImage(art, x, y, w, h);
  } else {
    const placeholder = ctx.createRadialGradient(450, 490, 10, 450, 490, 750);
    placeholder.addColorStop(0, '#65523b'); placeholder.addColorStop(1, '#111b1a');
    ctx.fillStyle = placeholder; ctx.fillRect(38, 38, 824, 1184);
    ctx.fillStyle = '#c6a777'; ctx.font = '130px Georgia,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('◈', 450, 510);
    ctx.font = '25px "Source Sans 3",sans-serif'; ctx.fillText('INSIRA UMA ILUSTRAÇÃO', 450, 610); ctx.textAlign = 'left';
  }
  const vignette = ctx.createLinearGradient(0, 38, 0, 1222);
  vignette.addColorStop(0, '#09090777'); vignette.addColorStop(.26, '#09090700');
  vignette.addColorStop(.65, '#09090700'); vignette.addColorStop(1, '#090907aa');
  ctx.fillStyle = vignette; ctx.fillRect(38, 38, 824, 1184);
  ctx.restore();
  const head = ctx.createLinearGradient(0, 53, 0, 145);
  head.addColorStop(0, '#17110de8'); head.addColorStop(1, '#17110dc7');
  round(ctx, 53, 53, 794, 96, 12, head);
  ctx.fillStyle = accent; ctx.fillRect(53, 147, 794, 3);
  const tokens = card.kind === 'rune' ? [] : cardTokens(card);
  const chip = Math.max(30, Math.min(52, 345 / Math.max(1, tokens.length)));
  const chipGap = Math.max(2, chip * .08);
  const costWidth = tokens.length ? tokens.length * chip + (tokens.length - 1) * chipGap + 18 : 0;
  const nameWidth = 758 - costWidth;
  let titleSize = 43;
  const title = (card.name || 'Nova carta').trim();
  do { ctx.font = `700 ${titleSize}px Cinzel, Georgia, serif`; if (ctx.measureText(title).width <= nameWidth || titleSize <= 24) break; titleSize -= 2; } while (true);
  ctx.fillStyle = '#f6e9cb'; ctx.textBaseline = 'middle';
  if (ctx.measureText(title).width <= nameWidth) ctx.fillText(title, 73, 101);
  else {
    const limit = Math.max(7, Math.floor(title.length * nameWidth / ctx.measureText(title).width) - 1);
    ctx.fillText(title.slice(0, limit) + '…', 73, 101);
  }
  let chipX = 825 - (tokens.length * chip + Math.max(0, tokens.length - 1) * chipGap);
  for (const token of tokens) {
    drawEnergySymbol(ctx, atlas, token, chipX, 101, chip, Boolean(token.count && token.id !== 'generic'));
    chipX += chip + chipGap;
  }
  // O texto flutua sobre a imagem, sem uma segunda moldura interna.
  round(ctx, 54, 828, 792, 333, 14, '#15110de3');
  ctx.fillStyle = accent; ctx.fillRect(75, 845, 5, 49);
  ctx.font = '700 26px Cinzel,Georgia,serif'; ctx.fillStyle = '#f7e4bb';
  ctx.fillText(kindNames[card.kind] || 'Carta', 96, 866);
  ctx.font = '600 21px "Source Sans 3",sans-serif'; ctx.fillStyle = '#c8b79c';
  if (card.subtype) ctx.fillText(card.subtype.toUpperCase(), 96, 898);
  if (card.kind === 'rune' && runeTokens(card).length) {
    const produced = runeTokens(card);
    const symbolSize = card.rules ? 100 : 130;
    const gap = 30;
    const rowWidth = produced.length * symbolSize + (produced.length - 1) * gap;
    let symbolX = 450 - rowWidth / 2;
    const symbolY = card.rules ? 977 : 1009;
    for (const token of produced) {
      drawEnergySymbol(ctx, atlas, token, symbolX, symbolY, symbolSize, true);
      symbolX += symbolSize + gap;
    }
  }
  const formatted = fitLines(ctx, card.rules || (card.kind === 'rune' && runeTokens(card).length ? '' : 'Escreva aqui o efeito da carta.'), 716, card.kind === 'rune' ? 3 : 7, card.kind === 'rune' ? 26 : 34, 21);
  ctx.font = `600 ${formatted.size}px "Source Sans 3",sans-serif`; ctx.fillStyle = '#f4e9d3'; ctx.textBaseline = 'alphabetic';
  const lineHeight = formatted.size * 1.22;
  formatted.lines.forEach((line,i) => ctx.fillText(line, 96, (card.kind === 'rune' && runeTokens(card).length ? 1081 : 946) + i * lineHeight));
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e1c58e'; ctx.font = '700 21px Cinzel,Georgia,serif'; ctx.fillText('◈  RUNAMARCA', 75, 1191);
  if (card.kind === 'creature') {
    round(ctx, 699, 1168, 124, 45, 8, '#15110de8');
    ctx.fillStyle = '#fff0cd'; ctx.font = '700 32px Cinzel,Georgia,serif'; ctx.textAlign = 'center'; ctx.fillText(`${number(card.power,0,30)}/${number(card.health,0,30)}`, 761, 1191); ctx.textAlign = 'left';
  }
}

function readForm() {
  for (const [key, id] of Object.entries(fields)) draft[key] = $(id).value;
  for (const key of ['quantity','power','health','generic','ruptura','forja','fluxo','artZoom','artX','artY']) draft[key] = number(draft[key], key === 'quantity' ? 1 : key === 'artZoom' ? 100 : 0, key === 'quantity' ? 60 : key === 'artZoom' ? 230 : key === 'power' || key === 'health' ? 30 : key.startsWith('art') ? 100 : key === 'generic' ? 20 : 12);
  draft.name = draft.name.trim().slice(0, 60);
  draft.subtype = draft.subtype.trim().slice(0, 45);
  draft.rules = draft.rules.slice(0, 850);
  draft.agile = $('card-agile').checked;
  draft.drawTrigger = $('draw-trigger').value;
  draft.drawCount = number($('draw-count').value, 1, 7, 1);
  draft.drawPowerFour = $('draw-power-four').checked && draft.drawTrigger === 'turnStart';
  draft.energyResource = $('energy-resource').value;
  draft.energyAmount = number($('energy-amount').value, 1, 5, 1);
  draft.energyBoost = $('energy-boost').value;
  draft.energyBoosted = number($('energy-boosted').value, 1, 5, 2);
  draft.agileDiscount = number($('agile-discount').value, 0, 5);
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
  $('patron-controls').hidden = !patron;
  $('auto-abilities').hidden = patron;
  $('energy-legend').textContent = rune ? 'Energia gerada pela Runa' : 'Custos de energia';
  $('energy-hint').textContent = rune
    ? 'Informe quanto a Runa produz ao girar. Os símbolos aparecem em destaque na área de texto.'
    : 'Cada símbolo é aplicado diretamente na faixa da carta.';
  syncAbilityUI();
  return draft;
}
function syncAbilityUI() {
  const creature = $('card-kind').value === 'creature';
  $('card-agile').disabled = !creature;
  $('energy-resource').disabled = !creature;
  $('energy-amount').disabled = !creature || !$('energy-resource').value;
  $('energy-boost').disabled = !creature || !$('energy-resource').value;
  $('energy-boosted').disabled = !creature || !$('energy-resource').value || !$('energy-boost').value;
  $('draw-count').disabled = !$('draw-trigger').value;
  $('draw-power-four').disabled = $('draw-trigger').value !== 'turnStart';
}
function populate(card) {
  draft = structuredClone(card);
  for (const [key,id] of Object.entries(fields)) $(id).value = draft[key] ?? blank()[key];
  $('card-agile').checked = Boolean(draft.agile);
  $('draw-trigger').value = draft.drawTrigger || '';
  $('draw-count').value = draft.drawCount ?? 1;
  $('draw-power-four').checked = Boolean(draft.drawPowerFour);
  $('energy-resource').value = draft.energyResource || '';
  $('energy-amount').value = draft.energyAmount ?? 1;
  $('energy-boost').value = draft.energyBoost || '';
  $('energy-boosted').value = draft.energyBoosted ?? 2;
  $('agile-discount').value = draft.agileDiscount ?? 0;
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
  $('patron-controls').hidden = draft.kind !== 'patron';
  $('auto-abilities').hidden = draft.kind === 'patron';
  $('energy-legend').textContent = draft.kind === 'rune' ? 'Energia gerada pela Runa' : 'Custos de energia';
  $('energy-hint').textContent = draft.kind === 'rune'
    ? 'Informe quanto a Runa produz ao girar. Os símbolos aparecem em destaque na área de texto.'
    : 'Cada símbolo é aplicado diretamente na faixa da carta.';
  syncAbilityUI();
  renderPreview();
}
function renderPreview() {
  const serial = ++renderSerial;
  const card = structuredClone(readForm());
  drawCard($('card-canvas'), card).catch(error => { if (serial === renderSerial) status(error.message, true); });
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
  if (!draft.name) return status('Informe o nome da carta.',true);
  if (!draft.art) return status('Escolha uma ilustração para guardar a carta.',true);
  if (draft.kind === 'patron' && !draft.patronAbilities.some(ability => ability.title && ability.effect)) return status('Preencha ao menos uma habilidade do Patrono.', true);
  if (draft.kind !== 'patron' && !draft.rules.trim() && !(draft.kind === 'rune' && runeTokens(draft).length)) return status('Escreva o texto da carta ou informe a energia gerada pela Runa.',true);
  const copy=structuredClone(draft);const index=project.findIndex(c=>c.id===copy.id);
  if (index>=0) project[index]=copy; else project.push(copy);
  try { if(db) await transact('readwrite',store=>store.put(copy)); status(`${copy.name} guardada neste navegador.`); }
  catch(error){status(`Carta na lista, mas não persistida: ${error.message}`,true);}
  projectList();
}
async function pngCard() {
  readForm(); if(!draft.name) return status('Informe o nome antes de baixar.',true);
  if(!draft.art) return status('Insira a ilustração antes de baixar.',true);
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1260;
  try {await document.fonts.ready;await drawCard(canvas,draft);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Falha ao gerar PNG.');download(blob,filename(draft.name,'png'));status(`PNG de ${draft.name} baixado.`);}catch(error){status(error.message,true);}
}
async function exportDeck() {
  if(!project.length)return status('Guarde ao menos uma carta no projeto.',true);
  const count=project.reduce((sum,c)=>sum+number(c.quantity,1,60,1),0);
  if(count>120)return status('O deck aceita até 120 cartas. Reduza as quantidades.',true);
  const cards=[];let estimated=0;
  try{
    await document.fonts.ready;
    for(const design of project){
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=840;await drawCard(canvas,design);
      const image=canvas.toDataURL('image/jpeg',.8);
      if(image.length>2_000_000)throw new Error(`${design.name} ficou acima de 2 MB na exportação.`);
      const energies=Object.fromEntries(energyIds.map(id=>[id,number(design[id],0,12)]));
      const colored=Object.values(energies).reduce((a,b)=>a+b,0);
      const card={name:design.name,kind:design.kind,subtype:design.subtype,rules:design.kind==='patron'?'':design.rules,cost:design.kind==='rune'?{generic:0,colored:0,energies:{ruptura:0,forja:0,fluxo:0}}:{generic:design.generic,colored,energies},power:design.kind==='creature'?design.power:0,health:design.kind==='creature'?design.health:0,agile:design.kind==='creature' && Boolean(design.agile),image};
      if (design.kind==='rune') card.runeEnergy = {generic:number(design.generic,0,20),...energies};
      if (design.kind==='patron') {
        card.cost = {generic:0,colored:0,energies:{ruptura:0,forja:0,fluxo:0}};
        card.patronStyle = { frame: design.patronFrame, ornament: design.patronOrnament, accent: design.patronAccent, font: design.patronFont, opacity: design.patronOpacity, flourish: design.patronFlourish };
        card.patronAbilities = design.patronAbilities;
      }
      if (design.kind !== 'patron' && design.drawTrigger) card.drawEffect = { trigger: design.drawTrigger, count: number(design.drawCount,1,7,1), ...(design.drawTrigger==='turnStart' && design.drawPowerFour ? { condition: 'powerAtLeast4' } : {}) };
      if (design.kind==='creature' && design.energyResource) card.energyEffect = { trigger:'tap', amount:number(design.energyAmount,1,5,1),resource:design.energyResource,...(design.energyBoost==='powerAtLeast4' ? {condition:'powerAtLeast4',boostedAmount:number(design.energyBoosted,1,5,2)} : {}) };
      if (design.kind !== 'patron' && number(design.agileDiscount,0,5)) card.costDiscount = { condition:'agileCreature',amount:number(design.agileDiscount,0,5) };
      for(let i=0;i<design.quantity;i++){cards.push(card);estimated+=image.length+500;}
      if(estimated>23_000_000)throw new Error('O deck passou de 23 MB. Reduza a quantidade de cartas ou o tamanho das imagens.');
    }
    download(new Blob([JSON.stringify({format:'runamarca-deck',version:1,cards})],{type:'application/json'}),'runamarca-deck.json');
    status(`Deck com ${cards.length} cartas exportado. Importe o JSON na mesa.`);
  }catch(error){status(error.message,true);}
}
function exportProject(){if(!project.length)return status('Guarde ao menos uma carta.',true);download(new Blob([JSON.stringify({format:'runamarca-editor',version:1,cards:project})],{type:'application/json'}),'runamarca-projeto-editavel.json');status('Projeto editável baixado.');}
async function importProject(file){
  try{const data=JSON.parse(await file.text());if(data.format!=='runamarca-editor'||!Array.isArray(data.cards))throw new Error('Arquivo de projeto inválido.');
    if(project.length+data.cards.length>120)throw new Error('O projeto aceita até 120 modelos.');
    const items=data.cards.map(raw=>({...blank(),...raw,id:crypto.randomUUID()}));
    for(const item of items)if(!/^data:image\/(jpeg|png|webp);base64,/i.test(item.art||''))throw new Error(`Ilustração inválida em ${item.name||'uma carta'}.`);
    if(db)await transact('readwrite',store=>{for(const item of items)store.put(item);});
    project.push(...items);projectList();status(`${items.length} modelo(s) importado(s) ao projeto.`);
  }catch(error){status(error.message,true);}
}

$('card-form').addEventListener('submit',saveCard);
$('card-form').addEventListener('input',renderPreview);
$('card-kind').addEventListener('change',renderPreview);
$('draw-trigger').addEventListener('change',syncAbilityUI);
$('energy-resource').addEventListener('change',syncAbilityUI);
$('energy-boost').addEventListener('change',syncAbilityUI);
$('card-art').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{draft.art=await shrinkArt(file);renderPreview();status(`Ilustração “${file.name}” carregada.`);}catch(error){status(error.message,true);}});
$('new-card').addEventListener('click',()=>{populate(blank());projectList();status('Nova carta iniciada.');});
$('download-png').addEventListener('click',pngCard);
$('download-deck').addEventListener('click',exportDeck);
$('download-project').addEventListener('click',exportProject);
$('import-project').addEventListener('change',async event=>{if(event.target.files[0])await importProject(event.target.files[0]);event.target.value='';});
document.fonts.ready.then(renderPreview);
syncAbilityUI();
(async()=>{try{db=await openDatabase();project=await allCards();projectList();status('Projeto carregado. Suas cartas guardadas ficam neste navegador.');}catch(error){projectList();status('Armazenamento local indisponível; exporte o projeto antes de sair.',true);}})();
