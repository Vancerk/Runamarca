import assert from 'node:assert/strict';
import fs from 'node:fs';
import {act,makeRoom,join,resolveCombat,view} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),deck=catalog.decks.find(d=>d.id==='ruptura-grupo');
const card=(id,p,extra={})=>({...structuredClone(deck.cards.find(c=>c.id===id)),uid:crypto.randomUUID(),modelId:id,owner:p.id,baseStats:{...deck.cards.find(c=>c.id===id)},attackMod:0,damage:0,...extra});
function setup(phase='prep'){const room=makeRoom('RUPT','A'),a=room.players[0],b=join(room,'B');for(const p of [a,b])Object.assign(p,{deckData:deck,patron:{hp:100,maxHp:100,affinity:'ruptura'},mana:10,manaMax:10,deck:Array.from({length:20},()=>({uid:crypto.randomUUID()})),taunts:{}});Object.assign(room,{phase,first:a.id,turn:a.id,collectPreview:true});return {room,a,b};}
const place=(p,c,lane)=>{p.reserve.push(c);p.formation[lane]=c.uid;return c;};
assert.equal(deck.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(deck.cards.length,13);for(const c of deck.cards){assert.ok(c.effects.length);assert.ok(fs.existsSync(new URL(c.image,import.meta.url)));}assert.ok(!deck.cards.find(c=>c.id==='RG05').text.includes('Sacrifique'));
{
 const {room,a,b}=setup();const spell=card('RG07',a);a.hand=[spell];act(room,a,{type:'play',cardId:spell.uid,targetId:'patron:'+b.id},catalog);assert.equal(b.patron.hp,99);assert.equal(a.mana,9);const event=room.events.find(e=>e.type==='spell');assert.equal(event.card.uid,spell.uid);assert.equal(view(room,b).events.find(e=>e.id===event.id).card.uid,spell.uid);assert.equal(event.targetPatronId,b.id);assert.equal(event.healthUpdates[0].patronId,b.id);
}
{
 const {room,a,b}=setup(),ally=card('RG01',a);a.reserve=[ally];const spell=card('RG04',a);a.hand=[spell];act(room,a,{type:'play',cardId:spell.uid,targetId:ally.uid},catalog);assert.equal(a.reserve.length,0);assert.equal(b.patron.hp,100);assert.equal(a.mana,4);
}
{
 const {room,a}=setup(),gnoll=card('RG08',a);a.reserve=[gnoll];let spell=card('RG06',a);a.hand=[spell];act(room,a,{type:'play',cardId:spell.uid},catalog);assert.equal(a.reserve.filter(c=>c.token).length,2);assert.equal(gnoll.attackMod,0);spell=card('RG06',a);a.hand=[spell];act(room,a,{type:'play',cardId:spell.uid},catalog);assert.equal(a.reserve.filter(c=>c.token).length,4,'segunda cópia também cria duas fichas');assert.equal(gnoll.attackMod,0);a.formation[0]=gnoll.uid;a.formation[1]=a.reserve.find(c=>c.token).uid;room.phase="resolving";resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,3,"um único bônus de +1 com aliado pequeno no combate");assert.equal(gnoll.attackMod,0);
}
{
 const {room,a,b}=setup('resolving');const geo=place(a,card('RG01',a),0);place(b,card('RG11',b,{attack:1}),0);resolveCombat(room);assert.ok(a.discard.some(c=>c.uid===geo.uid));assert.equal(a.reserve.filter(c=>c.token).length,1,'gera ficha mesmo morrendo no combate');assert.equal(a.reserve.find(c=>c.token).subtype,'Geometro');
}
{
 const {room,a,b}=setup('resolving');place(a,card('RG03',a),0);place(b,card('RG03',b),0);resolveCombat(room);assert.equal(a.patron.hp,99);assert.equal(b.patron.hp,99,'Últimos Suspiros simultâneos');
}
{
 const {room,a,b}=setup('formation'),ram=place(a,card('RG11',a),0);
 act(room,a,{type:'revealPayment',cardId:ram.uid,pay:true},catalog);assert.equal(a.mana,9);assert.ok(view(room,b).events.some(e=>e.type==='ability_notice'&&e.message.includes('Aríete')));assert.throws(()=>act(room,a,{type:'revealPayment',cardId:ram.uid,pay:true},catalog));room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,1);assert.equal(b.patron.hp,99);assert.equal(ram.attack,0);assert.equal(ram.revealPaid,undefined);
}
{
 const {room,a,b}=setup('formation'),v=place(a,card('RG10',a),1),target=card('RG12',b),eman=card('RG13',b);b.reserve.push(target,eman);b.emanation=[eman.uid];room.forceWindow={until:Date.now()+5000,owners:[a.id]};
 assert.throws(()=>act(room,a,{type:'forceOpponent',cardId:v.uid,targetId:eman.uid},catalog),/reserva/);const existing=place(b,card('RG01',b),1);assert.throws(()=>act(room,a,{type:'forceOpponent',cardId:v.uid,targetId:target.uid},catalog),/ocupada/);b.formation[1]=null;b.ready=true;
 act(room,a,{type:'forceOpponent',cardId:v.uid,targetId:target.uid},catalog);assert.equal(b.formation[1],target.uid);assert.equal(b.ready,false);assert.throws(()=>act(room,b,{type:'assign',cardId:target.uid,lane:2},catalog),/Vultobreve/);assert.equal(view(room,a).players[1].formation[1],null,'formação rival segue oculta');act(room,a,{type:'assign',cardId:v.uid,lane:2},catalog);assert.equal(b.formation[1],null);assert.equal(target.forcedBy,undefined);assert.ok(existing);
}
{
 const {room,a,b}=setup(),tracker=card('RG05',a),tribal=card('RG02',a);a.reserve=[tribal];a.hand=[tracker];act(room,a,{type:'play',cardId:tracker.uid},catalog);assert.equal(tribal.health,2);assert.equal(view(room,a).players[0].reserve.find(c=>c.uid===tribal.uid).effectiveAttack,2);assert.equal(tracker.health,4,'não aumenta a si própria');room.phase='resolving';a.formation=[tracker.uid,null,null];place(b,card('RG12',b,{attack:8}),0);resolveCombat(room);assert.equal(tribal.health,1,'aura desaparece com a fonte');
}
{
 const {room,a,b}=setup('resolving'),source=card('RG13',a);b.patron.retaliation=3;a.reserve=[source];a.emanation=[source.uid];place(a,card('RG11',a),0);place(b,card('RG11',b),0);resolveCombat(room);assert.equal(b.patron.hp,99);assert.equal(b.patron.retaliation,0);assert.equal(room.directedSteps[0].retaliationDamage,1);assert.equal(room.directedSteps[0].retaliationUpdates[0].count,4);
}
{
 const {room,a,b}=setup(),spell=card('RG09',a),fighter=card('RG02',a),unused=card('RG01',a);a.hand=[spell];a.reserve=[fighter,unused];act(room,a,{type:'play',cardId:spell.uid},catalog);a.formation[0]=fighter.uid;room.phase='resolving';resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,3);assert.equal(b.patron.hp,97);assert.equal(fighter.attackMod,0);assert.equal(unused.attackMod,0);assert.equal(a.pendingCombatAttack,undefined);
}
{
 const {room,a,b}=setup('resolving');a.patron.hp=49;place(a,card('RG12',a),0);resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,5);assert.equal(b.patron.hp,95);
}
{
 const {room,a,b}=setup('formation'),ram=place(a,card('RG11',a),0),schedule=globalThis.setTimeout;let callback;
 act(room,a,{type:'revealPayment',cardId:ram.uid,pay:true},catalog);
 try{globalThis.setTimeout=fn=>{callback=fn;return 1;};act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);}finally{globalThis.setTimeout=schedule;}
 const step=room.combat.timeline.find(s=>s.kind==='revelation'&&s.ability.sourceId===ram.uid);assert.equal(step.ability.op,'attack_modifier');assert.equal(step.ability.targetSide,a.id);assert.equal(step.ability.healthUpdates[0].attack,1);assert.ok(callback);callback();assert.equal(room.phase,'prep');
}
{
 const {room,a}=setup(),spell=card('RG06',a);a.reserve=Array.from({length:7},()=>card('RG12',a));a.hand=[spell];act(room,a,{type:'play',cardId:spell.uid},catalog);assert.equal(a.reserve.length,8,'fichas respeitam o limite da reserva');
}
{
 const {room,a,b}=setup('formation'),ram=place(a,card('RG11',a),0);act(room,a,{type:'revealPayment',cardId:ram.uid,pay:false},catalog);assert.equal(a.mana,10);assert.equal(room.events.filter(e=>e.type==='ability_notice').length,0);room.phase='resolving';resolveCombat(room);assert.equal(b.patron.hp,100);assert.equal(room.preClash[0].cards[0].attack,0);
}
console.log('Ruptura: catálogo, dano a qualquer alvo, fichas/Gnoll, Último Suspiro simultâneo, pagamento público do Aríete, Vultobreve, aura Tribal, Retaliação e bônus de combate aprovados.');

