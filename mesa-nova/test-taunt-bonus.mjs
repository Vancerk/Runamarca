// Provocar — owner decision of 06/11/2026 (reported with João Bobão, printed attack 0 plus a bonus): a creature with
// Provocar that is attacked by a provoked enemy strikes THAT enemy back, as in a frontal exchange, instead of its own
// lane. Still a single strike with its effective attack. With several provoked attackers it answers the first to attack
// it (Initiative first, then the leftmost lane); if that one is already dead it answers the next, and with none left
// it keeps its own lane. Real catalogue cards, real bonus card and the real engine flow (formation choice → both ready
// → timeline → resolution). Set TAUNT_TRACE=<file> to save the per-case trace.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setup,card,place,cast,act,catalog,resolveCombat} from './r1-fixtures.mjs';
const trace=[];
const mk=(id,p,attack,health,extra={})=>card(id,p,{attack,health,baseStats:{attack,health,cost:1},...extra});
function table({bonus=null,ownFront=null,taunter='FL16',taunterLane=0,lanes=[1],provoked=[{lane:1,attack:2,health:6}],twin=true}={}){
 const {room,a,b}=setup({aDeck:'forja-oficina-lyrik',bDeck:'fluxo-virelion'});
 for(const p of [a,b]){p.hand=[];p.reserve=[];p.formation=[null,null,null];p.emanation=[];p.taunts={};p.mana=10;p.manaMax=10;}
 const joao=card(taunter,a);place(a,joao,taunterLane);
 const enemies=provoked.map(x=>place(b,mk('FV03',b,x.attack,x.health,x.extra||{}),x.lane));
 // An identical taunter on the other seat proves that targets are resolved by UID, not by name.
 const twinCard=twin&&!provoked.some(x=>x.lane===2)&&ownFront?.lane!==2?place(b,card(taunter,b),2):null;
 const front=ownFront?place(b,mk('FV03',b,ownFront.attack??1,ownFront.health??5),ownFront.lane??taunterLane):null;
 if(bonus==='FL10'){const spell=card('FL10',a);cast(room,a,spell,{targetId:joao.uid});}
 if(bonus==='attackMod')joao.attackMod=(joao.attackMod||0)+2;
 room.phase='formation';room.turn=a.id;
 act(room,a,{type:'taunt',cardId:joao.uid,lanes},catalog);
 return {room,a,b,joao,enemies,front,twin:twinCard};
}
function run(name,opts,extra){
 const t=table(opts);extra?.(t);const {room,a,b,joao,enemies}=t;
 const hp=c=>Math.max(0,c.health-c.damage),before={joao:hp(joao),enemies:enemies.map(hp),patronB:b.patron.hp};
 act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);
 const timeline=(room.combat?.timeline||[]).filter(s=>s.kind==='strike').map(s=>({source:s.strike.sourceId,target:s.strike.targetId,pair:s.strike.pair?.sourceId||null}));
 if(room.phase==='resolving')resolveCombat(room);
 const steps=(room.directedSteps||[]).flatMap(s=>[s,...(s.pair?[s.pair]:[])]).map(s=>({source:s.sourceId,target:s.targetId,lane:s.lane,targetLane:s.targetLane,amount:s.amount,initiative:s.initiative}));
 const after={joao:hp(joao),enemies:enemies.map(hp),patronB:b.patron.hp};
 trace.push({name,joao:{uid:joao.uid,attack:joao.attack+(joao.attackMod||0)},enemies:enemies.map(e=>e.uid),taunts:a.taunts,before,after,timeline,steps});
 return {...t,before,after,steps,timeline,by:uid=>steps.filter(s=>s.source===uid)};
}
// 1. Effective attack 0: the provoked enemy hits João; João does not strike.
{const r=run('zero-sem-bonus',{});
 assert.equal(r.by(r.enemies[0].uid)[0]?.target,r.joao.uid,'provocado é redirecionado ao João');
 assert.equal(r.by(r.joao.uid).length,0,'ataque efetivo zero não golpeia');
 assert.equal(r.after.enemies[0],r.before.enemies[0]);}
// 2. Real +1/+1 (Adquirir Atualização): João strikes the provoked enemy for 1, as a paired exchange; no Patron damage.
{const r=run('bonus-real-FL10',{bonus:'FL10'});
 const s=r.by(r.joao.uid);assert.equal(s.length,1,'um único golpe');assert.equal(s[0].target,r.enemies[0].uid,'golpeia o inimigo provocado');assert.equal(s[0].amount,1,'usa o ataque efetivo');
 assert.equal(r.after.enemies[0],r.before.enemies[0]-1);assert.equal(r.after.patronB,r.before.patronB,'não atinge mais o Patrono');
 assert.ok(r.timeline.some(t=>(t.source===r.joao.uid&&t.pair===r.enemies[0].uid)||(t.source===r.enemies[0].uid&&t.pair===r.joao.uid)),'apresentação como confronto pareado');}
