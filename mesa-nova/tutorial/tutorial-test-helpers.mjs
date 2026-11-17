import assert from 'node:assert/strict';import fs from 'node:fs';
import {createGuidedTutorial} from './tutorial-first-duel.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('./cartas.json',import.meta.url)));
export function clock(){let now=1e6,n=0;const jobs=new Map();return {now:()=>now,setTimeout(fn,ms){jobs.set(++n,{fn,at:now+ms});return n;},clearTimeout:id=>jobs.delete(id),tick(ms){const end=now+ms;let cap=10000;while(cap--){const job=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!job)break;jobs.delete(job[0]);now=job[1].at;job[1].fn();}assert.ok(cap>0);now=end;}};}
export function setup(duel,extra={}){const time=clock(),session=createGuidedTutorial({code:'GUIDE'+duel,name:'Aprendiz',catalog,duel,clock:time,delay:5,...extra});let id=0;return {time,session,send(action){return session.command(session.player,{id:'step-'+(++id),version:session.view().tutorial.version,action});},async tick(ms=20){time.tick(ms);for(let i=0;i<15;i++)await Promise.resolve();}};}
export function explain(f){let cap=20;while(f.session.view().tutorial.instruction?.kind==='explain'){assert.ok(cap--);f.send({type:'tutorialContinue',sceneId:f.session.view().tutorial.instruction.id});}}
export function humanAction(f,policy='learning'){
 const {room,player:p}=f.session,done=id=>f.session.view().tutorial.goals.some(g=>g.id===id&&g.complete),alive=c=>c.damage<c.health;
 if(room.phase==='mulligan')return {type:'confirmMulligan'};
 if(room.phase==='prep'&&room.turn===p.id){
  const space=p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid)).length<8;
  const afford=id=>p.hand.find(c=>c.modelId===id&&c.cost<=p.mana&&(c.type!=='creature'||space));let c;const target=p.reserve.find(alive);
  if(policy==='learning'){
   if((c=afford('T2-BUFF'))&&target&&!done('direct-spell'))return {type:'play',cardId:c.uid,mode:'direct',targetId:target.uid};
   if((c=afford('T2-BUFF'))&&done('direct-spell')&&!done('prepare-spell'))return {type:'play',cardId:c.uid,mode:'lane',lane:1,targetSide:p.id};
   if((c=afford('T2-ENTRY'))&&!done('entry'))return {type:'play',cardId:c.uid};
   if((c=afford('T2-REVEAL'))&&!p.reserve.some(c=>c.modelId==='T2-REVEAL'&&alive(c)))return {type:'play',cardId:c.uid};
   if((c=afford('T3-SUPPORT'))&&!done('emanation'))return {type:'play',cardId:c.uid,mode:'emanate'};
   if(done('emanation')&&!done('patron-power')&&p.mana>=2)return {type:'patronPower',powerId:'forjar-armadura'};
  }
  c=space&&p.hand.find(c=>c.type==='creature'&&c.cost<=p.mana);return c?{type:'play',cardId:c.uid}:{type:'endPrep'};
 }
 if(room.phase==='vote'&&p.vote===null)return {type:'vote',fight:true};
 if(room.phase==='formation'&&!p.ready){
  const units=p.reserve.filter(c=>alive(c)&&!p.emanation.includes(c.uid)),need=policy==='learning'&&f.session.view().tutorial.duel===2&&!done('revelation');
  const gnoll=units.find(c=>c.modelId==='T2-REVEAL');
  const chosen=need?(gnoll?[gnoll,units.find(c=>c!==gnoll&&c.attack<=2)].filter(Boolean):units.slice(0,1)):units.slice(0,3);
  const order=policy==='alternate'?[2,0,1]:[1,0,2],card=chosen.find(c=>!p.formation.includes(c.uid)),lane=order.find(i=>!p.formation[i]);
  return card&&lane!==undefined?{type:'assign',cardId:card.uid,lane}:{type:'ready'};
 }
 return null;
}
export async function finish(f,policy='learning',onStep=()=>{}){let n=0;while(f.session.view().tutorial.status==='active'&&n++<3000){explain(f);const action=humanAction(f,policy);onStep(f,action);if(action)f.send(action);else await f.tick(f.session.room.phase==='resolving'?100000:20);}assert.ok(n<3000);return f.session.view();}
