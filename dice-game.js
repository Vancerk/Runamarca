import { randomBytes, randomUUID, randomInt } from 'node:crypto';

const rooms = new Map();
const code = () => randomBytes(3).toString('hex').toUpperCase();
const token = () => randomBytes(24).toString('hex');
const rollDice = n => Array.from({ length: n }, () => randomInt(1, 7));
const uniqueGrades = { 'vantagem-do-carpinteiro':'estanho', 'vantagem-do-carrasco':'prata', 'vantagem-do-sacerdote':'ouro', 'rei-dos-passaros':'unica', imperador:'ouro', tique:'ouro', casamento:'ouro' };
const gradeOf = id => uniqueGrades[id] || (id.endsWith('-estanho') ? 'estanho' : id.endsWith('-prata') ? 'prata' : 'ouro');
const familyOf = id => id.replace(/-(estanho|prata|ouro)$/, '');
const allowed = new Set(['casamento','defesa-estanho','defesa-prata','defesa-ouro','duplo-prata','duplo-ouro','fortuna-estanho','fortuna-prata','fortuna-ouro','imperador','largada-estanho','largada-prata','largada-ouro','poder-estanho','poder-prata','poder-ouro','rei-dos-passaros','ressurreicao-estanho','ressurreicao-prata','ressurreicao-ouro','senhor-da-guerra-estanho','senhor-da-guerra-prata','senhor-da-guerra-ouro','tique','transmutacao-estanho','transmutacao-prata','transmutacao-ouro','troca-prata','troca-ouro','vantagem-do-carpinteiro','vantagem-do-carrasco','vantagem-do-sacerdote']);
const lost = new Set(['diabo','mao-do-homem-morto','coroa-do-rei-deposto','eclipse','espelho-da-viuva','grilhao-do-carcereiro','ampulheta-quebrada','lagrima-da-santa','moeda-de-duas-caras','olho-do-profeta']);

function response(res, status, data) { res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(data)); }
async function body(req) { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 8000) throw Error('Pedido grande demais.'); } try { return JSON.parse(raw || '{}'); } catch { throw Error('JSON inválido.'); } }
const fail = message => { throw Error(message); };

