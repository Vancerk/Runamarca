export const roles={1:'Combatente fanfarrão',2:'Mago demonstrador',3:'Estrategista paciente'};
const alive=c=>c&&c.damage<c.health;
export function laterDuelCatalog(base,duel,first){
 const find=id=>{const card=base.decks.flatMap(d=>d.cards).find(c=>c.id===id);if(!card)throw Error('Carta de ensino ausente: '+id);return structuredClone(card);};
 const [human,npc]=structuredClone(first.decks);
 for(const [side,deck] of [['H',human],['N',npc]]){deck.id=`tutorial-${duel}-${side}`;deck.name=`Treino ${duel} · ${roles[duel]}`;deck.patron.name=side==='N'?roles[duel]:'Seu Patrono';deck.cards.forEach((c,i)=>{c.id=`T${duel}-${side}-${i+1}`;});}
 const copy=(id,newId,quantity)=>({...find(id),id:newId,quantity});
 if(duel===2){
  human.cards=human.cards.slice(0,4).map((c,i)=>({...c,attack:i===0?1:i===3?3:2,health:5+i,quantity:4}));
  human.cards.push(copy('FL10','T2-BUFF',4),copy('FL06','T2-ENTRY',3),copy('RG08','T2-REVEAL',3),copy('FL13','T2-FROST',2),{...human.cards[0],id:'T2-H-5',quantity:2});
  npc.cards.forEach(c=>{c.health=4;c.attack=1;});
 }else if(duel===3){
  human.cards=human.cards.slice(0,5).map(c=>({...c,quantity:4}));
  human.cards.push(copy('FL17','T3-SUPPORT',3),copy('FL10','T3-BUFF',4),copy('FL06','T3-ENTRY',3));
  human.patron.powers=[structuredClone(base.decks.find(d=>d.affinity==='forja').patron.powers.find(p=>p.id==='forjar-armadura'))];
  npc.cards=npc.cards.slice(0,7).map(c=>({...c,health:3,attack:1}));npc.cards.push(copy('FL10','T3-N-BUFF',2));
 }else throw Error('Duelo inválido.');
 return {...base,decks:[human,npc]};
}
export function arrangement(duel,side){
 if(duel===1)return side==='H'?{opening:['TUT-H-1','TUT-H-2'],next:['TUT-H-3','TUT-H-1','TUT-H-2','TUT-H-3','TUT-H-4','TUT-H-1','TUT-H-2','TUT-H-3','TUT-H-4']}:{opening:['TUT-N-1','TUT-N-2'],next:['TUT-N-3','TUT-N-1','TUT-N-2','TUT-N-3','TUT-N-4']};
 if(side==='N')return {opening:[`T${duel}-N-1`,`T${duel}-N-2`,`T${duel}-N-3`,`T${duel}-N-4`,duel===3?'T3-N-BUFF':`T${duel}-N-5`],next:[`T${duel}-N-1`,`T${duel}-N-2`,`T${duel}-N-3`,...(duel===3?['T3-N-BUFF']:[])]};
 if(duel===2)return {opening:['T2-H-1','T2-BUFF','T2-ENTRY','T2-REVEAL','T2-FROST'],next:['T2-H-2','T2-BUFF','T2-H-1','T2-ENTRY','T2-BUFF','T2-REVEAL','T2-H-3','T2-BUFF','T2-H-4','T2-ENTRY','T2-REVEAL']};
 return {opening:['T3-H-1','T3-H-2','T3-SUPPORT','T3-BUFF','T3-ENTRY'],next:['T3-H-3','T3-SUPPORT','T3-H-1','T3-BUFF','T3-H-4','T3-ENTRY','T3-H-2','T3-SUPPORT']};
}
export function laterInstruction({duel,room,player,shown,completed,coach}){
 const scene=(id,title,text,focus)=>({id,title,text,focus});
 const has=id=>completed.some(g=>g.id===id&&g.complete),once=id=>!shown.has(id),mine=room.phase==='prep'&&room.turn===player.id;
 const card=id=>player.hand.find(c=>c.modelId===id),afford=id=>card(id)?.cost<=player.mana;
 const reserveRoom=player.reserve.filter(c=>alive(c)&&!player.emanation.includes(c.uid)).length<8;
 if(duel===2){
  if(once('opening'))return scene('opening','Escolha sua mão inicial',`Marque até ${room.first===player.id?3:4} cartas para trocar, ou mantenha todas. Você só pode trocar uma vez. Depois confirme sua mão.`,'opening');
  if(room.phase==='mulligan')return null;
  if(once('spell-intro'))return scene('spell-intro','Uma magia, dois momentos','Jogue suas criaturas. Depois experimente uma magia: algumas podem ser usadas na hora ou preparadas numa casa. Confira o texto da carta.','hand');
  if(mine&&afford('T2-BUFF')&&player.reserve.some(alive)&&!has('direct-spell')&&once('direct'))return scene('direct','Efeito direto','Use Adquirir Atualização no modo direto e escolha um aliado. Você paga 2 de mana e ele recebe +1/+1 na hora.','hand');
  if(has('direct-spell')&&once('direct-result'))return scene('direct-result','O efeito já aconteceu','Confira o +1/+1 na criatura e a mana gasta. A magia direta já resolveu.','reserve');
  if(mine&&has('direct-spell')&&afford('T2-BUFF')&&!has('prepare-spell')&&once('prepare'))return scene('prepare','Escolha uma posição aliada','Prepare Adquirir Atualização em qualquer casa aliada. Você paga agora; o +1/+1 espera um aliado nessa casa no combate.','lanes');
  if(has('prepare-spell')&&!has('activate-prepared')&&once('waiting'))return scene('waiting','Preparada ainda não é ativada','A magia aguarda um alvo. Na formação, coloque um aliado nessa casa para ativá-la, se quiser. Outras casas continuam disponíveis.','lanes');
  if(room.combatCount>coach.lastCombat){coach.lastCombat=room.combatCount;if(has('prepare-spell')&&!has('activate-prepared')&&once('missed'))return scene('missed','Ainda sem ativação','A magia não encontrou um alvo permitido. Confira se ela continua na mesa e tente ajustar a formação no próximo combate.','lanes');}
  if(has('activate-prepared')&&once('activated'))return scene('activated','Agora ela resolveu','Um aliado ocupou a casa e recebeu o efeito. A magia preparada esperou o combate; a direta resolveu na hora.','reserve');
  if(mine&&has('activate-prepared')&&reserveRoom&&afford('T2-ENTRY')&&!has('entry')&&once('entry'))return scene('entry','Entrada: ao jogar','Jogue o Anão estudioso para comprar uma carta. Entrada acontece ao jogar a criatura, antes do combate.','hand');
  if(has('entry')&&once('entry-result'))return scene('entry-result','Uma compra pela Entrada','Você comprou uma carta pela Entrada do Anão. Esse efeito não espera o combate.','hand');
  if(has('entry')&&has('activate-prepared')&&(mine&&reserveRoom&&afford('T2-REVEAL')||room.phase==='formation'&&player.reserve.some(c=>c.modelId==='T2-REVEAL'))&&!has('revelation')&&once('revelation'))return scene('revelation','Revelação: no combate','Leve o Comandante Gnoll ao combate com outro aliado de até 2 de ataque. Ele ganha ataque na Revelação, não ao entrar na reserva.','lanes');
  if(has('revelation')&&once('revelation-result'))return scene('revelation-result','A Revelação aconteceu','O Gnoll ganhou ataque no combate. Entrada acontece ao jogar; Revelação, ao revelar a formação. Continue até vencer.','reserve');
 }else{
  if(once('autonomy'))return scene('autonomy','Agora a estratégia é sua','Escolha sua mão e jogue como aprendeu. Em breve, você poderá experimentar apoio e um poder do Patrono.','opening');
  if(room.phase==='mulligan')return null;
  if(mine&&afford('T3-SUPPORT')&&!has('emanation')&&once('emanation'))return scene('emanation','Investir em apoio','Em Emanação, o Engenheiro Cauteloso apoia a segunda casa em vez de combater. Jogá-lo custa 2; transferir entre reserva e Emanação custa 1. Confira o bônus na carta.','emanation');
  if(has('emanation')&&once('support-result'))return scene('support-result','O apoio está ativo','O apoio está ativo. O bônus vale para a casa de combate indicada na carta, qualquer que seja a vaga de Emanação usada.','emanation');
  if(mine&&has('emanation')&&player.mana>=2&&!has('patron-power')&&once('power'))return scene('power','Um poder do Patrono','Hora da Bigorna custa 2 e dá 1 de Vida Extra ao seu Patrono, uma vez por rodada. Use o poder se quiser investir em proteção.','powers');
  if(has('patron-power')&&once('power-result'))return scene('power-result','Seu Patrono também participa','Seu Patrono recebeu Vida Extra. Continue a partida combinando criaturas, magias e apoio.','powers');
 }
 return null;
}
