// One public musical direction per match. Never inspect hands, formations or targets.
// The library is provisional: acoustic activity is not semantic mood recognition.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('./music-catalog.json',import.meta.url),'utf8'));

export const MUSIC_RULES = Object.freeze({
  tensionHpRatio: .5, climaxHpRatio: .25,
  recoverFromTensionRatio: .6, recoverFromClimaxRatio: .35,
  burstDamage: 5, burstWindowMs: 30_000,
  minimumHoldMs: 45_000, openingDurationMs: 55_000, crossfadeMs: 6_000, leadMs: 1_200,
  musicVolume: .17, ambienceVolume: .07,
});
const ranks = {opening: 0, table: 0, tension: 1, climax: 2};
const observations = new WeakMap();
const liveRooms=new WeakSet(),timers=new WeakMap();
// Only hosted rooms opt in. Simulations use explicit timestamps without real timers.
export function enableMusicClock(room){liveRooms.add(room);syncMusic(room);}
export function stopMusicClock(room){liveRooms.delete(room);clearTimeout(timers.get(room));timers.delete(room);}
function scheduleMusic(room){
  clearTimeout(timers.get(room));timers.delete(room);
  if(!liveRooms.has(room)||!room.music?.playing||room.phase==='lobby')return;
  const cue=room.music,current=catalog.tracks.find(t=>t.id===cue.trackId),now=Date.now();
  const deadlines=[now+30_000];
  if(current)deadlines.push(cue.since+current.durationSeconds*1000-MUSIC_RULES.crossfadeMs);
  if(cue.stage==='opening'&&room.phase!=='mulligan')deadlines.push((observations.get(room)?.startedAt||now)+MUSIC_RULES.openingDurationMs);
  const timer=setTimeout(()=>{
    const before=JSON.stringify(musicView(room));syncMusic(room);
    if(before!==JSON.stringify(musicView(room)))room.revision=(room.revision||0)+1;
  },Math.max(100,Math.min(...deadlines)-now));
  timer.unref?.();timers.set(room,timer);
}
const openingChoices=new Map();let lastOpening=null;
function openingTrack(key){
  if(openingChoices.has(key))return openingChoices.get(key);
  const selected=selectMusicTrack(key,'opening',0,lastOpening);lastOpening=selected;
  openingChoices.set(key,selected);
  if(openingChoices.size>128)openingChoices.delete(openingChoices.keys().next().value);
  return selected;
}

export function selectMusicTrack(key, stage, sequence, previous, library=catalog, played=[]) {
  const hash = createHash('sha256').update(`${key}:${stage}:${sequence}`).digest();
  const used=new Set(played),available=library.tracks.filter(t=>t.enabled!==false&&t.url&&t.durationSeconds>0&&t.suggestedStage!=='ambience'&&!used.has(t.id));
  const stages=stage==='opening'?['opening','table']:stage==='table'?['table','opening']:stage==='tension'?['tension','climax','table']:['climax','tension','table'];
  const pool=stages.map(s=>available.filter(t=>(t.stages||[t.suggestedStage]).includes(s)).map(t=>t.id)).find(p=>p.length)||[];
  const alternatives=pool.filter(id=>id!==previous),options=alternatives.length?alternatives:pool;
  if(!options.length)return null;
  return options[hash.readUInt32BE(0) % options.length];
}

