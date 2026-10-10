import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,resolveCombat,view,easyBotAction} from './game.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),main=catalog.decks.find(d=>d.id==='forja-oficina-lyrik');
const card=(id,p,extra={})=>({...structuredClone(catalog.decks.flatMap(d=>d.cards).find(c=>c.id===id)),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,...extra});
function setup(){const room=makeRoom('ENTRY','A'),a=room.players[0],b=join(room,'B');for(const p of[a,b])Object.assign(p,{patron:{hp:20,maxHp:20},mana:10,manaMax:10,deck:Array.from({length:8},()=>({uid:randomUUID()}))});Object.assign(room,{phase:'prep',turn:a.id,first:a.id,collectPreview:true});return{room,a,b};}
for(const d of catalog.decks.filter(d=>d.affinity==='forja')){assert.equal(d.cards.reduce((n,c)=>n+c.quantity,0),30);assert.equal(d.cards.find(c=>c.id==='FL17').cost,2);assert.equal(d.cards.find(c=>c.id==='FL13').artZoom,150);}
assert.equal(main.cards.find(c=>c.id==='FL01').cost,2);assert.equal(main.cards.find(c=>c.id==='FL06').cost,3);assert.equal(main.cards.find(c=>c.id==='FL05').quantity,2);assert.equal(main.cards.find(c=>c.id==='FL10').quantity,2);
{
 const {room,a,b}=setup(),source=card('FL01',a),ally=card('FL05',a),enemy=card('RG02',b);a.hand=[source];a.reserve=[ally];b.reserve=[enemy];
 for(const targetId of [undefined,enemy.uid,'missing']){assert.throws(()=>act(room,a,{type:'play',cardId:source.uid,targetId},catalog),/aliada viva/);assert.equal(a.mana,10);assert.ok(a.hand.includes(source));assert.equal(a.reserve.length,1);}
 act(room,a,{type:'play',cardId:source.uid,targetId:ally.uid},catalog);assert.equal(a.mana,8);assert.deepEqual(ally.grantedKeywords,['initiative']);assert.equal(source.grantedKeywords,undefined,'Mecânico não recebe Iniciativa passivamente');assert.ok(view(room,a).players[0].reserve.find(c=>c.uid===ally.uid).highlightKeywords.includes('Iniciativa'));assert.ok(view(room,b).events.some(e=>e.type==='ability_notice'&&e.targetId===ally.uid));
 a.formation[0]=ally.uid;b.formation[0]=enemy.uid;room.phase='resolving';resolveCombat(room);assert.ok(b.discard.includes(enemy));assert.equal(ally.damage,1,'Revelação antecede Iniciativa, mas inimigo morto não revida');
 a.formation[0]=ally.uid;room.phase='resolving';resolveCombat(room);assert.deepEqual(ally.grantedKeywords,['initiative'],'concessão permanece após combate');
}
{
 const {room,a}=setup(),source=card('FL01',a);a.hand=[source];act(room,a,{type:'play',cardId:source.uid,targetId:source.uid},catalog);assert.deepEqual(source.grantedKeywords,['initiative'],'pode escolher a própria criatura aliada');
}
{
 const {room,a}=setup(),source=card('FL01',a),target=card('FL05',a,{grantedKeywords:['initiative']});a.hand=[source];a.reserve=[target];act(room,a,{type:'play',cardId:source.uid,targetId:target.uid},catalog);assert.deepEqual(target.grantedKeywords,['initiative'],'não duplica palavra concedida');
}
{
 const {room,a}=setup(),source=card('FL01',a),target=card('FL05',a);a.bot=true;a.hand=[source];a.reserve=[target];const action=easyBotAction(room);assert.equal(action.targetId,target.uid);act(room,a,action,catalog);assert.ok(target.grantedKeywords.includes('initiative'));
}
console.log('Mecânico: Entrada com escolha, validação antes de cobrança, efeito permanente destacado, Iniciativa após Revelação e bot aprovados.');
{
 const {room,a,b}=setup(),source=card('FL01',a),ally=card('FL17',a),inc=card('RG02',b);a.reserve=[ally];b.reserve=[inc];a.hand=[source];act(room,a,{type:'play',cardId:source.uid,targetId:ally.uid},catalog);a.formation[0]=ally.uid;b.formation[0]=inc.uid;room.phase='resolving';resolveCombat(room);assert.ok(a.discard.includes(ally),'Iniciativa não evita morrer durante Revelação');assert.ok(b.reserve.includes(inc));
}
{
 const {room,a,b}=setup(),syn=card('FL04',a),inc=card('RG02',b),toque=card('FL13',a);a.reserve=[syn];b.reserve=[inc];a.hand=[toque];a.formation[0]=syn.uid;b.formation[0]=inc.uid;act(room,a,{type:'play',cardId:toque.uid,mode:'lane',lane:0,targetSide:b.id},catalog);room.phase='resolving';resolveCombat(room);assert.equal(inc.attack,0);assert.equal(syn.damage,1,'Toque não reduz o dano da Revelação');assert.equal(syn.attack,1);assert.equal(syn.health,3,'Sintético sobrevive e cresce');
}
{
 const {room,a,b}=setup(),source=card('FL01',a),ally=card('FL17',a),inc=card('RG02',b),buff=card('FL10',a);a.reserve=[ally];b.reserve=[inc];a.hand=[source,buff];act(room,a,{type:'play',cardId:source.uid,targetId:ally.uid},catalog);act(room,a,{type:'play',cardId:buff.uid,targetId:ally.uid},catalog);a.formation[0]=ally.uid;b.formation[0]=inc.uid;room.phase='resolving';resolveCombat(room);assert.ok(a.reserve.includes(ally));assert.ok(b.discard.includes(inc));assert.equal(ally.damage,1,'Atualização + Iniciativa atravessam a Revelação sem revide');
}
console.log('Contra Ruptura: Revelação precede Iniciativa; Toque + Sintético cresce; Atualização + Iniciativa preserva criatura 1/1.');
