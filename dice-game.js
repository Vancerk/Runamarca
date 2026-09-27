import { randomBytes, randomUUID, randomInt } from 'node:crypto';

const rooms = new Map();
const code = () => randomBytes(3).toString('hex').toUpperCase();
const token = () => randomBytes(24).toString('hex');
const rollDice = n => Array.from({ length: n }, () => randomInt(1, 7));
const gradeOf = id => id.endsWith('-estanho') ? 'estanho' : id.endsWith('-prata') ? 'prata' : 'ouro';
const familyOf = id => id.replace(/-(estanho|prata|ouro)$/, '');
const allowed = new Set(['casamento','defesa-estanho','defesa-prata','defesa-ouro','duplo-prata','duplo-ouro','fortuna-estanho','fortuna-prata','fortuna-ouro','imperador','largada-estanho','largada-prata','largada-ouro','poder-estanho','poder-prata','poder-ouro','rei-dos-passaros','ressurreicao-estanho','ressurreicao-prata','ressurreicao-ouro','senhor-da-guerra-estanho','senhor-da-guerra-prata','senhor-da-guerra-ouro','tique','transmutacao-estanho','transmutacao-prata','transmutacao-ouro','troca-prata','troca-ouro','vantagem-do-carpinteiro','vantagem-do-carrasco','vantagem-do-sacerdote']);

function response(res, status, data) { res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(data)); }
async function body(req) { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 8000) throw Error('Pedido grande demais.'); } try { return JSON.parse(raw || '{}'); } catch { throw Error('JSON inválido.'); } }
const fail = message => { throw Error(message); };

export function scoreDice(values, powers = {}) {
  if (!Array.isArray(values) || !values.length || values.length > 7 || values.some(n => !Number.isInteger(n) || n < 1 || n > 6)) return 0;
  const counts = Array(7).fill(0); values.forEach(n => counts[n]++);
  const memo = new Map();
  const search = left => {
    const key = left.join(''); if (memo.has(key)) return memo.get(key);
    if (left.slice(1).every(n => n === 0)) return 0;
    let best = -Infinity;
    const use = (required, value) => {
      if (required.some((n, i) => n > left[i])) return;
      const rest = left.map((n, i) => n - required[i]);
      const score = search(rest);
      if (score !== -Infinity) best = Math.max(best, score + value);
    };
    const req = (...nums) => { const a = Array(7).fill(0); nums.forEach(n => a[n]++); return a; };
    if (left[1]) use(req(1), powers.tique ? 200 : 100);
    if (left[5]) use(req(5), powers.tique ? 100 : 50);
    for (let n = 1; n <= 6; n++) for (let count = 3; count <= Math.min(6, left[n]); count++) {
      const triple = n === 1 ? 1000 : n * 100;
      use(req(...Array(count).fill(n)), triple * (2 ** (count - 3)) + (powers.imperador ? 100 : 0));
    }
    use(req(1,2,3,4,5), 500); use(req(2,3,4,5,6), 750); use(req(1,2,3,4,5,6), 1500);
    if (powers.carpinteiro) use(req(3,5), 100);
    if (powers.carrasco) use(req(4,5,6), 300);
    if (powers.sacerdote) use(req(1,3,5), 1000);
    if (powers.casamento) for (let n = 1; n <= 6; n++) use(req(n,n), 100);
    memo.set(key, best); return best;
  };
  return Math.max(0, search(counts));
}
function hasScoring(values, powers) {
  if (values.some(n=>n===1||n===5)) return true;
  const counts=Array(7).fill(0); values.forEach(n=>counts[n]++);
  if (counts.some(n=>n>=3)) return true;
  const includes=group=>group.every(n=>counts[n]>0);
  return (powers.carpinteiro&&includes([3,5]))||(powers.carrasco&&includes([4,5,6]))||(powers.sacerdote&&includes([1,3,5]))||(powers.casamento&&counts.some(n=>n>=2));
}

