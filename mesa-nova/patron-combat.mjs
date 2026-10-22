// A Patron is a combatant, never an entry in the creature reserve.
export const patronCombatId=p=>'patron:'+p.id;
export function patronCombatant(p){
 if(!p?.patron)return null;
 return {uid:patronCombatId(p),modelId:p.patron.id||'patron',owner:p.id,type:'patron',name:p.patron.name,image:p.patron.image,imageKind:'illustration',artFit:'cover',cost:0,attack:0,attackMod:0,effects:[],text:'Patrono armado',
  get health(){return p.patron.maxHp;},get damage(){return p.patron.maxHp-p.patron.hp;},get extraLife(){return p.patron.extraLife||0;},set extraLife(n){p.patron.extraLife=n;},
  get equipment(){return p.patron.equipment;},set equipment(w){p.patron.equipment=w;}};
}
export function assignPatron(room,p,lane){
 if(room.phase!=='formation'||p.ready)throw Error('O Patrono só pode entrar antes de confirmar a formação.');
 const uid=patronCombatId(p);
 if(lane===null){p.formation=p.formation.map(id=>id===uid?null:id);return;}
 if(!Number.isInteger(lane)||lane<0||lane>2)throw Error('Posição inválida.');
 if(!p.patron?.equipment||p.patron.equipment.durability<=0||p.patron.hp<=0)throw Error('O Patrono precisa estar vivo e equipado com uma arma válida.');
 if(p.formation[lane]&&p.formation[lane]!==uid)throw Error('O Patrono precisa de uma casa desocupada.');
 p.formation=p.formation.map(id=>id===uid?null:id);p.formation[lane]=uid;
}
