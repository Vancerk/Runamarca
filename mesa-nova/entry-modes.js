function chooseEntryMode(card,kind){
 hideHover();return new Promise(resolve=>{const dialog=$('target-picker'),content=$('target-picker-content');content.replaceChildren();text(content,'h2',card.name+' · escolha ao invocar');text(content,'p','O modo permanece nos próximos combates. Os bônus e penalidades continuam durando somente o combate.');
 let settled=false;const finish=mode=>{if(settled)return;settled=true;dialog.removeEventListener('close',cancel);if(dialog.open){dialog.addEventListener('close',()=>resolve(mode),{once:true});dialog.close();}else resolve(mode);},cancel=()=>finish(null);dialog.addEventListener('close',cancel);
 const choices=kind==='protocol'?[['assault','Assalto · ataque'],['escort','Escolta · vida']]:[['weaken','Enfraquecer · inimigo à frente'],['buff','Fortalecer · aliado à direita']];const row=document.createElement('div');row.className='taunt-options';for(const [mode,label]of choices)row.append(button(label,()=>finish(mode)));content.append(row,button('Cancelar',()=>finish(null)));if(!dialog.open)dialog.showModal();
 });
}