export function syncMusic(room, now = Date.now()) {
  try{return updateMusic(room,now);}finally{scheduleMusic(room);}
}
function updateMusic(room,now){
  if (room.collectPreview) return null;
  if (room.phase === 'lobby' || room.players.length !== 2 || room.players.some(p => !p.patron)) {
    observations.delete(room);
    room.music = null;
    return null;
  }
  const key = String(room.matchId || room.code);
  let memory = observations.get(room);
  const hp = room.players.map(p => ({id: p.id, hp: Math.max(0, p.patron.hp), max: p.patron.maxHp || 20}));
  if (!memory || memory.key !== key || !room.music) {
    memory = {key, startedAt: now, hp: new Map(hp.map(p => [p.id, p.hp])), hits: []};
    observations.set(room, memory);
    const restored=room.music?.matchKey===key?room.music:null;
    room.music = restored||{matchKey: key, stage: 'opening', sequence: 0,
      trackId: openingTrack(key), since: now + MUSIC_RULES.leadMs,
      ambienceId: 'crowded-tavern', ambienceSince: now + MUSIC_RULES.leadMs,
      crossfadeMs: MUSIC_RULES.crossfadeMs, musicVolume: MUSIC_RULES.musicVolume,
      ambienceVolume: MUSIC_RULES.ambienceVolume, reason: 'match-start',
      playing: true, playbackReady: Boolean(catalog.playbackReady)};
    room.music.playedTrackIds??=room.music.trackId?[room.music.trackId]:[];
  }
  const cue = room.music;
  if (room.phase === 'finished') {
    if (cue.playing) { cue.playing = false; cue.stoppedAt = now; }
    return cue;
  }
  for (const p of hp) {
    const loss = Math.max(0, (memory.hp.get(p.id) ?? p.hp) - p.hp);
    if (loss) memory.hits.push({id: p.id, amount: loss, at: now});
    memory.hp.set(p.id, p.hp);
  }
  memory.hits = memory.hits.filter(hit => now - hit.at <= MUSIC_RULES.burstWindowMs);
  const ratio = Math.min(...hp.map(p => p.hp / p.max));
  const burst = hp.some(p => memory.hits.filter(hit => hit.id === p.id)
    .reduce((n, hit) => n + hit.amount, 0) >= MUSIC_RULES.burstDamage);
  let next = ratio <= MUSIC_RULES.climaxHpRatio ? 'climax'
    : ratio <= MUSIC_RULES.tensionHpRatio || burst ? 'tension'
    : room.phase!=='mulligan'&&now-memory.startedAt>=MUSIC_RULES.openingDurationMs ? 'table' : 'opening';
  if (ranks[next] < ranks[cue.stage]) {
    // Separate recovery thresholds and minimum residence prevent musical flapping.
    const held = now - cue.since >= MUSIC_RULES.minimumHoldMs;
    const recovered = ratio > (cue.stage === 'climax'
      ? MUSIC_RULES.recoverFromClimaxRatio : MUSIC_RULES.recoverFromTensionRatio);
    if (!held || !recovered) next = cue.stage;
  }
  const current=catalog.tracks.find(track=>track.id===cue.trackId);
  const finishedTrack=current&&now-cue.since>=current.durationSeconds*1000-MUSIC_RULES.crossfadeMs;
  if (next !== cue.stage || finishedTrack) {
    const changedStage=next!==cue.stage;
    cue.stage = next;
    cue.sequence++;
    cue.trackId = selectMusicTrack(key, next, cue.sequence, cue.trackId,catalog,cue.playedTrackIds);
    if(cue.trackId)cue.playedTrackIds.push(cue.trackId);
    cue.since = now + MUSIC_RULES.leadMs;
    cue.reason = !changedStage ? 'track-end' : next === 'climax' ? 'critical-health'
      : next === 'tension' ? (burst ? 'recent-health-loss' : 'low-health')
      : next === 'table' ? 'table-music' : 'recovery';
  }
  return cue;
}

export function musicView(room) {
  // Copy only the cue. Private director observations are never sent to clients.
  if(!room.music)return null;const {playedTrackIds,...publicCue}=room.music;return publicCue;
}

export function playbackPosition(cue, durationSeconds, serverNow) {
  if (!cue?.playing || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  return {waitMs: Math.max(0, cue.since - serverNow),
    offsetSeconds: Math.min(durationSeconds,Math.max(0, serverNow - cue.since) / 1000)};
}
