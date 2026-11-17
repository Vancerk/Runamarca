// S6: feedback contract for S7 (questions and UI are S7's). Identity comes from the existing
// seat token (x-player-token, resolved by the room server); the match context is the one the
// server observed, never the client's; one record per (matchId, participant), create-only.
//
// GET  /api/rooms/:code/feedback[?matchId=]  → 200 {contract,matchId,eligible,reason?,submitted,context}
// POST /api/rooms/:code/feedback {matchId, answers:{id: 1..5 | boolean | text≤280}, comment?≤1000, clientVersion?}
//   201 {status:'stored',feedbackId}   first valid submission, written before the reply
//   200 {status:'duplicate',feedbackId} identical resend (nothing written)
//   400 INVALID_FEEDBACK · 403 NOT_A_PARTICIPANT/BOT_PARTICIPANT · 404 MATCH_UNKNOWN
//   409 MATCH_NOT_FINISHED / ALREADY_SUBMITTED (different content) · 422 SIMULATION · 503 STORAGE_FAILED
import {createHash} from 'node:crypto';
import {contextFor,eligibility,feedbackId,publicRecord,latestFor} from './match-context.mjs';
import {selectSurvey,validateAgainstSurvey,SURVEY_VERSION} from './survey.mjs';
export const CONTRACT='runamarca-feedback/1';
const LIMITS={answers:30,key:/^[a-z][a-z0-9_]{0,39}$/,text:280,comment:1000,matchId:/^[A-Za-z0-9-]{8,64}$/};
const clean=(s,max)=>{const v=String(s).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim();return v.length>max?null:v;};
export function validateSubmission(body){
 const errors=[];if(!body||typeof body!=='object'||Array.isArray(body))return {errors:['corpo deve ser um objeto']};
 if(typeof body.matchId!=='string'||!LIMITS.matchId.test(body.matchId))errors.push('matchId inválido');
 const a=body.answers,answers={};if(!a||typeof a!=='object'||Array.isArray(a))errors.push('answers deve ser um objeto');
 else{const keys=Object.keys(a);if(!keys.length||keys.length>LIMITS.answers)errors.push(`answers deve ter de 1 a ${LIMITS.answers} itens`);
  for(const k of keys){const v=a[k];if(!LIMITS.key.test(k)){errors.push(`chave inválida: ${k.slice(0,40)}`);continue;}
   if(typeof v==='boolean'||(Number.isInteger(v)&&v>=1&&v<=5))answers[k]=v;else if(typeof v==='string'){const t=clean(v,LIMITS.text);if(t==null||!t)errors.push(`resposta ${k} vazia ou acima de ${LIMITS.text} caracteres`);else answers[k]=t;}else errors.push(`resposta ${k}: use inteiro 1–5, booleano ou texto`);}}
 let comment=null;if(body.comment!=null){if(typeof body.comment!=='string')errors.push('comment deve ser texto');else{comment=clean(body.comment,LIMITS.comment);if(comment==null)errors.push(`comment acima de ${LIMITS.comment} caracteres`);else if(!comment)comment=null;}}
 const clientVersion=typeof body.clientVersion==='string'?body.clientVersion.slice(0,20):null,surveyVersion=typeof body.surveyVersion==='string'?body.surveyVersion.slice(0,40):null;
 const ignored=Object.keys(body).filter(k=>!['matchId','answers','comment','clientVersion','surveyVersion'].includes(k));// e.g. a client "context" is never trusted
 return {errors,value:{matchId:body.matchId,answers,comment,clientVersion,surveyVersion},ignored};}
// What S7 may show to this participant (server-derived, no tokens).
export function participantView(ctx,participantId){const me=ctx.participants.find(p=>p.participantId===participantId),op=ctx.participants.find(p=>p.participantId!==participantId);
 return {matchId:ctx.matchId,mode:ctx.mode,kind:ctx.kind,rounds:ctx.rounds,durationMs:ctx.durationMs,finished:ctx.finished,
  outcome:!ctx.result?null:ctx.result.draw?'draw':ctx.result.winner===participantId?'win':'loss',
  you:me&&{deckId:me.deckId,patron:me.patron,deckCards:Object.values(me.deck).reduce((n,v)=>n+v,0),deck:me.deck,usedCards:me.usedCards,powers:me.powers,style:me.style},
  opponent:op&&{kind:op.kind,patron:op.patron}};}
