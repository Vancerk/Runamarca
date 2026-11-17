import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {makeRoom,join,act,view} from './game.mjs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const catalog=JSON.parse(read('cartas.json')),all=catalog.decks.flatMap(d=>d.cards),sfx=JSON.parse(read('sfx-catalog.json'));
test('every Platinum has reserve and combat staging and mechanic-specific colour',()=>{
 const scope=vm.createContext({});vm.runInContext(read('platinum-entry.js'),scope);
 const palettes=new Set();for(const id of ['FL11','FL12','FV15','RG10']){const card=all.find(c=>c.id===id),a=scope.RunaPlatinumEntry.definition(card,'reserve'),b=scope.RunaPlatinumEntry.definition(card,'combat');assert.notEqual(a.phase,b.phase);assert.ok(a.duration>b.duration);assert.ok(b.duration<2800);palettes.add(a.palette.join());for(const [,cue]of a.cues)assert.ok(sfx.cues[cue]?.sourceId,cue);}assert.equal(palettes.size,4);
});
function combat(platinums){
 const deck=catalog.decks.find(d=>d.id==='forja-oficina-lyrik'),room=makeRoom('MANIFEST','A'),a=room.players[0],b=join(room,'B');
 for(const p of [a,b])Object.assign(p,{patron:{hp:100,maxHp:100},mana:10,manaMax:10,deckData:deck,deck:[],taunts:{}});
 Object.assign(room,{first:a.id,turn:a.id,phase:'formation'});
 const place=(p,id,lane)=>{const c={...structuredClone(all.find(c=>c.id===id)),uid:crypto.randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,protocolMode:'assault'};p.reserve.push(c);p.formation[lane]=c.uid;};
 place(a,platinums?'FL12':'FL03',0);if(platinums>1)place(b,'FL11',1);
 const timeout=globalThis.setTimeout;let finish;try{globalThis.setTimeout=(fn,ms)=>{finish={fn,ms};return 0;};act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);}finally{globalThis.setTimeout=timeout;}
 return {room,a,b,finish};
}
test('one or multiple Platinum cards share one bounded server reveal window',()=>{
 for(const count of [0,1,2]){const {room,a,b,finish}=combat(count);assert.equal(room.phase,'resolving');assert.equal(room.combat.timeline[0].duration,count?2800:1200);assert.deepEqual(view(room,a).combat.timeline,view(room,b).combat.timeline);assert.equal(finish.ms,room.combat.timeline.reduce((n,s)=>n+s.duration,0));const before=room.players.map(p=>p.reserve.map(c=>[c.uid,c.damage,c.attack]));view(room,a);view(room,b);assert.deepEqual(room.players.map(p=>p.reserve.map(c=>[c.uid,c.damage,c.attack])),before);finish.fn();assert.notEqual(room.phase,'resolving');}
});
test('new death effects point to the three documented official downloads',()=>{
 const sources=JSON.parse(read('manifestations-audio-sources.json'));for(const id of ['death_machine','death_runic','death_synthetic']){const cue=sfx.cues[id];assert.ok(sources.downloads.some(x=>x.id===cue.sourceId));assert.match(cue.sourceUrl,/^https:\/\/www\.epidemicsound\.com\/sound-effects\/tracks\//);assert.ok(fs.statSync(new URL(cue.url,import.meta.url)).size>1000);}
});
test('every catalog sample exists; table effects stay silent if the player cannot play',()=>{
 for(const [key,cue] of Object.entries(sfx.cues)){if(cue.enabled===false)continue;assert.ok(cue.sourceId,key);assert.ok(fs.existsSync(new URL(cue.url.split('?')[0],import.meta.url)),key);}
 const calls=[],scope=vm.createContext({RunaSfx:{play:(ctx,key)=>{calls.push(key);return false;}}});vm.runInContext(read('table-audio.js'),scope);
 const context={state:'running',createOscillator(){throw Error('Synthetic fallback forbidden');},createBuffer(){throw Error('Noise fallback forbidden');}};
 for(const kind of ['death_machine','death_synthetic','death_runic','hammer','turn','unknown'])assert.equal(scope.RunaTableAudio.effect(context,kind),false);assert.equal(calls.length,6);
});
test('playback source policy excludes generated tones and the old free sample loading',()=>{
 for(const file of ['app.js','table-audio.js','damage-fx.js','patron-intro.js','contract-opening.js','forge-hammer.js','pacotes-preview.js']){const source=read(file);assert.doesNotMatch(source,/createOscillator|impactGeneric_light_000|soundFiles=/,file);}
 assert.doesNotMatch(read('music-table.js'),/Versão anterior/);
});