{const {room,a,b}=setup('formation'),v=card('RG10',a),target=card('RG12',b);a.reserve=[v];b.reserve=[target];room.forceWindow={until:Date.now()+5000,owners:[a.id]};assert.throws(()=>act(room,b,{type:'assign',cardId:target.uid,lane:0},catalog),/prioridade/);act(room,a,{type:'assign',cardId:v.uid,lane:0},catalog);room.forceWindow.until=Date.now()-1;assert.throws(()=>act(room,a,{type:'forceOpponent',cardId:v.uid,targetId:target.uid},catalog),/terminaram/);act(room,b,{type:'assign',cardId:target.uid,lane:1},catalog);assert.equal(b.formation[1],target.uid);}
assert.equal(deck.cards.find(c=>c.id==='RG11').cost,3);

// Limites do rebalanceamento: condição de combate, frequência e custo real.
for(const location of ['reserve','emanation','combat']){
 const {room,a}=setup('resolving'),gnoll=place(a,card('RG08',a),0),small=card('RG01',a);a.reserve.push(small);
 if(location==='emanation')a.emanation=[small.uid];
 if(location==='combat'){a.formation[1]=small.uid;place(a,card('RG02',a),2);}
 resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,location==='combat'?3:2,`Gnoll: condição em ${location}`);assert.equal(gnoll.attackMod,0);
}
{
 const {room,a}=setup('resolving');place(a,card('RG08',a),0);place(a,card('RG02',a),1);a.reserve.push(card('RG05',a));
 resolveCombat(room);assert.equal(room.preClash[0].cards[0].attack,2,'Gnoll não ativa com Tribal cujo ataque efetivo é 2');
}
{
 const {room,a,b}=setup('resolving'),geo=place(a,card('RG01',a),0),blocker=place(b,card('RG11',b,{attack:0,health:20}),0);
 resolveCombat(room);assert.equal(geo.blockedSummonUsed,true);assert.equal(a.reserve.filter(c=>c.token).length,1);
 a.formation=[null,geo.uid,null];b.formation=[null,blocker.uid,null];room.phase='resolving';resolveCombat(room);
 assert.equal(a.reserve.filter(c=>c.token).length,1,'reposicionar e bloquear novamente não renova a ficha');
 const bounceModel=catalog.decks.flatMap(d=>d.cards).find(c=>c.id==='FV13'),bounce={...structuredClone(bounceModel),uid:crypto.randomUUID(),modelId:bounceModel.id,owner:b.id};
 room.phase='prep';room.turn=b.id;b.mana=10;b.hand=[bounce];act(room,b,{type:'play',cardId:bounce.uid,targetId:geo.uid},catalog);
 const returned=a.hand.find(c=>c.modelId==='RG01');assert.ok(returned);assert.equal(returned.blockedSummonUsed,undefined);
 room.turn=a.id;a.mana=10;act(room,a,{type:'play',cardId:returned.uid},catalog);a.formation=[returned.uid,null,null];b.formation=[blocker.uid,null,null];room.phase='resolving';resolveCombat(room);
 assert.equal(a.reserve.filter(c=>c.token).length,2,'nova entrada em campo renova o primeiro bloqueio');
}
{
 const {room,a,b}=setup('formation'),geo=place(a,card('RG01',a),0),schedule=globalThis.setTimeout;place(b,card('RG11',b,{attack:0}),0);let callback;
 try{globalThis.setTimeout=fn=>{callback=fn;return 1;};act(room,a,{type:'ready'},catalog);act(room,b,{type:'ready'},catalog);}finally{globalThis.setTimeout=schedule;}
 assert.equal(geo.blockedSummonUsed,undefined,'prévia de animação não consome o primeiro bloqueio');assert.equal(a.reserve.filter(c=>c.token).length,0);assert.ok(callback);callback();assert.equal(geo.blockedSummonUsed,true);assert.equal(a.reserve.filter(c=>c.token).length,1);
}
for(const targetKind of ['ally','enemy','own-patron','enemy-patron']){
 const {room,a,b}=setup(),target=card('RG11',targetKind==='ally'?a:b),spell=card('RG07',a);(targetKind==='ally'?a:b).reserve.push(target);a.hand=[spell];
 const targetId=targetKind==='own-patron'?'patron:'+a.id:targetKind==='enemy-patron'?'patron:'+b.id:target.uid;
 act(room,a,{type:'play',cardId:spell.uid,targetId},catalog);assert.equal(a.mana,9);assert.ok(a.discard.some(c=>c.uid===spell.uid));
 assert.equal(targetKind==='own-patron'?a.patron.hp:targetKind==='enemy-patron'?b.patron.hp:target.damage,targetKind.includes('patron')?99:1,`Estilhaço causa exatamente 1 em ${targetKind}`);
}
{
 const creator=JSON.parse(fs.readFileSync(new URL('./criador/prototipo.json',import.meta.url))),creatorDeck=creator.decks.find(d=>d.id===deck.id);
 for(const id of ['RG01','RG05','RG06','RG07','RG08'])assert.deepEqual(creatorDeck.cards.find(c=>c.id===id),deck.cards.find(c=>c.id===id),'criador e mesa devem usar a mesma carta');
}
console.log('Rebalanceamento aprovado: Gnoll exige aliado pequeno no combate; Geômetro só no primeiro bloqueio por entrada; Estilhaço causa 1 a qualquer alvo; Rastreadora preservada.');
