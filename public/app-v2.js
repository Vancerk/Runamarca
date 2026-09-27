const $ = id => document.getElementById(id);
let session = null;
let state = null;
let selection = null;
let streamController = null;
let toastTimer = null;
let playFaceDown = false;
let hoverTimer = null;
let hoverSource = null;
let energyCatalog = null;
let deckCatalog = [];
let selectedDeck = null;
let lastGatePhase = null;
let coinAnimationDone = false;
let handOrder = [];
let handDrag = null;
let suppressHandClickUntil = 0;
let invitationCode = null;
const railPreferenceKey = 'runamarca-rail-layout';

function setRailCollapsed(side, collapsed) {
  const target = $('game');
  const button = $(`toggle-${side}-rail`);
  target.classList.toggle(`${side}-collapsed`, collapsed);
  button.setAttribute('aria-expanded', String(!collapsed));
  button.setAttribute('aria-label', `${collapsed ? 'Expandir' : 'Recolher'} painel ${side === 'left' ? 'esquerdo' : 'direito'}`);
  button.title = button.getAttribute('aria-label');
  button.querySelector('.rail-toggle-icon').textContent = side === 'left' ? (collapsed ? '▸' : '◂') : (collapsed ? '◂' : '▸');
  try { localStorage.setItem(railPreferenceKey, JSON.stringify({ left: target.classList.contains('left-collapsed'), right: target.classList.contains('right-collapsed') })); } catch {}
}

