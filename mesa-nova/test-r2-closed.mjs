import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setup,card,unit,place,cast,combat,act,view,catalog} from './r1-fixtures.mjs';

test('Aríete: escolhe sem pagar; serializar não cobra; paga uma vez na Revelação e expira',()=>{
 const {room,a,b}=setup({aDeck:'ruptura-grupo'}),ram=place(a,card('RG11',a),0);
 assert.equal(ram.cost,2);room.phase='formation';act(room,a,{type:'revealPayment',cardId:ram.uid,pay:true},catalog);
 assert.equal(a.mana,10);JSON.stringify(view(room,a));JSON.stringify(view(room,b));assert.equal(a.mana,10);
 assert.throws(()=>act(room,a,{type:'revealPayment',cardId:ram.uid,pay:true},catalog));
 // No startPrep refill may mask payment: the next preparation belongs to B.
 const before=a.mana;combat(room);assert.equal(a.mana,before-1);assert.equal(room.preClash[0].cards[0].attack,2);
 assert.equal(ram.attack,0);assert.equal(ram.attackMod,0);assert.equal(ram.revealRequested,undefined);
 place(a,ram,0);combat(room);assert.equal(room.preClash[0].cards[0].attack,0);
});
for(const choice of ['decline','empty-at-resolution','silenced','insufficient-at-resolution','insufficient-at-choice'])test(`Aríete negativo: ${choice}`,()=>{
 const {room,a}=setup({aDeck:'ruptura-grupo'}),ram=place(a,card('RG11',a),0);room.phase='formation';
 if(choice==='insufficient-at-choice'){a.mana=0;assert.throws(()=>act(room,a,{type:'revealPayment',cardId:ram.uid,pay:true},catalog),/insuficiente/);assert.equal(ram.revealPaymentRound,undefined);return;}
 act(room,a,{type:'revealPayment',cardId:ram.uid,pay:choice!=='decline'},catalog);
 if(choice==='empty-at-resolution')a.formation[0]=null;
 if(choice==='silenced'){room.phase='prep';room.turn=a.id;cast(room,a,card('FV01',a),{targetId:ram.uid});}
 if(choice==='insufficient-at-resolution')a.mana=0;
 const before=a.mana;combat(room);assert.equal(a.mana,before);
 if(choice!=='empty-at-resolution')assert.equal(room.preClash[0].cards[0].attack,0);
});
for(const [raw,mod,expected] of [[0,0,3],[1,0,3],[2,0,3],[3,0,2],[2,1,2],[3,-1,3]])test(`Gnoll: ataque ${raw} mod ${mod}`,()=>{
 const {room,a}=setup({aDeck:'ruptura-grupo'});place(a,card('RG08',a),0);place(a,unit(a,{attack:raw,attackMod:mod}),1);
 combat(room);assert.equal(room.preClash[0].cards[0].attack,expected);
});
for(const zone of ['alone','reserve','emanation'])test(`Gnoll não usa a si mesmo nem ${zone}`,()=>{
 const {room,a}=setup({aDeck:'ruptura-grupo'});place(a,card('RG08',a),0);
 if(zone!=='alone'){const ally=unit(a,{attack:1});a.reserve.push(ally);if(zone==='emanation')a.emanation=[ally.uid];}
 combat(room);assert.equal(room.preClash[0].cards[0].attack,2);
});
for(const mixed of [false,true])test(`Legado: mão ${mixed?'mista, permanente e única':'vazia'}`,()=>{
 const {room,a,b}=setup({aDeck:'forja-oficina-experimental'});const legacy=place(a,card('FEX09',a),0);
 assert.deepEqual([legacy.cost,legacy.attack,legacy.health],[1,1,1]);
 const target=card('FL17',a,{attack:3,health:5}),magic=card('FL10',a);if(mixed)a.hand=[target,magic];
 place(b,unit(b,{attack:1}),0);combat(room);
 assert.ok(a.discard.some(c=>c.uid===legacy.uid));if(mixed){assert.equal(target.attack,4);assert.equal(target.health,6);assert.equal(magic.attack,undefined);}
 const later=card('FL17',a);a.hand.push(later);combat(room);assert.equal(later.attack,1);if(mixed)assert.equal(target.attack,4);
});
test('Composições finais aprovadas e IDs históricos recuperáveis',()=>{
 const limits={lacaio:4,padrao:3,elite:2,soberano:1};
 for(const d of catalog.decks){assert.equal(d.cards.reduce((n,c)=>n+c.quantity,0),30,d.id);assert.equal(new Set(d.cards.map(c=>c.id)).size,d.cards.length);
  for(const c of d.cards){assert.ok(Number.isInteger(c.quantity)&&c.quantity>0&&c.quantity<=limits[c.rarity],c.id);assert.ok(['forja','fluxo','ruptura'].includes(c.affinity||d.affinity),c.id);assert.ok(c.type);assert.ok(Array.isArray(c.effects));}}
 assert.equal(new Set(catalog.additionalCards.map(c=>c.id)).size,catalog.additionalCards.length);
 const f=catalog.decks.find(d=>d.id==='forja-oficina-lyrik');assert.equal(f.cards.find(c=>c.id==='FL16').quantity,3);assert.equal(f.cards.find(c=>c.id==='FL04').quantity,2);assert.ok(!f.cards.some(c=>c.id==='FL20'));
 const fluxo=catalog.decks.find(d=>d.id==='fluxo-virelion');assert.equal(fluxo.cards.find(c=>c.id==='FL20').quantity,1);assert.equal(fluxo.cards.find(c=>c.id==='FV07').quantity,2);assert.equal(fluxo.cards.find(c=>c.id==='FV02').quantity,1);assert.equal(fluxo.cards.find(c=>c.id==='R2-FV18').quantity,2);assert.ok(!fluxo.cards.some(c=>c.id==='FV17'));assert.ok(catalog.additionalCards.some(c=>c.id==='FV17'));
 assert.deepEqual(JSON.parse(fs.readFileSync(new URL('./criador/prototipo.json',import.meta.url))),catalog);
 const old=JSON.parse(fs.readFileSync(new URL('../../../r2-20261020/before/cartas.json',import.meta.url)));
 const find=(data,id)=>data.decks.flatMap(d=>d.cards).find(c=>c.id===id);
 assert.deepEqual(find(catalog,'FL09'),find(old,'FL09'),'Golias integralmente preservado');
 assert.deepEqual(find(catalog,'FL12'),find(old,'FL12'),'Cataclisma preservado');for(const id of ['RG12','FV03']){const a=find(catalog,id),b=find(old,id);for(const key of ['cost','attack','health','quantity','rarity','subtype'])assert.deepEqual(a[key],b[key],id+' '+key+' preservado');}assert.ok(find(catalog,'RG12').effects.some(e=>e.op==='previous_round_patron_damage_attack'));assert.ok(find(catalog,'FV03').effects.some(e=>e.op==='first_spell_damage'));
});
test('Tooltip usa resumo separado; ajuda completa mantém exceções',()=>{
 const context={window:{addEventListener(){} }};vm.runInNewContext(fs.readFileSync(new URL('./rules-glossary.js',import.meta.url),'utf8'),context);
 const terms=context.window.RunaRulesGlossary;for(const term of terms){assert.ok(term[2]);assert.ok(term[3],term[1]);}
 assert.ok(terms.find(x=>x[1]==='Silêncio')[2].includes('arma equipada'));assert.ok(!terms.find(x=>x[1]==='Silêncio')[3].includes('arma equipada'));
 assert.ok(terms.find(x=>x[1]==='Metade ↓'));assert.ok(terms.find(x=>x[1]==='Metade ↑'));
 const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');assert.ok(app.includes("text(item,'p',shortDefinition||definition)"));
});