// 3. Enemy in João's own lane: João answers the provoked one; the frontal enemy still strikes João but is not hit by him.
{const r=run('bonus-frente-ocupada',{bonus:'attackMod',ownFront:{lane:0,attack:1,health:5}});
 const front=r.front.uid,s=r.by(r.joao.uid);assert.equal(s.length,1);assert.equal(s[0].target,r.enemies[0].uid);assert.equal(s[0].amount,2);
 assert.ok(!r.steps.some(x=>x.source===r.joao.uid&&x.target===front),'não golpeia a frente');
 assert.ok(r.steps.some(x=>x.source===front&&x.target===r.joao.uid),'a frente continua atacando o João');}
// 4. Control: positive printed attack (Golias 5/10) answers the provoked enemy too.
{const r=run('controle-golias',{taunter:'FL09'});
 const s=r.by(r.joao.uid);assert.equal(s[0].target,r.enemies[0].uid);assert.equal(s[0].amount,5);assert.equal(r.after.enemies[0],1);assert.equal(r.after.patronB,r.before.patronB);}
// 5. Golias in the centre provoking both neighbours: answers the first to attack it — leftmost without Initiative.
{const r=run('golias-dois-provocados',{taunter:'FL09',taunterLane:1,lanes:[0,2],provoked:[{lane:0,attack:2,health:9},{lane:2,attack:2,health:9}]});
 const s=r.by(r.joao.uid);assert.equal(s.length,1);assert.equal(s[0].target,r.enemies[0].uid,'casa mais à esquerda');
 assert.ok(r.enemies.every(e=>r.by(e.uid)[0]?.target===r.joao.uid),'ambos redirecionados ao Golias');}
// 6. Same, but the right-hand provoked attacker has Initiative: it attacks first, so Golias answers it.
{const r=run('golias-iniciativa',{taunter:'FL09',taunterLane:1,lanes:[0,2],provoked:[{lane:0,attack:2,health:9},{lane:2,attack:2,health:9,extra:{effects:[{op:'initiative'}]}}]});
 assert.equal(r.by(r.joao.uid)[0].target,r.enemies[1].uid,'Iniciativa ataca primeiro');}
// 7. A provoked enemy that does not attack (effective attack 0) does not draw the answer: João keeps its own lane.
{const r=run('provocado-sem-ataque',{bonus:'FL10',provoked:[{lane:1,attack:0,health:6}]});
 const s=r.by(r.joao.uid);assert.equal(s.length,1);assert.equal(s[0].target,null,'própria posição vazia → Patrono');assert.equal(r.after.patronB,r.before.patronB-1);}
// 8. Lethal exchange: both fall.
{const r=run('troca-letal',{bonus:'attackMod',provoked:[{lane:1,attack:3,health:2}]});
 assert.equal(r.after.enemies[0],0,'provocado morre');assert.equal(r.after.joao,0,'João morre');}
// 9. The provoked enemy dies in the Initiative phase before attacking: João keeps its own lane.
{const r=run('provocado-morto-antes',{bonus:'attackMod',provoked:[{lane:1,attack:2,health:1}]},({a,catalog:_})=>{const killer=mk('FV03',a,3,9,{effects:[{op:'initiative'}]});place(a,killer,1);});
 const s=r.by(r.joao.uid);assert.equal(s.length,1);assert.equal(s[0].target,null,'sem provocado vivo, golpeia a própria posição');assert.equal(r.after.joao,r.before.joao,'o provocado nunca chegou a atacar');}
// 10. Identity: the identical taunter on the other seat neither answers nor is targeted by João.
{const r=run('gemeo-outro-assento',{bonus:'FL10'});
 assert.ok(r.twin);assert.ok(!r.steps.some(s=>s.source===r.joao.uid&&s.target===r.twin.uid));}
if(process.env.TAUNT_TRACE)fs.writeFileSync(process.env.TAUNT_TRACE,JSON.stringify(trace,null,1));
console.log('Provocar: o provocador troca dano com o inimigo provocado (um golpe, ataque efetivo, primeiro a atacá-lo). '+trace.length+' casos.');
