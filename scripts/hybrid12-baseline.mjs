// Copia os arquivos que a revisão 12 pode tocar para prototype-qa/hybrid-12/baseline/files,
// preservando o trabalho das revisões anteriores (inclusive arquivos não rastreados).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const out = path.join(root, 'prototype-qa', 'hybrid-12', 'baseline', 'files');
if (fs.existsSync(out) && !process.argv.includes('--force')) {
  console.log('baseline já existe; use --force para sobrescrever:', out);
  process.exit(0);
}
const entries = [
  'mesa-nova/hybrid',
  'mesa-nova/app.js', 'mesa-nova/card-visual.js', 'mesa-nova/camp-layout.js', 'mesa-nova/platinum-entry.js',
  'mesa-nova/platinum-entry.css', 'mesa-nova/combat-motion.js', 'mesa-nova/board-prototype.js',
  'PROTOTIPO-LOCAL.md', 'README.md',
];
for (const name of fs.readdirSync(path.join(root, 'scripts'))) {
  if (/^hybrid(9|10|11)-/.test(name)) entries.push(`scripts/${name}`);
}
const manifest = [];
for (const rel of entries) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(out, rel), { recursive: true });
  manifest.push(rel);
}
fs.writeFileSync(path.join(out, '..', 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), entries: manifest }, null, 2));
console.log(`copiados ${manifest.length} itens para ${out}`);
