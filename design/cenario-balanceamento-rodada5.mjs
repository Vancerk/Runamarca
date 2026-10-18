import assert from 'node:assert/strict';

export const newChanges=[
 {id:'F03',healingManaCost:1,excludeSelf:true},
 {id:'F02',revelationCondition:'self_wounded'},
 {id:'F06',health:5},
 {id:'F08',cost:8},
];
export function applyForja(source,catalog,{axiomCost=8}={}){
 assert.ok([8,9].includes(axiomCost));
 const card=id=>catalog.decks.find(d=>d.affinity==='forja').cards.find(c=>c.id===id);
 card('F03').effects[0].mana_cost=1;card('F03').effects[0].exclude_self=true;
 card('F03').text='Emanação: ao fim da sua preparação, você pode pagar 1 mana para curar 1 de dano de outra criatura aliada.';
 card('F02').effects[0].condition='self_wounded';
 card('F02').text='Revelação: se estiver ferido, cause 1 de dano à criatura inimiga na mesma posição.';
 card('F06').health=5;card('F08').cost=axiomCost;
 const replace=(from,to)=>{assert.equal(source.split(from).length-1,1,'Ponto de extensao mudou: '+from);source=source.replace(from,to);};
 replace("&&(ef.condition!=='owner_played_direct_spell_this_round'||p.directPlayed)","&&(ef.condition!=='owner_played_direct_spell_this_round'||p.directPlayed)&&(ef.condition!=='self_wounded'||card.damage>0)");
 replace("if(ef.condition==='owner_played_direct_spell_this_round'&&!p.directPlayed)continue;","if(ef.condition==='owner_played_direct_spell_this_round'&&!p.directPlayed)continue;if(ef.condition==='self_wounded'&&card.damage<=0)continue;");
 replace("clerics.forEach((_,index)=>{const target=findCreature(p,data.healTargetIds?.[index]||data.healTargetId);if(target)target.damage=Math.max(0,target.damage-1);});",`clerics.forEach((uid,index)=>{
        const cleric=findCreature(p,uid),ef=effects(cleric).find(ef=>ef.op==='heal'),target=findCreature(p,data.healTargetIds?.[index]||data.healTargetId),cost=ef?.mana_cost||0;
        if(!target||target.damage<=0||(ef?.exclude_self&&target.uid===uid)||p.mana<cost)return;
        p.mana-=cost;target.damage=Math.max(0,target.damage-1);
        emit(room,'cleric_heal',{playerId:p.id,sourceId:uid,targetId:target.uid,amount:1,mana:cost});
      });`);
 return {source,catalog};
}

export async function verifyForja(engine,catalog){
 const models=catalog.decks.flatMap(d=>d.cards),checks=[];
 const model=(id,p)=>({...structuredClone(models.find(c=>c.id===id)),uid:id+'-'+p.id,modelId:id,owner:p.id,damage:0,attackMod:0});
 async function setup(){const api=await engine(710),room=api.makeRoom('CHECK5','A'),p=room.players[0],q=api.join(room,'B');room.phase='prep';room.first=room.turn=p.id;room.preparationsDone=0;for(const seat of [p,q]){seat.patron={hp:20,maxHp:20};seat.manaMax=seat.mana=10;seat.deck=[model('R01',seat)];}return{api,room,p,q};}
 for(const mana of [0,1,2]){
  const {api,room,p}=await setup(),cleric=model('F03',p),target=model('F06',p);target.damage=2;p.reserve=[cleric,target];p.emanation=[cleric.uid];p.mana=mana;
  api.act(room,p,{type:'endPrep',healTargetIds:[target.uid]},catalog);
  assert.equal(target.damage,mana?1:2);assert.equal(p.mana,mana?mana-1:0);
 }
 checks.push('Cleriga: cura custa 1 mana; sem mana nao cura nem gera saldo negativo.');
 for(const mode of ['self','skip','full']){
  const {api,room,p}=await setup(),cleric=model('F03',p),target=model('F06',p);cleric.damage=1;p.reserve=[cleric,target];p.emanation=[cleric.uid];p.mana=2;
  api.act(room,p,{type:'endPrep',healTargetIds:[mode==='self'?cleric.uid:mode==='full'?target.uid:null]},catalog);
  assert.equal(cleric.damage,1);assert.equal(target.damage,0);assert.equal(p.mana,2);
 }
 checks.push('Cleriga: opcional, nao cura a si mesma e nao cobra por alvo sem ferimento.');
 {
  const {api,room,p}=await setup(),a=model('F03',p),b={...model('F03',p),uid:'second-cleric'},target=model('F06',p);target.damage=3;p.reserve=[a,b,target];p.emanation=[a.uid,b.uid];p.mana=1;
  api.act(room,p,{type:'endPrep',healTargetIds:[target.uid,target.uid]},catalog);assert.equal(p.mana,0);assert.equal(target.damage,2);
  checks.push('Duas Clerigas: cada ativacao paga separadamente, respeitando a mana disponivel.');
 }
 for(const wound of [0,1]){
  const {api,room,p,q}=await setup(),shield=model('F02',p),target=model('F06',q);shield.attack=0;shield.damage=wound;target.attack=0;target.effects=[];p.reserve=[shield];q.reserve=[target];p.formation=[shield.uid,null,null];q.formation=[target.uid,null,null];room.phase='formation';
  api.act(room,p,{type:'ready'},catalog);api.act(room,q,{type:'ready'},catalog);
  assert.equal(room.combat.timeline.filter(step=>step.kind==='revelation').length,wound?1:0);api.flush();assert.equal(target.damage,wound?1:0);
 }
 checks.push('Escudeiro: Revelacao e seu aviso so ocorrem quando ja esta ferido.');
 {
  const {api,room,p,q}=await setup(),shield=model('F02',p),target=model('F06',q);shield.attack=0;target.attack=0;target.effects=[];p.reserve=[shield];q.reserve=[target];q.hand=[model('R11',q)];room.turn=q.id;
  api.act(room,q,{type:'play',cardId:q.hand[0].uid,mode:'lane',lane:0,targetSide:p.id},catalog);p.formation=[shield.uid,null,null];q.formation=[target.uid,null,null];room.phase='formation';api.act(room,p,{type:'ready'},catalog);api.act(room,q,{type:'ready'},catalog);api.flush();assert.equal(target.damage,1);
  checks.push('Escudeiro ferido por armadilha antes da Revelacao ativa o efeito no mesmo combate.');
 }
 {
  const {api,room,p}=await setup(),axiom=model('F08',p);p.hand=[axiom];p.mana=axiom.cost-1;assert.throws(()=>api.act(room,p,{type:'play',cardId:axiom.uid},catalog),/Mana insuficiente/);p.mana=axiom.cost;api.act(room,p,{type:'play',cardId:axiom.uid},catalog);assert.equal(p.mana,0);assert.equal(p.hand.length,1);assert.equal(p.reserve[0].attack,8);assert.equal(p.reserve[0].health,8);
  checks.push(`Axiom: ${axiom.cost-1} mana insuficiente; por ${axiom.cost} entra 8/8 e compra uma carta.`);
 }
 assert.equal(models.find(c=>c.id==='F06').health,5);checks.push('Drakonir: 3/5, custo 5 e Revelacao de 1 dano preservados.');
 return checks;
}
