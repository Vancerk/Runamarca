// S7: post-match questionnaire, selected deterministically from the S6 context the server
// recorded for this participant (no randomness, no AI). Stable question ids + SURVEY_VERSION;
// the server recomputes the same survey to validate a submission.
// Questions only mention what the participant actually did (used cards / powers / style counts).
import {readFileSync} from 'node:fs';
export const SURVEY_VERSION='pos-partida-2';
// Duration bands (server-measured durationMs, match start → engine 'finished'):
// curta < 5 min · media 5–25 min · longa ≥ 25 min. Minutes shown are rounded (min. 1).
export const DURATION_BANDS={shortMs:5*60_000,longMs:25*60_000};
const names=(()=>{const map=new Map(),powers=new Map();try{const walk=o=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if(o.id&&o.name&&!map.has(o.id))map.set(o.id,o.name);if(Array.isArray(o.powers))for(const p of o.powers)if(p?.id&&p.name)powers.set(p.id,p.name);Object.values(o).forEach(walk);}};walk(JSON.parse(readFileSync(new URL('./cartas.json',import.meta.url),'utf8')));}catch{}return {card:id=>map.get(id)||id,power:id=>powers.get(id)||id};})();
const SCALE=[1,2,3,4,5].map(v=>({value:v,label:String(v)}));
const scale=(id,text,low,high)=>({id,kind:'scale',text,options:SCALE,low,high});
const choice=(id,text,options)=>({id,kind:'choice',text,options:options.map(([value,label])=>({value,label}))});
// Priority-ordered candidates; each returns a question or null for this context.
const CANDIDATES=[
 v=>v.opponent?.kind==='bot'?choice('bot_desafio','O bot foi um desafio…',[['facil','Fácil demais'],['equilibrado','Equilibrado'],['dificil','Difícil demais']]):choice('rival_espera','A espera pela vez do rival foi…',[['curta','Curta'],['adequada','Adequada'],['longa','Longa']]),
 v=>{const ms=Number.isFinite(v.durationMs)?v.durationMs:null,min=ms==null?null:Math.max(1,Math.round(ms/60_000)),band=ms==null?null:ms<DURATION_BANDS.shortMs?'curta':ms>=DURATION_BANDS.longMs?'longa':'media';
  const text=`A partida teve ${v.rounds} ${v.rounds===1?'rodada':'rodadas'}${min!=null?` e durou cerca de ${min} min`:''}. A duração pareceu…`;
  const options=band==='longa'?[['adequada','Adequada'],['longa','Longa demais'],['cansativa','Cansativa']]:band==='curta'?[['curta','Rápida demais'],['adequada','Adequada'],['longa','Longa demais']]:[['curta','Curta demais'],['adequada','Adequada'],['longa','Longa demais']];
  return {...choice('duracao',text,options),ref:{durationBand:band,minutes:min}};},
 v=>{const used=Object.entries(v.you?.powers||{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));if(!used.length)return null;const [id,n]=used[0];return {...scale('poder_util',`Você usou ${names.power(id)} ${n===1?'uma vez':`${n} vezes`}. Quanto ela ajudou?`,'Pouco','Muito'),ref:{power:id}};},
 v=>{const used=Object.entries(v.you?.usedCards||{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3);if(used.length<2)return null;return {...choice('carta_destaque','Qual das cartas que você jogou mais pesou na partida?',[...used.map(([id])=>[id,names.card(id)]),['nenhuma','Nenhuma delas']]),ref:{cards:used.map(([id])=>id)}};},
 v=>v.you?.style?.spellsPrepared>0?scale('preparadas_claras',`Você preparou ${v.you.style.spellsPrepared} ${v.you.style.spellsPrepared===1?'magia':'magias'}. A ativação delas ficou clara?`,'Nada clara','Muito clara'):null,
 v=>v.you?.style?.spellsDirect>0&&!(v.you?.style?.spellsPrepared>0)?scale('alvos_claros','Escolher alvos para suas magias foi claro?','Nada claro','Muito claro'):null,
 v=>v.you?.style?.emanations>0?scale('emanacao_clara','Os efeitos da Emanação ficaram claros?','Nada claros','Muito claros'):null,
 v=>v.outcome?scale('resultado_justo',v.outcome==='draw'?'O empate pareceu um resultado justo?':'O resultado pareceu justo?','Nada justo','Muito justo'):null,
];
// 1 fixed opener + up to 4 candidates in priority order → 3..5 questions, no repeats.
export function selectSurvey(view){
 const questions=[scale('diversao','Quanto você gostou desta partida?','Nada','Muito')],seen=new Set(['diversao']);
 for(const make of CANDIDATES){if(questions.length>=5)break;const q=make(view);if(q&&!seen.has(q.id)){seen.add(q.id);questions.push(q);}}
 if(questions.length<3&&!seen.has('regras_claras'))questions.push(scale('regras_claras','As regras ficaram claras nesta partida?','Nada claras','Muito claras'));
 return {version:SURVEY_VERSION,questions,comment:{id:'comentario',optional:true,maxLength:1000,label:'Comentário (opcional)'}};}
// Answers must match the offered survey exactly: every question answered, no extra keys, valid value.
export function validateAgainstSurvey(survey,answers){
 const errors=[],ids=new Set(survey.questions.map(q=>q.id));
 for(const k of Object.keys(answers))if(!ids.has(k))errors.push(`pergunta não oferecida: ${k}`);
 for(const q of survey.questions){const v=answers[q.id];if(v===undefined){errors.push(`sem resposta: ${q.id}`);continue;}if(!q.options.some(o=>o.value===v))errors.push(`valor inválido para ${q.id}`);}
 return errors;}
