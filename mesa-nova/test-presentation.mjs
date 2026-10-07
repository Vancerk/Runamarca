import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8'),feedback=fs.readFileSync(new URL('./table-feedback.js',import.meta.url),'utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\n',start);return source.slice(start,end);}
const nodes=[],cards=new Map(),frames=[];let rect={left:200,top:300,width:100,height:140};
const context=vm.createContext({innerWidth:1000,innerHeight:800,seat:()=>({id:'a'}),tableCard:uid=>cards.get(uid),spellTargetRects:new Map(),performance:{now:()=>0},requestAnimationFrame:cb=>frames.push(cb),document:{querySelectorAll:()=>[...cards.values()],body:{append:n=>{n.isConnected=true;nodes.push(n);}},createElement:()=>({style:{},dataset:{},offsetWidth:100,offsetHeight:40,remove(){this.isConnected=false;}})}});
const speech=feedback.slice(feedback.indexOf('function speechBubble('),feedback.indexOf('function renderForceWindow('));
vm.runInContext('const shownSpeechEvents=new Set();\n'+speech+'\n'+fn('center')+'\n'+fn('spellTarget'),context);
cards.set('x',{dataset:{uid:'x'},getBoundingClientRect:()=>rect});
for(const [id,playerId] of [[1,'a'],[2,'b'],[3,'spectator']]){vm.runInContext(`speechBubble({id:${id},playerId:'${playerId}',cardId:'x',speech:'Minha fala'})`,context);frames.shift()(1);const n=nodes.at(-1);assert.equal(n.textContent,'Minha fala');assert.equal(n.style.left,'250px');assert.equal(n.style.top,'290px');frames.shift()(4000);}
rect={left:400,top:400,width:100,height:140};vm.runInContext("speechBubble({id:4,cardId:'x',speech:'Em movimento'})",context);frames.shift()(1);assert.equal(nodes.at(-1).style.left,'450px');rect={left:500,top:500,width:100,height:140};frames.shift()(2);assert.equal(nodes.at(-1).style.left,'550px','balão acompanha a carta ao trocar de zona');frames.shift()(4000);const count=nodes.length;vm.runInContext("speechBubble({id:4,cardId:'x'})",context);assert.equal(nodes.length,count,'fala não reaparece quando a fila de áudio alcança o evento');
assert.equal(vm.runInContext("spellTarget('x')",context),cards.get('x'));cards.delete('x');context.spellTargetRects.set('x',rect);assert.equal(vm.runInContext("spellTarget('x').getBoundingClientRect()",context),rect,'Magia letal conserva a posição visual do alvo removido');
console.log('Apresentação: balões acompanham cartas de ambos os jogadores/espectadores, sem repetir; alvo letal preservado.');

// Exercise the real spotlight lifecycle, including both seats, spectators and stale sessions.
{
 const spotlight=feedback.slice(feedback.indexOf('async function highlightUsedSpell('),feedback.indexOf('function choosePatronPower('));
 const flights=[],sounds=[],shown=[];let self='a',waiting=null;
 const ctx=vm.createContext({visualGeneration:1,seat:()=>({id:self}),$:id=>({id,getBoundingClientRect:()=>({left:id==='self-grave'?50:850,top:500,width:100,height:100})}),center:n=>{const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},cardEl:()=>({isConnected:false,classList:{add(){}},visualReady:waiting||Promise.resolve(),getBoundingClientRect:()=>({left:350,top:200,width:300,height:420}),animate(frames,options){flights.push({frames,options});return {};},remove(){this.isConnected=false;}}),settleAnimation:async()=>{},pause:async()=>{},sound:x=>sounds.push(x),document:{body:{append:n=>{n.isConnected=true;shown.push(n);}}}});
 vm.runInContext(spotlight,ctx);
 for(const [viewer,owner,destination] of [['a','a',-400],['a','b',400],['b','b',-400],['b','a',400],['a','b',400]]){
  self=viewer;const exit=await vm.runInContext('highlightUsedSpell({},'+JSON.stringify(owner)+')',ctx);assert.equal(shown.at(-1).isConnected,true);await exit();assert.equal(shown.at(-1).isConnected,false);assert.ok(flights.at(-1).frames[1].transform.includes(destination+'px'));const count=flights.length;await exit();assert.equal(flights.length,count,'saída idempotente');
 }
 const count=shown.length;waiting=new Promise(resolve=>{ctx.release=resolve;});const stale=vm.runInContext("highlightUsedSpell({},'a')",ctx);ctx.visualGeneration++;ctx.release();const exit=await stale;await exit();assert.equal(shown.length,count,'não exibe carta de sessão anterior após carregar canvas');
 assert.equal(sounds.length,5);console.log('Magia em destaque: dono, rival, espectador, destino Nartvanyr e cancelamento aprovados.');
}
