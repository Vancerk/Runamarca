import {act, view} from './game.mjs';
import {enableRoomTimeline, roomNow, roomIsPaused, roomTimelineView, pauseRoomTimeline,
  resumeRoomTimeline, disposeRoomTimeline} from './room-timeline.mjs';

// Provisional roles and the first engine-observable goals. Scenes, dialogue and the
// remaining curriculum are intentionally separate; this is not the final lesson script.
export const TUTORIAL_DUELS = Object.freeze([
  Object.freeze({id: 1, role: 'Combatente fanfarrão', guidance: 'guided', goals: Object.freeze([
    'play-creature', 'confirm-formation', 'resolve-combat', 'win',
  ])}),
  Object.freeze({id: 2, role: 'Mago demonstrador', guidance: 'first-occurrence', goals: Object.freeze([
    'confirm-opening', 'direct-spell', 'prepare-spell', 'activate-prepared', 'entry', 'revelation', 'win',
  ])}),
  Object.freeze({id: 3, role: 'Estrategista paciente', guidance: 'contextual', goals: Object.freeze([
    'emanation', 'patron-power', 'win',
  ])}),
]);
const sessions = new WeakMap();
const reject = (code, message) => { throw Object.assign(Error(message), {code}); };
const alive = card => card && card.damage < card.health;

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

