// Escudo do Mestre: página e API sob /escudo/, restritas a mestres autenticados pelo Discord.
// Usa a sessão e o banco já existentes (accounts.mjs); não cria login, bot nem cadastro de fichas.
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = resolve(here, '../public');
const MAX_BODY = 32 * 1024;
const MAX_NPC_BODY = 3 * 1024 * 1024;   // fichas de NPC (o exemplo do Kiran sozinho tem ~40 KB)
const MAX_NPCS = 300;
const MAX_FICHAS = 12;

// Somente estes arquivos são servidos (sem montar caminhos a partir da URL).
const STATIC = {
  '/escudo/': ['index.html', 'text/html; charset=utf-8'],
  '/escudo/escudo.css': ['escudo.css', 'text/css; charset=utf-8'],
  '/escudo/abas.js': ['abas.js', 'text/javascript; charset=utf-8'],
  '/escudo/recolher.js': ['recolher.js', 'text/javascript; charset=utf-8'],
  '/escudo/mapas.js': ['mapas.js', 'text/javascript; charset=utf-8'],
  '/escudo/fichas.js': ['fichas.js', 'text/javascript; charset=utf-8'],
  '/escudo/npc.js': ['npc.js', 'text/javascript; charset=utf-8'],
  '/escudo/npcs/': ['npcs/index.html', 'text/html; charset=utf-8'],
  '/escudo/npcs/npcs.css': ['npcs/npcs.css', 'text/css; charset=utf-8'],
  '/escudo/npcs/npcs.js': ['npcs/npcs.js', 'text/javascript; charset=utf-8']
};
const PAGES = new Set(['index.html', 'npcs/index.html']);
const ASSET = /^\/escudo\/assets\/([a-z0-9-]{1,60})\.webp$/;

// A página lê a planilha (gviz/JSONP) direto do Google; retratos vêm da Torre (/torre/assets/...).
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://docs.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' https: data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

