import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const base=new URL('./',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('patron-dialogues.json',base)));
const introCode=fs.readFileSync(new URL('patron-intro.js',base),'utf8'),voiceCode=fs.readFileSync(new URL('patron-voice.js',base),'utf8');
const p=(id,affinity)=>({id,patron:{affinity}});
const intro=vm.runInNewContext(introCode+';RunaPatronIntro');
test('Espelhos identificam cada ator e selecionam o mesmo diálogo nas duas perspectivas',()=>{
 const a=p('A','forja'),b=p('B','forja'),variants=new Set();
 for(let i=0;i<20;i++){
  const options={matchKey:'room:'+i},left=intro.selectDialogue(data,[a,b],'A',options),right=intro.selectDialogue(data,[b,a],'A',options);
  assert.equal(left.id,right.id);variants.add(left.id);
  for(const line of left.lines){assert.equal(intro.actorForLine(line,[b,a],'A').id,line.role==='first'?'A':'B');}
 }
 assert.equal(variants.size,2);
 const selected=intro.selectDialogue(data,[a,b],'A',{dialogueId:'lyrik-lyrik-culpa'});
 assert.equal(selected.lines[0].role,'second');
 assert.equal(intro.actorForLine(data.matchups[0].lines[0],[p('M','fluxo'),a],'M').id,'A');
});
test('Todos os 15 novos áudios existem; Marika nova aguarda gravação e Dom continua intacto',()=>{
 const clips=[...data.matchups.flatMap(m=>m.lines),...Object.values(data.cues.lyrik.powers),...Object.values(data.cues.lyrik.victory),data.cues.lyrik.defeat];
 const received=clips.filter(l=>/^LR\d+$/.test(l.recordingCode||''));
 assert.equal(new Set(received.map(c=>c.audio)).size,15);
 for(const line of received){assert.ok(fs.statSync(new URL(line.audio,base)).size>1000);assert.ok(line.durationSeconds>0);}
 for(const m of data.matchups.filter(m=>['lyrik-marika','marika-lyrik'].includes(m.id)))for(const line of m.lines.filter(l=>l.speaker==='marika'))assert.equal(line.audio,null);
 assert.equal(data.matchups.find(m=>m.id==='dom-lyrik').lines[0].recordingCode,'D02');
});
function harness({delayed=false}={}){
 const playbackData=structuredClone(data);playbackData.cues.lyrik.powers['forjar-armadura'].enabled=true;
 let starts=0,stops=0,release;const sources=[],classes=new Set();
 const context={state:'running',destination:{},decodeAudioData:async()=>({duration:1}),createGain:()=>({gain:{},connect(){return this;},disconnect(){}}),createBufferSource(){const s={connect(){return this;},disconnect(){},start(){starts++;},stop(){stops++;}};sources.push(s);return s;}};
 const scope={console,setTimeout,clearTimeout,setInterval,clearInterval,document:{body:{classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}}},RunaPatronIntro:{manifest:()=>delayed?new Promise(r=>{release=()=>r(playbackData);}):Promise.resolve(playbackData)},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})};
 const api=vm.runInNewContext(voiceCode+';RunaPatronVoice',scope);
 return {api,context,sources,classes,get starts(){return starts;},get stops(){return stops;},release:()=>release?.(),options:{base:'/',player:p('L','forja'),kind:'power',powerId:'forjar-armadura',getAudioContext:()=>context}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('Poderes e vitórias escolhem fala específica ou neutra sem usar falas de Lyrik para outros Patronos',()=>{
 const {api}=harness();const lyrik=p('L','forja');
 assert.equal(api.selectCue(data,lyrik,'power',{powerId:'forjar-armadura'}),null,'basic voice is temporarily disabled');
 assert.equal(api.selectCue(data,lyrik,'power',{powerId:'forjar-arma'}).recordingCode,'LR11');
 for(const [affinity,code] of [['forja','LR14'],['fluxo','LR13'],['ruptura','LR12']])assert.equal(api.selectCue(data,lyrik,'victory',{opponent:p('O',affinity)}).recordingCode,code);
 assert.equal(api.selectCue(data,p('M','fluxo'),'defeat'),null);
});
test('Eventos duplicados não repetem fala; cancelamento interrompe áudio e fila',async()=>{
 const h=harness(),first=h.api.play({...h.options,key:'1'});
 await tick();await h.api.play({...h.options,key:'1'});assert.equal(h.starts,1);assert.ok(h.classes.has('patron-voice-active'));
 const queued=h.api.play({...h.options,key:'2'});h.api.cancel();await Promise.all([first,queued]);assert.equal(h.starts,1);assert.equal(h.stops,1);assert.equal(h.classes.size,0);
});
test('Trocar de partida durante carregamento impede reprodução tardia',async()=>{
 const h=harness({delayed:true}),playing=h.api.play(h.options);await tick();h.api.cancel();h.release();await playing;assert.equal(h.starts,0);
});
test('Fim de uma fala libera a próxima sem sobreposição; validade e áudio suspenso são respeitados',async()=>{
 const h=harness(),a=h.api.play(h.options),b=h.api.play({...h.options,kind:'victory'});await tick();assert.equal(h.starts,1);h.sources[0].onended();await a;await tick();assert.equal(h.starts,2);h.sources[1].onended();await b;
 await h.api.play({...h.options,valid:()=>false});assert.equal(h.starts,2);
 h.context.state='suspended';await h.api.play(h.options);assert.equal(h.starts,2);
});

test('Balões seguem o relógio do áudio e desaparecem ao terminar ou cancelar',async()=>{
 const h=harness(),captions=[];h.context.currentTime=0;
 const playing=h.api.play({...h.options,onCaption:t=>captions.push(t)});await tick();
 assert.equal(captions.at(-1),'Sem ordens, nem deveres.');
 h.context.currentTime=2.1;await new Promise(r=>setTimeout(r,80));assert.equal(captions.at(-1),'Só aço e chamas!');
 h.sources[0].onended();await playing;assert.equal(captions.at(-1),null);
 const cancelled=h.api.play({...h.options,onCaption:t=>captions.push(t)});await tick();h.api.cancel();await cancelled;assert.equal(captions.at(-1),null);
});