export function createTutorialSession({room, player, catalog, duel = 1, clock, turnsTimed = true, restore = null}) {
  const definition = TUTORIAL_DUELS.find(item => item.id === duel);
  if (!definition) reject('TUTORIAL_DUEL', 'Encontro de tutorial inválido.');
  if (sessions.has(room) || (!restore && (room.phase !== 'lobby' || room.matchId)) || (restore && (restore.schema!==1 || restore.duel!==duel || room.simulation!=='tutorial')) || room.players.length !== 2 || room.spectators.length ||
      !room.players.includes(player) || player.bot || room.players.filter(p => p.bot).length !== 1)
    reject('TUTORIAL_ROOM', 'O tutorial exige uma sala nova e exclusiva com um jogador e um NPC.');
  if (room.stake) reject('TUTORIAL_STAKE', 'O tutorial não aceita apostas.');
  enableRoomTimeline(room, clock, {turnsTimed, restore:restore?.clock});
  room.simulation = 'tutorial';
  const npc = room.players.find(p => p.bot), previousOnChange = room.onChange;
  const state = {version: 0, status: 'active', completed: new Set(), prepared: new Set(),
    initialFormationConfirmed: false, combatCount: room.combatCount || 0, receipts: new Map()};
  if(restore){state.version=restore.version+1;state.status=restore.status;state.completed=new Set(restore.completed);state.prepared=new Set(restore.prepared);state.initialFormationConfirmed=restore.initialFormationConfirmed;state.combatCount=restore.combatCount;state.receipts=new Map(restore.receipts);}
  sessions.set(room, state);

  function complete(goal) { if (definition.goals.includes(goal)) state.completed.add(goal); }
  function reconcile() {
    const count = room.combatCount || 0;
    if (count > state.combatCount) {
      complete('resolve-combat');
      if(room.committedRevelations?.some(item=>item.casterId===player.id))complete('revelation');
      // Inspect committed engine results, never the detached animation preview.
      if (room.preparedActivations?.some(item => item.casterId === player.id && state.prepared.has(item.cardId))) complete('activate-prepared');
      state.combatCount = count;
    }
    if (state.status === 'active' && room.phase === 'finished') {
      state.status = room.winner === player.id ? 'won' : 'retry';
      if (state.status === 'won') complete('win');
    }
  }
  function notify() { reconcile(); state.version++; }
  function publish() { notify(); previousOnChange?.(); }
  room.onChange = () => { if (state.status !== 'exited') publish(); };
  function setPaused(paused) {
    if (state.status !== 'active') reject('TUTORIAL_FINISHED', 'Este encontro não está em andamento.');
    const changed = paused ? pauseRoomTimeline(room) : resumeRoomTimeline(room);
    if (changed) { room.revision++; publish(); }
  }

  function publicState(actor = player) {
    if (actor !== player) reject('TUTORIAL_OWNER', 'Somente o participante pode consultar este tutorial.');
    reconcile();
    const result = view(room, player);
    result.tutorial = {duel, role: definition.role, guidance: definition.guidance, version: state.version,
      status: state.status, clock: roomTimelineView(room), goals: definition.goals.map(id => ({id, complete: state.completed.has(id)}))};
    return result;
  }

  function apply(actor, action) {
    if (state.status !== 'active') reject('TUTORIAL_FINISHED', 'Este encontro não está em andamento.');
    if (roomIsPaused(room)) reject('TUTORIAL_PAUSED', 'O tutorial está pausado.');
    if (actor === player && duel === 1 && !state.initialFormationConfirmed && room.phase === 'formation' && action.type === 'ready' &&
        !player.formation.some(Boolean) && player.reserve.some(card => alive(card) && !player.emanation.includes(card.uid)))
      reject('TUTORIAL_PARTICIPATE', 'Nesta primeira lição, coloque uma criatura em qualquer casa permitida antes de confirmar.');
    const card = action.cardId ? player.hand.find(item => item.uid === action.cardId) : null;
    const beforeRevision = room.revision, beforeEvent=room.eventId;
    try { act(room, actor, action, catalog); }
    catch (error) { if (room.revision !== beforeRevision) publish(); throw error; }
    if (actor === player) {
      if(action.type==='play'&&card?.effects?.some(e=>e.timing==='on_enter'&&e.op==='draw')&&room.events.some(e=>e.id>beforeEvent&&e.type==='draw'&&e.playerId===player.id))complete('entry');
      if (action.type === 'play' && card?.type === 'creature' && player.reserve.some(item => item.uid === card.uid)) complete('play-creature');
      if (action.type === 'ready' && player.ready && player.formation.some(Boolean)) { state.initialFormationConfirmed = true; complete('confirm-formation'); }
      if (action.type === 'confirmMulligan' && player.mulliganReady) complete('confirm-opening');
      if (action.type === 'play' && ['spell','direct_spell','prepared_spell'].includes(card?.type)) {
        if (action.mode === 'lane' && player.prepared.some(item => item.card.uid === card.uid)) { state.prepared.add(card.uid); complete('prepare-spell'); }
        else if ((action.mode || 'direct') === 'direct' && player.discard.some(item => item.uid === card.uid)) complete('direct-spell');
      }
      if ((action.type === 'emanate' || action.type === 'play' && action.mode === 'emanate') && player.emanation.includes(action.cardId)) complete('emanation');
      if (action.type === 'patronPower') complete('patron-power');
    }
    publish();
  }

  function exit() {
    if (state.status === 'exited') return;
    state.status = 'exited';
    // This room belongs only to the tutorial. Pending callbacks cannot revive it.
    room.phase = 'finished'; room.turn = null; room.combat = null; room.turnClock = null;
    room.revision++; state.version++;
    disposeRoomTimeline(room);
    room.onChange = previousOnChange;
  }

  return Object.freeze({
    view: publicState,
    setPaused,
    // Called only after authentication; clients provide an ID/version, never a room or a goal.
    command(actor, request) {
      if (actor !== player) reject('TUTORIAL_OWNER', 'Somente o participante pode controlar este tutorial.');
      if (!request || typeof request.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(request.id) ||
          !request.action || typeof request.action.type !== 'string') reject('TUTORIAL_REQUEST', 'Comando de tutorial inválido.');
      const fingerprint = stable({version: request.version, action: request.action});
      const receipt = state.receipts.get(request.id);
      if (receipt) {
        if (receipt !== fingerprint) reject('TUTORIAL_CONFLICT', 'O identificador já foi usado para outro comando.');
        return {replayed: true, state: publicState()};
      }
      if (request.version !== state.version) reject('TUTORIAL_STALE', 'O tutorial mudou. Atualize o estado antes de agir.');
      const type = request.action.type;
      if (type === 'tutorialExit') exit();
      else {
        if (state.status !== 'active') reject('TUTORIAL_FINISHED', 'Este encontro não está em andamento.');
        if (type === 'tutorialPause' || type === 'tutorialResume') {
          setPaused(type === 'tutorialPause');
        } else {
          if (['leave','spectate','restart','deck','addBot','removeBot'].includes(type)) reject('TUTORIAL_ACTION', 'Use os controles próprios deste tutorial.');
          apply(player, request.action);
        }
      }
      state.receipts.set(request.id, fingerprint);
      if (state.receipts.size > 128) state.receipts.delete(state.receipts.keys().next().value);
      return {replayed: false, state: publicState()};
    },
    npcAction(action) { apply(npc, action); return publicState(); },
    // A server-owned projection for future persistence; not a client-supplied restore API.
    checkpoint() { reconcile(); return {schema: 1, duel, version: state.version, status: state.status,
      completed: [...state.completed], initialFormationConfirmed: state.initialFormationConfirmed, at: roomNow(room)}; },
    snapshot(){reconcile();return {schema:1,duel,version:state.version,status:state.status,completed:[...state.completed],prepared:[...state.prepared],initialFormationConfirmed:state.initialFormationConfirmed,combatCount:state.combatCount,receipts:[...state.receipts],clock:roomTimelineView(room)};},
    dispose: exit,
  });
}