export class EscudoError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS elysium_escudo_mesas(
  master_id TEXT PRIMARY KEY,
  fichas JSONB NOT NULL,
  version INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

// ---------- validação da mesa ----------
const ID = /^[A-Za-z0-9-]{1,64}$/;
function sheetLink(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw new EscudoError('Link de ficha inválido.'); }
  const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,100})(?:\/|$)/);
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.username || url.password || url.port || !match) {
    throw new EscudoError('Use um link https://docs.google.com/spreadsheets/d/...');
  }
  const gid = (url.hash + '&' + url.search).match(/[#?&]gid=(\d{1,12})/);
  return `https://docs.google.com/spreadsheets/d/${match[1]}/edit${gid ? '#gid=' + gid[1] : ''}`;
}
function imageLink(value) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value).trim();
  if (text.length > 500) throw new EscudoError('Link de imagem muito longo.');
  let url;
  try { url = new URL(text); } catch { throw new EscudoError('Link de imagem inválido.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new EscudoError('A imagem precisa de um link https.');
  return url.href;
}
export function normalizeMesa(fichas) {
  if (!Array.isArray(fichas)) throw new EscudoError('Mesa inválida.');
  if (fichas.length > MAX_FICHAS) throw new EscudoError(`A mesa comporta até ${MAX_FICHAS} fichas.`);
  const ids = new Set();
  return fichas.map(entry => {
    if (!entry || typeof entry !== 'object') throw new EscudoError('Mesa inválida.');
    if (!ID.test(String(entry.id || ''))) throw new EscudoError('Entrada da mesa sem identificador válido.');
    if (ids.has(entry.id)) throw new EscudoError('Entrada repetida na mesa.');
    ids.add(entry.id);
    const out = {id: entry.id};
    const hasCharacter = entry.characterId !== undefined && entry.characterId !== null && entry.characterId !== '';
    const hasLink = entry.link !== undefined && entry.link !== null && entry.link !== '';
    if (hasCharacter === hasLink) throw new EscudoError('Cada entrada aponta para um personagem da Torre ou para um link de ficha.');
    if (hasCharacter) {
      // IDs de personagem são strings opacas da Torre; preservados como vieram.
      if (typeof entry.characterId !== 'string' || !ID.test(entry.characterId)) throw new EscudoError('Personagem inválido.');
      out.characterId = entry.characterId;
    } else {
      out.link = sheetLink(entry.link);
    }
    const imagem = imageLink(entry.imagem);
    if (imagem) out.imagem = imagem;
    return out;
  });
}

// ---------- persistência ----------
export function createMesaStore(db) {
  let ready = null;
  const init = () => { if (!ready) ready = db.query(SCHEMA).catch(error => { ready = null; throw error; }); return ready; };
  return {
    async get(masterId) {
      await init();
      const {rows} = await db.query('SELECT fichas, version, updated_at FROM elysium_escudo_mesas WHERE master_id=$1', [masterId]);
      if (!rows.length) return {version: 0, fichas: [], updatedAt: null};
      const row = rows[0];
      const fichas = typeof row.fichas === 'string' ? JSON.parse(row.fichas) : row.fichas;
      return {version: Number(row.version), fichas, updatedAt: new Date(row.updated_at).toISOString()};
    },
    // Grava só se a versão enviada for a atual (controle otimista); devolve null em conflito.
    async put(masterId, expectedVersion, fichas) {
      await init();
      const body = JSON.stringify(fichas);
      let result;
      if (expectedVersion === 0) {
        // Primeira gravação: só cria se ainda não existe (ON CONFLICT cobre duas abas ao mesmo tempo).
        const existing = await db.query('SELECT 1 FROM elysium_escudo_mesas WHERE master_id=$1', [masterId]);
        if (existing.rows.length) return null;
        result = await db.query('INSERT INTO elysium_escudo_mesas(master_id, fichas, version) VALUES($1, $2::jsonb, 1) ON CONFLICT (master_id) DO NOTHING RETURNING version', [masterId, body]);
      } else {
        result = await db.query('UPDATE elysium_escudo_mesas SET fichas=$2::jsonb, version=version+1, updated_at=NOW() WHERE master_id=$1 AND version=$3 RETURNING version', [masterId, body, expectedVersion]);
      }
      if (!result.rows.length) return null;
      return this.get(masterId);
    }
  };
}

// ---------- fichas de NPC ----------
// Um documento por mestre: { npcs: [...], current }. O formato interno de cada ficha é o da
// página de fichas (npcs.js), que normaliza tudo ao carregar; aqui só se garante o envelope,
// identificadores e tamanho.
export function normalizeNpcDoc(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new EscudoError('Fichas inválidas.');
  if (!Array.isArray(data.npcs)) throw new EscudoError('Fichas inválidas.');
  if (data.npcs.length > MAX_NPCS) throw new EscudoError(`Limite de ${MAX_NPCS} fichas de NPC.`);
  const ids = new Set();
  for (const npc of data.npcs) {
    if (!npc || typeof npc !== 'object' || Array.isArray(npc)) throw new EscudoError('Ficha de NPC inválida.');
    if (typeof npc.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(npc.id)) throw new EscudoError('Ficha de NPC sem identificador válido.');
    if (ids.has(npc.id)) throw new EscudoError('Ficha de NPC repetida.');
    ids.add(npc.id);
  }
  const current = data.current == null ? null : String(data.current);
  return {npcs: data.npcs, current: current && ids.has(current) ? current : (data.npcs[0]?.id || null)};
}
export function createNpcStore(db) {
  let ready = null;
  const init = () => { if (!ready) ready = db.query(`CREATE TABLE IF NOT EXISTS elysium_escudo_npcs(
    master_id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    version INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`).catch(error => { ready = null; throw error; }); return ready; };
  return {
    async get(masterId) {
      await init();
      const {rows} = await db.query('SELECT data, version, updated_at FROM elysium_escudo_npcs WHERE master_id=$1', [masterId]);
      if (!rows.length) return {version: 0, data: null, updatedAt: null};
      const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      return {version: Number(rows[0].version), data, updatedAt: new Date(rows[0].updated_at).toISOString()};
    },
    // Mesmo controle otimista da Mesa: só grava se a versão enviada for a atual.
    async put(masterId, expectedVersion, data) {
      await init();
      const body = JSON.stringify(data);
      let result;
      if (expectedVersion === 0) {
        const existing = await db.query('SELECT 1 FROM elysium_escudo_npcs WHERE master_id=$1', [masterId]);
        if (existing.rows.length) return null;
        result = await db.query('INSERT INTO elysium_escudo_npcs(master_id, data, version) VALUES($1, $2::jsonb, 1) ON CONFLICT (master_id) DO NOTHING RETURNING version', [masterId, body]);
      } else {
        result = await db.query('UPDATE elysium_escudo_npcs SET data=$2::jsonb, version=version+1, updated_at=NOW() WHERE master_id=$1 AND version=$3 RETURNING version, updated_at', [masterId, body, expectedVersion]);
      }
      if (!result.rows.length) return null;
      // Não devolve o documento inteiro (pode ter alguns MB): a página já o tem.
      return {version: Number(result.rows[0].version), updatedAt: new Date(result.rows[0].updated_at || Date.now()).toISOString()};
    }
  };
}

// ---------- quem é mestre ----------
// Administrador do site + mestres cadastrados na Torre (torre/backend/mestres.json, os mesmos
// que recebem relatórios) + IDs extras opcionais em ESCUDO_MESTRES (separados por vírgula).
export function readMasterIds({adminId = process.env.DISCORD_ADMIN_ID, extra = process.env.ESCUDO_MESTRES, file = resolve(here, '../../torre/backend/mestres.json')} = {}) {
  const ids = new Set();
  if (adminId) ids.add(String(adminId));
  for (const id of String(extra || '').split(',').map(s => s.trim())) if (/^\d{15,22}$/.test(id)) ids.add(id);
  try {
    const list = JSON.parse(readFileSync(file, 'utf8'));
    for (const master of Array.isArray(list) ? list : []) if (master && /^\d{15,22}$/.test(String(master.id))) ids.add(String(master.id));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Escudo: não foi possível ler a lista de mestres da Torre.');
  }
  return ids;
}

// ---------- respostas ----------
function sendJson(res, status, data) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
  res.end(JSON.stringify(data));
}
function sendPage(res, status, title, message, link) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  res.writeHead(status, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"});
  res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0807;color:#eadfca;font-family:Georgia,serif}main{max-width:32rem;padding:2rem;border:1px solid #624824;border-radius:8px;background:#17110c;text-align:center}h1{color:#d9b46a;font-size:1.4rem}a{color:#d9b46a}</style></head><body><main><h1>${esc(title)}</h1><p>${esc(message)}</p>${link ? `<p><a href="${esc(link.href)}">${esc(link.text)}</a></p>` : ''}</main></body></html>`);
}
async function readBody(req, limit = MAX_BODY) {
  // Recusa pelo cabeçalho antes de ler; o resto do corpo é descartado para a resposta 413 chegar ao navegador.
  if (Number(req.headers['content-length']) > limit) { req.resume(); throw new EscudoError('As fichas passaram do tamanho máximo permitido.', 413); }
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new EscudoError('Pedido muito grande.', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new EscudoError('JSON inválido.'); }
}