function player(room, req) { const p = room.players.find(p => p.token === req.headers['x-player-token']); if (!p) fail('Acesso à sala inválido.'); return p; }
const other = (room, p) => room.players.find(q => q.id !== p.id);
function hasPower(room, p, family) { if (!p.insignia || familyOf(p.insignia) !== family) return false; const rival = other(room,p); return !(rival?.insignia && familyOf(rival.insignia) === 'defesa' && gradeOf(rival.insignia) === gradeOf(p.insignia)); }
function powers(room, p) { return { tique:hasPower(room,p,'tique'), imperador:hasPower(room,p,'imperador'), carpinteiro:hasPower(room,p,'vantagem-do-carpinteiro'), carrasco:hasPower(room,p,'vantagem-do-carrasco'), sacerdote:hasPower(room,p,'vantagem-do-sacerdote'), casamento:hasPower(room,p,'casamento') && (p.charges || 0) > 0 }; }
function view(room, p) { return { code:room.code, target:room.target, stake:room.stake, phase:room.phase, turn:room.turn, winner:room.winner, round:room.round, roll:room.roll, available:room.available, turnPoints:room.turnPoints, lastKeep:room.lastKeep, bust:room.bust, proposal:room.proposal, log:room.log.slice(-30), players:room.players.map(q => ({ id:q.id,name:q.name,score:q.score,insignia:q.insignia,insigniaActive:q.insignia?hasPower(room,q,familyOf(q.insignia)):false,charges:q.charges })), you:p.id }; }
function emit(room) { for (const c of room.clients) c.res.write(`data: ${JSON.stringify(view(room,c.player))}\n\n`); }
function log(room, message) { room.log.push(message); if (room.log.length > 100) room.log.shift(); }
function next(room, p, message) { log(room,message); room.turn = other(room,p).id; room.round++; room.roll=[]; room.available=6; room.turnPoints=0; room.lastKeep=0; room.bust=false; }
function charges(id) { const grade=gradeOf(id), family=familyOf(id); if (['defesa','largada','imperador','tique','vantagem-do-carpinteiro','vantagem-do-carrasco','vantagem-do-sacerdote'].includes(family)) return 0; if (family==='casamento') return 3; if (family==='rei-dos-passaros') return 2; if (family==='duplo') return grade==='ouro'?3:2; if (['poder','ressurreicao'].includes(family)) return grade==='ouro'?3:grade==='prata'?2:1; return 1; }
function selected(room, indices) { if (!Array.isArray(indices) || !indices.length || new Set(indices).size!==indices.length || indices.some(i => !Number.isInteger(i) || i<0 || i>=room.roll.length)) fail('Selecione dados válidos da rolagem atual.'); return indices.map(i=>room.roll[i]); }
function requireTurn(room,p) { if (room.phase!=='active' || room.turn!==p.id) fail('Aguarde o seu turno.'); }
function activate(room,p,data) {
  const id=p.insignia, family=id && familyOf(id); if (!id || !hasPower(room,p,family)) fail('Esta insígnia não está ativa.');
  if (p.charges<1) fail('As cargas desta insígnia acabaram.');
  const grade=gradeOf(id), index=Number(data.index);
  if (family==='ressurreicao') {
    if (!room.bust) fail('Ressurreição só pode ser usada após perder a rolagem.');
    room.bust=false; room.roll=rollDice(room.available); p.charges--; log(room,`${p.name} usou Ressurreição e rolou novamente.`);
    if (!hasScoring(room.roll,powers(room,p))) { if (p.charges>0) room.bust=true; else next(room,p,`${p.name} falhou novamente e perdeu os pontos do turno.`); }
    return;
  }
  if (room.bust) fail('Resolva a falha antes de usar outra insígnia.');
  if (family==='senhor-da-guerra') {
    if (!room.turnPoints || room.roll.length) fail('Guarde os dados pontuados antes de usar esta insígnia.');
    const before=room.turnPoints; room.turnPoints=Math.floor(before*(grade==='ouro'?2:grade==='prata'?1.5:1.25)); p.charges--; log(room,`${p.name} ampliou a pontuação do turno de ${before} para ${room.turnPoints}.`); return;
  }
  if (family==='duplo') {
    if (!room.lastKeep || room.roll.length) fail('Duplo precisa de uma combinação recém-guardada.');
    room.turnPoints+=room.lastKeep; room.lastKeep=0; p.charges--; log(room,`${p.name} duplicou a última combinação.`); return;
  }
  if (family==='poder' || family==='rei-dos-passaros') {
    if (!room.roll.length || room.roll.length>=7) fail('Role os dados antes de ganhar um dado extra.');
    room.roll.push(...rollDice(1)); room.available++; p.charges--; log(room,`${p.name} ganhou um dado extra na rolagem.`); return;
  }
  if (!room.roll.length) fail('Role os dados antes de usar esta insígnia.');
  if (family==='fortuna' || family==='troca') {
    const indices=data.indices;
    const max=family==='fortuna'?(grade==='ouro'?3:grade==='prata'?2:1):(grade==='ouro'?2:1);
    const values=selected(room,indices);
    if (indices.length>max || (family==='troca' && grade==='ouro' && (indices.length!==2 || values[0]!==values[1]))) fail('Escolha os dados permitidos por esta insígnia.');
    for (const i of indices) room.roll[i]=randomInt(1,7);
    p.charges--; log(room,`${p.name} usou ${family==='fortuna'?'Fortuna':'Troca'} para rolar novamente.`); return;
  }
  if (family==='transmutacao') {
    if (!Number.isInteger(index)||index<0||index>=room.roll.length) fail('Selecione um dado para transmutar.');
    room.roll[index]=grade==='ouro'?1:grade==='prata'?5:3; p.charges--; log(room,`${p.name} transmutou um dado em ${room.roll[index]}.`); return;
  }
  fail('Esta insígnia modifica a pontuação automaticamente.');
}
function act(room,p,data) {
  const type=data.type;
  if (type==='propose') {
    if (room.phase!=='active' || room.proposal || room.players.some(q=>q.insignia) || room.roll.length || room.bust || room.turnPoints) fail('A proposta pode ser feita entre turnos, antes de rolar.');
    const id=String(data.insignia||''); if (!allowed.has(id)) fail('Escolha uma insígnia válida.');
    const bonus=Math.max(0,Math.min(5000,Math.trunc(Number(data.startBonus)||0)));
    room.proposal={ by:p.id, insignia:id, grade:gradeOf(id), startBonus:bonus }; log(room,`${p.name} propôs jogar com insígnias de ${gradeOf(id)}.`); return;
  }
  if (type==='decline') { if (!room.proposal || room.proposal.by===p.id) fail('Não há proposta para recusar.'); room.proposal=null; log(room,`${p.name} recusou a proposta de insígnias.`); return; }
  if (type==='accept') {
    const offer=room.proposal; if (!offer || offer.by===p.id) fail('Não há proposta para aceitar.');
    const id=String(data.insignia||''); if (!allowed.has(id)||gradeOf(id)!==offer.grade) fail('Escolha uma insígnia da mesma categoria.');
    const proposer=room.players.find(q=>q.id===offer.by); proposer.insignia=offer.insignia; proposer.charges=charges(offer.insignia); p.insignia=id; p.charges=charges(id); room.proposal=null;
    if (offer.startBonus && familyOf(offer.insignia)==='largada') proposer.score+=offer.startBonus;
    if (offer.startBonus && familyOf(id)==='largada') p.score+=offer.startBonus;
    log(room,`${p.name} aceitou: ${offer.grade} entrou em jogo para os dois lados.`); return;
  }
  requireTurn(room,p);
  if (type==='useInsignia') { activate(room,p,data); return; }
  if (room.bust) {
    if (type!=='acceptBust') fail('Use Ressurreição ou aceite a falha.');
    next(room,p,`${p.name} perdeu ${room.turnPoints} pontos do turno.`); return;
  }
  if (type==='roll') {
    if (room.roll.length) fail('Guarde uma combinação antes de rolar novamente.');
    room.roll=rollDice(room.available); room.lastKeep=0;
    if (!hasScoring(room.roll,powers(room,p))) {
      if (hasPower(room,p,'ressurreicao') && p.charges>0) { room.bust=true; log(room,`${p.name} falhou. Pode usar Ressurreição ou aceitar a perda.`); }
      else next(room,p,`${p.name} não pontuou e perdeu os pontos do turno.`);
    } else log(room,`${p.name} lançou ${room.roll.length} dados.`);
    return;
  }
  if (type==='keep') {
    const indices=data.indices, values=selected(room,indices);
    const activePowers=powers(room,p);
    if (!(values.length===2 && values[0]===values[1])) activePowers.casamento=false;
    let score=scoreDice(values,activePowers);
    if (!score) fail('Os dados escolhidos não formam uma pontuação válida.');
    if (hasPower(room,p,'casamento') && values.length===2 && values[0]===values[1] && ![1,5].includes(values[0])) p.charges--;
    room.turnPoints+=score; room.lastKeep=score; room.available-=indices.length; room.roll=[];
    if (room.available===0) room.available=6;
    log(room,`${p.name} guardou ${score} pontos; total do turno: ${room.turnPoints}.`); return;
  }
  if (type==='bank') {
    if (!room.turnPoints || room.roll.length) fail('Guarde uma combinação antes de encerrar.');
    p.score+=room.turnPoints;
    if (p.score>=room.target) { room.phase='finished'; room.winner=p.id; room.turn=null; log(room,`${p.name} venceu com ${p.score} pontos!`); }
    else next(room,p,`${p.name} marcou ${room.turnPoints} pontos. Total: ${p.score}.`);
    return;
  }
  fail('Ação desconhecida.');
}

