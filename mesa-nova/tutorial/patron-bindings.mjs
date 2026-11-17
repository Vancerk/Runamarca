// Persistent control belongs to the Patron, never to a second physical card.
export function patronBindingLane(p){
 const links=['sleep','anchor'].map(k=>p?.patron?.[k]).filter(x=>x?.remaining>0);
 if(!links.length||p.patron.hp<=0)return null;
 if(links.some(x=>x.lane!==links[0].lane))throw Error('Vínculos de Patrono conflitantes: decisão de posição necessária.');
 return links[0].lane;
}
export function restoreBoundPatrons(room){
 for(const p of room.players){const lane=patronBindingLane(p);if(lane===null)continue;
  const uid='patron:'+p.id;
  if(p.formation[lane]&&p.formation[lane]!==uid)throw Error('A casa vinculada ao Patrono está ocupada.');
  p.formation=p.formation.map(x=>x===uid?null:x);p.formation[lane]=uid;
 }
}
export function decayPatronBindings(room,p){
 for(const key of ['sleep','anchor']){
  const state=p.patron?.[key];if(!state)continue;
  if(p.patron.hp<=0||room.combatCount>=state.setAt&&--state.remaining<=0)delete p.patron[key];
 }
}
