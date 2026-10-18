import fs from 'node:fs/promises';
const app=await fs.readFile('mesa-nova/app.js','utf8');
const extract=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
const catalog=JSON.parse(await fs.readFile('mesa-nova/cartas.json','utf8'));
const model=catalog.decks.find(d=>d.affinity==='forja').cards.find(c=>c.type==='creature'&&c.image);
const helpers=[extract('function cloneVisual','const $='),extract('function text(parent','function manaAffinity'),extract('function cardEl','function showHover'),extract('async function animateTransfer','async function animateOpeningToHand')].join('\n');
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><link rel="stylesheet" href="style.css?v=20261003-atributos"><script src="card-visual.js"></script><style>body{padding:25px}h1{font-size:22px}.proof{display:flex;gap:70px;align-items:center}.proof .card{width:230px;height:322px}.proof .combat-card{width:260px;height:237px}.proof .card:hover{transform:none}.proof section{display:grid;gap:12px}#visual-layer{z-index:100}.proof button{margin-top:20px}#hover-preview{position:relative;left:auto;top:auto}</style><h1>Verificação de atributos e transição</h1><main class="proof"><section><h2>Carta completa</h2><div id="origin"></div></section><section><h2>Versão de combate</h2><div id="destination"></div><button id="transfer">Testar transição</button></section><section><h2>Prévia sem texto adicional</h2><div id="hover-preview"></div></section></main><div id="visual-layer"></div><script>
const $=id=>document.getElementById(id),state=null,movingCards=new Set(),displayedAttack=new Map(),displayedHealth=new Map();let pendingArrival=[];
const manaAffinity=v=>v,affordable=()=>false,showHover=()=>{},moveHover=()=>{},hideHover=()=>{},sound=()=>{},weightOf=()=>.5;
const tableCard=uid=>document.querySelector('#destination .card');
function finishVisual(uid,node){node?.remove();movingCards.delete(uid);document.querySelectorAll('.card').forEach(c=>c.style.visibility='');}
${helpers}
const model=${JSON.stringify({...model,uid:'proof',attack:10,health:12,damage:2,attackMod:1})};
const original=cardEl(model);$('origin').append(original);const combat=cardEl(model,{combat:true});$('destination').append(combat);const preview=cardEl(model);$('hover-preview').append(preview);
$('transfer').onclick=()=>animateTransfer({uid:model.uid,card:model,copy:cloneVisual(original),rect:original.getBoundingClientRect()});
</script></html>`;
await fs.writeFile('mesa-nova/visual-smoke.html',html);
