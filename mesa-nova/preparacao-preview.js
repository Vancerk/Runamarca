/* Preview controls use the same effects and weapon token as the table. */
let previewSerial=0;
const previewPanel=document.querySelector('.ether-points'),previewHead=document.getElementById('self-head');
function paintPreviewEther(max,spent){previewPanel.replaceChildren();for(let i=0;i<max;i++){const point=document.createElement('span');point.className='ether-point '+(i<spent?'available':'spent');const img=document.createElement('img');img.src='energy-icons/forja.png';img.alt='';point.append(img);previewPanel.append(point);}previewHead.querySelector('.ether-count').textContent=spent+'/'+max;}
function previewRefill(previousMax){RunaPreparationFeedback.clear();const total=Math.min(10,previousMax+1);paintPreviewEther(total,total);RunaPreparationFeedback.refill({id:++previewSerial,previousMana:1,previousMax,mana:total,manaMax:total},{side:'self',affinity:'forja'});}
paintPreviewEther(4,1);
document.getElementById('refill').onclick=()=>previewRefill(4);
document.getElementById('refill-cap').onclick=()=>previewRefill(10);
document.getElementById('equip').onclick=()=>{const avatar=previewHead.querySelector('.patron-avatar');avatar.querySelector('.equipped-weapon')?.remove();const w={...RunaWeapons.recipe(1,'resistente','precisa'),uid:'preview-weapon'},chip=RunaWeaponPresentation.token(w);chip.classList.add('patron-weapon');chip.querySelector('.weapon-bonus').textContent=String(w.attack);avatar.append(chip);};
document.getElementById('prepare').onclick=()=>{const lane=document.querySelector('.lane-side');lane.classList.add('has-prepared-magic');lane.querySelector('.prepared-space-label').hidden=false;lane.querySelector('.spell-dock').hidden=false;RunaPreparationFeedback.place({id:++previewSerial,prepared:true,targetSide:'demo',lane:1},{side:'self'});};
addEventListener('pagehide',()=>RunaPreparationFeedback.clear());
