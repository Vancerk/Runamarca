import assert from 'node:assert/strict';

export const changes = [
  {id:'F01',health:2},
  {id:'F02',health:3},
  {id:'F04',cost:4},
  {id:'R02',attack:2},
  {id:'R06',attack:4},
  {id:'R10',drawOnKill:true},
];

export function scenario(originalSource, originalCatalog, dualArea, immuneEmana){
  const catalog=structuredClone(originalCatalog);
  for(const update of changes){
    const card=catalog.decks.flatMap(d=>d.cards).find(c=>c.id===update.id);
    assert.ok(card,update.id);
    for(const key of ['health','cost','attack'])if(key in update)card[key]=update[key];
    if(update.drawOnKill){
      card.effects.find(e=>e.op==='damage').draw_on_kill=1;
      card.text='Cause 2 de dano a uma criatura inimiga. Se esse dano a destruir, compre 1 carta.';
    }
  }
  if(dualArea)for(const card of catalog.decks.flatMap(d=>d.cards))for(const ef of card.effects||[]){
    if(ef.op!=='area_damage')continue;
    ef.direct_amount=Math.floor(ef.amount/2);
    assert.ok(ef.direct_amount>=1,'Esta experiencia requer dano de area base de pelo menos 2.');
    card.text=`Direta: cause ${ef.direct_amount} de dano a todas as criaturas inimigas fora da emanacao. Preparada: quando uma criatura inimiga for revelada na posicao escolhida, cause ${ef.amount} de dano apenas as criaturas da formacao inimiga. Expira ao fim da rodada mesmo sem ativar.`;
  }
  let source=originalSource;
  const replace=(from,to)=>{assert.equal(source.split(from).length-1,1,'Ponto de extensao mudou: '+from);source=source.replace(from,to);};
  replace("if(ef.op==='damage'){applyDamage(room,target,ef.amount);continue;}","if(ef.op==='damage'){const previouslyAlive=alive(target);applyDamage(room,target,ef.amount);if(ef.draw_on_kill&&previouslyAlive&&!alive(target))draw(room,caster,ef.draw_on_kill);continue;}");
  replace('const spellChanges=new Map();const spellDraws=[];','const spellChanges=new Map();const spellDraws=[];const killDraws=[];');
  replace("if(ef.op==='damage')change.damage+=ef.amount;","if(ef.op==='damage'){change.damage+=ef.amount;if(ef.draw_on_kill)killDraws.push([caster,target,ef.draw_on_kill]);}");
  replace('for(const [caster,count] of spellDraws)draw(room,caster,count);','for(const [caster,target,count] of killDraws)if(!alive(target))draw(room,caster,count);for(const [caster,count] of spellDraws)draw(room,caster,count);');
  if(dualArea||immuneEmana){
    const guard=immuneEmana?'&&!other(room,caster.id).emanation.includes(creature.uid)':'';
    replace("if(ef.op==='area_damage'){for(const creature of other(room,caster.id).reserve)if(alive(creature))applyDamage(room,creature,ef.amount);continue;}",`if(ef.op==='area_damage'){for(const creature of other(room,caster.id).reserve)if(alive(creature)${guard})applyDamage(room,creature,ef.direct_amount??ef.amount);continue;}`);
    const prepared=dualArea?"for(let lane=0;lane<3;lane++){const enemy=laneCard(room,other(room,caster.id).id,lane);if(alive(enemy))changeFor(enemy).damage+=ef.amount;}":"for(const enemy of other(room,caster.id).reserve)if(alive(enemy)&&!other(room,caster.id).emanation.includes(enemy.uid))changeFor(enemy).damage+=ef.amount;";
    replace("if(ef.op==='area_damage'){for(const enemy of other(room,caster.id).reserve)if(alive(enemy))changeFor(enemy).damage+=ef.amount;continue;}",`if(ef.op==='area_damage'){${prepared}continue;}`);
  }
  return {source,catalog};
}

