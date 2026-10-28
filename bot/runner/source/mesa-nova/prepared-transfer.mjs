// Desvio: one simultaneous swap per pair, from attacks frozen after initial buffs.
import {studyPrepared} from './fluxo-studies.mjs';
const alive=c=>c&&c.damage<c.health;
export function validatePreparedTransfer(card){
 for(const ef of card.effects||[])if(ef.op==='transfer_attack'){
  if(card.type!=='prepared_spell'||!card.positionOnly||!card.enemyOnly)throw Error('Desvio exige armadilha em posição inimiga.');
  if(Object.keys(ef).some(k=>!['op','timing','duration'].includes(k))||ef.timing!==undefined&&ef.timing!=='before_attacks'||ef.duration!==undefined&&ef.duration!=='combat')throw Error('Definição de Desvio contém parâmetro desconhecido ou regra não suportada.');
 }
}
export function resolvePreparedTransfers(room,{attack,laneCard,pushLog}){
 const eligible=[],validOriginals=new Set();
 for(const caster of room.players)for(const prep of studyPrepared(caster)){
  const ef=(prep.card.effects||[]).find(e=>e.op==='transfer_attack');if(!ef)continue;
  validatePreparedTransfer(prep.card);
  if(prep.echo&&!validOriginals.has(prep.sourcePrep.card.uid))continue;
  const enemy=room.players.find(p=>p.id===prep.targetSide&&p!==caster);
  if(!enemy||!Number.isInteger(prep.lane)||prep.lane<0||prep.lane>2)continue;
  const source=laneCard(room,enemy.id,prep.lane),target=laneCard(room,caster.id,prep.lane);
  if(!alive(source)||!alive(target)||source.type!=='creature'||target.type!=='creature'||enemy.emanation.includes(source.uid)||caster.emanation.includes(target.uid))continue;
  const sourceAttack=attack(source,room,prep.lane),targetAttack=attack(target,room,prep.lane);
  if(!Number.isFinite(sourceAttack)||!Number.isFinite(targetAttack))continue;
  if(!prep.echo)validOriginals.add(prep.card.uid);
  eligible.push({prep,caster,source,target,sourceAttack,targetAttack});
 }
 // All plans read the same snapshot. Opposite controllers and overlapping Echoes
 // share an unordered pair; duplicates consume normally without undoing the swap.
 const groups=new Map(),deltas=new Map();
 for(const plan of eligible){
  const key=JSON.stringify([plan.source.uid,plan.target.uid].sort());
  let group=groups.get(key);
  if(!group){group={blocked:Boolean(plan.source.runeCoating||plan.target.runeCoating),plan};groups.set(key,group);}
  plan.group=group;
 }
 for(const {blocked,plan} of groups.values()){
  if(blocked)continue;
  const delta=plan.targetAttack-plan.sourceAttack;
  deltas.set(plan.source,(deltas.get(plan.source)||0)+delta);
  deltas.set(plan.target,(deltas.get(plan.target)||0)-delta);
 }
 for(const [c,delta] of deltas)c.attackMod=(c.attackMod||0)+delta;
 for(const {prep,caster,source,target,sourceAttack,targetAttack,group} of eligible){
  (room.transferOrder??=[]).push({window:'after-revelation-before-attacks',round:room.round,cardId:prep.card.uid,sourceId:source.uid,targetId:target.uid,lane:prep.lane,operation:'swap',sourceAttackBefore:sourceAttack,targetAttackBefore:targetAttack,blocked:group.blocked,echo:Boolean(prep.echo)});
  if(room.collectPreview)room.spellHealthUpdates.push({cardId:prep.card.uid,targets:[source,target].map(c=>({uid:c.uid,hp:Math.max(0,c.health-c.damage),maxHp:c.health,attack:attack(c,room,prep.lane)}))});
  if(!prep.echo){caster.discard.push(prep.card);caster.prepared=caster.prepared.filter(p=>p!==prep);}
  room.lastCombat.spells.push(`${prep.card.name} · posição ${prep.lane+1}`);
  pushLog?.(room,group.blocked?`${prep.card.name}: Antimagia impediu a troca.`:`${prep.card.name}: ataques ${sourceAttack} e ${targetAttack} trocados, somente neste combate.`,caster.id);
 }
}
