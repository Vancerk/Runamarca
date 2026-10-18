import fs from 'node:fs/promises';
let app=await fs.readFile('mesa-nova/app.js','utf8');
app=app.replace('mini=false,back=false,active=false','mini=false,back=false,active=false,combat=false');
app=app.replace("if(!back){if(card.image)","if(!back){el.classList.add('styled-card','energy-'+manaAffinity(card.affinity));if(combat)el.classList.add('combat-card');if(card.image)");
app=app.replace("el.onclick=()=>{if(back",`if(!back){const canvas=document.createElement('canvas');canvas.width=450;canvas.height=combat?410:630;canvas.className='card-art-canvas';el.prepend(canvas);const design={name:card.name,kind:card.type==='creature'?'creature':'spell',rules:card.text,subtype:card.subtype||'',themeEnergy:manaAffinity(card.affinity),art:card.image,artZoom:card.artZoom||100,artX:card.artX??50,artY:card.artY??0,generic:card.cost,power:card.attack,health:card.health};const render=combat?RunaCardVisual.drawCombat:RunaCardVisual.drawCard;if(!combat&&card.imageKind==='card'){const image=new Image();image.onload=()=>canvas.getContext('2d').drawImage(image,0,0,450,630);image.src=card.image;}else render(canvas,design,{assets:'criador/',hideStats:true,flat:card.imageKind==='card'}).catch(console.error);}
  el.onclick=()=>{if(back`);
app=app.replace('mini:true,active:selected===placed.uid','mini:true,combat:true,active:selected===placed.uid');
app=app.replace('`${cards.length} criatura(s)`',"''");
app=app.replace("box.append(button('Encerrar preparação'","text(box,'h3',`Preparação - Rodada ${state.round}`);box.append(button('Encerrar'");
app=app.replace("'primary'));}\n  }else if(state.phase==='vote')","'primary'));}else box.append(button('Turno do oponente',()=>{},'',true));\n  }else if(state.phase==='vote')");
app=app.replace("text(box,'h3','Distribua suas criaturas');text(box,'p','Arraste da reserva às posições ou de volta para retirar.');","text(box,'h3',`Combate - Rodada ${state.round}`);");
app=app.replace("if(self.ready)text(box,'p','Formação confirmada. Aguardando o rival.','status-pill');else box.append(button('Confirmar formação'","if(self.ready)box.append(button('Turno do oponente',()=>{},'',true));else box.append(button('Encerrar'");
app=app.replace("text(box,'h3','Confronto em andamento');text(box,'p','Acompanhe as magias, a Revelação e os choques nas três posições. O resultado será aplicado ao fim da animação.');","text(box,'h3',`Combate - Rodada ${state.round}`);box.append(button('Turno de combate',()=>{},'',true));");
app=app.replace("stars.remove();portrait.remove();title.textContent", "stars.remove();portrait.classList.remove('captured-scroll','capture-hit');portrait.replaceChildren();const jailedImage=document.createElement('img');jailedImage.src=loser.patron.image||'card-back.png';jailedImage.alt=loser.patron.name;portrait.append(jailedImage);text(portrait,'strong','CAPTURADO');portrait.classList.add('jailed-patron');title.textContent");
app=app.replace("button('Voltar à mesa',()=>scene.remove(),'primary')","button('Nova partida',()=>{selected=null;command({type:'reset'});},'primary')");
// Retain the dragged visual while waiting for the server: the transfer begins at release.
app=app.replace("const moved=Boolean(ghost),rect=ghost?.getBoundingClientRect(),target=", "const held=ghost?.cloneNode(true);if(held){held.classList.add('release-ghost');held.style.pointerEvents='none';document.body.append(held);movingCards.add(card.uid);setTimeout(()=>{held.remove();movingCards.delete(card.uid);if(!commandBusy)render();},2500);}const moved=Boolean(ghost),rect=ghost?.getBoundingClientRect(),target=");
app=app.replace('if(transfer)movingCards.add(transfer.uid);render();',"if(transfer)movingCards.add(transfer.uid);document.querySelectorAll('.release-ghost').forEach(node=>node.remove());render();");
await fs.writeFile('mesa-nova/app.js',app);
let html=await fs.readFile('mesa-nova/index.html','utf8');html=html.replaceAll('EMANAÇÃO · 2 VAGAS','EMANAÇÃO').replaceAll('Emanação · 2 vagas','Emanação');await fs.writeFile('mesa-nova/index.html',html);
await fs.appendFile('mesa-nova/style.css',`
/* Shared card presentation: the same artwork supplies hand and combat. */
.card.styled-card>img,.card.styled-card>.fallback,.card.styled-card>.card-title,.card.styled-card>.rarity{display:none}
.card.styled-card{background:transparent;border:0;overflow:visible;border-radius:5px}
.card .card-art-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.card.styled-card .mana-gem{display:none}
.card.styled-card .numbers{inset:0;background:none;padding:0;font-family:Georgia,serif;font-weight:700;pointer-events:none;font-size:clamp(10px,1.1vw,18px);text-shadow:0 1px 2px #14231e;}
.card.styled-card .numbers>span:nth-child(2){display:none}
.card.styled-card .attack-value,.card.styled-card .health-value{position:absolute;transform:translate(-50%,-50%);color:#fff9df;top:93%;left:9.25%}
.card.styled-card .health-value{left:91.78%;top:93.42%}
.card.styled-card .attack-value.attack-buffed{color:#8ef3a2}.card.styled-card .health-value.health-damaged{color:#ff7771}
.card.styled-card.big .numbers{font-size:19px}
.lane-side .card.mini.combat-card{width:132px;height:120px;flex-basis:132px}
.card.combat-card .attack-value{top:90.8%}.card.combat-card .health-value{top:91.8%}
.card.combat-card .numbers{font-size:18px}
.center-actions{display:flex!important;flex-direction:column;gap:6px}.center-actions h3{font-size:12px;margin:0}.center-actions button:disabled{background:#383331;color:#aaa18f;border-color:#71654e;box-shadow:none;cursor:default}
.jailed-patron{position:absolute!important;transform:translate(160px,-45px) scale(.7);filter:blur(2px) brightness(.55);z-index:0}
.jailed-patron:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 24px,#232322 25px 32px,#8c8880 33px 35px);border:7px solid #5f5c54;box-shadow:inset 0 0 20px #000}
.capture-stage .champion{position:relative;z-index:2}
@media(max-width:750px){.lane-side .card.mini.combat-card{width:100px;height:91px;flex-basis:100px}.card.combat-card .numbers{font-size:14px}}
`);
