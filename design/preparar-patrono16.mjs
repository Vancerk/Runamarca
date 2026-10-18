import fs from 'node:fs/promises';
const output='design/testes-2026-10-03-patrono16';
await fs.mkdir(output,{recursive:true});
let engine=await fs.readFile('mesa-nova/game.mjs','utf8');
if(!engine.includes('hp:20,maxHp:20'))throw Error('Vida inicial inesperada');
engine=engine.replace('hp:20,maxHp:20','hp:16,maxHp:16');
await fs.writeFile('mesa-nova/game.mjs',engine);
for(const filename of ['mesa-nova/cartas.json','mesa-nova/criador/prototipo.json']){
 const catalog=JSON.parse(await fs.readFile(filename,'utf8'));
 for(const deck of catalog.decks)deck.patron.health=16;
 await fs.writeFile(filename,JSON.stringify(catalog,null,2)+'\n');
}
for(const filename of ['mesa-nova/criador/editor.js','mesa-nova/criador/index.html']){
 let text=await fs.readFile(filename,'utf8');
 text=text.replaceAll('patronHealth:20','patronHealth:16').replaceAll('patronHealth || 20','patronHealth || 16').replaceAll('patronHealth||20','patronHealth||16').replace("number($('patron-health').value,1,99,20)","number($('patron-health').value,1,99,16)");
 text=text.replace(/(id="patron-health"[^>]*value=")20"/,'$116"');
 await fs.writeFile(filename,text);
}
await fs.copyFile('mesa-nova/game.mjs',output+'/motor-testado.mjs');
await fs.copyFile('mesa-nova/cartas.json',output+'/catalogo-testado.json');
let runner=await fs.readFile('design/simular-balanceamento-pontos.mjs','utf8');
runner=runner.replaceAll('design/testes-2026-10-03-pontos',output).replace("'pontos-v2'","'patrono16-pontos-v2'").replace('../testes-2026-10-03-rodada6-axiom9/resultados.json','../testes-2026-10-03-pontos/resultados.json');
runner=runner.replace("let guard=0;","for(const player of room.players){assert.equal(player.patron.hp,16);assert.equal(player.patron.maxHp,16);}\n let guard=0;");
await fs.writeFile('design/simular-balanceamento-patrono16.mjs',runner);
console.log('Patronos com 16 de vida; cenário isolado preparado.');