export async function verifyScenario(engine,catalog,dualArea,immuneEmana){
  const models=catalog.decks.flatMap(d=>d.cards),checks=[];
  const creature=(uid,owner,health=6)=>({uid,owner,modelId:uid,name:uid,type:'creature',cost:1,attack:0,health,damage:0,attackMod:0,effects:[]});
  const model=(id,owner)=>({...structuredClone(models.find(c=>c.id===id)),uid:id+'-test',modelId:id,owner,damage:0,attackMod:0});
  async function setup(){
    const api=await engine(700),room=api.makeRoom('CHECK','A'),p=room.players[0],q=api.join(room,'B');
    room.phase='prep';room.turn=room.first=p.id;room.preparationsDone=0;
    for(const player of [p,q]){player.patron={hp:20,maxHp:20};player.mana=player.manaMax=10;player.deck=[model('R01',player.id)];}
    q.reserve=Array.from({length:5},(_,i)=>creature('enemy-'+i,q.id));q.emanation=[q.reserve[4].uid];
    return {api,room,p,q};
  }
  {
    const {api,room,p,q}=await setup();p.hand=[model('M10',p.id)];
    api.act(room,p,{type:'play',cardId:p.hand[0].uid,mode:'direct'},catalog);
    const expected=Array(5).fill(dualArea?1:2);if(immuneEmana)expected[4]=0;
    assert.deepEqual(q.reserve.map(c=>c.damage),expected);
    checks.push(`Area direta: dano correto na reserva; emanacao ${immuneEmana?'protegida':'atingida no controle'}.`);
  }
  {
    const {api,room,p,q}=await setup();p.hand=[model('M10',p.id)];
    api.act(room,p,{type:'play',cardId:p.hand[0].uid,mode:'lane',lane:1,targetSide:q.id},catalog);
    room.phase='formation';q.formation=q.reserve.slice(0,3).map(c=>c.uid);
    api.act(room,p,{type:'ready'},catalog);api.act(room,q,{type:'ready'},catalog);api.flush();
    assert.deepEqual(q.reserve.map(c=>c.damage),dualArea?[2,2,2,0,0]:immuneEmana?[2,2,2,2,0]:[2,2,2,2,2]);
    assert.equal(p.prepared.length,0);assert.ok(p.discard.some(c=>c.modelId==='M10'));
    checks.push('Area preparada: alcance e dano corretos; consumida depois de ativar.');
  }
  for(const combat of [false,true]){
    const {api,room,p,q}=await setup();p.hand=[model('M10',p.id)];
    api.act(room,p,{type:'play',cardId:p.hand[0].uid,mode:'lane',lane:1,targetSide:q.id},catalog);
    if(combat){room.phase='formation';q.formation=[q.reserve[0].uid,null,null];api.act(room,p,{type:'ready'},catalog);api.act(room,q,{type:'ready'},catalog);api.flush();}
    else {room.phase='vote';api.act(room,p,{type:'vote',fight:false},catalog);api.act(room,q,{type:'vote',fight:false},catalog);}
    assert.equal(room.round,2);assert.equal(p.prepared.length,0);assert.ok(p.discard.some(c=>c.modelId==='M10'));assert.ok(q.reserve.every(c=>c.damage===0));
    checks.push(`Area sem gatilho expira ao fim da rodada ${combat?'com':'sem'} combate, sem causar dano.`);
  }
  for(const lethal of [false,true]){
    const {api,room,p,q}=await setup();q.reserve=[creature('target',q.id,lethal?2:3)];q.emanation=['target'];p.hand=[model('R10',p.id)];
    api.act(room,p,{type:'play',cardId:p.hand[0].uid,mode:'direct',targetId:q.reserve[0].uid},catalog);
    assert.equal(p.hand.length,lethal?1:0);assert.equal(p.deck.length,lethal?0:1);
    checks.push(`Tiro direto atinge emanacao e ${lethal?'compra uma carta ao eliminar':'nao compra se o alvo sobreviver'}.`);
  }
  // R10 pode ser preparado no motor. A compra condicional segue a morte na etapa simultanea de magias.
  {
    const {api,room,p,q}=await setup();q.reserve=[creature('target',q.id,2)];p.hand=[model('R10',p.id)];
    api.act(room,p,{type:'play',cardId:p.hand[0].uid,mode:'lane',lane:0,targetSide:q.id},catalog);
    room.phase='formation';q.formation=[q.reserve[0].uid,null,null];api.act(room,p,{type:'ready'},catalog);api.act(room,q,{type:'ready'},catalog);api.flush();
    assert.ok(room.events.some(e=>e.type==='draw'&&e.playerId===p.id));assert.ok(q.discard.some(c=>c.uid==='target'));
    checks.push('Tiro preparado: eliminacao na etapa de magias concede a compra.');
  }
  return checks;
}
