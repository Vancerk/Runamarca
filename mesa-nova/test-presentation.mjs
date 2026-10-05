import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\n',start);return source.slice(start,end);}
const nodes=[],cards=new Map(),zones=new Map(),rect={left:200,top:300,width:100,height:140};
const context=vm.createContext({innerWidth:1000,innerHeight:800,seat:()=>({id:'a'}),tableCard:uid=>cards.get(uid),spellTargetRects:new Map(),$:id=>zones.get(id),setTimeout:()=>{},document:{body:{append:n=>nodes.push(n)},createElement:()=>({style:{},dataset:{}})}});
vm.runInContext(fn('center')+'\n'+fn('speechBubble')+'\n'+fn('spellTarget'),context);
for(const id of ['self-reserve','opponent-reserve','self-emana','opponent-emana'])zones.set(id,{getBoundingClientRect:()=>rect});
for(const playerId of ['a','b']){vm.runInContext(`speechBubble({id:1,playerId:'${playerId}',cardId:'x',zone:'reserve',speech:'Minha fala'})`,context);const n=nodes.at(-1);assert.equal(n.textContent,'Minha fala');assert.equal(n.style.position,'fixed');assert.equal(n.style.zIndex,'200');}
cards.set('x',{getBoundingClientRect:()=>rect});assert.equal(vm.runInContext("spellTarget('x')",context),cards.get('x'));cards.delete('x');context.spellTargetRects.set('x',rect);assert.equal(vm.runInContext("spellTarget('x').getBoundingClientRect()",context),rect,'Magia letal conserva a posição visual do alvo removido');
console.log('Apresentação: balões de ambos os jogadores na camada da janela e alvo letal preservado.');
