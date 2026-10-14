// Modo de demonstração LOCAL do Escudo do Mestre — só para testar no próprio computador.
// Não faz parte do site: o server.js não importa este arquivo.
//
//   node escudo/dev/demo.mjs        e abra http://127.0.0.1:3080/escudo/
//
// O que muda em relação ao site:
// - sem login Discord: escuta só em 127.0.0.1 e trata quem abrir como "Mestre (demonstração)";
// - a Mesa fica no arquivo escudo/dev/.dados/mesa-demo.json, não no PostgreSQL;
// - personagens e retratos da Torre são buscados no site publicado (ELYSIUM_ORIGIN).
// O resto (páginas, validação, controle de versão, leitura das planilhas) é o mesmo código do site.
import http from 'node:http';
import {mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createEscudo} from '../backend/handler.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 3080);
const HOST = '127.0.0.1';
const ORIGIN = `http://${HOST}:${PORT}`;
const ELYSIUM = String(process.env.ELYSIUM_ORIGIN || 'https://elysiumjogos.onrender.com').replace(/\/+$/, '');
const DATA_DIR = resolve(here, '.dados');
const MESA_FILE = resolve(DATA_DIR, 'mesa-demo.json');
const DEMO_USER = {discord_id: '000000000000000000', display_name: 'Mestre (demonstração)'};

// ---------- Mesa em arquivo, com o mesmo contrato de get/put do banco ----------
function readMesa() {
  try { return JSON.parse(readFileSync(MESA_FILE, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {version: 0, fichas: [], updatedAt: null}; throw error; }
}
const fileStore = {
  async get() { return readMesa(); },
  async put(_masterId, expectedVersion, fichas) {
    const current = readMesa();
    if (current.version !== expectedVersion) return null;
    const next = {version: current.version + 1, fichas, updatedAt: new Date().toISOString()};
    mkdirSync(DATA_DIR, {recursive: true});
    writeFileSync(MESA_FILE + '.tmp', JSON.stringify(next, null, 2));
    renameSync(MESA_FILE + '.tmp', MESA_FILE);
    return next;
  }
};

const handleEscudo = createEscudo({
  identify: async () => DEMO_USER,
  configured: () => true,
  store: fileStore,
  origin: () => ORIGIN,
  masterIds: () => new Set([DEMO_USER.discord_id])
});

// ---------- Torre: lista de personagens e retratos vêm do site publicado ----------
// O Render gratuito "dorme"; o primeiro pedido pode levar ~1 minuto enquanto ele acorda.
let cache = null;
async function torreCharacters() {
  if (cache && Date.now() - cache.at < 30000) return cache.body;
  const response = await fetch(ELYSIUM + '/torre/api/characters', {signal: AbortSignal.timeout(90000), headers: {accept: 'application/json'}});
  const text = await response.text();
  let list;
  try { list = JSON.parse(text); } catch { throw new Error('O site ainda está acordando (resposta não é JSON).'); }
  if (!response.ok || !Array.isArray(list)) throw new Error('A Torre respondeu ' + response.status + '.');
  cache = {at: Date.now(), body: JSON.stringify(list)};
  return cache.body;
}
const PORTRAIT = /^\/torre\/assets\/personagens\/([a-f0-9]{64}\.(?:png|jpe?g|webp|gif))$/;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  try {
    if (url.pathname === '/' ) { res.writeHead(302, {Location: '/escudo/'}); res.end(); return; }
    if (url.pathname === '/torre/api/characters' && req.method === 'GET') {
      try {
        const body = await torreCharacters();
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
        res.end(body);
      } catch (error) {
        console.log('Torre indisponível: ' + error.message);
        res.writeHead(503, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({error: 'Torre indisponível no momento.'}));
      }
      return;
    }
    const portrait = url.pathname.match(PORTRAIT);
    if (portrait && req.method === 'GET') {
      const response = await fetch(ELYSIUM + '/torre/assets/personagens/' + portrait[1], {signal: AbortSignal.timeout(90000)});
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.startsWith('image/')) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'private, max-age=86400'});
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (await handleEscudo(req, res, url)) return;
    res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Só o Escudo existe nesta demonstração: abra /escudo/');
  } catch (error) {
    console.error('Erro na demonstração:', error.message);
    if (!res.headersSent) { res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'}); res.end('Erro na demonstração.'); }
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Escudo do Mestre — demonstração local');
  console.log('  Abra: ' + ORIGIN + '/escudo/');
  console.log('  Personagens da Torre vindos de: ' + ELYSIUM);
  console.log('  Mesa salva em: ' + MESA_FILE);
  console.log('  Para encerrar: Ctrl+C');
  console.log('');
});
