import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syncMusic,musicView,playbackPosition,MUSIC_RULES,selectMusicTrack} from './music-director.mjs';
import {makeRoom,join,act,view} from './game.mjs';

function fixture() {
  const room = {code:'MUSIC1',matchId:'match-1',phase:'prep',players:[
    {id:'a',patron:{hp:20,maxHp:20}}, {id:'b',patron:{hp:20,maxHp:20}},
  ]};
  syncMusic(room, 100_000);
  return room;
}
test('the same public cue reaches both players and spectators, including late entry', () => {
  const catalog = JSON.parse(readFileSync(new URL('./cartas.json',import.meta.url)));
  const room = makeRoom('ABCDEF','A'), a=room.players[0], b=join(room,'B');
  act(room,a,{type:'deck',deckId:catalog.decks[0].id},catalog);
  act(room,b,{type:'deck',deckId:catalog.decks[1].id},catalog);
  const spectator=join(room,'C','spectator');
  assert.equal(room.phase,'mulligan');
  assert.equal(view(room,a).music.stage,'opening');
  assert.deepEqual(view(room,a).music,view(room,b).music);
  assert.deepEqual(view(room,a).music,view(room,spectator).music);
  const before=musicView(room);
  view(room,b);view(room,a);
  assert.deepEqual(musicView(room),before,'reading a view cannot restart or reroll the song');
});
test('health thresholds use either public Patron, independent of perspective', () => {
  const room=fixture();
  room.players[1].patron.hp=10;
  syncMusic(room,102_000);
  assert.equal(room.music.stage,'tension');
  room.players[0].patron.hp=5;
  syncMusic(room,103_000);
  assert.equal(room.music.stage,'climax');
  assert.equal(room.music.reason,'critical-health');
  const reversed=fixture();reversed.players.reverse();reversed.players[0].patron.hp=10;
  syncMusic(reversed,102_000);
  assert.equal(reversed.music.stage,'tension');
});
test('damage accumulates per Patron across 30 seconds; armor alone does not trigger it', () => {
  const room=fixture();
  room.players[0].patron.armor=0;
  syncMusic(room,101_000);
  assert.equal(room.music.stage,'opening');
  room.players[0].patron.hp=17;syncMusic(room,102_000);
  room.players[1].patron.hp=18;syncMusic(room,103_000);
  assert.equal(room.music.stage,'opening','damage to different Patrons is not added together');
  room.players[0].patron.hp=15;syncMusic(room,104_000);
  assert.equal(room.music.stage,'tension');
  assert.equal(room.music.reason,'recent-health-loss');
});
test('expired bursts and healing are handled, with minimum hold and recovery hysteresis', () => {
  const room=fixture();
  room.players[0].patron.hp=17;syncMusic(room,102_000);
  room.players[0].patron.hp=15;syncMusic(room,133_000);
  assert.equal(room.music.stage,'opening','old damage expires');
  room.players[0].patron.hp=10;syncMusic(room,134_000);
  room.players[0].patron.hp=20;syncMusic(room,140_000);
  assert.equal(room.music.stage,'tension','healing cannot immediately restart calm music');
  syncMusic(room,181_000);
  assert.equal(room.music.stage,'table');
  room.players[0].patron.hp=5;syncMusic(room,182_000);
  room.players[0].patron.hp=7;syncMusic(room,230_000);
  assert.equal(room.music.stage,'climax','exactly 35% is below the recovery boundary');
  room.players[0].patron.hp=8;syncMusic(room,231_000);
  assert.equal(room.music.stage,'tension');
});
test('hidden formations and engine previews never affect a public music decision', () => {
  const room=fixture(),before=musicView(room);
  room.players[0].hand=[{attack:100}];room.players[1].formation=['secret'];
  syncMusic(room,102_000);
  assert.deepEqual(musicView(room),before);
  room.collectPreview=true;room.players[0].patron.hp=1;
  syncMusic(room,103_000);
  assert.deepEqual(musicView(room),before);
});
test('new matches reset the cue; finished and lobby states stop playback', () => {
  const room=fixture();
  room.players[0].patron.hp=5;syncMusic(room,102_000);
  room.phase='finished';syncMusic(room,104_000);
  assert.equal(room.music.playing,false);
  assert.equal(playbackPosition(room.music,90,105_000),null);
  room.phase='lobby';syncMusic(room,106_000);
  assert.equal(room.music,null);
  room.phase='prep';room.matchId='match-2';room.players[0].patron.hp=20;
  syncMusic(room,107_000);
  assert.equal(room.music.stage,'opening');
  assert.equal(room.music.matchKey,'match-2');
});
test('reconnect positions derive from server time, without restarting a finished song', () => {
  const cue=fixture().music;
  assert.deepEqual(playbackPosition(cue,90,100_000),{waitMs:1200,offsetSeconds:0});
  assert.deepEqual(playbackPosition(cue,90,193_200),{waitMs:0,offsetSeconds:90});
  assert.equal(playbackPosition(cue,0,193_200),null);
  const copy=musicView({music:cue});copy.trackId='bad';
  assert.notEqual(copy.trackId,cue.trackId);
  assert.equal(cue.musicVolume,.17);assert.equal(cue.ambienceVolume,.07);
  assert.equal(cue.crossfadeMs,MUSIC_RULES.crossfadeMs);
  assert.equal(cue.playbackReady,true,'local library is ready, while mood labels remain provisional');
});
test('every selected cue has a real candidate in the catalog and no local private path', () => {
  const catalog=JSON.parse(readFileSync(new URL('./music-catalog.json',import.meta.url)));
  const ids=new Set(catalog.tracks.map(t=>t.id));
  for(let i=0;i<30;i++){
    const room=fixture();room.matchId='catalog-'+i;syncMusic(room,102_000);
    for(const hp of [20,10,5]){
      room.players[0].patron.hp=hp;syncMusic(room,103_000+hp);
      assert.ok(room.music.trackId===null||ids.has(room.music.trackId));
      assert.ok(ids.has(room.music.ambienceId));
    }
  }
  assert.equal(catalog.playbackReady,true);
  assert.doesNotMatch(JSON.stringify(catalog),/Downloads|previewPath|C:\\\\/);
});

