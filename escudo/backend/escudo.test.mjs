// Testes do Escudo do Mestre: autorização, origem, validação e persistência da mesa.
// Rodar com: node --test escudo/backend/escudo.test.mjs  (PostgreSQL simulado com pg-mem)
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newDb} from 'pg-mem';
import {createEscudo, normalizeMesa, readMasterIds} from './handler.mjs';

// Contas fictícias declaradas apenas para o teste.
const MESTRE = {discord_id: '111111111111111111', display_name: 'Mestre Teste'};
const OUTRO_MESTRE = {discord_id: '222222222222222222', display_name: 'Outra Mestra'};
const JOGADOR = {discord_id: '333333333333333333', display_name: 'Jogador Teste'};
const USERS = {mestre: MESTRE, outro: OUTRO_MESTRE, jogador: JOGADOR};
const SHEET = 'https://docs.google.com/spreadsheets/d/1RMUQDSyEurI6WZFFgkiEHGggAwfLNrEbOBNXnWPbHJE/edit?usp=sharing';

async function setup({failDb = false} = {}) {
  const {Pool} = newDb().adapters.createPg();
  const pool = new Pool();
  const database = {query: (sql, params) => failDb ? Promise.reject(new Error('banco fora')) : pool.query(sql, params)};
  let origin;
  const handle = createEscudo({
    identify: async req => USERS[req.headers['x-test-user']] || null,
    configured: () => true,
    database,
    origin: () => origin,
    masterIds: () => new Set([MESTRE.discord_id, OUTRO_MESTRE.discord_id])
  });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    if (!(await handle(req, res, url))) { res.writeHead(404); res.end('fora'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, {user, method = 'GET', body, headers = {}} = {}) => fetch(origin + path, {
    method, redirect: 'manual',
    headers: {...(user ? {'x-test-user': user} : {}), ...(body !== undefined ? {'content-type': 'application/json', origin} : {}), ...headers},
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return {server, origin, call, close: () => new Promise(r => server.close(r))};
}

test('rotas fora de /escudo não são tratadas', async () => {
  const t = await setup();
  try {
    const r = await t.call('/torre/api/characters');
    assert.equal(await r.text(), 'fora');
    assert.equal((await t.call('/escudote')).status, 404);
  } finally { await t.close(); }
});

test('sem login: página redireciona ao Discord e API responde 401', async () => {
  const t = await setup();
  try {
    const page = await t.call('/escudo/');
    assert.equal(page.status, 302);
    assert.equal(page.headers.get('location'), '/auth/discord?return=%2Fescudo%2F');
    assert.equal((await t.call('/escudo/api/mesa')).status, 401);
    assert.equal((await t.call('/escudo/fichas.js')).status, 401);
    const bare = await t.call('/escudo');
    assert.equal(bare.status, 308);
    assert.equal(bare.headers.get('location'), '/escudo/');
  } finally { await t.close(); }
});

test('conta que não é mestre recebe 403 na página, nos arquivos e na API', async () => {
  const t = await setup();
  try {
    assert.equal((await t.call('/escudo/', {user: 'jogador'})).status, 403);
    assert.equal((await t.call('/escudo/assets/mapa-mundi.webp', {user: 'jogador'})).status, 403);
    assert.equal((await t.call('/escudo/api/mesa', {user: 'jogador'})).status, 403);
    assert.equal((await t.call('/escudo/api/mesa', {user: 'jogador', method: 'PUT', body: {version: 0, fichas: []}})).status, 403);
  } finally { await t.close(); }
});

test('mestre recebe a página com CSP e os arquivos estáticos', async () => {
  const t = await setup();
  try {
    const page = await t.call('/escudo/', {user: 'mestre'});
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /script-src 'self' https:\/\/docs\.google\.com/);
    assert.match(await page.text(), /<title>Escudo do Mestre<\/title>/);
    const js = await t.call('/escudo/fichas.js', {user: 'mestre'});
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
    const img = await t.call('/escudo/assets/mapa-mundi.webp', {user: 'mestre'});
    assert.equal(img.status, 200);
    assert.equal(img.headers.get('content-type'), 'image/webp');
  } finally { await t.close(); }
});

test('caminhos fora da lista não são servidos (inclui tentativa de sair da pasta)', async () => {
  const t = await setup();
  try {
    for (const path of ['/escudo/../server.js', '/escudo/%2e%2e/server.js', '/escudo/backend/handler.mjs', '/escudo/assets/../index.html', '/escudo/assets/x.png'])
      assert.equal((await t.call(path, {user: 'mestre'})).status, 404, path);
  } finally { await t.close(); }
});

test('mesa: começa vazia, salva, incrementa a versão e é separada por mestre', async () => {
  const t = await setup();
  try {
    const vazia = await (await t.call('/escudo/api/mesa', {user: 'mestre'})).json();
    assert.deepEqual(vazia, {version: 0, fichas: [], updatedAt: null});

    const fichas = [{id: 'a1', characterId: '0b3e2f9a-1c2d-4e5f-8a9b-0c1d2e3f4a5b'}, {id: 'a2', link: SHEET, imagem: 'https://exemplo.test/retrato.png'}];
    const r1 = await t.call('/escudo/api/mesa', {user: 'mestre', method: 'PUT', body: {version: 0, fichas}});
    assert.equal(r1.status, 200);
    const s1 = await r1.json();
    assert.equal(s1.version, 1);
    assert.equal(s1.fichas[1].link, 'https://docs.google.com/spreadsheets/d/1RMUQDSyEurI6WZFFgkiEHGggAwfLNrEbOBNXnWPbHJE/edit');
    assert.equal(s1.fichas[0].characterId, '0b3e2f9a-1c2d-4e5f-8a9b-0c1d2e3f4a5b');

    const r2 = await t.call('/escudo/api/mesa', {user: 'mestre', method: 'PUT', body: {version: 1, fichas: [fichas[0]]}});
    assert.equal((await r2.json()).version, 2);
    const lida = await (await t.call('/escudo/api/mesa', {user: 'mestre'})).json();
    assert.equal(lida.version, 2);
    assert.equal(lida.fichas.length, 1);

    const outra = await (await t.call('/escudo/api/mesa', {user: 'outro'})).json();
    assert.equal(outra.version, 0, 'outra mestra não vê a mesa do primeiro');
  } finally { await t.close(); }
});

test('mesa: versão desatualizada devolve 409 com a versão salva, sem sobrescrever', async () => {
  const t = await setup();
  try {
    await t.call('/escudo/api/mesa', {user: 'mestre', method: 'PUT', body: {version: 0, fichas: [{id: 'a', link: SHEET}]}});
    const conflito = await t.call('/escudo/api/mesa', {user: 'mestre', method: 'PUT', body: {version: 0, fichas: []}});
    assert.equal(conflito.status, 409);
    const corpo = await conflito.json();
    assert.equal(corpo.version, 1);
    assert.equal(corpo.fichas.length, 1);
    const antiga = await t.call('/escudo/api/mesa', {user: 'mestre', method: 'PUT', body: {version: 7, fichas: []}});
    assert.equal(antiga.status, 409);
  } finally { await t.close(); }
});

test('mesa: exige origem do site e JSON', async () => {
  const t = await setup();
  try {
    const semOrigem = await t.call('/escudo/api/mesa', {user: 'mestre', method: 'PUT', body: {version: 0, fichas: []}, headers: {origin: 'https://outro.site'}});
    assert.equal(semOrigem.status, 403);
    const texto = await fetch(t.origin + '/escudo/api/mesa', {method: 'PUT', headers: {'x-test-user': 'mestre', origin: t.origin, 'content-type': 'text/plain'}, body: '{}'});
    assert.equal(texto.status, 415);
    assert.equal((await t.call('/escudo/api/mesa', {user: 'mestre', method: 'POST', body: {}})).status, 405);
  } finally { await t.close(); }
});

test('mesa: rejeita entradas inválidas', async () => {
  const t = await setup();
  try {
    const casos = [
      {version: 0, fichas: 'x'},
      {version: -1, fichas: []},
      {version: 0, fichas: [{id: 'a'}]},
      {version: 0, fichas: [{id: 'a', link: SHEET, characterId: 'b'}]},
      {version: 0, fichas: [{id: 'a', link: 'https://evil.test/spreadsheets/d/1RMUQDSyEurI6WZFFgkiEHGggAwfLNrEbOBNXnWPbHJE/'}]},
      {version: 0, fichas: [{id: 'a', link: 'http://docs.google.com/spreadsheets/d/1RMUQDSyEurI6WZFFgkiEHGggAwfLNrEbOBNXnWPbHJE/'}]},
      {version: 0, fichas: [{id: 'a', link: SHEET, imagem: 'javascript:alert(1)'}]},
      {version: 0, fichas: [{id: 'a', link: SHEET}, {id: 'a', link: SHEET}]},
      {version: 0, fichas: [{id: '<x>', link: SHEET}]},
      {version: 0, fichas: [{id: 'a', characterId: 123}]},
      {version: 0, fichas: Array.from({length: 13}, (_, i) => ({id: 'f' + i, link: SHEET}))}
    ];
    for (const body of casos) {
      const r = await t.call('/escudo/api/mesa', {user: 'mestre', method: 'PUT', body});
      assert.equal(r.status, 400, JSON.stringify(body).slice(0, 120));
    }
    assert.equal((await (await t.call('/escudo/api/mesa', {user: 'mestre'})).json()).version, 0, 'nada foi gravado');
  } finally { await t.close(); }
});

test('mesa: falha do banco vira 503 sem detalhes internos', async () => {
  const t = await setup({failDb: true});
  try {
    const r = await t.call('/escudo/api/mesa', {user: 'mestre'});
    assert.equal(r.status, 503);
    assert.doesNotMatch((await r.json()).error, /banco fora/);
  } finally { await t.close(); }
});

test('normalizeMesa descarta campos desconhecidos', () => {
  const [entry] = normalizeMesa([{id: 'a', characterId: 'abc-1', privado: 'x', imagem: ''}]);
  assert.deepEqual(entry, {id: 'a', characterId: 'abc-1'});
});

test('lista de mestres: admin, mestres da Torre e ESCUDO_MESTRES', () => {
  const dir = mkdtempSync(join(tmpdir(), 'escudo-mestres-'));
  const file = join(dir, 'mestres.json');
  writeFileSync(file, JSON.stringify([{name: 'A', id: '444444444444444444'}, {name: 'inválido', id: 'abc'}]));
  const ids = readMasterIds({adminId: '555555555555555555', extra: '666666666666666666, lixo', file});
  assert.deepEqual([...ids].sort(), ['444444444444444444', '555555555555555555', '666666666666666666']);
  const semArquivo = readMasterIds({adminId: '555555555555555555', extra: '', file: join(dir, 'nao-existe.json')});
  assert.deepEqual([...semArquivo], ['555555555555555555']);
});
