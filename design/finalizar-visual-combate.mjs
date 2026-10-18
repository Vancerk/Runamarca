import fs from 'node:fs/promises';
let app=await fs.readFile('mesa-nova/app.js','utf8');
app=app.replace(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.cloneNode\(true\)/g,'cloneVisual($1)');
app=`function cloneVisual(source){const copy=source.cloneNode(true);const originals=source.querySelectorAll('canvas'),clones=copy.querySelectorAll('canvas');originals.forEach((canvas,i)=>clones[i]?.getContext('2d').drawImage(canvas,0,0));return copy;}\n`+app;
app=app.replace("{image:card.art,kind:'illustration'}","{image:card.art,kind:'illustration',artZoom:card.artZoom,artX:card.artX,artY:card.artY}");
app=app.replace("}else box.append(button('Turno do oponente',()=>{},'',true));","}else{text(box,'h3',`Preparação - Rodada ${state.round}`);box.append(button('Turno do oponente',()=>{},'',true));}");
await fs.writeFile('mesa-nova/app.js',app);
let game=await fs.readFile('mesa-nova/game.mjs','utf8');game=game.replace("imageKind:art(model.id).kind||'illustration'","imageKind:art(model.id).kind||'illustration',artZoom:art(model.id).artZoom??100,artX:art(model.id).artX??50,artY:art(model.id).artY??0");await fs.writeFile('mesa-nova/game.mjs',game);
await fs.appendFile('mesa-nova/style.css','\n.game[data-phase="resolving"] .center-actions{display:flex!important}\n');
