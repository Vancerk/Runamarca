// Bloco B · servidor de protótipo isolado para o vídeo da sequência real (somente loopback, modo de teste).
// It is scripts/board-prototype-server.mjs plus a QA control port (PROTOTYPE_PORT+1, 127.0.0.1 only) with ONE
// route: POST /scene/<code> moves, for each seat, one creature of its own deck (fluxo: FV01 Fogo Fátuo 3/2,
// forja: FL06 Anão estudioso 2/2) from its deck/hand to its reserve, during the preparation. Nothing else is
// changed: no HP, damage, rules, clocks, phase or turn; everything after it (end of preparation, vote, formation,
// drag, confirmation, combat, casualties, next preparation) runs through the real server and engine.
import {randomBytes} from 'node:crypto';import http from 'node:http';
process.env.NODE_ENV='test';
process.env.RUNAMARCA_ACCESS_SECRET=randomBytes(32).toString('hex');
for(const name of ['DATABASE_URL','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI'])delete process.env[name];
const {server}=await import('../server.js');
const {createTestAccess,roomsForTest}=await import('../mesa-nova/server.mjs');
server.prependListener('request',(req)=>{if(req.url.startsWith('/runamarca/'))req.headers.cookie=(req.headers.cookie?req.headers.cookie+'; ':'')+createTestAccess(req,'/runamarca');});
const port=Number(process.env.PROTOTYPE_PORT||3087),PICK={'fluxo-virelion':'FV01','forja-oficina-lyrik':'FL06'};
server.listen(port,'127.0.0.1',()=>console.log(`Prototype QA: http://127.0.0.1:${port}/runamarca/`));
http.createServer((req,res)=>{
 const m=req.method==='POST'&&req.url.match(/^\/scene\/([A-Z0-9]+)$/),send=(code,body)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 if(!m)return send(404,{error:'not found'});
 const room=roomsForTest().get(m[1]);if(!room)return send(404,{error:'room'});if(room.phase!=='prep')return send(409,{error:'phase '+room.phase});
 const moved=[];for(const p of room.players){const id=PICK[p.deckId];if(!id)continue;let c=p.deck.find(x=>x.id===id);if(c)p.deck.splice(p.deck.indexOf(c),1);else{c=p.hand.find(x=>x.id===id);if(c)p.hand.splice(p.hand.indexOf(c),1);}if(!c)continue;p.reserve.push(c);moved.push({player:p.name,card:c.name,uid:c.uid,stats:c.attack+'/'+c.health});}
 room.revision++;send(200,{moved});
}).listen(port+1,'127.0.0.1',()=>console.log(`QA control: http://127.0.0.1:${port+1}/scene/<code>`));