export async function handleDice(req,res,url) {
  if (!url.pathname.startsWith('/api/dice')) return false;
  try {
    if (req.method==='POST' && url.pathname==='/api/dice/rooms') {
      const data=await body(req), name=String(data.name||'Jogador').trim().slice(0,30)||'Jogador';
      const target=Math.max(1000,Math.min(50000,Math.trunc(Number(data.target)||5000)));
      let roomCode; do { roomCode=code(); } while (rooms.has(roomCode));
      const p={id:randomUUID(),token:token(),name,score:0,insignia:null,charges:0};
      const room={code:roomCode,target,stake:String(data.stake||'').trim().slice(0,80),phase:'lobby',players:[p],turn:null,winner:null,round:1,roll:[],available:6,turnPoints:0,lastKeep:0,bust:false,proposal:null,log:[],clients:new Set()};
      rooms.set(roomCode,room); response(res,200,{code:roomCode,token:p.token}); return true;
    }
    const match=url.pathname.match(/^\/api\/dice\/rooms\/([A-Za-z0-9]+)\/(join|state|events|action)$/);
    if (!match) { response(res,404,{error:'Não encontrado.'}); return true; }
    const room=rooms.get(match[1].toUpperCase()), op=match[2]; if (!room) fail('Sala não encontrada.');
    if (op==='join' && req.method==='POST') {
      if (room.players.length!==1 || room.phase!=='lobby') fail('Sala já está completa.');
      const data=await body(req); const p={id:randomUUID(),token:token(),name:String(data.name||'Jogador').trim().slice(0,30)||'Jogador',score:0,insignia:null,charges:0};
      room.players.push(p); room.phase='active'; room.turn=room.players[randomInt(0,2)].id; log(room,`${p.name} entrou na mesa. A partida começou.`);
      response(res,200,{code:room.code,token:p.token}); emit(room); return true;
    }
    const p=player(room,req);
    if (op==='state' && req.method==='GET') { response(res,200,view(room,p)); return true; }
    if (op==='events' && req.method==='GET') {
      res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive'});
      const c={res,player:p}; room.clients.add(c); res.write(`data: ${JSON.stringify(view(room,p))}\n\n`);
      const heartbeat=setInterval(()=>res.write(': ping\n\n'),20000); req.on('close',()=>{clearInterval(heartbeat);room.clients.delete(c);}); return true;
    }
    if (op==='action' && req.method==='POST') { act(room,p,await body(req)); response(res,200,{ok:true}); emit(room); return true; }
    response(res,405,{error:'Método inválido.'}); return true;
  } catch(error) { response(res,400,{error:error.message||'Erro inesperado.'}); return true; }
}