export function scoreDiceDetailed(values, powers = {}) {
  if (!Array.isArray(values) || !values.length || values.length > 7 || values.some(n => !Number.isInteger(n) || n < 1 || n > 6)) return { score:0, marriagesUsed:0, groups:[] };
  const counts = Array(7).fill(0); values.forEach(n => counts[n]++);
  const memo = new Map();
  const marriageCharges = Math.max(0, Math.min(3, Number(powers.casamentoCharges ?? (powers.casamento ? 1 : 0)) || 0));
  const search = (left, marriagesLeft) => {
    const key = `${left.join('')}:${marriagesLeft}`; if (memo.has(key)) return memo.get(key);
    if (left.slice(1).every(n => n === 0)) return { score:0, marriagesUsed:0, groups:[] };
    let best = { score:-Infinity, marriagesUsed:0, groups:[] };
    const use = (required, value, label, marriage = false) => {
      if (required.some((n, i) => n > left[i])) return;
      if (marriage && marriagesLeft < 1) return;
      const rest = left.map((n, i) => n - required[i]);
      const tail = search(rest, marriagesLeft - Number(marriage));
      const candidate = { score:tail.score + value, marriagesUsed:tail.marriagesUsed + Number(marriage), groups:[`${label} (${value})`,...tail.groups] };
      if (candidate.score > best.score || (candidate.score === best.score && candidate.marriagesUsed < best.marriagesUsed)) best = candidate;
    };
    const req = (...nums) => { const a = Array(7).fill(0); nums.forEach(n => a[n]++); return a; };
    if (!powers.noSingles && left[1]) use(req(1), powers.tique ? 200 : 100, powers.tique?'1 individual ×2':'1 individual');
    if (!powers.noSingles && left[5]) use(req(5), powers.tique ? 100 : 50, powers.tique?'5 individual ×2':'5 individual');
    if (powers.prophetFace && left[powers.prophetFace]) use(req(powers.prophetFace), 0, `face ${powers.prophetFace} do Profeta`);
    for (let n = 1; n <= 6; n++) for (let count = 3; count <= Math.min(6, left[n]); count++) {
      const triple = n === 1 ? 1000 : n * 100;
      use(req(...Array(count).fill(n)), triple * (2 ** (count - 3)) + (powers.imperador ? 100 : 0), `${['','','','trinca','quadra','quina','sena'][count]} de ${n}${powers.imperador?' + Imperador':''}`);
    }
    use(req(1,2,3,4,5), 500, 'sequência 1–5'); use(req(2,3,4,5,6), 750, 'sequência 2–6'); use(req(1,2,3,4,5,6), 1500, 'sequência 1–6');
    if (powers.carpinteiro) use(req(3,5), 100, 'Carpinteiro 3+5');
    if (powers.carrasco) use(req(4,5,6), 300, 'Carrasco 4+5+6');
    if (powers.sacerdote) use(req(1,3,5), 1000, 'Sacerdote 1+3+5');
    if (marriagesLeft) for (let n = 1; n <= 6; n++) use(req(n,n), 100, `Casamento: par de ${n}`, true);
    memo.set(key, best); return best;
  };
  const result = search(counts, marriageCharges);
  const bonus=result.score > -Infinity && powers.prophetFace ? counts[powers.prophetFace] * 100 : 0;
  return { score: Math.max(0, result.score + bonus), marriagesUsed:result.score > -Infinity ? result.marriagesUsed : 0, groups:result.score > -Infinity ? [...result.groups,...(bonus?[`Olho do Profeta: ${counts[powers.prophetFace]} × 100 (${bonus})`]:[])] : [] };
}
export function scoreDice(values, powers = {}) { return scoreDiceDetailed(values, powers).score; }
function hasScoring(values, powers) { for (let mask=1; mask<(1<<values.length); mask++) { const choice=values.filter((_,i)=>mask&(1<<i)); if (scoreDice(choice,powers)>0) return true; } return false; }