test('archived music is not selected; empty, single and multi-song pools are valid',()=>{
 assert.match(fixture().music.trackId,/^epidemic-/);
 const library={tracks:[{id:'disabled',enabled:false,url:'x',durationSeconds:10,stages:['opening']}]};
 assert.equal(selectMusicTrack('m','opening',0,null,library),null);
 library.tracks.push({id:'a',url:'a.mp3',durationSeconds:10,stages:['opening']});
 assert.equal(selectMusicTrack('m','opening',1,'a',library),'a');
 library.tracks.push({id:'b',url:'b.mp3',durationSeconds:10,stages:['opening']});
 assert.equal(selectMusicTrack('m','opening',2,'a',library),'b');
});

test('introduction transitions to shared table music, then rotates at the end',()=>{
 const room=fixture();const opening=room.music.trackId;
 syncMusic(room,155_000);assert.equal(room.music.stage,'table');assert.notEqual(room.music.trackId,opening);
 const library=JSON.parse(readFileSync(new URL('./music-catalog.json',import.meta.url)));
 const before=room.music.trackId,track=library.tracks.find(t=>t.id===before);
 syncMusic(room,room.music.since+track.durationSeconds*1000);
 assert.equal(room.music.reason,'track-end');assert.notEqual(room.music.trackId,before);
});

test('successive matches alternate openings while the same match keeps its choice',()=>{
 const a=fixture();a.matchId='opening-sequence-a';syncMusic(a,200_000);
 const b=fixture();b.matchId='opening-sequence-b';syncMusic(b,200_000);
 assert.notEqual(a.music.trackId,b.music.trackId);
 const same=fixture();same.matchId=a.matchId;syncMusic(same,200_000);assert.equal(same.music.trackId,a.music.trackId);
});

test('a long match never repeats music, even after recovery and repeated stage changes',()=>{
 const room=fixture(),heard=new Set([room.music.trackId]);let time=100000;
 for(let i=0;i<45;i++){time+=320000;room.players[0].patron.hp=[20,10,4,20][i%4];const old=room.music.sequence;syncMusic(room,time);if(room.music.sequence!==old&&room.music.trackId){assert.ok(!heard.has(room.music.trackId));heard.add(room.music.trackId);}}
 assert.ok(heard.size>=6);assert.equal(room.music.trackId,null,'exhausted compatible pools keep only ambience');
 const restored=structuredClone(room);syncMusic(restored,time+1);assert.deepEqual(restored.music.playedTrackIds,room.music.playedTrackIds);
 assert.equal(musicView(room).playedTrackIds,undefined);
});