function drawFlight(source, destination, index, opponent = false) {
  const from = source.getBoundingClientRect();
  const to = destination.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const layer = $('draw-animation-layer');
  const card = document.createElement('div');
  card.className = 'draw-flying-card';
  card.style.left = `${from.left + from.width / 2 - 28}px`;
  card.style.top = `${from.top + from.height / 2 - 39}px`;
  layer.append(card);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = card.animate([
    { transform: 'translate(0,0) scale(.66) rotate(-14deg)', opacity: 0 },
    { transform: `translate(${dx * .5}px,${dy * .35 - 48}px) scale(1.08) rotate(9deg)`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px,${dy}px) scale(${opponent ? .5 : .8}) rotate(0deg)`, opacity: 0 }
  ], { duration: 1250, delay: index * 170, easing: 'cubic-bezier(.22,.7,.25,1)', fill: 'forwards' });
  animation.onfinish = () => {
    card.remove();
    const burst = document.createElement('div');
    burst.className = 'draw-burst';
    burst.style.left = `${to.left + to.width / 2 - 6}px`;
    burst.style.top = `${to.top + to.height / 2 - 6}px`;
    layer.append(burst);
    burst.animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 360, easing: 'ease-out' }).onfinish = () => burst.remove();
  };
}

function animateDrawChanges(previous, next) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || next.phase !== 'active') return;
  for (const player of next.players) {
    const before = previous?.players.find(item => item.id === player.id)?.handCount || 0;
    const gained = Math.min(7, player.handCount - before);
    if (gained <= 0) continue;
    const opponent = player.id !== next.you;
    const source = opponent ? $('opponent-deck') : document.querySelector('.deck-visual');
    const destination = opponent ? $('opponent-hand') : $('hand-cards');
    const visibleSource = source.getBoundingClientRect().width ? source : $('room-label');
    for (let index = 0; index < gained; index++) drawFlight(visibleSource, destination, index, opponent);
  }
}

function selectedEnergy() {
  const id = energyCatalog?.legacyColorEnergy?.[me()?.deckColor];
  return energyCatalog?.energies?.find(energy => energy.id === id);
}

function costParts(card, energyName = 'energia específica') {
  const generic = card.cost?.generic || 0;
  const colored = card.cost?.colored || 0;
  const parts = [];
  if (generic) parts.push(`${generic} neutra${generic === 1 ? '' : 's'}`);
  if (card.cost?.energies) {
    for (const [id, name] of [['ruptura','Ruptura'],['forja','Forja'],['fluxo','Fluxo']]) {
      const amount = card.cost.energies[id] || 0;
      if (amount) parts.push(`${amount} de ${name}`);
    }
  } else if (colored) parts.push(`${colored} de ${energyName}`);
  return parts.join(' + ') || '0';
}
function runeAmount(card) {
  return card.runeEnergy
    ? Object.values(card.runeEnergy).reduce((sum, amount) => sum + (Number(amount) || 0), 0)
    : 1;
}
function runeParts(card) {
  if (!card.runeEnergy) return '1 energia';
  const parts = [];
  for (const [id, name] of [['generic','neutra'],['ruptura','Ruptura'],['forja','Forja'],['fluxo','Fluxo']]) {
    const amount = Number(card.runeEnergy[id]) || 0;
    if (amount) parts.push(`${amount} ${id === 'generic' ? `energia${amount === 1 ? '' : 's'} neutra${amount === 1 ? '' : 's'}` : `de ${name}`}`);
  }
  return parts.join(' + ') || '0 energias';
}

function presetCostOverlay(card, large = false) {
  const slug = card.image?.match(/^\/decks\/(igni|ventus|glacies)\/image\d+\.png$/)?.[1];
  const energyId = energyCatalog?.deckEnergy?.[slug];
  if (!energyId || !(card.cost?.colored || card.cost?.generic)) return null;
  const overlay = document.createElement('span');
  const purpleFrame = slug === 'glacies' && /\/image(?:5|7)\.png$/.test(card.image);
  overlay.className = `card-cost-overlay cost-${purpleFrame ? 'purple' : slug}${large ? ' large-cost-overlay' : ''}`;
  const generic = card.cost.generic || 0;
  const colored = card.cost.colored || 0;
  overlay.style.setProperty('--cost-pips', (generic ? 1 : 0) + colored);
  if (generic) {
    const amount = document.createElement('span');
    amount.className = 'cost-neutral-symbol';
    amount.textContent = String(generic);
    overlay.append(amount);
  }
  for (let i = 0; i < colored; i++) {
    const symbol = document.createElement('i');
    symbol.className = `cost-energy-symbol energy-${energyId}`;
    overlay.append(symbol);
  }
  const energy = energyCatalog.energies.find(item => item.id === energyId);
  overlay.setAttribute('aria-label', `Custo: ${costParts(card, energy?.name)}`);
  return overlay;
}

function hideCardHover() {
  clearTimeout(hoverTimer);
  hoverSource = null;
  $('card-hover-preview').classList.add('hidden');
  $('card-effect-tooltip').classList.add('hidden');
}

function fillLargeCard(target, card, back) {
  target.replaceChildren();
  const imageSource = back ? '/card-back.png' : card.image;
  if (imageSource) {
    const image = document.createElement('img');
    image.src = imageSource;
    image.alt = back ? 'Verso da carta RunaMarca' : card.name;
    const overlay = !back ? presetCostOverlay(card, true) : null;
    if (overlay) {
      const frame = document.createElement('div');
      frame.className = 'large-full-card';
      frame.append(image, overlay);
      target.append(frame);
    } else target.append(image);
  } else {
    const glyph = document.createElement('div');
    glyph.className = 'large-card-fallback';
    glyph.textContent = '◈';
    target.append(glyph);
  }
  if (back || !imageSource) {
    const label = document.createElement('div');
    label.className = 'large-card-label';
    label.textContent = back ? 'Carta virada para baixo' : card.name;
    target.append(label);
  }
}

function showCardHover(card, back, source) {
  if (!source.isConnected || $('card-detail').open) return;
  const preview = $('card-hover-preview');
  fillLargeCard(preview, card, back);
  preview.classList.remove('hidden');
  const sourceRect = source.getBoundingClientRect();
  const previewRect = preview.getBoundingClientRect();
  const spaceRight = window.innerWidth - sourceRect.right;
  const left = spaceRight >= previewRect.width + 20
    ? sourceRect.right + 14
    : sourceRect.left - previewRect.width - 14;
  preview.style.left = `${Math.max(12, Math.min(window.innerWidth - previewRect.width - 12, left))}px`;
  preview.style.top = `${Math.max(12, Math.min(window.innerHeight - previewRect.height - 12, sourceRect.top + sourceRect.height / 2 - previewRect.height / 2))}px`;
  const explanation = effectExplanation(card, back);
  const tooltip = $('card-effect-tooltip');
  tooltip.textContent = explanation;
  tooltip.classList.toggle('hidden', !explanation);
  if (explanation) {
    const right = Math.min(window.innerWidth - 12, parseFloat(preview.style.left) + previewRect.width + 10);
    tooltip.style.left = `${right + 220 > window.innerWidth ? Math.max(12, parseFloat(preview.style.left) - 230) : right}px`;
    tooltip.style.top = preview.style.top;
  }
}

function effectExplanation(card, back) {
  if (back) return '';
  const lines = [];
  if (card.rules) lines.push(card.rules);
  if (card.drawEffect) lines.push(`Compra automática: ${card.drawEffect.count} carta(s) ao ${card.drawEffect.trigger === 'enter' ? 'entrar em campo' : card.drawEffect.trigger === 'reveal' ? 'ser revelada' : card.drawEffect.trigger === 'turnStart' ? 'começar o turno' : 'atacar com criatura ágil'}.`);
  if (card.tokenEffect) lines.push(`Cria ${card.tokenEffect.count} ficha(s) de ${card.tokenEffect.name} ${card.tokenEffect.power}/${card.tokenEffect.health}${card.tokenEffect.extraPerDiscardName ? `, mais 1 por ${card.tokenEffect.extraPerDiscardName} no descarte` : ''} ao ${card.tokenEffect.trigger === 'enter' ? 'entrar em campo' : card.tokenEffect.trigger === 'attack' ? 'atacar' : card.tokenEffect.trigger === 'reveal' ? 'ser revelada' : 'bloquear (acionamento manual)'}.`);
  if (card.energyEffect) lines.push(`Ao girar: gera ${card.energyEffect.amount} energia(s).`);
  if (card.costDiscount) lines.push(`Desconto de ${card.costDiscount.amount} energia(s) quando você controla uma criatura Ágil.`);
  const keywordText = [
    [/\bAtaque Rápido\b/i, 'Ataque Rápido: pode atacar e virar no turno em que entra em campo.'],
    [/\bÁgil\b/i, 'Ágil: só pode ser atingida por outra criatura com Ágil ou Prontidão.'],
    [/\bProntidão\b/i, 'Prontidão: pode atingir criaturas com Ágil.'],
    [/\bTranspassar\b/i, 'Transpassar: o dano de combate excedente atinge o jogador.'],
    [/\bIniciativa\b/i, 'Iniciativa: causa dano de combate antes de criaturas sem Iniciativa.'],
    [/\bAtaque Simultâneo\b/i, 'Ataque Simultâneo: ataca duas vezes no mesmo ataque.'],
    [/\bTriturar\b/i, 'Triturar: move a carta do topo do baralho diretamente para o descarte.'],
    [/\bVigilância\b/i, 'Vigilância: atacar não vira esta criatura.'],
    [/\bVislumbre\b/i, 'Vislumbre: veja a carta do topo do baralho e escolha mantê-la no topo ou colocá-la no fundo.']
  ];
  const printed = card.rules || '';
  for (const [pattern, description] of keywordText) if (pattern.test(printed)) lines.push(description);
  if (card.quickAttack && !/\bAtaque Rápido\b/i.test(printed)) lines.push(keywordText[0][1]);
  if (card.agile && !/\bÁgil\b/i.test(printed)) lines.push(keywordText[1][1]);
  return [...new Set(lines)].join('\n\n');
}

function openCardDetail(card, back) {
  hideCardHover();
  fillLargeCard($('card-detail-content'), card, back);
  $('card-detail').showModal();
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

async function request(route, options = {}) {
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(session ? { 'x-player-token': session.token } : {}) };
  const response = await fetch(route, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
  return data;
}

async function action(type, extra = {}) {
  if (!session) return;
  try { await request(`/api/rooms/${session.code}/action`, { method: 'POST', body: JSON.stringify({ type, ...extra }) }); }
  catch (error) { toast(error.message); }
}

function enter(data) {
  session = { ...data, invited: data.invited === true || Boolean(invitationCode) };
  document.body.classList.toggle('invitation', session.invited);
  document.body.classList.add('in-room');
  try { handOrder = JSON.parse(sessionStorage.getItem(`runamarca-hand-order-${data.code}-${data.token}`) || '[]'); } catch { handOrder = []; }
  sessionStorage.setItem('procurados-session', JSON.stringify(session));
  history.replaceState(null, '', `/runamarca?s=${data.code}`);
  $('welcome').classList.add('hidden');
  $('game').classList.remove('hidden');
  $('room-label').textContent = data.code;
  connect();
}

async function connect() {
  streamController?.abort();
  const controller = new AbortController();
  streamController = controller;
  while (!controller.signal.aborted) {
    try {
      const response = await fetch(`/api/rooms/${session.code}/events`, { headers: { 'x-player-token': session.token }, signal: controller.signal });
      if (response.status === 403) {
        const invite = session.invited ? session.code : invitationCode;
        sessionStorage.removeItem('procurados-session');
        session = null;
        state = null;
        invitationCode = invite;
        history.replaceState(null, '', invite ? `/runamarca?convite=${invite}` : '/runamarca');
        document.body.classList.toggle('invitation', Boolean(invite));
        document.body.classList.remove('in-room');
        $('room-code').value = invite || '';
        $('room-code').readOnly = Boolean(invite);
        $('game').classList.add('hidden');
        $('welcome').classList.remove('hidden');
        toast('A sala foi encerrada. Crie outra sala para continuar.');
        return;
      }
      if (!response.ok) throw new Error('A sala não está mais disponível. Crie outra sala.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const event = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (event.startsWith('data: ')) {
            const previous = state;
            state = JSON.parse(event.slice(6));
            render();
            animateDrawChanges(previous, state);
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      toast(error.message);
    }
    if (!controller.signal.aborted) await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

function me() { return state.players.find(p => p.id === state.you); }
function rival() { return state.players.find(p => p.id !== state.you); }
function ownCreatures() { return state.board.filter(c => c.ownerId === state.you && c.zone === 'creature'); }
function selectedHandCard() { return [...(me()?.hand || []), ...(me()?.tokens || [])].find(c => c.id === selection); }
function costOf(card) {
  let cost = (card.cost?.colored || 0) + (card.cost?.generic || 0);
  if (card.costDiscount?.condition === 'agileCreature' && state.board.some(c => c.ownerId === state.you && c.zone === 'creature' && c.faceUp && c.agile)) cost = Math.max(0, cost - card.costDiscount.amount);
  return cost;
}
function canPlay(card, zone) {
  if (!card || !zone) return false;
  if (zone !== 'spell' && state.turn !== state.you) return false;
  if (zone === 'rune' && me().runePlayed) return false;
  if (zone === 'patron' && state.board.some(c => c.ownerId === state.you && c.zone === 'patron')) return false;
  return zone === 'rune' || me().ether >= costOf(card);
}

function cardNode(card, { back = false, selected = false } = {}) {
  const el = document.createElement('div');
  el.className = `card${back ? ' back' : ''}${selected ? ' selected' : ''}${card.tapped ? ' tapped' : ''}${!back && card.faceUp === false ? ' face-down-own' : ''}`;
  if (card.isToken) el.classList.add('token-card');
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', back ? 'Carta virada para baixo' : card.name);
  if (!back) {
    if (card.image) {
      const image = document.createElement('img');
      image.className = 'card-image';
      image.src = card.image;
      image.alt = '';
      image.loading = 'lazy';
      image.draggable = false;
      el.append(image);
      const costOverlay = presetCostOverlay(card);
      if (costOverlay) el.append(costOverlay);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'card-fallback';
      fallback.textContent = '✦';
      el.append(fallback);
    }
    if (!card.image) {
      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = card.name;
      el.append(name);
    }
  }
  el.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hideCardHover();
    hoverSource = el;
    hoverTimer = setTimeout(() => {
      if (hoverSource === el) showCardHover(card, back, el);
    }, el.closest('.hand-cards') ? 850 : 400);
  });
  el.addEventListener('pointerleave', hideCardHover);
  el.addEventListener('pointercancel', hideCardHover);
  return el;
}

function button(label, onClick, disabled = false) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.disabled = disabled;
  el.addEventListener('click', onClick);
  return el;
}

function choose(cardId) { selection = cardId; render(); }

function statValue(card, stat) { return (card[stat] || 0) + (card[`${stat}Modifier`] || 0); }
function signed(value) { return value > 0 ? `+${value}` : String(value); }

function creatureStats(card, editable = false) {
  const box = document.createElement('div');
  box.className = editable ? 'creature-stat-editor' : 'creature-stat-display';
  for (const [stat, title] of [['power', 'Ataque'], ['health', 'Vida']]) {
    const modifier = card[`${stat}Modifier`] || 0;
    const row = document.createElement('div');
    row.className = 'creature-stat-row';
    const label = document.createElement('span');
    label.className = 'creature-stat-label';
    label.textContent = title;
    row.append(label);
    if (editable) {
      const decrease = button('−', () => action('stat', { cardId: card.id, stat, delta: -1 }), statValue(card, stat) <= 0);
      decrease.setAttribute('aria-label', `Diminuir ${title.toLowerCase()} de ${card.name}`);
      row.append(decrease);
    }
    const value = document.createElement('strong');
    value.className = modifier > 0 ? 'stat-up' : modifier < 0 ? 'stat-down' : '';
    value.textContent = `${statValue(card, stat)}${modifier ? ` (${signed(modifier)})` : ''}`;
    value.title = `Valor original: ${card[stat] || 0}`;
    row.append(value);
    if (editable) {
      const increase = button('+', () => action('stat', { cardId: card.id, stat, delta: 1 }), statValue(card, stat) >= 99);
      increase.setAttribute('aria-label', `Aumentar ${title.toLowerCase()} de ${card.name}`);
      row.append(increase);
    }
    box.append(row);
  }
  return box;
}

function creatureBadge(card) {
  const badge = document.createElement('div');
  badge.className = 'creature-badge';
  if (!card.faceUp) {
    badge.textContent = '? / ?';
    badge.setAttribute('aria-label', 'Atributos ocultos');
    return badge;
  }
  badge.setAttribute('aria-label', `Ataque ${statValue(card, 'power')}, vida ${statValue(card, 'health')}`);
  badge.title = `Ataque ${statValue(card, 'power')} (${signed(card.powerModifier || 0)}); vida ${statValue(card, 'health')} (${signed(card.healthModifier || 0)})`;
  for (const [index, stat] of ['power', 'health'].entries()) {
    if (index) { const slash = document.createElement('span'); slash.textContent = '/'; badge.append(slash); }
    const value = document.createElement('span');
    const modifier = card[`${stat}Modifier`] || 0;
    value.className = modifier > 0 ? 'stat-up' : modifier < 0 ? 'stat-down' : '';
    value.textContent = String(statValue(card, stat));
    if (modifier) { const marker = document.createElement('small'); marker.textContent = signed(modifier); value.append(marker); }
    badge.append(value);
  }
  return badge;
}

function renderPatron(id, player) {
  const slot = $(id);
  slot.replaceChildren();
  slot.dataset.color = player?.deckColor || '';
  const own = player?.id === state.you;
  const patron = state.board.find(c => c.ownerId === player?.id && c.zone === 'patron');
  const label = document.createElement('span');
  label.className = 'eyebrow';
  label.textContent = 'PATRONO';
  slot.append(label);
  if (patron) {
    const card = cardNode(patron, { back: !patron.faceUp, selected: patron.id === selection });
    card.addEventListener('click', () => choose(patron.id));
    slot.append(card);
  } else {
    const glyph = document.createElement('span');
    glyph.className = 'patron-glyph';
    glyph.textContent = '✦';
    slot.append(glyph);
  }
  const name = document.createElement('span');
  name.className = 'patron-name';
  name.textContent = player?.name || 'Aguardando';
  const health = document.createElement('strong');
  health.className = 'patron-health';
  health.textContent = player?.life ?? 20;
  slot.append(name, health);
  if (own) {
    const actions = document.createElement('div');
    actions.className = 'health-actions';
    actions.append(button('−', () => action('life', { delta: -1 })), button('+', () => action('life', { delta: 1 })));
    slot.append(actions);
  }
}

function insertionSlot(neighborId, side) {
  const slot = button('+', () => {
    const card = selectedHandCard();
    if (card) action('play', { cardId: card.id, zone: 'creature', neighborId, side, faceUp: !playFaceDown });
  });
  slot.className = 'placement-slot';
  slot.title = side === 'left' ? 'Colocar criatura à esquerda' : 'Colocar criatura à direita';
  slot.setAttribute('aria-label', slot.title);
  return slot;
}

function runePiles(cards) {
  const buckets = new Map();
  for (const card of cards) {
    const key = JSON.stringify([card.faceUp ? card.name : 'oculta', card.faceUp ? card.image : '', card.tapped, card.faceUp]);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(card);
  }
  return [...buckets.values()].flatMap(bucket => {
    const piles = [];
    for (let i = 0; i < bucket.length; i += 3) piles.push(bucket.slice(i, i + 3));
    return piles;
  });
}

function renderZone(id, ownerId, zone) {
  const target = $(id);
  target.replaceChildren();
  const cards = state.board.filter(c => c.ownerId === ownerId && c.zone === zone && !c.attacking);
  const own = ownerId === state.you;
  const hand = selectedHandCard();
  const placing = own && zone === 'creature' && hand && (hand.kind === 'creature' || hand.kind === 'flex') && canPlay(hand, 'creature');
  const placingRune = own && zone === 'rune' && hand && (hand.kind === 'rune' || hand.kind === 'flex') && canPlay(hand, 'rune');
  const placingSpell = own && zone === 'spell' && hand && (hand.kind === 'spell' || hand.kind === 'flex') && canPlay(hand, 'spell');
  target.closest('.field-zone').classList.toggle('zone-target', Boolean(placingRune || placingSpell));
  if (zone === 'rune') {
    for (const pile of runePiles(cards)) {
      const top = pile.find(card => card.id === selection) || pile[0];
      const holder = document.createElement('div');
      holder.className = `rune-pile${pile.length > 1 ? ' stacked' : ''}${top.tapped ? ' tapped-pile' : ''}`;
      holder.title = `${top.faceUp ? top.name : 'Runa oculta'} · ${pile.length} ${top.tapped ? 'virada(s)' : 'preparada(s)'}`;
      const el = cardNode(top, { back: !top.faceUp, selected: pile.some(card => card.id === selection) });
      el.addEventListener('click', () => choose(top.id));
      el.addEventListener('keydown', event => { if (event.key === 'Enter') choose(top.id); });
      if (own && !top.tapped) el.addEventListener('dblclick', () => action('tap', { cardId: top.id }));
      holder.append(el);
      if (pile.length > 1) {
        const count = document.createElement('span');
        count.className = 'rune-pile-count';
        count.textContent = `×${pile.length}`;
        holder.append(count);
      }
      target.append(holder);
    }
  }
  if (placing && cards.length) target.append(insertionSlot(cards[0].id, 'left'));
  for (let i = 0; zone !== 'rune' && i < cards.length; i++) {
    const card = cards[i];
    const el = cardNode(card, { back: !card.faceUp, selected: card.id === selection });
    el.addEventListener('click', () => choose(card.id));
    el.addEventListener('keydown', event => { if (event.key === 'Enter') choose(card.id); });
    if (zone === 'creature') {
      const unit = document.createElement('div');
      unit.className = 'creature-unit';
      unit.append(creatureBadge(card), el);
      target.append(unit);
    } else target.append(el);
    if (placing) target.append(insertionSlot(card.id, 'right'));
  }
  if (placing && !cards.length) target.append(insertionSlot(null, 'right'));
  if (placingRune) {
    const slot = button('+', () => action('play', { cardId: hand.id, zone: 'rune', faceUp: !playFaceDown }));
    slot.className = 'placement-slot rune-placement-slot';
    slot.title = 'Colocar Runa em Terrenos';
    slot.setAttribute('aria-label', slot.title);
    target.append(slot);
  }
  if (placingSpell) {
    const slot = button('+', () => action('play', { cardId: hand.id, zone: 'spell', faceUp: !playFaceDown }));
    slot.className = 'placement-slot spell-placement-slot';
    slot.title = 'Colocar Mágica em Magias';
    slot.setAttribute('aria-label', slot.title);
    target.append(slot);
  }
  if (!cards.length && !placing && !placingRune && !placingSpell) {
    const empty = document.createElement('span');
    empty.className = 'zone-empty';
    empty.textContent = zone === 'creature' ? 'Nenhuma criatura' : zone === 'rune' ? 'Nenhuma Runa' : 'Nenhuma magia';
    target.append(empty);
  }
}

function renderSelection() {
  const panel = $('selection');
  panel.replaceChildren();
  const handCard = selectedHandCard();
  const boardCard = state.board.find(c => c.id === selection);
  const card = handCard || boardCard;
  if (!card) {
    selection = null;
    panel.className = 'selection-empty';
    const glyph = document.createElement('span'); glyph.className = 'selection-glyph'; glyph.textContent = '✧';
    const message = document.createElement('p'); message.textContent = 'Selecione uma carta para ver suas ações.';
    panel.append(glyph, message);
    return;
  }
  panel.className = '';
  const own = !state.spectator && (!boardCard || boardCard.ownerId === state.you);
  const preview = cardNode(card, { back: boardCard && !boardCard.faceUp && !own });
  preview.classList.add('selection-card');
  const name = document.createElement('div');
  name.className = 'selection-name';
  name.textContent = own || card.faceUp ? card.name : 'Carta oculta';
  panel.append(preview);
  if (!card.image) panel.append(name);
  const enlarge = button('Ampliar carta', () => openCardDetail(card, Boolean(boardCard && !boardCard.faceUp && !own)));
  enlarge.className = 'enlarge-card';
  panel.append(enlarge);
  if (boardCard?.zone === 'creature' && (boardCard.faceUp || own)) panel.append(creatureStats(boardCard, own));
  if (card.energyEffect && (own || card.faceUp)) {
    const rule = document.createElement('p');
    rule.className = 'card-ability-note';
    rule.textContent = card.energyEffect.condition === 'powerAtLeast4'
      ? 'Ao girar: ganhe 1 energia à escolha. Ganhe 2 se você controlar uma criatura com poder 4 ou mais.'
      : `Ao girar: ganhe ${card.energyEffect.amount} energia de ${card.energyEffect.resource === 'any' ? 'sua escolha' : card.energyEffect.resource[0].toUpperCase() + card.energyEffect.resource.slice(1)}.`;
    panel.append(rule);
  }
  if (!own) return;
  const actions = document.createElement('div');
  actions.className = 'selection-actions';
  if (handCard) {
    const cost = document.createElement('p');
    cost.className = 'cost-note';
    const energy = selectedEnergy();
    const printedCost = (card.cost?.colored || 0) + (card.cost?.generic || 0);
    const discount = printedCost - costOf(card);
    cost.textContent = card.kind === 'rune'
      ? `Ao girar: ${runeParts(card)} · sem custo para colocar`
      : `Custo: ${costParts(card, energy?.name)}${discount ? ` · desconto: ${discount} · pagar: ${costOf(card)}` : ` · total: ${costOf(card)}`} · Reserva: ${me().ether}`;
    actions.append(cost);
    if (card.kind !== 'rune' && me().ether < costOf(card)) {
      const missing = document.createElement('p');
      missing.className = 'cost-warning';
      missing.textContent = `Faltam ${costOf(card) - me().ether} de energia. Coloque e vire uma Runa para abastecer a reserva.`;
      actions.append(missing);
    }
    const hide = document.createElement('label');
    hide.className = 'cost-note';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = playFaceDown;
    checkbox.addEventListener('change', () => { playFaceDown = checkbox.checked; });
    hide.append(checkbox, document.createTextNode(' Jogar virada para baixo'));
    actions.append(hide);
    const zones = card.kind === 'flex' ? ['rune','creature','spell','patron'] : [card.kind];
    for (const zone of zones) {
      const label = { rune: 'Colocar em Terrenos', creature: 'Invocar criatura', spell: 'Colocar em Magias', patron: 'Colocar como Patrono' }[zone];
      if (zone === 'creature' && ownCreatures().length) {
        const hint = document.createElement('p'); hint.className = 'cost-note'; hint.textContent = 'Escolha um + ao lado das criaturas em campo.'; actions.append(hint);
      } else actions.append(button(label, () => action('play', { cardId: card.id, zone, faceUp: !playFaceDown }), !canPlay(card, zone)));
      if (zone === 'spell' && canPlay(card, zone)) {
        const hint = document.createElement('p'); hint.className = 'cost-note';
        hint.textContent = 'Clique no + em Magias ou use o botão acima. A carta ficará na mesa até você descartá-la ou devolvê-la à mão.';
        actions.append(hint);
      }
    }
    actions.append(button('Descartar da mão', () => action('discard', { cardId: card.id })));
  } else {
    actions.append(button(card.faceUp ? 'Virar para baixo' : 'Revelar carta', () => action('flip', { cardId: card.id })));
    if (card.zone === 'rune') {
      const pile = runePiles(state.board.filter(c => c.ownerId === state.you && c.zone === 'rune')).find(group => group.some(c => c.id === card.id)) || [card];
      const oneAmount = runeAmount(card);
      actions.append(button(`Virar 1 Runa · +${oneAmount} energia${oneAmount === 1 ? '' : 's'}`, () => { selection = pile.find(c => c.id !== card.id)?.id || card.id; action('tap', { cardId: card.id }); }, card.tapped));
      if (pile.length > 1) {
        const groupAmount = pile.reduce((sum, rune) => sum + runeAmount(rune), 0);
        actions.append(button(`Virar grupo de ${pile.length} · +${groupAmount} energias`, () => action('tapGroup', { cardIds: pile.map(c => c.id) }), card.tapped));
      }
      const note = document.createElement('p');
      note.className = 'cost-note';
      note.textContent = `${pile.length} Runa(s) iguais neste grupo · ${card.tapped ? 'viradas' : 'preparadas'}.`;
      actions.append(note);
    } else if (card.zone === 'creature' && card.energyEffect) {
      const boosted = card.energyEffect.condition === 'powerAtLeast4' && state.board.some(c => c.ownerId === state.you && c.zone === 'creature' && c.faceUp && statValue(c, 'power') >= 4);
      const amount = boosted ? card.energyEffect.boostedAmount : card.energyEffect.amount;
      actions.append(button(`Girar para gerar ${amount} energia${amount > 1 ? 's' : ''}`, () => action('tap', { cardId: card.id }), card.tapped || card.attackedThisTurn || !card.faceUp));
    } else actions.append(button(card.tapped ? 'Desvirar / preparar' : 'Girar / exaurir', () => action('tap', { cardId: card.id })));
    if (card.zone === 'creature') actions.append(button('Declarar ataque', () => action('attack', { cardId: card.id }), state.turn !== state.you || !card.faceUp || card.tapped || card.attackedThisTurn || (!card.quickAttack && card.summonedTurnNumber === state.turnNumber)));
    if (card.tokenEffect?.trigger === 'block') actions.append(button('Acionar efeito ao bloquear', () => action('triggerBlock', { cardId: card.id }), !card.faceUp));
    actions.append(button('Voltar à mão', () => action('return', { cardId: card.id })));
    actions.append(button('Descartar', () => action('discard', { cardId: card.id })));
  }
  panel.append(actions);
}

function render() {
  if (!state) return;
  renderGate();
  hideCardHover();
  if ($('card-detail').open) $('card-detail').close();
  const self = state.spectator ? state.players[0] : me();
  const opponent = state.spectator ? state.players[1] : rival();
  $('game').classList.toggle('spectating', Boolean(state.spectator));
  $('spectator-label').classList.toggle('hidden', !state.spectator);
  $('opponent-role').textContent = state.spectator ? 'JOGADOR 2' : 'ADVERSÁRIO';
  $('opponent-creature-label').textContent = state.spectator ? `CRIATURAS DE ${opponent?.name.toUpperCase() || 'JOGADOR 2'}` : 'CRIATURAS DO RIVAL';
  $('self-creature-label').textContent = state.spectator ? `CRIATURAS DE ${self.name.toUpperCase()}` : 'SUAS CRIATURAS';
  $('game').dataset.deckColor = self.deckColor || '';
  $('self-name').textContent = self.name;
  $('active-deck-name').textContent = self.deckChoice === 'custom' ? 'Deck próprio confirmado' : deckCatalog.find(deck => deck.slug === self.deckChoice)?.title || 'Aguardando deck';
  $('deck-count').textContent = self.deckCount;
  $('discard-count').textContent = self.discardCount;
  $('hand-heading-count').textContent = `(${state.spectator ? 0 : self.handCount})`;
  $('ether-count').textContent = self.ether;
  const energy = selectedEnergy();
  $('ether-color').textContent = energy ? `Energia de ${energy.name}` : 'Vire uma Runa para ganhar energia';
  $('energy-icon').className = energy ? `energy-icon energy-${energy.id}` : 'energy-icon hidden';
  $('energy-icon').title = energy?.description || '';
  $('draw-status').textContent = !self.deckReady ? 'Escolha um deck. As compras serão automáticas.'
    : state.phase === 'active' ? 'A mão inicial, a compra do turno e os efeitos de compra entram automaticamente na mão.'
    : 'Sete cartas serão distribuídas automaticamente ao começar.';
  $('opponent-name').textContent = opponent?.name || 'Aguardando rival...';
  $('opponent-deck').textContent = `${opponent?.deckCount || 0} no baralho`;
  $('opponent-hand').textContent = `${opponent?.handCount || 0} na mão`;
  $('round-label').textContent = `Rodada ${state.round}`;
  $('turn-label').textContent = state.phase === 'lobby' ? 'Escolha dos decks'
    : state.phase === 'coin' ? 'Sorteio da moeda'
    : state.phase === 'finished' ? 'Partida encerrada'
    : state.turn === state.you ? 'Seu turno' : opponent ? `Turno de ${opponent.name}` : 'Aguardando rival';
  $('end-turn').disabled = state.spectator || state.phase !== 'active' || state.turn !== state.you || !opponent || state.players.some(p => !p.deckReady);
  $('end-turn').title = state.players.some(p => !p.deckReady) ? 'Os dois jogadores precisam confirmar os decks.' : '';
  const hand = $('hand-cards');
  cancelHandDrag();
  hand.replaceChildren();
  const currentIds = (self.hand || []).map(card => card.id);
  handOrder = [...handOrder.filter(id => currentIds.includes(id)), ...currentIds.filter(id => !handOrder.includes(id))];
  for (const card of handOrder.map(id => (self.hand || []).find(item => item.id === id)).filter(Boolean)) {
    const el = cardNode(card, { selected: card.id === selection });
    el.dataset.cardId = card.id;
    el.draggable = false;
    el.addEventListener('dragstart', event => event.preventDefault());
    el.addEventListener('pointerdown', event => beginHandDrag(event, el));
    el.addEventListener('click', () => { if (performance.now() >= suppressHandClickUntil) choose(card.id); });
    el.addEventListener('keydown', event => { if (event.key === 'Enter') choose(card.id); });
    hand.append(el);
  }
  const pocket = $('token-cards');
  pocket.replaceChildren();
  $('token-count').textContent = String(self.tokens?.length || 0);
  for (const card of self.tokens || []) {
    const el = cardNode(card, { selected: card.id === selection });
    el.addEventListener('click', () => choose(card.id));
    pocket.append(el);
  }
  renderPatron('self-patron', self);
  renderPatron('opponent-patron', opponent);
  for (const [prefix, player] of [['self', self], ['opponent', opponent]]) {
    for (const [id, zone] of [['creatures','creature'],['runes','rune'],['spells','spell']]) renderZone(`${prefix}-${id}`, player?.id, zone);
  }
  renderAttackLane();
  renderDiscardZone(self, opponent);
  $('placement-hint').textContent = selectedHandCard()?.kind === 'creature' && ownCreatures().length ? 'ESCOLHA UM +' : '';
  renderSelection();
  const log = $('log');
  log.replaceChildren();
  for (const line of [...state.log].reverse()) { const p = document.createElement('p'); p.textContent = line; log.append(p); }
}

function renderAttackLane() {
  const lane = $('attack-lane');
  lane.replaceChildren();
  const attacking = state.board.filter(card => card.attacking);
  for (const card of attacking) {
    const unit = document.createElement('div');
    unit.className = 'attack-unit';
    const label = document.createElement('span');
    label.textContent = `${state.players.find(p => p.id === card.ownerId)?.name || 'Jogador'} · ATAQUE`;
    const image = cardNode(card, { back: !card.faceUp, selected: selection === card.id });
    image.addEventListener('click', () => choose(card.id));
    unit.append(label, image);
    lane.append(unit);
  }
  lane.classList.toggle('occupied', attacking.length > 0);
}

function renderDiscardZone(self, opponent) {
  const zone = $('discard-zone');
  zone.replaceChildren();
  for (const player of [self, opponent].filter(Boolean)) {
    const section = document.createElement('div');
    section.className = 'discard-pile';
    const title = document.createElement('span');
    title.textContent = `${player.name} · ${player.discardCount}`;
    section.append(title);
    for (const card of [...player.discard].reverse()) {
      const image = cardNode(card);
      image.addEventListener('click', () => openCardDetail(card, false));
      section.append(image);
    }
    zone.append(section);
  }
}

function renderGate() {
  if (!state) return;
  if (state.spectator) { $('match-gate').hidden = true; return; }
  const phase = state.phase || 'active';
  if (phase === 'lobby' && lastGatePhase !== 'lobby') {
    selectedDeck = null;
    $('preset-decks').querySelectorAll('.preset-deck').forEach(button => button.classList.remove('selected'));
  }
  const gate = $('match-gate');
  gate.hidden = phase === 'active';
  if (phase === 'active') { lastGatePhase = phase; return; }
  const self = me();
  const opponent = rival();
  $('gate-decks').hidden = phase !== 'lobby' || self.deckReady;
  $('gate-custom').hidden = phase !== 'lobby' || self.deckReady;
  $('confirm-deck').hidden = phase !== 'lobby' || self.deckReady;
  $('confirm-deck').disabled = !selectedDeck;
  $('gate-coin').hidden = phase !== 'coin';
  $('gate-restart').hidden = phase !== 'finished';
  $('gate-players').textContent = `${self.name}: ${self.deckReady ? 'deck confirmado' : 'escolhendo deck'} · ${opponent ? `${opponent.name}: ${opponent.deckReady ? 'deck confirmado' : 'escolhendo deck'}` : 'aguardando rival'}`;
  if (phase === 'lobby') {
    $('gate-title').textContent = self.deckReady ? 'Deck confirmado' : 'Escolha seu deck';
    $('gate-description').textContent = self.deckReady ? 'Aguardando o outro jogador confirmar o deck. Depois, a moeda decidirá quem escolhe a ordem.' : 'Clique em Ruptura, Forja ou Fluxo e confirme sua escolha.';
  }
  if (phase === 'coin') {
    $('gate-title').textContent = 'A moeda decide';
    $('gate-description').textContent = 'Os dois decks estão prontos. Quem vencer a moeda escolhe começar ou jogar em segundo.';
    if (lastGatePhase !== 'coin') {
      coinAnimationDone = false;
      $('gate-coin').classList.remove('flipping');
      void $('gate-coin').offsetWidth;
      $('gate-coin').classList.add('flipping');
      setTimeout(() => { if (state?.phase === 'coin') { coinAnimationDone = true; renderGate(); } }, 1800);
    }
    const winner = state.players.find(p => p.id === state.coinWinner);
    $('coin-result').textContent = coinAnimationDone ? `${winner?.name || 'Um jogador'} venceu a moeda.` : 'A moeda está no ar...';
    $('coin-decisions').hidden = !coinAnimationDone || state.coinWinner !== state.you;
    if (coinAnimationDone && state.coinWinner !== state.you) $('gate-description').textContent = `Aguardando ${winner?.name || 'o vencedor'} escolher quem começa.`;
  }
  if (phase === 'finished') {
    const winner = state.players.find(p => p.id === state.winner);
    $('gate-title').textContent = `${winner?.name || 'O rival'} venceu!`;
    $('gate-description').textContent = 'A vida do Patrono chegou a zero. Inicie uma nova partida para escolher os decks novamente.';
    $('gate-players').textContent = 'Partida encerrada';
  }
  lastGatePhase = phase;
}

async function fileToDataUrl(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 720 / bitmap.width, 1000 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e6d7b4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', .78);
}

async function importImages(files) {
  if (!files.length) return;
  if (files.length > 120) { toast('Limite de 120 cartas por deck.'); return; }
  try {
    const cards = [];
    let totalSize = 0;
    for (const file of files) {
      if (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)) throw new Error(`Formato não aceito: ${file.name}`);
      const image = await fileToDataUrl(file);
      if (image.length > 2_000_000) throw new Error(`Imagem muito grande: ${file.name}`);
      totalSize += image.length;
      if (totalSize > 23_000_000) throw new Error('Deck acima de 23 MB. Use imagens menores.');
      cards.push({ name: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), image });
    }
    await action('import', { cards });
  } catch (error) { toast(error.message); }
}

async function importJson(file) {
  try {
    const data = JSON.parse(await file.text());
    const cards = Array.isArray(data) ? data : data.cards;
    if (!Array.isArray(cards)) throw new Error('Use uma lista de cartas ou { "cards": [...] }.');
    await action('import', { cards });
  } catch (error) { toast(error.message); }
}

async function loadDecks() {
  try {
    const decks = await request('/api/decks');
    deckCatalog = decks;
    const holder = $('preset-decks');
    holder.replaceChildren();
    for (const deck of decks) {
      const control = document.createElement('button');
      control.type = 'button'; control.className = 'preset-deck';
      control.dataset.deck = deck.slug;
      const image = document.createElement('img'); image.src = deck.cover; image.alt = '';
      const caption = document.createElement('span');
      const title = document.createElement('strong'); title.textContent = deck.title;
      const count = document.createElement('small'); count.textContent = `${deck.count} cartas`;
      caption.append(title, count); control.append(image, caption);
      control.addEventListener('click', () => {
        selectedDeck = deck.slug;
        holder.querySelectorAll('.preset-deck').forEach(button => button.classList.toggle('selected', button.dataset.deck === selectedDeck));
        $('confirm-deck').disabled = false;
        $('gate-description').textContent = `${deck.title} · ${deck.count} cartas. Confirme para preparar seu baralho.`;
      });
      holder.append(control);
    }
  } catch (error) { toast(error.message); }
}

$('create-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { enter(await request('/api/rooms', { method: 'POST', body: JSON.stringify({ name: $('create-name').value }) })); }
  catch (error) { toast(error.message); }
});
$('join-form').addEventListener('submit', async event => {
  event.preventDefault();
  const code = $('room-code').value.trim().toUpperCase();
  try { enter(await request(`/api/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ name: $('join-name').value }) })); }
  catch (error) { toast(error.message); }
});
$('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(`${location.origin}/runamarca?convite=${session.code}`); toast('Link de convite copiado.'); }
  catch { toast(`Código da sala: ${session.code}`); }
});
const handContainer = $('hand-cards');
function beginHandDrag(event, element) {
  if (handDrag || event.button !== 0 || (event.pointerType === 'mouse' && event.buttons !== 1)) return;
  const rect = element.getBoundingClientRect();
  handDrag = { element, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, rect, originalOrder: [...handContainer.querySelectorAll('.card[data-card-id]')].map(card => card.dataset.cardId), active: false, placeholder: null };
}
function cancelHandDrag() {
  if (!handDrag) return;
  handDrag.placeholder?.remove();
  handDrag.element.remove();
  handDrag = null;
}
window.addEventListener('pointermove', event => {
  const drag = handDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 7) return;
  if (!drag.active) {
    drag.active = true;
    hideCardHover();
    const placeholder = document.createElement('div');
    placeholder.className = 'hand-card-placeholder';
    placeholder.style.width = `${drag.rect.width}px`;
    placeholder.style.height = `${drag.rect.height}px`;
    drag.element.before(placeholder);
    drag.placeholder = placeholder;
    document.body.append(drag.element);
    drag.element.classList.add('hand-dragging');
    Object.assign(drag.element.style, { position: 'fixed', width: `${drag.rect.width}px`, height: `${drag.rect.height}px`, margin: '0', zIndex: '100', transition: 'none', transform: 'none', pointerEvents: 'none' });
  }
  event.preventDefault();
  drag.element.style.left = `${event.clientX - drag.offsetX}px`;
  drag.element.style.top = `${event.clientY - drag.offsetY}px`;
  const others = [...handContainer.querySelectorAll('.card[data-card-id]')];
  const next = others.find(card => event.clientX < card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2);
  if (next) handContainer.insertBefore(drag.placeholder, next);
  else handContainer.append(drag.placeholder);
  const bounds = handContainer.getBoundingClientRect();
  if (event.clientX > bounds.right - 25) handContainer.scrollLeft += 12;
  else if (event.clientX < bounds.left + 25) handContainer.scrollLeft -= 12;
}, { passive: false });
function finishHandDrag(event, canceled = false) {
  const drag = handDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  handDrag = null;
  if (!drag.active) return;
  suppressHandClickUntil = performance.now() + 250;
  drag.element.classList.remove('hand-dragging');
  drag.element.removeAttribute('style');
  drag.placeholder.replaceWith(drag.element);
  if (canceled) {
    for (const id of drag.originalOrder) {
      const card = [...handContainer.children].find(child => child.dataset.cardId === id);
      if (card) handContainer.append(card);
    }
    return;
  }
  handOrder = [...handContainer.querySelectorAll('.card[data-card-id]')].map(card => card.dataset.cardId);
  try { sessionStorage.setItem(`runamarca-hand-order-${session.code}-${session.token}`, JSON.stringify(handOrder)); } catch {}
}
window.addEventListener('pointerup', event => finishHandDrag(event));
window.addEventListener('pointercancel', event => finishHandDrag(event, true));
$('end-turn').addEventListener('click', () => action('endTurn'));
for (const side of ['left', 'right']) {
  $(`toggle-${side}-rail`).addEventListener('click', () => setRailCollapsed(side, !$('game').classList.contains(`${side}-collapsed`)));
}
try {
  const savedLayout = JSON.parse(localStorage.getItem(railPreferenceKey) || '{}');
  for (const side of ['left', 'right']) if (savedLayout[side]) setRailCollapsed(side, true);
} catch {}
$('confirm-deck').addEventListener('click', () => { if (selectedDeck) action('chooseDeck', { deck: selectedDeck }); });
$('choose-first').addEventListener('click', () => action('decideFirst', { position: 'first' }));
$('choose-second').addEventListener('click', () => action('decideFirst', { position: 'second' }));
$('gate-restart').addEventListener('click', () => action('resetMatch'));
$('shuffle').addEventListener('click', () => action('shuffle'));
$('reset-match').addEventListener('click', () => { if (confirm('Reiniciar a partida para os dois jogadores e escolher novos decks?')) action('resetMatch'); });
$('close-card-detail').addEventListener('click', () => $('card-detail').close());
$('card-detail').addEventListener('click', event => { if (event.target === $('card-detail')) $('card-detail').close(); });
window.addEventListener('scroll', hideCardHover, true);
$('image-upload').addEventListener('change', async event => { await importImages([...event.target.files]); event.target.value = ''; });
$('json-upload').addEventListener('change', async event => { if (event.target.files[0]) await importJson(event.target.files[0]); event.target.value = ''; });
document.addEventListener('keydown', event => {
  if (!session || !state || event.target.matches('input, textarea, button')) return;
  const key = event.key.toLowerCase();
  if (key === ' ' && !$('end-turn').disabled) { event.preventDefault(); action('endTurn'); }
  if (!selection) return;
  const boardCard = state.board.find(c => c.id === selection && c.ownerId === state.you);
  const handCard = selectedHandCard();
  if (key === 'f' && boardCard) action('flip', { cardId: selection });
  if (key === 'r' && boardCard) action('return', { cardId: selection });
  if (key === 'd' && (boardCard || handCard)) action('discard', { cardId: selection });
});

Promise.all([loadDecks(), request('/api/energies').then(data => { energyCatalog = data; render(); })]).catch(error => toast(error.message));
const params = new URLSearchParams(location.search);
const linkCode = (params.get('convite') || params.get('s') || '').trim().toUpperCase();
let savedSession = null;
try { savedSession = JSON.parse(sessionStorage.getItem('procurados-session') || 'null'); }
catch { sessionStorage.removeItem('procurados-session'); }
if (savedSession && (!linkCode || savedSession.code === linkCode)) enter(savedSession);
else if (linkCode) {
  invitationCode = linkCode;
  document.body.classList.add('invitation');
  $('room-code').value = linkCode;
  $('room-code').readOnly = true;
}
