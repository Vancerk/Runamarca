// Copia os arquivos de código (js/mjs/css/html/json pequenos/md) de mesa-nova e scripts
// para uma pasta de snapshot, para diferenciar o diff desta rodada do trabalho preexistente.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'prototype-qa/ui-owner/initial-snapshot';
const roots = ['mesa-nova', 'scripts'];
const skipDirs = new Set(['art', 'assets', 'audio', 'images', 'effects', 'energy-icons', 'node_modules', 'lab-3d']);
const exts = new Set(['.js', '.mjs', '.css', '.html', '.md']);
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!skipDirs.has(entry.name)) walk(full); continue; }
    const ext = path.extname(entry.name);
    const keepJson = ext === '.json' && fs.statSync(full).size < 2_000_000 && dir.startsWith('mesa-nova');
    if (!exts.has(ext) && !keepJson) continue;
    const dest = path.join(out, full);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && process.argv[3] !== '--force') continue;
    fs.copyFileSync(full, dest);
    count++;
  }
}
for (const root of roots) walk(root);
console.log(`snapshot: ${count} arquivos em ${out}`);
