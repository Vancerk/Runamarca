import {actions,publicRoom} from './policy-base.mjs';

// These are public-model validations, not queries of the actual hidden room.
export function inspectPublicCandidates(api,view,weights){
 return actions(view,weights).map(action=>{
  const room=publicRoom(view);
  try{api.act(room,room.players.find(p=>p.id===view.you),action);return {action,accepted:true,error:null};}
  catch(error){return {action,accepted:false,error:String(error.message).slice(0,300)};}
 });
}
