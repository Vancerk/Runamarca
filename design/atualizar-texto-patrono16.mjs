import fs from 'node:fs/promises';
const file='mesa-nova/index.html';
await fs.writeFile(file,(await fs.readFile(file,'utf8')).replace('Patronos começam com 20 de vida.','Patronos começam com 16 de vida.'));
