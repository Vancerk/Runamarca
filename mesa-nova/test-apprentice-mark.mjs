// R2 replaces entry marks/once-per-field. Original preserved in R0 and before/.
import assert from 'node:assert/strict';
import {setup,card,unit,cast,combat,act,view,catalog} from './r1-fixtures.mjs';
import {easyBotAction} from './game.mjs';
import {unrestrictedReturn} from './test-return-fixture.mjs';
const shot=(room,p,source,target)=>act(room,p,{type:'apprenticeTarget',cardId:source.uid,targetId:target.uid},catalog);
{
 const {room,a,b}=setup(),enemy=unit(b);b.reserve.push(enemy);const source=card('FV03',a);cast(room,a,source,{mode:'emanate'});
 assert.equal(source.apprenticeTargetId,undefined,'sem marca escolhida na Entrada');cast(room,a,card('FV08',a));
 for(const targetId of ['missing','patron:'+b.id,source.uid]){assert.throws(()=>act(room,a,{type:'apprenticeTarget',cardId:source.uid,targetId},catalog),/criatura inimiga/);assert.equal(a.apprenticeQueue.length,1);}
 shot(room,a,source,enemy);assert.equal(enemy.damage,1);cast(room,a,card('FV02',a),{mode:'lane',lane:0,targetSide:b.id});assert.equal(a.apprenticeQueue.length,0);combat(room);assert.equal(room.events.filter(e=>e.type==='apprentice_damage').length,1);
}
{
 const {room,a,b}=setup(),enemy=unit(b);b.reserve.push(enemy);const source=card('FV03',a);cast(room,a,source,{mode:'emanate'});cast(room,a,card('FV08',a));shot(room,a,source,enemy);
 act(room,a,{type:'emanate',cardId:source.uid},catalog);const bounce=card('FV13',b);unrestrictedReturn(bounce);cast(room,b,bounce,{targetId:source.uid});assert.ok(a.hand.includes(source));
 cast(room,a,source,{mode:'emanate'});cast(room,a,card('FV08',a));assert.equal(a.apprenticeQueue.length,0,'retornar à mão não renova a rodada');assert.equal(enemy.damage,1);
 combat(room);cast(room,a,card('FV08',a));shot(room,a,source,enemy);assert.equal(enemy.damage,2);
}
{
 const {room,a,b}=setup(),enemy=card('FEX03',b);b.reserve.push(enemy);const source=card('FV03',a);cast(room,a,source,{mode:'emanate'});cast(room,a,card('FV08',a));shot(room,a,source,enemy);assert.equal(enemy.damage,2,'primeiro dano dobrado preservado');
}
{
 const {room,a,b}=setup(),enemy=card('RG03',b,{health:1});b.reserve.push(enemy);const source=card('FV03',a);cast(room,a,source,{mode:'emanate'});cast(room,a,card('FV08',a));shot(room,a,source,enemy);assert.equal(a.patron.hp,99,'Último Suspiro preservado');assert.equal(view(room,a).players.find(p=>p.id===a.id).pendingApprenticeTargets.length,0);
}
{
 const {room,a,b}=setup(),enemy=unit(b);b.reserve.push(enemy);const source=card('FV03',a);cast(room,a,source,{mode:'emanate'});cast(room,a,card('FV08',a));a.bot=true;
 const choice=easyBotAction(room);assert.equal(choice.type,'apprenticeTarget');assert.equal(choice.cardId,source.uid);assert.equal(choice.targetId,enemy.uid);act(room,a,choice,catalog);assert.equal(enemy.damage,1);
}
console.log('Aprendiz R2: escolha por gatilho em Emanação, zonas, uso por rodada, retorno à mão, alvo válido, dano dobrado, Último Suspiro e compatibilidade da ação do bot aprovados.');
