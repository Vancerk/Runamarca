// S6 wiring smoke: the room server (mesa-nova/server.mjs) answers the feedback route with the
// seat token. Isolated instance on an ephemeral port, own store dir, shared bot disabled.
// Usage: node scripts/s6-http-smoke.mjs <out-dir>
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
const out=path.resolve(process.argv[2]||'prototype-qa/s6/http');fs.mkdirSync(out,{recursive:true});
process.env.NODE_ENV='test';process.env.RUNAMARCA_SHARED_BOT='0';process.env.RUNAMARCA_FEEDBACK_DIR=path.join(out,'store');delete process.env.DATABASE_URL;
const {handleNewGame,createTestAccess,feedbackStore}=await import('../mesa-nova/server.mjs');
const server=http.createServer((req,res)=>{req.headers.cookie=createTestAccess(req,'');handleNewGame(req,res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`,checks=[];const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log(pass?'ok  ':'FAIL',name,pass?'':JSON.stringify(detail).slice(0,300));};
const req=async(p,{method='GET',token,body}={})=>{const r=await fetch(base+p,{method,headers:{'content-type':'application/json',...(token?{'x-player-token':token}:{})},body:body&&JSON.stringify(body)});return {status:r.status,body:await r.json().catch(()=>null)};};
try{const c=await req('/api/create',{method:'POST',body:{name:'Ana'}});const code=c.body.code,token=c.body.token;
 const g=await req(`/api/rooms/${code}/feedback`,{token});check('GET com token do assento: contrato, sem partida',g.status===200&&g.body.contract==='runamarca-feedback/1'&&g.body.eligible===false&&g.body.reason==='MATCH_UNKNOWN',g);
 const bad=await req(`/api/rooms/${code}/feedback`,{method:'POST',token:'x'.repeat(32),body:{matchId:'abcdefgh-1',answers:{fun:3}}});check('POST com token inválido recusado (SEAT_INVALID)',bad.status===400&&bad.body.code==='SEAT_INVALID',bad);
 const none=await req(`/api/rooms/${code}/feedback`,{method:'POST',token,body:{matchId:'abcdefgh-1',answers:{fun:3}}});check('POST para partida inexistente: 404 MATCH_UNKNOWN',none.status===404&&none.body.code==='MATCH_UNKNOWN',none);
 check('servidor usa o repositório configurado por RUNAMARCA_FEEDBACK_DIR',feedbackStore.backend==='file'&&feedbackStore.dir===process.env.RUNAMARCA_FEEDBACK_DIR,{backend:feedbackStore.backend,dir:feedbackStore.dir});
}finally{server.close();}
fs.writeFileSync(path.join(out,'s6-http-smoke.json'),JSON.stringify({checks},null,1));console.log(`${checks.filter(c=>c.pass).length}/${checks.length} checks`);process.exit(checks.every(c=>c.pass)?0:1);
