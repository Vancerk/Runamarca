// R1 functional fixtures only. No pilot, runner, server, network or balance battery.
import fs from 'node:fs';
import {act, makeRoom, join, resolveCombat, view} from './game.mjs';
import {initStudies} from './fluxo-studies.mjs';
export {act, view, resolveCombat};
export const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url),'utf8'));
const models=[...catalog.decks.flatMap(d=>d.cards),...(catalog.additionalCards||[])];
let serial=0;
export const uid=()=>`r1-fixture-${++serial}`;
export function card(id,p,extra={}){
 const model=models.find(c=>c.id===id);if(!model)throw Error('Missing real model '+id);
 return {...structuredClone(model),uid:uid(),owner:p.id,modelId:id,damage:0,attackMod:0,
  baseStats:{attack:model.attack,health:model.health,cost:model.cost},...extra};
}
export function unit(p,extra={}){
 return {uid:uid(),owner:p.id,modelId:'r1-target',id:'r1-target',name:'Alvo funcional',
  type:'creature',cost:0,attack:0,health:40,damage:0,attackMod:0,effects:[],
  baseStats:{attack:0,health:40,cost:0},...extra};
}
export function spell(p,effects,extra={}){
 return {uid:uid(),owner:p.id,id:'r1-spell',modelId:'r1-spell',name:'Magia de fixture',
  type:'direct_spell',cost:0,effects,...extra};
}
export function setup({aDeck='fluxo-virelion',bDeck='forja-oficina-lyrik'}={}){
 const room=makeRoom('R1CASE','A'),a=room.players[0],b=join(room,'B');
 Object.assign(room,{phase:'prep',turn:a.id,first:a.id,round:4,preparationsDone:0,collectPreview:true});
 for(const [p,id] of [[a,aDeck],[b,bDeck]]){
  const d=catalog.decks.find(x=>x.id===id);
  Object.assign(p,{deckData:d,deckId:id,mana:10,manaMax:10,preparationSerial:1,weapons:[],
   patron:{...structuredClone(d.patron),hp:100,maxHp:100,affinity:d.affinity,usedPowers:{}}});
  p.deck=d.cards.flatMap(m=>Array.from({length:m.quantity},()=>card(m.id,p)));
 }
 return {room,a,b};
}
export function studies(p,threshold=20){
 initStudies(p);p.study.seenIds=p.originalDeck.slice(0,threshold).map(c=>c.studyOriginalId);
 if(threshold>=20){p.study.activated=[10,20];p.study.discount=true;p.study.sharing=true;p.study.centerNeighbor=2;}
}
export function place(p,c,lane){if(!p.reserve.includes(c))p.reserve.push(c);p.formation[lane]=c.uid;return c;}
export function cast(room,p,c,data={}){if(!p.hand.includes(c)&&!p.studyBook?.cards.includes(c))p.hand.push(c);room.phase='prep';room.turn=p.id;act(room,p,{type:'play',cardId:c.uid,...data},catalog);return c;}
export function combat(room){room.phase='resolving';resolveCombat(room);}
export function jsonView(room,p){return JSON.parse(JSON.stringify(view(room,p)));}
