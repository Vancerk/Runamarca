import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const npcSource=readFileSync(new URL('../escudo/public/npcs/npcs.js',import.meta.url),'utf8');
const loadSource=npcSource.slice(npcSource.indexOf('async function load()'),npcSource.indexOf('  let saveTimer'));
for(const server of [true,false])test(`preserva Kiran personalizado ao carregar ${server?'servidor':'arquivo local'}`,async()=>{
 const data={npcs:[{id:'saved',nome:'Kiran Veyr',papel:'Exemplo',historia:'História personalizada',habs:[{nome:'Minha habilidade'}]}],current:'saved'};
 const context=vm.createContext({SERVIDOR:server,API:'/test',STORE:'test',SEED:null,db:{npcs:[],current:null},versao:0,canStore:true,normalize:n=>n,exemploAleatorio:()=>{throw Error('Não deve substituir ficha existente');},fetch:async()=>({ok:true,json:async()=>({version:3,data:structuredClone(data)})}),localStorage:{getItem:()=>JSON.stringify(data)}});
 await vm.runInContext(loadSource+';load()',context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.db)),data);
});
test('barra consulta o Escudo uma vez e mostra Torre para administrador adicional',async()=>{
 const source=readFileSync(new URL('../public/account.js',import.meta.url),'utf8');
 const elements=[];const calls=[];
 function element(tag){const e={tag,children:[],style:{},setAttribute(k,v){this[k]=v;},append(...kids){this.children.push(...kids);},insertBefore(k){this.children.push(k);},querySelector(){return null;}};elements.push(e);return e;}
 const body=element('body');body.prepend=e=>body.children.push(e);
 const context=vm.createContext({URLSearchParams,location:{pathname:'/',search:''},ResizeObserver:class{observe(){}},CustomEvent:class{},document:{createElement:element,body,documentElement:{style:{setProperty(){}}},getElementById(){return null;},dispatchEvent(){}},fetch:async path=>{calls.push(path);return {ok:true,json:async()=>path==='/api/account'?{user:{name:'Mestre',admin:false}}:path==='/torre/api/config'?{admin:true}:{id:'master'}};}});
 vm.runInContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.filter(x=>x==='/escudo/api/me').length,1);
 const links=body.children[0].children.filter(x=>x.tag==='a').map(x=>x.href);
 for(const href of ['/torre/','/escudo/','/escudo/npcs/'])assert.ok(links.includes(href),href);
});
