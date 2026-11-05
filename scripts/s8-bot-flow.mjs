// S8: human vs the REAL automatic bot (shared bot runtime of the server) through the prototype
// server HTTP API: create room → addBot → deck → mulligan → several Preparation rounds. The human
// only ends turns, votes and confirms; every bot move comes from the server's bot. Records phases,
// rounds, the bot's own actions (from the public log) and the S6 feedback contract state.
// Usage: node scripts/s8-bot-flow.mjs <base> <out-dir> [seconds]
import fs from 'node:fs';import path from 'node:path';
const [base='http://127.0.0.1:3086/runamarca',out='prototype-qa/s8/bot-flow',secs='150']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const checks=[],check=(n,p,d)=>{checks.push({name:n,pass:!!p,detail:d});console.log(p?'ok  ':'FAIL',n,p?'':JSON.stringify(d).slice(0,400));};
const api=async(p,body,token)=>{const r=await fetch(base+p,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{'x-player-token':token}:{})},body:body&&JSON.stringify(body)});const t=await r.text();let j=null;try{j=JSON.parse(t);}catch{}return {status:r.status,body:j};};
const c=await api('/api/create',{name:'Ana'});const code=c.body.code,token=c.body.token;let state=c.body.state;
const acts=[],act=async b=>{const r=await api(`/api/rooms/${code}/act`,b,token);acts.push({type:b.type,status:r.status,error:r.body?.error||null,phase:r.body?.phase});if(r.status===200&&r.body?.phase)state=r.body;return r;};
await act({type:'addBot',deckId:'ruptura-grupo'});await act({type:'deck',deckId:'fluxo-virelion',art:{}});
const seen={phases:new Set(),rounds:new Set(),botLog:new Set(),botTurns:0},until=Date.now()+Number(secs)*1000;let lastTurnBot=false,matchId=null;
while(Date.now()<until){const s=(await api(`/api/rooms/${code}/state`,null,token)).body;if(!s)break;state=s;matchId=s.matchId||matchId;seen.phases.add(s.phase);seen.rounds.add(s.round);
 const me=s.players.find(p=>p.id===s.you),bot=s.players.find(p=>p.id!==s.you);for(const l of s.log||[])if(l.actor===bot?.id)seen.botLog.add(l.message);
 if(s.phase==='prep'&&s.turn===bot?.id&&!lastTurnBot){seen.botTurns++;lastTurnBot=true;}if(s.turn===me?.id)lastTurnBot=false;
 if(s.phase==='finished')break; // S8: no early stop at round 4; the [seconds] argument is the only limit.
 if(s.phase==='mulligan'&&!me.mulliganReady)await act({type:'confirmMulligan'});
 else if(s.phase==='prep'&&s.turn===me.id)await act({type:'endPrep'});
 else if(s.phase==='vote'&&me.vote==null)await act({type:'vote',fight:true});
 else if(s.phase==='formation'&&!me.ready)await act({type:'ready'});
 await new Promise(r=>setTimeout(r,400));}
const fb=(await api(`/api/rooms/${code}/feedback${matchId?'?matchId='+matchId:''}`,null,token)).body;
const rejected=acts.filter(a=>a.status!==200);
check('bot real entrou e a partida começou pelo servidor (mulligan → preparação)',seen.phases.has('prep')&&matchId,{phases:[...seen.phases],matchId});
check('o bot automático jogou turnos próprios (vez do bot ocorreu e o log registra ações do bot)',seen.botTurns>=2&&seen.botLog.size>=2,{botTurns:seen.botTurns,botLog:[...seen.botLog].slice(-6)});
check('a partida avançou rodadas com combate e circuito do motor (fases vote/formation/resolving vistas)',[...seen.rounds].some(r=>r>=3)&&seen.phases.has('resolving'),{rounds:[...seen.rounds],phases:[...seen.phases]});
check('contrato S6/S7 vigente para a partida em andamento contra o bot (contexto pve, ainda não elegível)',fb?.contract==='runamarca-feedback/1'&&fb.context?.mode==='pve'&&fb.eligible===(state.phase==='finished')&&(fb.reason===null||fb.reason==='MATCH_NOT_FINISHED'),{fb:fb&&{eligible:fb.eligible,reason:fb.reason,mode:fb.context?.mode,opponent:fb.context?.opponent?.kind,you:fb.context?.you?.style}});
fs.writeFileSync(path.join(out,'s8-bot-flow.json'),JSON.stringify({code,matchId,phases:[...seen.phases],rounds:[...seen.rounds],botTurns:seen.botTurns,botLog:[...seen.botLog],rejected,checks,feedback:fb&&{eligible:fb.eligible,reason:fb.reason,context:fb.context}},null,1));
console.log(`${checks.filter(x=>x.pass).length}/${checks.length} checks`);process.exitCode=checks.every(x=>x.pass)?0:1;
