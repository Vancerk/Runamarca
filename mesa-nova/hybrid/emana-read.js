// UI-owner revision, item 9 (phones): when an Emanation socket is too small for the
// complete text at a readable size, the face shows no clipped text
// (data-text-fit="detail") and a tap opens the card's native detail (showCard), which
// shows the whole card. Presentation only: showCard sends nothing. During the owner's
// own preparation the native tap opens the Emanation menu instead; a "Ler carta
// completa" option is then added to that menu, so the text stays one tap away.
const isDetail=node=>node?.querySelector('.hybrid-emana-face')?.dataset.textFit==='detail';
const cardOf=uid=>state?.players?.flatMap(p=>p.reserve||[]).find(c=>c.uid===uid)||null;
// The native menu only exists for the owner's own Emanations; a rival copy (even a
// homonym) tapped during the owner's preparation opens its own detail.
const nativeMenu=uid=>state?.phase==='prep'&&state.turn===state.you&&!state.spectator&&Boolean(state.players?.find(p=>p.id===state.you)?.emanation?.includes(uid));
// The menu option is bound to the UID that was actually tapped (homonymous copies, even
// on opposite sides, carry different stats), never to the menu title.
let menuUid=null;
document.addEventListener('click',e=>{const node=e.target.closest?.('#game .combat-emanation .hybrid-emana-card');menuUid=node&&isDetail(node)&&nativeMenu(node.dataset.uid)?node.dataset.uid:null;if(!node||!isDetail(node)||nativeMenu(node.dataset.uid))return;const card=cardOf(node.dataset.uid);if(!card)return;e.stopImmediatePropagation();e.preventDefault();showCard(card);},true);
const dialog=document.getElementById('target-picker'),content=document.getElementById('target-picker-content');
new MutationObserver(()=>{if(!dialog.open)return;const name=content.querySelector(':scope>h2')?.textContent;const card=cardOf(menuUid);if(!card||card.name!==name||content.querySelector('.hybrid-read-card'))return;const read=button('Ler carta completa',()=>{dialog.close();showCard(card);},'hybrid-read-card');read.dataset.uid=card.uid;content.append(read);}).observe(content,{childList:true});