// `store` (com get/put iguais aos de createMesaStore) é opcional: o modo de demonstração local usa um arquivo.
export function createEscudo({identify, configured, database, store: customStore, npcStore: customNpcStore, origin, masterIds, publicDir = PUBLIC_DIR}) {
  const store = customStore || createMesaStore(database);
  const npcStore = customNpcStore || createNpcStore(database);
  const writes = new Map();
  const throttled = (id, limit = 60) => {
    const now = Date.now(); const recent = (writes.get(id) || []).filter(t => now - t < 60000);
    if (recent.length >= limit) return true;
    recent.push(now); writes.set(id, recent);
    if (writes.size > 500) for (const [key, times] of writes) if (!times.length || times.at(-1) < now - 60000) writes.delete(key);
    return false;
  };

  return async function handleEscudo(req, res, url) {
    if (url.pathname !== '/escudo' && !url.pathname.startsWith('/escudo/')) return false;
    try {
      if (url.pathname === '/escudo') { res.writeHead(308, {Location: '/escudo/' + url.search, 'Cache-Control': 'no-store'}); res.end(); return true; }
      if (url.pathname === '/escudo/npcs') { res.writeHead(308, {Location: '/escudo/npcs/' + url.search, 'Cache-Control': 'no-store'}); res.end(); return true; }
      const isApi = url.pathname.startsWith('/escudo/api/');
      if (!configured()) {
        if (isApi) sendJson(res, 503, {error: 'Login Discord ainda não configurado no servidor.'});
        else sendPage(res, 503, 'Escudo do Mestre', 'O login com Discord ainda não está configurado neste servidor.');
        return true;
      }
      const user = await identify(req);
      if (!user) {
        if (isApi) sendJson(res, 401, {error: 'Entre com Discord para usar o Escudo do Mestre.'});
        else if (url.pathname === '/escudo/') { res.writeHead(302, {Location: '/auth/discord?return=' + encodeURIComponent('/escudo/'), 'Cache-Control': 'no-store'}); res.end(); }
        else sendPage(res, 401, 'Escudo do Mestre', 'Entre com Discord para continuar.', {href: '/auth/discord?return=%2Fescudo%2F', text: 'Entrar com Discord'});
        return true;
      }
      const master = masterIds().has(String(user.discord_id));
      if (!master) {
        if (isApi) sendJson(res, 403, {error: 'O Escudo do Mestre é reservado aos mestres.'});
        else sendPage(res, 403, 'Escudo do Mestre', 'Esta área é reservada aos mestres. Se você mestra mesas de Elysium, peça ao administrador para incluir sua conta.', {href: '/', text: 'Voltar aos Jogos Elysium'});
        return true;
      }

      if (isApi) {
        if (url.pathname === '/escudo/api/me' && req.method === 'GET') {
          sendJson(res, 200, {id: String(user.discord_id), name: user.display_name});
          return true;
        }
        if (url.pathname === '/escudo/api/mesa') {
          if (req.method === 'GET') { sendJson(res, 200, await store.get(String(user.discord_id))); return true; }
          if (req.method === 'PUT') {
            if (req.headers.origin !== origin()) throw new EscudoError('Origem inválida.', 403);
            if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new EscudoError('Envie JSON.', 415);
            if (throttled(String(user.discord_id))) throw new EscudoError('Muitas alterações seguidas. Aguarde um minuto.', 429);
            const data = await readBody(req);
            const version = Number(data.version);
            if (!Number.isSafeInteger(version) || version < 0) throw new EscudoError('Versão inválida.');
            const fichas = normalizeMesa(data.fichas);
            const saved = await store.put(String(user.discord_id), version, fichas);
            if (!saved) { sendJson(res, 409, {error: 'A mesa foi alterada em outro lugar.', ...(await store.get(String(user.discord_id)))}); return true; }
            sendJson(res, 200, saved);
            return true;
          }
          throw new EscudoError('Método inválido.', 405);
        }
        if (url.pathname === '/escudo/api/npcs') {
          if (req.method === 'GET') { sendJson(res, 200, await npcStore.get(String(user.discord_id))); return true; }
          if (req.method === 'PUT') {
            if (req.headers.origin !== origin()) throw new EscudoError('Origem inválida.', 403);
            if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new EscudoError('Envie JSON.', 415);
            // A página salva sozinha enquanto se edita (com espera de ~1,5 s entre gravações).
            if (throttled('npcs:' + user.discord_id, 120)) throw new EscudoError('Muitas alterações seguidas. Aguarde um minuto.', 429);
            const body = await readBody(req, MAX_NPC_BODY);
            const version = Number(body.version);
            if (!Number.isSafeInteger(version) || version < 0) throw new EscudoError('Versão inválida.');
            const data = normalizeNpcDoc(body.data);
            const saved = await npcStore.put(String(user.discord_id), version, data);
            if (!saved) { sendJson(res, 409, {error: 'As fichas foram alteradas em outro lugar.', ...(await npcStore.get(String(user.discord_id)))}); return true; }
            sendJson(res, 200, saved);
            return true;
          }
          throw new EscudoError('Método inválido.', 405);
        }
        throw new EscudoError('Não encontrado.', 404);
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') throw new EscudoError('Método inválido.', 405);
      const asset = url.pathname.match(ASSET);
      const entry = STATIC[url.pathname];
      if (!entry && !asset) { sendPage(res, 404, 'Escudo do Mestre', 'Página não encontrada.', {href: '/escudo/', text: 'Abrir o Escudo'}); return true; }
      const [file, type] = entry || ['assets/' + asset[1] + '.webp', 'image/webp'];
      let bytes;
      try { bytes = await readFile(resolve(publicDir, file)); }
      catch (error) { if (error.code === 'ENOENT') { sendPage(res, 404, 'Escudo do Mestre', 'Arquivo não encontrado.'); return true; } throw error; }
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': asset ? 'private, max-age=86400' : 'private, no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        ...(PAGES.has(file) ? {'Content-Security-Policy': CSP, 'X-Frame-Options': 'DENY'} : {})
      });
      res.end(req.method === 'HEAD' ? undefined : bytes);
      return true;
    } catch (error) {
      if (error instanceof EscudoError) sendJson(res, error.status, {error: error.message});
      else { console.error('Escudo: falha inesperada.', error?.message || error); sendJson(res, 503, {error: 'Não foi possível acessar o Escudo agora. Tente novamente em instantes.'}); }
      return true;
    }
  };
}
