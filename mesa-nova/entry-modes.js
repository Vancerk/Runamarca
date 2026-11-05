function chooseEntryMode(card,kind){
 hideHover();return new Promise(resolve=>{const dialog=$('target-picker'),content=$('target-picker-content');content.replaceChildren();text(content,'h2',card.name+' · escolha ao invocar');text(content,'p','O modo permanece nos próximos combates. Os bônus e penalidades continuam durando somente o combate.');
 let settled=false;const finish=mode=>{if(settled)return;settled=true;dialog.removeEventListener('close',cancel);if(dialog.open){dialog.addEventListener('close',()=>resolve(mode),{once:true});dialog.close();}else resolve(mode);},cancel=()=>finish(null);dialog.addEventListener('close',cancel);
 // UI-owner revision: same option texts as the formation pickers in app.js
 // (showProtocolPicker/showMonkPicker), so each choice carries its real effect.
 const choices=kind==='protocol'?[['assault','Assalto · +2 ataque · adjacentes +1 ataque'],['escort','Escolta · +2 vida · adjacentes +1 vida']]:[['weaken','Enfraquecer · −2 ataque ao inimigo à frente'],['buff','Fortalecer · +1/+1 ao aliado à direita']];const row=document.createElement('div');row.className='taunt-options';for(const [mode,label]of choices)row.append(button(label,()=>finish(mode)));content.append(row,button('Cancelar',()=>finish(null)));if(!dialog.open)dialog.showModal();
 });
}
