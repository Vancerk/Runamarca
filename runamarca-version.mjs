import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
let cache, cachedAt = 0;
export function runamarcaVersion() {
  const meta = JSON.parse(fs.readFileSync(new URL('./mesa-nova/version.json', import.meta.url), 'utf8'));
  if (!cache || Date.now() - cachedAt > 10000) {
    let commit = process.env.RENDER_GIT_COMMIT || null, dirty = null;
    if (!commit) try {
      const git = args => execFileSync('git', ['-C', root, ...args], { encoding:'utf8', windowsHide:true, timeout:3000, stdio:['ignore','pipe','ignore'] }).trim();
      commit = git(['rev-parse','HEAD']); dirty = !!git(['status','--porcelain']);
    } catch {}
    cache = { commit, dirty }; cachedAt = Date.now();
  }
  return { ...meta, ...cache, environment: process.env.NODE_ENV === 'test' ? 'local-test' : 'server' };
}
