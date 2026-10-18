import fs from 'node:fs/promises';
const file='mesa-nova/criador/editor.js';
let editor=await fs.readFile(file,'utf8');
editor=editor.replace("forja:['#75521c','#31220d','#8a6526','#261d0b']","forja:['#89701f','#493e18','#ac8b2d','#4b401b']");
editor=editor.replace("paper.addColorStop(0,'#f4dfb7');paper.addColorStop(.7,'#dfbf8b');paper.addColorStop(1,'#aa7548')","paper.addColorStop(0,'#f6f3e8');paper.addColorStop(.7,'#e7e3d4');paper.addColorStop(1,'#c7bea5')");
const between=(a,b)=>editor.slice(editor.indexOf(a),editor.indexOf(b));
let renderer=`(()=>{\n${between('const energyNames','const fields')}\nconst imageCache=new Map();\n${between('function number','function status')}\n${between('function img','function darken')}\n${between('function richRuns','function rulesOverflow')}\n${between('let grainTexture','function readForm')}`;
renderer=renderer.replace('async function drawCard(canvas,card){','async function drawCard(canvas,card,{assets="",hideStats=false}={}){').replace("img('energy-icons/'+id+'.png')","img(assets+'energy-icons/'+id+'.png')").replace("img('attack-shield.png')","img(assets+'attack-shield.png')").replace("const stats=card.kind==='creature'?","const stats=hideStats?[]:card.kind==='creature'?");
renderer+=`
async function drawCombat(canvas,card,{assets='',flat=false}={}){
 const [art,shield]=await Promise.all([img(card.art),img(assets+'attack-shield.png')]);
 const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/900,0,0,canvas.height/820,0,0);ctx.clearRect(0,0,900,820);
 const stone=ctx.createLinearGradient(0,0,900,820);stone.addColorStop(0,'#8a7960');stone.addColorStop(1,'#302c28');round(ctx,17,17,866,786,35,stone,'#c5a572',4);grain(ctx,17,17,866,786,.4);
 framedPanel(ctx,40,38,820,741,{forja:'#79621d',fluxo:'#214966',ruptura:'#55251b'}[card.themeEnergy]||'#79621d',20);
 ctx.save();bevelPath(ctx,49,49,802,713,18);ctx.clip();
 if(art){const source=flat?{x:art.width*49/900,y:art.height*129/1260,w:art.width*802/900,h:art.height*713/1260}:{x:0,y:0,w:art.width,h:art.height};const scale=Math.max(802/source.w,713/source.h)*(Number(card.artZoom||100)/100),w=source.w*scale,h=source.h*scale;ctx.drawImage(art,source.x,source.y,source.w,source.h,49+(802-w)*Number(card.artX??50)/100,49+(713-h)*Number(card.artY??0)/100,w,h);}else{ctx.fillStyle='#39392d';ctx.fillRect(49,49,802,713);}
 ctx.restore();if(shield)ctx.drawImage(shield,5,653,159.85,159.85);drawHeart(ctx,826,747);
}
window.RunaCardVisual={drawCard,drawCombat};
})();\n`;
await fs.writeFile('mesa-nova/card-visual.js',renderer);
editor=editor.slice(0,editor.indexOf('async function drawCard(canvas,card){'))+`async function drawCard(canvas,card){return RunaCardVisual.drawCard(canvas,card);}\n\n`+editor.slice(editor.indexOf('function readForm'));
await fs.writeFile(file,editor);
let index=await fs.readFile('mesa-nova/criador/index.html','utf8');index=index.replace('<script src="editor.js', '<script src="../card-visual.js?v=20261003-combate" defer></script>\n  <script src="editor.js').replaceAll('20261003-combinacoes','20261003-combate');await fs.writeFile('mesa-nova/criador/index.html',index);
index=await fs.readFile('mesa-nova/index.html','utf8');index=index.replace('<script src="app.js" defer></script>','<script src="card-visual.js?v=20261003-combate" defer></script><script src="app.js?v=20261003-combate" defer></script>').replace('href="style.css"','href="style.css?v=20261003-combate"');await fs.writeFile('mesa-nova/index.html',index);