function participant(name){return {id:randomUUID(),token:token(),name,score:0,insignia:null,charges:0,legendary:null,legendaryCharges:0,insigniasLocked:false,skipNextTurn:false,lastCommonUsed:null};}
function player(room, req) { const p = [...room.players,...room.spectators].find(p => p.token === req.headers['x-player-token']); if (!p) fail('Acesso à sala inválido.'); return p; }
const other = (room, p) => room.players.find(q => q.id !== p.id);
function startMatch(room){if(room.players.length!==2||room.phase!=='lobby')return;room.phase='active';room.turn=room.players[randomInt(0,2)].id;log(room,`${room.players[0].name} e ${room.players[1].name} ocuparam a mesa. A partida começou.`);}
function resetMatch(room){room.phase='lobby';room.turn=null;room.winner=null;room.round=1;room.roll=[];room.available=6;room.turnPoints=0;room.lastKeep=0;room.bust=false;room.proposal=null;room.rollMultiplier=1;room.prophetFace=0;room.pendingProphet=0;room.pendingCoin=null;room.extraTurn=false;room.hourglassArmed=null;room.diaboRisk=null;room.eclipseTarget=null;room.eclipseOwner=null;room.shackleTarget=null;room.shackled=false;room.noSingles=false;room.lastBust=null;for(const q of room.players){q.score=0;q.insignia=null;q.charges=0;q.legendary=null;q.legendaryCharges=0;q.insigniasLocked=false;q.skipNextTurn=false;q.lastCommonUsed=null;}}
function hasPower(room, p, family) { if (!p.insignia || familyOf(p.insignia) !== family) return false; const rival = other(room,p); return !(rival?.insignia && familyOf(rival.insignia) === 'defesa' && gradeOf(rival.insignia) === gradeOf(p.insignia)); }
function powers(room, p) { const enabled=!room.extraTurn&&!p.insigniasLocked;return { tique:enabled&&hasPower(room,p,'tique'), imperador:enabled&&hasPower(room,p,'imperador'), carpinteiro:enabled&&hasPower(room,p,'vantagem-do-carpinteiro'), carrasco:enabled&&hasPower(room,p,'vantagem-do-carrasco'), sacerdote:enabled&&hasPower(room,p,'vantagem-do-sacerdote'), casamentoCharges:enabled&&hasPower(room,p,'casamento') ? p.charges : 0, noSingles:room.noSingles, prophetFace:room.prophetFace }; }
function choices(room,p) { if (room.turn!==p.id || room.bust) return []; const out=[]; for(let mask=1;mask<(1<<room.roll.length);mask++){const indices=room.roll.map((_,i)=>i).filter(i=>mask&(1<<i));const detail=scoreDiceDetailed(indices.map(i=>room.roll[i]),powers(room,p));if(detail.score>0)out.push({indices,score:detail.score*room.rollMultiplier});} return out; }
function view(room, p) { return { code:room.code, target:room.target, stake:room.stake, phase:room.phase, turn:room.turn, winner:room.winner, round:room.round, roll:room.roll, available:room.available, turnPoints:room.turnPoints, lastKeep:room.lastKeep, bust:room.bust, choices:choices(room,p), extraTurn:room.extraTurn, hourglassArmed:room.hourglassArmed===p.id, lastBust:room.lastBust, proposal:room.proposal, log:room.log.slice(-30), players:room.players.map(q => ({ id:q.id,name:q.name,score:q.score,insignia:q.insignia,insigniaActive:q.insignia?hasPower(room,q,familyOf(q.insignia)):false,charges:q.charges,legendary:q.legendary,legendaryCharges:q.legendaryCharges,insigniasLocked:q.insigniasLocked,lastCommonUsed:q.lastCommonUsed })), spectators:room.spectators.map(q=>({id:q.id,name:q.name})), spectator:room.spectators.includes(p), you:p.id }; }
function emit(room) { for (const c of room.clients) c.res.write(`data: ${JSON.stringify(view(room,c.player))}\n\n`); }
function log(room, message) { room.log.push(message); if (room.log.length > 100) room.log.shift(); }
function next(room, p, message) {
  log(room,message); const rival=other(room,p); let candidate=room.hourglassArmed===p.id?p:rival;
  room.extraTurn=room.hourglassArmed===p.id; room.hourglassArmed=null;
  if(candidate.skipNextTurn){candidate.skipNextTurn=false;log(room,`${candidate.name} perdeu a vez por causa da Ampulheta Quebrada.`);candidate=other(room,candidate);room.extraTurn=false;}
  room.turn=candidate.id;room.round++;room.roll=[];room.available=room.shackleTarget===candidate.id?5:6;room.shackled=room.available===5;if(room.shackled)room.shackleTarget=null;room.turnPoints=0;room.lastKeep=0;room.bust=false;room.rollMultiplier=1;room.prophetFace=0;room.pendingCoin=null;room.pendingProphet=0;room.diaboRisk=null;
  room.noSingles=room.eclipseTarget===candidate.id; if(room.noSingles){room.eclipseTarget=room.eclipseOwner;room.eclipseOwner=room.eclipseOwner===candidate.id?null:room.eclipseOwner;if(!room.eclipseOwner)room.eclipseTarget=null;}
}
function bust(room,p,reason='Sem combinação pontuável') {
  room.lastBust={id:randomUUID(),at:Date.now(),player:p.name,dice:[...room.roll],atRisk:room.turnPoints,reason};
  log(room,`${p.name} rolou ${room.roll.join(', ')}: ${reason.toLowerCase()}. ${room.turnPoints} pontos do turno em risco.`);
  if(p.legendary==='lagrima-da-santa'&&p.legendaryCharges>0&&!p.insigniasLocked&&!room.extraTurn){const saved=Math.ceil(room.turnPoints/2);p.score+=saved;p.legendaryCharges=0;room.lastBust.saved=saved;if(p.score>=room.target){room.phase='finished';room.winner=p.id;room.turn=null;log(room,`${p.name} venceu ao salvar ${saved} pontos com Lágrima da Santa.`);}else next(room,p,`${p.name} salvou ${saved} pontos com Lágrima da Santa na primeira falha.`);return;}
  room.bust=true;
  const recover=(hasPower(room,p,'ressurreicao')&&p.charges>0)||(['fortuna','troca','transmutacao'].some(f=>hasPower(room,p,f))&&p.charges>0)||(p.legendaryCharges>0&&!p.insigniasLocked&&['mao-do-homem-morto','lagrima-da-santa','diabo'].includes(p.legendary));
  if(recover) log(room,`${p.name} falhou. Escolha uma insígnia de recuperação ou aceite a falha.`);
  else settleBust(room,p);
}
function settleBust(room,p) {const lostPoints=room.turnPoints;if(room.extraTurn)p.skipNextTurn=true;if(room.diaboRisk===p.id)p.score=Math.max(0,p.score-lostPoints);room.diaboRisk=null;if(room.hourglassArmed===p.id)room.hourglassArmed=null;next(room,p,`${p.name} falhou e perdeu ${lostPoints} pontos do turno.`);}
function charges(id) { const grade=gradeOf(id), family=familyOf(id); if (['defesa','largada','imperador','tique','vantagem-do-carpinteiro','vantagem-do-carrasco','vantagem-do-sacerdote'].includes(family)) return 0; if (family==='casamento') return 3; if (family==='rei-dos-passaros') return 2; if (family==='duplo') return grade==='ouro'?3:2; if (['poder','ressurreicao'].includes(family)) return grade==='ouro'?3:grade==='prata'?2:1; return 1; }
function selected(room, indices) { if (!Array.isArray(indices) || !indices.length || new Set(indices).size!==indices.length || indices.some(i => !Number.isInteger(i) || i<0 || i>=room.roll.length)) fail('Selecione dados válidos da rolagem atual.'); return indices.map(i=>room.roll[i]); }
function requireTurn(room,p) { if (room.phase!=='active' || room.turn!==p.id) fail('Aguarde o seu turno.'); }
function activate(room,p,data) {
  if(room.extraTurn || p.insigniasLocked) fail('Você não pode usar insígnias neste turno.');
  const id=p.insignia, family=id && familyOf(id); if (!id || !hasPower(room,p,family)) fail('Esta insígnia não está ativa.');
  if (p.charges<1) fail('As cargas desta insígnia acabaram.');
  const grade=gradeOf(id), index=Number(data.index);
  if (family==='ressurreicao') {
    if (!room.bust) fail('Ressurreição só pode ser usada após perder a rolagem.');
    room.bust=false; room.roll=rollDice(room.available); p.charges--;p.lastCommonUsed=id; log(room,`${p.name} usou Ressurreição e rolou novamente.`);
    if (!hasScoring(room.roll,powers(room,p))) bust(room,p);
    return;
  }
  if (room.bust && !['fortuna','troca','transmutacao'].includes(family)) fail('Resolva a falha antes de usar outra insígnia.');
  if (family==='senhor-da-guerra') {
    if (!room.turnPoints || room.roll.length) fail('Guarde os dados pontuados antes de usar esta insígnia.');
    const before=room.turnPoints; room.turnPoints=Math.floor(before*(grade==='ouro'?2:grade==='prata'?1.5:1.25)); p.charges--; p.lastCommonUsed=id; log(room,`${p.name} ampliou a pontuação do turno de ${before} para ${room.turnPoints}.`); return;
  }
  if (family==='duplo') {
    if (!room.lastKeep || room.roll.length) fail('Duplo precisa de uma combinação recém-guardada.');
    room.turnPoints+=room.lastKeep; room.lastKeep=0; p.charges--; p.lastCommonUsed=id; log(room,`${p.name} duplicou a última combinação.`); return;
  }
  if (family==='poder' || family==='rei-dos-passaros') {
    if (!room.roll.length || room.roll.length>=7) fail('Role os dados antes de ganhar um dado extra.');
    room.roll.push(...rollDice(1)); room.available++; p.charges--; p.lastCommonUsed=id; log(room,`${p.name} ganhou um dado extra na rolagem.`); return;
  }
  if (!room.roll.length) fail('Role os dados antes de usar esta insígnia.');
  if (family==='fortuna' || family==='troca') {
    const indices=data.indices;
    const max=family==='fortuna'?(grade==='ouro'?3:grade==='prata'?2:1):(grade==='ouro'?2:1);
    const values=selected(room,indices);
    if (indices.length>max || (family==='troca' && grade==='ouro' && (indices.length!==2 || values[0]!==values[1]))) fail('Escolha os dados permitidos por esta insígnia.');
    for (const i of indices) room.roll[i]=randomInt(1,7);
    p.charges--; p.lastCommonUsed=id; log(room,`${p.name} usou ${family==='fortuna'?'Fortuna':'Troca'} para rolar novamente.`); room.bust=false;if(!hasScoring(room.roll,powers(room,p))) bust(room,p); return;
  }
  if (family==='transmutacao') {
    if (!Number.isInteger(index)||index<0||index>=room.roll.length) fail('Selecione um dado para transmutar.');
    room.roll[index]=grade==='ouro'?1:grade==='prata'?5:3; p.charges--; p.lastCommonUsed=id; log(room,`${p.name} transmutou um dado em ${room.roll[index]}.`); room.bust=false;if(!hasScoring(room.roll,powers(room,p)))bust(room,p); return;
  }
  fail('Esta insígnia modifica a pontuação automaticamente.');
}
function activateLost(room,p,data) {
  const id=p.legendary;if(!id||p.legendaryCharges<1||p.insigniasLocked||room.extraTurn)fail('A Insígnia Perdida não está disponível.');
  const rival=other(room,p), index=Number(data.index), face=Number(data.face);
  if(id==='mao-do-homem-morto'||id==='lagrima-da-santa'){
    if(!room.bust)fail('Use esta insígnia após uma falha.');
    const saved=id==='mao-do-homem-morto'?room.turnPoints:Math.ceil(room.turnPoints/2);
    p.score+=saved;p.legendaryCharges=0;if(id==='mao-do-homem-morto')p.insigniasLocked=true;
    if(p.score>=room.target){room.phase='finished';room.winner=p.id;room.turn=null;log(room,`${p.name} venceu ao salvar ${saved} pontos com ${id}.`);}else next(room,p,`${p.name} salvou ${saved} pontos após a falha.`);return;
  }
  if(room.bust&&id!=='diabo')fail('Resolva a falha antes de usar esta insígnia.');
  if(id==='coroa-do-rei-deposto')fail('A Coroa atua automaticamente quando o rival guarda pontos e você está atrás.');
  if(id==='diabo'){
    if(!room.roll.length)fail('Use o Diabo após uma rolagem.');
    const indices=data.indices;selected(room,indices);if(indices.length>2||!Number.isInteger(face)||face<1||face>6)fail('Escolha até dois dados e a nova face.');
    for(const i of indices)room.roll[i]=face;room.diaboRisk=p.id;room.bust=false;
  }else if(id==='eclipse'){
    if(room.roll.length||room.turnPoints)fail('Use o Eclipse antes de rolar neste turno.');
    room.eclipseTarget=rival.id;room.eclipseOwner=p.id;
  }else if(id==='espelho-da-viuva'){
    if(!rival.lastCommonUsed)fail('O rival ainda não usou uma insígnia comum.');
    const copied=rival.lastCommonUsed, family=familyOf(copied);
    if(['defesa','largada','imperador','tique','casamento','vantagem-do-carpinteiro','vantagem-do-carrasco','vantagem-do-sacerdote'].includes(family))fail('A última insígnia do rival não tem uma ativação copiável.');
    const old=p.insignia, oldCharges=p.charges;p.insignia=copied;p.charges=1;
    try{activate(room,p,data)}catch(error){p.insignia=old;p.charges=oldCharges;throw error}
    p.insignia=old;p.charges=oldCharges;
  }else if(id==='grilhao-do-carcereiro'){
    if(room.roll.length||room.turnPoints)fail('Use o Grilhão antes de rolar neste turno.');room.shackleTarget=rival.id;
  }else if(id==='ampulheta-quebrada'){
    if(room.roll.length||!room.turnPoints)fail('Guarde pontos e prepare o encerramento do turno.');room.hourglassArmed=p.id;
  }else if(id==='moeda-de-duas-caras'){
    if(room.roll.length||!['par','impar'].includes(data.parity))fail('Declare par ou ímpar antes de rolar.');room.pendingCoin=data.parity;
  }else if(id==='olho-do-profeta'){
    if(room.roll.length||!Number.isInteger(face)||face<1||face>6)fail('Declare uma face antes de rolar.');room.pendingProphet=face;
  }
  p.legendaryCharges=0;log(room,`${p.name} ativou ${id.replaceAll('-',' ')}.`);
  if(room.roll.length&&!hasScoring(room.roll,powers(room,p)))bust(room,p);
}
function act(room,p,data) {
  const type=data.type;
  if(type==='leave'||type==='spectate'){
    const index=room.players.indexOf(p);
    if(index>=0){if(room.phase!=='lobby')resetMatch(room);room.players.splice(index,1);if(type==='spectate')room.spectators.push(p);log(room,`${p.name} ${type==='spectate'?'foi para a arquibancada':'saiu da sala'}.`);}
    else if(type==='leave'){room.spectators.splice(room.spectators.indexOf(p),1);log(room,`${p.name} saiu da arquibancada.`);}
    return;
  }
  if(type==='takeSeat'){
    if(!room.spectators.includes(p))fail('Você já está na mesa.');
    if(room.phase!=='lobby'||room.players.length>=2)fail('As duas vagas estão ocupadas. Aguarde uma vaga no saguão.');
    room.spectators.splice(room.spectators.indexOf(p),1);room.players.push(p);log(room,`${p.name} saiu da arquibancada e ocupou uma vaga.`);startMatch(room);return;
  }
  if(!room.players.includes(p))fail('Espectadores podem assistir, mas não jogar os dados.');
  if (type==='propose') {
    if (room.phase!=='active' || room.proposal || room.players.some(q=>q.insignia||q.legendary) || room.roll.length || room.bust || room.turnPoints || room.round!==1) fail('A proposta deve ser feita antes da primeira rolagem.');
    const id=String(data.insignia||''), legendary=String(data.legendary||''); if ((id&&!allowed.has(id))||(legendary&&!lost.has(legendary))||(!id&&!legendary)) fail('Escolha uma insígnia válida.');
    const bonus=Math.max(0,Math.min(5000,Math.trunc(Number(data.startBonus)||0)));
    room.proposal={ by:p.id, insignia:id||null, legendary:legendary||null, grade:id?gradeOf(id):null, startBonus:bonus }; log(room,`${p.name} propôs jogar com insígnias${id?' de '+gradeOf(id):' perdidas'}.`); return;
  }
  if (type==='decline') { if (!room.proposal || room.proposal.by===p.id) fail('Não há proposta para recusar.'); room.proposal=null; log(room,`${p.name} recusou a proposta de insígnias.`); return; }
  if (type==='accept') {
    const offer=room.proposal; if (!offer || offer.by===p.id) fail('Não há proposta para aceitar.');
    const id=String(data.insignia||''), legendary=String(data.legendary||'');
    if(offer.insignia?(!allowed.has(id)||gradeOf(id)!==offer.grade):Boolean(id))fail('Escolha uma insígnia comum da mesma categoria.');
    if(offer.legendary?(!lost.has(legendary)):Boolean(legendary))fail('Ambos devem escolher uma Insígnia Perdida.');
    const proposer=room.players.find(q=>q.id===offer.by); proposer.insignia=offer.insignia; proposer.charges=offer.insignia?charges(offer.insignia):0; proposer.legendary=offer.legendary;proposer.legendaryCharges=offer.legendary?1:0;
    p.insignia=id||null; p.charges=id?charges(id):0;p.legendary=legendary||null;p.legendaryCharges=legendary?1:0;room.proposal=null;
    if (offer.startBonus && familyOf(offer.insignia)==='largada') proposer.score+=offer.startBonus;
    if (offer.startBonus && familyOf(id)==='largada') p.score+=offer.startBonus;
    log(room,`${p.name} aceitou a partida com insígnias${offer.grade?' de '+offer.grade:''}${offer.legendary?' e perdidas':''}.`); return;
  }
  requireTurn(room,p);
  if (type==='useInsignia') { activate(room,p,data); return; }
  if (type==='useLegendary') {activateLost(room,p,data);return;}
  if (room.bust) {
    if (type!=='acceptBust') fail('Use uma insígnia de recuperação ou aceite a falha.');
    settleBust(room,p); return;
  }
  if (type==='roll') {
    if (room.roll.length) fail('Guarde uma combinação antes de rolar novamente.');
    if(room.hourglassArmed===p.id)fail('Encerre o turno para acionar a Ampulheta Quebrada.');
    room.roll=rollDice(room.available); room.lastKeep=0;
    room.rollMultiplier=1;room.prophetFace=room.pendingProphet;room.pendingProphet=0;
    if(room.prophetFace&&!room.roll.includes(room.prophetFace))room.turnPoints=Math.max(0,room.turnPoints-100);
    if(room.pendingCoin){const parity=room.roll.reduce((a,b)=>a+b,0)%2===0?'par':'impar';if(parity!==room.pendingCoin){room.pendingCoin=null;bust(room,p,'A aposta da Moeda falhou');return;}room.rollMultiplier=2;room.pendingCoin=null;}
    if (!hasScoring(room.roll,powers(room,p))) bust(room,p);
    else log(room,`${p.name} lançou ${room.roll.length} dados.`);
    return;
  }
  if (type==='keep') {
    const indices=data.indices, values=selected(room,indices);
    const result=scoreDiceDetailed(values,powers(room,p));const multiplier=room.rollMultiplier;let score=result.score*multiplier;
    if (!score) fail('Os dados escolhidos não formam uma pontuação válida.');
    p.charges-=result.marriagesUsed;if(result.marriagesUsed)p.lastCommonUsed=p.insignia;
    const brokeShackle=room.shackled&&indices.length===room.available;
    room.turnPoints+=score; room.lastKeep=score; room.available-=indices.length; room.roll=[];
    if (room.available===0){room.available=6;if(brokeShackle){room.shackled=false;log(room,`O Grilhão de ${p.name} foi quebrado.`);}}
    room.rollMultiplier=1;room.prophetFace=0;
    log(room,`${p.name} guardou ${score} pontos com ${values.join(', ')}: ${result.groups.join(' + ')}${multiplier>1?' ×2 pela Moeda':''}. Turno: ${room.turnPoints}.`); return;
  }
  if (type==='bank') {
    if (!room.turnPoints || room.roll.length) fail('Guarde uma combinação antes de encerrar.');
    p.score+=room.turnPoints;const rival=other(room,p);
    if(rival.legendary==='coroa-do-rei-deposto'&&rival.legendaryCharges>0&&!rival.insigniasLocked&&rival.score<p.score-room.turnPoints){const stolen=Math.floor(room.turnPoints*.25/50)*50;if(stolen){p.score=Math.max(0,p.score-stolen);rival.score+=stolen;rival.legendaryCharges=0;log(room,`${rival.name} roubou ${stolen} pontos com a Coroa do Rei Deposto.`);}}
    if (rival.score>=room.target) {room.phase='finished';room.winner=rival.id;room.turn=null;log(room,`${rival.name} venceu com ${rival.score} pontos!`);}
    else if (p.score>=room.target) { room.phase='finished'; room.winner=p.id; room.turn=null; log(room,`${p.name} venceu com ${p.score} pontos!`); }
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
      const role=String(data.role||'player');if(!['player','spectator'].includes(role))fail('Escolha jogador ou espectador.');
      const target=Math.max(1000,Math.min(50000,Math.trunc(Number(data.target)||5000)));
      let roomCode; do { roomCode=code(); } while (rooms.has(roomCode));
      const p=participant(name);
      const room={code:roomCode,target,stake:String(data.stake||'').trim().slice(0,80),phase:'lobby',players:role==='player'?[p]:[],spectators:role==='spectator'?[p]:[],turn:null,winner:null,round:1,roll:[],available:6,turnPoints:0,lastKeep:0,bust:false,proposal:null,log:[],clients:new Set(),rollMultiplier:1,prophetFace:0,pendingProphet:0,pendingCoin:null,extraTurn:false,hourglassArmed:null,diaboRisk:null,eclipseTarget:null,eclipseOwner:null,shackleTarget:null,shackled:false,noSingles:false,lastBust:null};
      rooms.set(roomCode,room); response(res,200,{code:roomCode,token:p.token}); return true;
    }
    const match=url.pathname.match(/^\/api\/dice\/rooms\/([A-Za-z0-9]+)\/(join|state|events|action)$/);
    if (!match) { response(res,404,{error:'Não encontrado.'}); return true; }
    const room=rooms.get(match[1].toUpperCase()), op=match[2]; if (!room) fail('Sala não encontrada.');
    if (op==='join' && req.method==='POST') {
      const data=await body(req),role=String(data.role||'player');if(!['player','spectator'].includes(role))fail('Escolha jogador ou espectador.');
      if(role==='player'&&(room.phase!=='lobby'||room.players.length>=2))fail('As vagas de jogador estão ocupadas. Entre na arquibancada.');
      const p=participant(String(data.name||'Jogador').trim().slice(0,30)||'Jogador');
      if(role==='spectator'){room.spectators.push(p);log(room,`${p.name} entrou na arquibancada.`);}else{room.players.push(p);log(room,`${p.name} ocupou uma vaga de jogador.`);startMatch(room);}
      response(res,200,{code:room.code,token:p.token}); emit(room); return true;
    }
    const p=player(room,req);
    if (op==='state' && req.method==='GET') { response(res,200,view(room,p)); return true; }
    if (op==='events' && req.method==='GET') {
      res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive'});
      const c={res,player:p}; room.clients.add(c); res.write(`data: ${JSON.stringify(view(room,p))}\n\n`);
      const heartbeat=setInterval(()=>res.write(': ping\n\n'),20000); req.on('close',()=>{clearInterval(heartbeat);room.clients.delete(c);}); return true;
    }
    if (op==='action' && req.method==='POST') {const data=await body(req);act(room,p,data);response(res,200,{ok:true});emit(room);if(data.type==='leave'&&!room.players.length&&!room.spectators.length)rooms.delete(room.code);return true; }
    response(res,405,{error:'Método inválido.'}); return true;
  } catch(error) { response(res,400,{error:error.message||'Erro inesperado.'}); return true; }
}