const reply=(json,res,status,body)=>json(res,status,body);
export async function handleFeedback({req,res,room,player,json,payload,store,url}){
 if(req.method==='GET'){const matchId=url.searchParams.get('matchId')||room.matchId||latestFor(room.code,player.id);const ctx=matchId&&contextFor(matchId);const el=eligibility(ctx,player.id);
  let submitted=false;if(ctx&&el.eligible)try{submitted=Boolean(await store.getFeedback(feedbackId(ctx.matchId,player.id)));}catch{submitted=null;}
  const view=ctx&&el.reason!=='NOT_A_PARTICIPANT'?participantView(ctx,player.id):null;
  // S7: the questionnaire is offered only to an eligible participant who has not answered yet.
  return reply(json,res,200,{contract:CONTRACT,matchId:ctx?.matchId||null,eligible:el.eligible,reason:el.reason||null,submitted,context:view,survey:el.eligible&&submitted===false?selectSurvey(view):null});}
 if(req.method!=='POST')return reply(json,res,405,{error:'Método inválido.'});
 const {errors,value,ignored}=validateSubmission(await payload(req));if(errors.length)return reply(json,res,400,{code:'INVALID_FEEDBACK',errors});
 const ctx=contextFor(value.matchId);if(!ctx||ctx.roomCode!==room.code)return reply(json,res,404,{code:'MATCH_UNKNOWN',error:'Partida não encontrada nesta sala.'});
 const el=eligibility(ctx,player.id);
 if(!el.eligible){const status={NOT_A_PARTICIPANT:403,BOT_PARTICIPANT:403,SIMULATION:422,MATCH_NOT_FINISHED:409}[el.reason]||403;return reply(json,res,status,{code:el.reason,error:'Envio não permitido para esta partida.'});}
 // Content identity ignores the order of the answer keys (same answers, reordered = same content).
 const ordered=Object.fromEntries(Object.keys(value.answers).sort().map(k=>[k,value.answers[k]]));value.answers=ordered;
 // S7: answers must match the questionnaire the server offers for this context (same version, same ids, valid options).
 const survey=selectSurvey(participantView(ctx,player.id));
 if(value.surveyVersion!==survey.version)return reply(json,res,400,{code:'SURVEY_VERSION',error:'Questionário desatualizado.',expected:survey.version});
 const surveyErrors=validateAgainstSurvey(survey,value.answers);if(surveyErrors.length)return reply(json,res,400,{code:'INVALID_ANSWERS',errors:surveyErrors});
 const id=feedbackId(ctx.matchId,player.id),contentHash=createHash('sha256').update(JSON.stringify([ordered,value.comment])).digest('hex');
 const op=ctx.participants.find(p=>p.participantId!==player.id);
 const record={schema:1,contract:CONTRACT,feedbackId:id,matchId:ctx.matchId,roomCode:ctx.roomCode,participant:{participantId:player.id,accountId:el.part.accountId,name:el.part.name,kind:'human'},opponentKind:op?.kind||null,
  answers:value.answers,comment:value.comment,survey:{version:survey.version,questions:survey.questions.map(({id,kind,text,options,ref})=>({id,kind,text,options:options.map(o=>o.value),ref:ref||null}))},clientVersion:value.clientVersion,ignoredClientFields:ignored,contentHash,submittedAt:new Date().toISOString(),context:publicRecord(ctx)};
 // The server's context is always stored (idempotent upsert) before the answers, so both are recoverable together.
 try{await store.saveContext(publicRecord(ctx));const r=await store.saveFeedback(record);
  if(r.status==='duplicate')return r.record?.contentHash===contentHash?reply(json,res,200,{status:'duplicate',feedbackId:id}):reply(json,res,409,{code:'ALREADY_SUBMITTED',feedbackId:id,error:'Respostas desta partida já foram registradas.'});
  return reply(json,res,201,{status:'stored',feedbackId:id});}
 catch(error){console.error('feedback storage failed',error?.code||error?.message);return reply(json,res,503,{code:'STORAGE_FAILED',error:'Não foi possível gravar as respostas. Tente novamente.'});}}
