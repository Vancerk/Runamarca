import * as base from './policy-base.mjs';
import {inspectPublicCandidates} from './candidates.mjs';
import * as p1 from './policy-v1.mjs';
import * as p2 from './policy-v2.mjs';
export const POLICY_VERSION=p2.POLICY_VERSION;
export const budgets=Object.freeze({iniciante:160,intermediario:500,experiente:1800});
export {healing,fx,hp,atk,alive,publicRoom,actions} from './policy-base.mjs';
export function setCatalog(value){base.setCatalog(value);p1.setCatalog(value);p2.setCatalog(value);}
export const weights={agressivo:{face:2.6,board:1,hand:.6,future:.2},equilibrado:{face:1.8,board:1.2,hand:.9,future:.5},paciente:{face:1.3,board:1.3,hand:1.2,future:.85},controle:{face:.9,board:1.9,hand:.7,future:.65},aleatorio:{face:1,board:1,hand:1,future:.5}};
weights.ponderado=weights.paciente;
export function legalActions(api,s,w){return inspectPublicCandidates(api,s,w).filter(c=>c.accepted).map(c=>c.action);}
export function simpleFormation(s,w,random){
 s=structuredClone(s);for(const owner of s.players)for(const c of owner.reserve){const target=s.players.flatMap(p=>p.reserve).find(t=>t.forcedBy===c.uid);if(target)c.fixedFormationLane=target.forcedLane;}
 const p=s.players.find(p=>p.id===s.you),forms=base.rawForms(p,w).sort((a,b)=>base.roughForm(p,b,w)-base.roughForm(p,a,w));
 const slots=random?forms[Math.floor(random()*forms.length)]:forms[0];return {plan:base.configs(p,slots,s.seals)[0],score:base.roughForm(p,slots,w)};
}
export function pilot(api,s,style,level,phase){
 style=style==='ponderado'?'paciente':style;
 if(!weights[style]||!budgets[level])throw Error('Perfil de piloto inválido');
 const w={...weights[style],expert:level==='experiente'},budget=budgets[level];
 if(style!=='aleatorio')return (level==='iniciante'?p1:p2).decide(api,s,w,level,budget);
 if(phase==='formation')return {choice:simpleFormation(s,w,api.random),work:0,budgetHit:false,policyVersion:p1.POLICY_VERSION};
 if(s.phase==='forging'){const options=p1.candidateActions(api,s,w);return {choice:options[Math.floor(api.random()*options.length)]||null,work:0,budgetHit:false,policyVersion:p1.POLICY_VERSION};}
 const choices=[];let used=0;for(const action of p1.candidateActions(api,s,w)){
  if(used>=budget)break;const r=base.publicRoom(s);used++;try{api.act(r,r.players.find(p=>p.id===s.you),action);choices.push(action);}catch{}
 }
 return {choice:choices[Math.floor(api.random()*choices.length)]||null,work:used,budgetHit:used>=budget,policyVersion:p1.POLICY_VERSION};
}
