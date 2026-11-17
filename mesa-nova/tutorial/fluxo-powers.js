function patronPowerSpec(player,index){
 const original=player.patron?.powers?.[index];if(original?.id!=='estudos-avancados')return original;
 const stage=player.study?.stage;return {...original,cost:stage?.cost??9,name:stage?'Estudos Avançados · '+stage.name:'Estudos concluídos',text:stage?.text||'Todos os três avanços foram ativados.',threshold:stage?.threshold,locked:!stage||player.study.seen<stage.threshold,complete:!stage};
}
function showStudyPower(power){
 const p=seat(),study=p?.study,stage=study?.stage;if(!stage||study.seen<stage.threshold)return;
 hideHover();const dialog=$('target-picker'),content=$('target-picker-content');content.replaceChildren();delete dialog.dataset.studyBook;
 text(content,'h2',stage.name);text(content,'p',stage.text);text(content,'p',study.seen+'/'+study.total+' cartas estudadas · '+stage.cost+' Éter','study-note');
 if(stage.threshold===10){content.append(button('Ativar Otimização Etérea',()=>{dialog.close();command({type:'patronPower',powerId:power.id});},'primary'));dialog.showModal();return;}
 if(stage.threshold===20){text(content,'p','Escolha a casa adjacente preferida para as magias da casa central. Você pode mudar essa escolha ao usar cada magia.');const row=document.createElement('div');row.className='taunt-options';for(const lane of [0,2])row.append(button('Casa '+(lane+1),()=>{dialog.close();command({type:'patronPower',powerId:power.id,centerNeighbor:lane});},'primary'));content.append(row);dialog.showModal();return;}
 text(content,'p','O Grimório busca uma mistura de criaturas e magias, com pelo menos duas opções de custo até 4 quando disponíveis. As cinco cartas são sorteadas ao ativar.');
 text(content,'p','São 10 cópias: cinco para sua mão e cinco embaralhadas no seu baralho. Até duas das cópias para a mão, com custo até 4, podem ser jogadas gratuitamente.');
 const confirm=button('Sortear e criar 10 cópias · 9 Éter',async()=>{confirm.disabled=true;dialog.close();await command({type:'patronPower',powerId:power.id,chooseInstant:true});},'primary');content.append(confirm);dialog.showModal();
}
function renderStudyBook(){
 const picker=$('target-picker');if(picker.dataset.studySelecting&&(state.phase!=='prep'||state.turn!==state.you||picker.dataset.studySelecting!==(state.matchId||state.code))){delete picker.dataset.studySelecting;if(picker.open)picker.close();}
 const dialog=$('target-picker'),book=seat()?.study?.book;if(!book||state.phase!=='prep'||state.turn!==state.you){if(dialog.dataset.studyBook){delete dialog.dataset.studyBook;if(dialog.open)dialog.close();}return;}
 const key=book.instantIds.join(':');if(dialog.open&&dialog.dataset.studyBook!==key)return;if(dialog.open&&dialog.dataset.studyBook===key)return;
 const content=$('target-picker-content');content.replaceChildren();dialog.dataset.studyBook=key;text(content,'h2','Grimório Completo');text(content,'p',(book.remaining??book.instantIds.length)+' usos gratuitos restantes. Clique em uma carta iluminada para usá-la.');
 const scene=RunaMarikaEffects.scene([],true);scene.update(book.cards,card=>{delete dialog.dataset.studyBook;dialog.close();if(card.type==='creature'||card.type==='equipment')command({type:'play',cardId:card.uid});else chooseSpellTarget(card);},c=>book.instantIds.includes(c.uid));content.append(scene,button('Guardar todas as cópias restantes',()=>{delete dialog.dataset.studyBook;dialog.close();command({type:'grimoireFinish'});}));if(!dialog.open)dialog.showModal();
}
function chooseSharedLane(data){
 const p=seat();if(data.type!=='play'||!p?.study?.sharing)return Promise.resolve(data);
 const c=p.hand.find(c=>c.uid===data.cardId)||p.study.book?.cards.find(c=>c.uid===data.cardId);if(!c||['creature','equipment'].includes(c.type))return Promise.resolve(data);
 const side=state.players.find(s=>s.reserve.some(c=>c.uid===data.targetId)),lane=data.mode==='lane'?data.lane:side?.formation.indexOf(data.targetId);if(lane!==1)return Promise.resolve(data);
 return new Promise(resolve=>{const dialog=$('target-picker'),content=$('target-picker-content');content.replaceChildren();text(content,'h2','Conhecimento Compartilhado');text(content,'p','Qual casa adjacente recebe também esta magia?');for(const sharedLane of [0,2])content.append(button('Casa '+(sharedLane+1),()=>{dialog.close();resolve({...data,sharedLane});},'primary'));dialog.addEventListener('close',()=>resolve(null),{once:true});if(!dialog.open)dialog.showModal();});
}
