import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {act,makeRoom,join,view,resolveCombat,easyBotAction} from './game.mjs';
import {unrestrictedReturn} from './test-return-fixture.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url))),models=[...catalog.decks.flatMap(d=>d.cards),...(catalog.additionalCards||[])];
const card=(id,p,extra={})=>{const model=models.find(c=>c.id===id);return {...structuredClone(model),uid:randomUUID(),modelId:id,owner:p.id,damage:0,attackMod:0,baseStats:{attack:model.attack,health:model.health,cost:model.cost},...extra};};
function setup(){const room=makeRoom('SILENCE','A'),a=room.players[0],b=join(room,'B');for(const p of[a,b])Object.assign(p,{deckData:catalog.decks.find(d=>d.id==='fluxo-virelion'),patron:{hp:100,maxHp:100},mana:100,manaMax:10,deck:Array.from({length:20},()=>card('FV03',p))});Object.assign(room,{phase:'prep',turn:a.id,first:a.id,collectPreview:true});return {room,a,b};}
function play(room,p,id,targetId){const c=card(id,p);if(id==='FV13')unrestrictedReturn(c);p.hand.push(c);act(room,p,{type:'play',cardId:c.uid,targetId},catalog);return c;}
{
 const {room,a,b}=setup(),target=card('FL21',b,{attack:5,health:5,damage:0,grantedKeywords:['initiative'],runeCoating:true,corruption:true,spellBuff:'permanent'});b.reserve=[target];
 play(room,a,'FV01',target.uid);assert.equal(target.attack,1);assert.equal(target.health,1);assert.deepEqual(target.effects,[]);assert.equal(target.text,'');assert.equal(target.grantedKeywords,undefined);assert.equal(target.runeCoating,undefined);assert.equal(target.corruption,undefined);
 room.turn=b.id;play(room,b,'FL10',target.uid);assert.equal(target.attack,2);assert.equal(target.health,2,'Silêncio remove duplicação do Rúnico, mas permite bônus novos');
 room.turn=a.id;play(room,a,'FV13',target.uid);assert.equal(target.silenced,undefined);assert.ok(target.effects.some(e=>e.op==='double_stat_gains'),'Retorno à mão restaura regras originais');assert.equal(target.attack,1);assert.equal(target.health,1);
}
{
 const {room,a,b}=setup(),target=card('RG03',b,{health:5,damage:3});b.reserve=[target];play(room,a,'FV01',target.uid);assert.ok(b.discard.includes(target),'Perder vida concedida pode ser letal');assert.equal(a.patron.hp,100,'Último Suspiro silenciado não dispara');assert.equal(room.events.find(e=>e.type==='silence').healthUpdates[0].hp,0);
}
{
 const {room,a,b}=setup(),target=card('FL04',b,{health:7,attack:5,damage:1});b.reserve=[target];play(room,a,'FV01',target.uid);assert.equal(target.health,2);assert.equal(target.damage,1,'Silêncio não cura dano');b.formation[0]=target.uid;room.phase='resolving';resolveCombat(room);assert.equal(target.attack,0,'Crescimento foi removido');assert.equal(target.health,2);
}
{
 const {room,a,b}=setup(),source=card('FV15',b),ally=card('FL04',b);b.reserve=[source,ally];room.seals=[{sourceId:source.uid,owner:b.id,enemyOwner:a.id,allyLane:0,enemyLane:1}];play(room,a,'FV01',source.uid);assert.deepEqual(room.seals,[],'Selos dependem da habilidade ativa de Ithalion');
}
{
 const {room,a,b}=setup(),source=card('FL17',b),ally=card('FL04',b);b.reserve=[source,ally];b.emanation=[source.uid];b.formation[0]=ally.uid;play(room,a,'FV01',source.uid);const snapshot=view(room,b).players.find(p=>p.id===b.id);assert.equal(snapshot.reserve.find(c=>c.uid===ally.uid).health,2,'Emanação silenciada não concede vida');assert.ok(b.emanation.includes(source.uid),'Silêncio não move a carta para outro local');
}
{
 const {room,a,b}=setup(),target=card('FL02',b,{anchor:{lane:0,remaining:2,setAt:0},sleep:{lane:0,remaining:2,setAt:0},volatileProject:true,extraLife:2});const weapon={uid:'weapon',durability:2,attack:3,effects:[{op:'trample'}]};target.equipment=weapon;b.reserve=[target];b.formation[0]=target.uid;play(room,a,'FV01',target.uid);assert.equal(target.equipment,undefined);assert.ok(b.weapons.includes(weapon));assert.equal(weapon.durability,2);for(const key of ['sleep','anchor','volatileProject','extraLife'])assert.equal(target[key],undefined);
}
{
 const {room,a,b}=setup(),target=card('RG05',b),tribal=card('RG06',b,{subtype:'Tribal',health:1,attack:1});b.reserve=[target,tribal];play(room,a,'FV01',target.uid);assert.equal(tribal.tribalHealth,0,'Aura Tribal do emissor silenciado desaparece');
}
{
 const {room,a,b}=setup(),fat=card('FV01',a);a.hand=[fat];for(const targetId of [undefined,'missing','patron:'+b.id]){assert.throws(()=>act(room,a,{type:'play',cardId:fat.uid,targetId},catalog),/criatura viva/);assert.equal(a.mana,100);assert.ok(a.hand.includes(fat));}act(room,a,{type:'play',cardId:fat.uid,targetId:fat.uid},catalog);assert.equal(fat.silenced,true,'Sem outras criaturas, pode escolher a si mesmo');assert.equal(fat.attack,3);assert.equal(fat.health,2);
}
{
 const {room,a,b}=setup(),target=card('FV06',b);b.reserve=[target];a.bot=true;a.hand=[card('FV01',a)];assert.equal(easyBotAction(room).targetId,target.uid);
}
assert.equal(models.find(c=>c.id==='FL08').cost,5);assert.equal(models.find(c=>c.id==='RG04').cost,5);
console.log('Silêncio: alvos, validação antes da cobrança, atributos/dano, efeitos novos, retorno, Último Suspiro, Emanação, selos, arma na reserva e bot aprovados.');
