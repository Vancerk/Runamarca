import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,card,unit,place,cast,combat,act,view,catalog,spell} from './r1-fixtures.mjs';
import {dealPatronDamage} from './combat-triggers.mjs';
import {unrestrictedReturn} from './test-return-fixture.mjs';
import {expireTurn} from './game.mjs';
import {domPowers} from './dom-powers.mjs';
const emanate=(p,c)=>{p.reserve.push(c);p.emanation.push(c.uid);return c;};
function shot(room,p,source,target){act(room,p,{type:'apprenticeTarget',cardId:source.uid,targetId:target.uid},catalog);}
test('Lançador cadastrado Prata sem subtipo; Ruptura mantém 30 com Geometro 3 e Lançador 1',()=>{
 const d=catalog.decks.find(d=>d.id==='ruptura-grupo');assert.equal(d.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(d.cards.find(c=>c.id==='RG01').quantity,3);
 const c=d.cards.find(c=>c.id==='R2-RG14');assert.deepEqual([c.cost,c.attack,c.health,c.quantity,c.rarity,c.subtype],[2,1,2,1,'padrao','']);
 const {room,a}=setup({aDeck:'ruptura-grupo'});cast(room,a,card('R2-RG14',a),{mode:'emanate'});assert.equal(a.mana,8);assert.equal(a.emanation.length,1);
});
for(const armor of [0,3])test(`Lançador dispara por magia aliada; absorção ${armor}`,()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});room.rulesSeed=20261021;b.patron.extraLife=armor;const launcher=emanate(a,card('R2-RG14',a));
 cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,1);assert.equal(a.launcherUsedRounds[launcher.uid],room.round);
 if(armor){assert.equal(b.patron.hp,100);assert.equal(b.patron.extraLife,1);}else assert.equal(b.patron.hp,98);
 assert.ok(b.damageRounds.includes(room.round));
 cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,1);
});
test('Lançador: duas cópias marcam uso antes do dano, sem cascata, novo uso só na rodada seguinte',()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});const sources=[emanate(a,card('R2-RG14',a)),emanate(a,card('R2-RG14',a))];
 cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(b.patron.hp,97);assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,2);assert.equal(room.rulesRng.draws,2);
 for(const source of sources)assert.equal(a.launcherUsedRounds[source.uid],room.round);
 combat(room);cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,4);
});
test('Lançador: dano zero, inimigo, próprio e fadiga não se passam por outra fonte aliada',()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});const source=emanate(a,card('R2-RG14',a));
 dealPatronDamage(room,b,0,{ownerId:a.id,sourceId:'ally',kind:'spell'});
 dealPatronDamage(room,b,1,{ownerId:b.id,sourceId:'enemy',kind:'spell'});
 dealPatronDamage(room,b,1,{ownerId:a.id,sourceId:source.uid,kind:'launcher'});
 dealPatronDamage(room,b,1,{kind:'fatigue'});assert.equal(a.launcherUsedRounds,undefined);assert.equal(room.rulesRng,undefined);
});
test('Lançador não dispara por fadiga real de compra ou por ferir o próprio Patrono',()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});emanate(b,card('R2-RG14',b));a.deck=[];
 cast(room,a,card('FV08',a));assert.equal(a.patron.hp,97);assert.ok(a.damageRounds.includes(room.round));assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,0);
 emanate(a,card('R2-RG14',a));cast(room,a,card('RG07',a),{targetId:'patron:'+a.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,0);
});
test('Lançador: entrada tardia observa evento futuro; reentrada não renova uso',()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});const source=card('R2-RG14',a);cast(room,a,source,{mode:'emanate'});
 assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,0);cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});
 act(room,a,{type:'emanate',cardId:source.uid},catalog);act(room,a,{type:'emanate',cardId:source.uid},catalog);cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,1);
});
test('Lançador: silêncio não apaga o registro de uso da rodada',()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});const source=emanate(a,card('R2-RG14',a));cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});cast(room,a,card('FV01',a),{targetId:source.uid});
 assert.equal(source.silenced,true);assert.equal(a.launcherUsedRounds[source.uid],room.round);cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,1);
});
test('Lançador: retornar à mão e reinvocar não renova uso gasto',()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'}),source=emanate(a,card('R2-RG14',a));cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});
 act(room,a,{type:'emanate',cardId:source.uid},catalog);const bounce=card('FV13',b);unrestrictedReturn(bounce);cast(room,b,bounce,{targetId:source.uid});assert.ok(a.hand.includes(source));
 cast(room,a,source,{mode:'emanate'});cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,1);
 combat(room);cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});assert.equal(room.events.filter(e=>e.type==='launcher_damage').length,2);
});
test('Lançador: RNG serializado reproduz alvos, exclui reserva e Emanação',()=>{
 function run(){const {room,a,b}=setup({aDeck:'ruptura-grupo'});room.rulesSeed=20261021;emanate(a,card('R2-RG14',a));const board=place(b,unit(b,{health:100}),0),reserve=unit(b),emana=emanate(b,unit(b));b.reserve.push(reserve);const hits=[];
  for(let i=0;i<12;i++){room.round++;a.mana=10;cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});const hit=room.events.findLast(e=>e.type==='launcher_damage');assert.ok([board.uid,'patron:'+b.id].includes(hit.targetId));hits.push(hit.targetId===board.uid?'board':'patron');}
  assert.equal(reserve.damage,0);assert.equal(emana.damage,0);assert.equal(room.rulesRng.draws,12);return {hits,rng:JSON.parse(JSON.stringify(room.rulesRng))};}
 assert.deepEqual(run(),run());
});
for(const kind of ['power','reprisal','combat','trample','last_breath'])test(`Lançador recebe proveniência real de ${kind}`,()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});room.rulesSeed=1;emanate(a,card('R2-RG14',a));
 if(kind==='power'){a.patron.powers=domPowers('damage');act(room,a,{type:'patronPower',powerId:'golpe-do-maioral',targetId:'patron:'+b.id},catalog);}
 if(kind==='reprisal'){a.patron.powers=domPowers();act(room,a,{type:'patronPower',powerId:'represalia-de-eter'},catalog);cast(room,b,card('FV08',b));}
 if(kind==='combat'){place(a,unit(a,{attack:2}),0);combat(room);}
 if(kind==='trample'){place(a,card('FL05',a),0);place(b,unit(b,{health:1}),0);combat(room);}
 if(kind==='last_breath'){place(a,card('RG03',a,{health:1}),0);place(b,unit(b,{attack:1,health:40}),0);combat(room);}
 const hits=room.events.filter(e=>e.type==='launcher_damage');assert.equal(hits.length,1);assert.equal(hits[0].originKind,kind);assert.equal(hits[0].playerId,a.id);assert.equal(hits[0].targetPatronId,b.id);
});
for(const kind of ['spell','combat','trample','armor','fatigue'])test(`Debulhador: memória da rodada anterior por ${kind}, não da atual`,()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'});const deb=card('RG12',a);assert.ok(deb.effects.some(e=>e.op==='trample'));assert.ok(!deb.effects.some(e=>e.op==='low_patron_attack'));
 if(kind==='spell'||kind==='armor'){if(kind==='armor')b.patron.extraLife=10;cast(room,a,card('RG07',a),{targetId:'patron:'+b.id});}
 if(kind==='combat'){place(a,unit(a,{attack:2}),0);combat(room);}
 if(kind==='trample'){place(a,card('FL05',a),0);place(b,unit(b,{health:1}),0);combat(room);}
 if(kind==='fatigue'){b.deck=[];cast(room,b,card('FV08',b));}
 b.deck=[card('FV08',b),card('FV08',b),card('FV08',b)];const blocker=place(b,unit(b,{attack:0,health:100}),0);
 if(['spell','armor','fatigue'].includes(kind)){place(a,deb,0);combat(room);assert.equal(room.preClash[0].cards[0].attack,4);}
 place(a,deb,0);place(b,blocker,0);combat(room);assert.equal(room.preClash[0].cards[0].attack,5);assert.equal(deb.attack,4);assert.equal(deb.attackMod,0);
 place(a,deb,0);place(b,blocker,0);combat(room);assert.equal(room.preClash[0].cards[0].attack,4);
});
test('Debulhador: baixa vida do próprio Patrono não concede bônus',()=>{
 const {room,a}=setup({aDeck:'ruptura-grupo'});a.patron.hp=1;place(a,card('RG12',a),0);combat(room);assert.equal(room.preClash[0].cards[0].attack,4);
});
for(const n of [1,2])test(`Aprendiz: ${n} cópias em Emanação disparam juntas na primeira magia, uma vez por rodada`,()=>{
 const {room,a,b}=setup();const sources=Array.from({length:n},()=>emanate(a,card('FV03',a))),target=unit(b,{health:20});b.reserve.push(target);
 cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,n);assert.equal(view(room,b).players.find(p=>p.id===a.id).pendingApprenticeTargets.length,0);
 for(const source of sources)shot(room,a,source,target);assert.equal(target.damage,n);
 cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,0);assert.equal(target.damage,n);
 combat(room);cast(room,a,card('FV08',a));for(const source of sources)shot(room,a,source,target);assert.equal(target.damage,n*2);
});
test('Aprendiz: reserva não dispara; entrada após primeira magia espera outra rodada',()=>{
 const {room,a,b}=setup();const source=card('FV03',a),target=unit(b);b.reserve.push(target);cast(room,a,source);cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,0);
 act(room,a,{type:'emanate',cardId:source.uid},catalog);cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,0);
 combat(room);cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,1);shot(room,a,source,target);assert.equal(target.damage,1);
});
test('Aprendiz: segunda cópia escolhe novo alvo se a primeira matou o anterior; nunca Patrono',()=>{
 const {room,a,b}=setup();const sources=[emanate(a,card('FV03',a)),emanate(a,card('FV03',a))],first=unit(b,{health:1}),second=unit(b,{health:2});b.reserve.push(first,second);cast(room,a,card('FV08',a));
 assert.throws(()=>act(room,a,{type:'apprenticeTarget',cardId:sources[0].uid,targetId:'patron:'+b.id},catalog));assert.equal(a.apprenticeQueue.length,2);
 shot(room,a,sources[0],first);assert.ok(b.discard.includes(first));assert.throws(()=>shot(room,a,sources[1],first));assert.equal(a.apprenticeQueue.length,1);shot(room,a,sources[1],second);assert.equal(second.damage,1);assert.equal(b.patron.hp,100);
});
test('Aprendiz perde disparos restantes quando não houver alvo, sem renovar a primeira magia',()=>{
 const {room,a,b}=setup();const sources=[emanate(a,card('FV03',a)),emanate(a,card('FV03',a))],target=unit(b,{health:1});b.reserve.push(target);cast(room,a,card('FV08',a));shot(room,a,sources[0],target);
 assert.equal(a.apprenticeQueue.length,0);b.reserve.push(unit(b));cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,0);
});
test('Aprendiz: reentrada e silêncio não renovam a rodada; preparo conta como jogar, Eco não',()=>{
 const {room,a,b}=setup();const source=emanate(a,card('FV03',a)),target=place(b,unit(b),0);cast(room,a,card('FV02',a),{mode:'lane',targetSide:b.id,lane:0});shot(room,a,source,target);
 act(room,a,{type:'emanate',cardId:source.uid},catalog);act(room,a,{type:'emanate',cardId:source.uid},catalog);cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,0);
 cast(room,a,card('FV01',a),{targetId:source.uid});assert.equal(source.silenced,true);assert.equal(a.firstSpellRound,room.round);combat(room);assert.equal(a.apprenticeQueue.length,0);
});
test('Tempo da preparação esgotado resolve os disparos pendentes e permite encerrar',()=>{
 const {room,a,b}=setup();emanate(a,card('FV03',a));emanate(a,card('FV03',a));b.reserve.push(unit(b,{health:2}));cast(room,a,card('FV08',a));
 room.turnClock={key:'r2-timeout',phase:'prep',playerId:a.id,endsAt:Date.now()-10};assert.equal(expireTurn(room),true);assert.equal(a.apprenticeQueue.length,0);assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,2);assert.equal(room.turn,b.id);
});
