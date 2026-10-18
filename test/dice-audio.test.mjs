import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const script = await readFile(new URL('../public/dice-audio.js', import.meta.url), 'utf8');
function harness() {
  const starts = [], stopped = [], fetches = [], handlers = {}, contexts = [];
  let fail = false, pending = null;
  class Context {
    constructor() { this.state = 'suspended'; this.destination = {}; contexts.push(this); }
    async resume() { this.state = 'running'; }
    async decodeAudioData(bytes) { return { bytes, duration:1 }; }
    createGain() { return { gain:{value:0}, connect() {}, disconnect() {} }; }
    createBufferSource() {
      const source = { connect() {}, disconnect() {}, start() { starts.push(this); }, stop() { stopped.push(this); } };
      return source;
    }
  }
  const document = { hidden:false, addEventListener(name, fn) { handlers[name] = fn; } };
  const window = { AudioContext:Context, addEventListener(name, fn) { handlers[name] = fn; } };
  const fetch = async url => {
    fetches.push(url);
    if (pending) await pending;
    return { ok:!fail, arrayBuffer:async () => new ArrayBuffer(8) };
  };
  vm.runInNewContext(script, {window, document, fetch, Math});
  return { manager:window.SixBonesDiceAudio, starts, stopped, fetches, handlers, contexts, document,
    setFailure(value) { fail = value; }, hold() { let resolve; pending = new Promise(done => { resolve = done; }); return () => { pending = null; resolve(); }; } };
}

test('mute cancels active and still-loading sounds, including after enabling again', async () => {
  const h = harness(), player = h.manager.create();
  assert.equal(await player.play('roll-small'), true);
  player.setEnabled(false); assert.equal(h.stopped.length, 1);
  assert.equal(await player.play('combo'), false);
  player.setEnabled(true);
  const release = h.hold(), waiting = player.play('roll-large');
  player.setEnabled(false); player.setEnabled(true); release();
  assert.equal(await waiting, false); assert.equal(h.starts.length, 1);
  assert.equal(await player.play('roll-large'), true);
});

test('stop cancels a delayed roll and lets the next roll work', async () => {
  const h = harness(), player = h.manager.create(), release = h.hold();
  const opening = player.play('roll-large'); player.stop(); release();
  assert.equal(await opening, false); assert.equal(h.starts.length, 0);
  assert.equal(await player.play('roll-large'), true);
});

test('a new score replaces the previous stinger while leaving the dice independent', async () => {
  const h = harness(), player = h.manager.create();
  await player.play('roll-small'); await player.play('combo'); await player.play('combo-grand');
  assert.equal(player.diagnostics().active, 2); assert.equal(h.stopped.length, 1);
  player.stop(); assert.equal(player.diagnostics().active, 0);
});

test('dice variation avoids immediate repeats, reuses downloads and replaces old rolls', async () => {
  const h = harness(), player = h.manager.create();
  for (let n = 0; n < 5; n++) assert.equal(await player.play('roll-large'), true);
  assert.equal(h.fetches.length, 2); assert.notEqual(h.fetches[0], h.fetches[1]);
  assert.equal(h.stopped.length, 4); assert.equal(player.diagnostics().active, 1);
});

test('network failures remain silent and can recover on a later interaction', async () => {
  const h = harness(), player = h.manager.create(); h.setFailure(true);
  assert.equal(await player.play('combo'), false); assert.equal(h.starts.length, 0);
  h.setFailure(false); assert.equal(await player.play('combo'), true);
});

test('hiding the tab stops audio and prevents late playback', async () => {
  const h = harness(), player = h.manager.create(); await player.play('roll-large');
  h.document.hidden = true; h.handlers.visibilitychange();
  assert.equal(player.diagnostics().active, 0); assert.equal(await player.play('roll-small'), false);
  h.document.hidden = false; assert.equal(await player.play('roll-small'), true);
});

test('unsupported audio does not throw or block game interaction', async () => {
  const window = { addEventListener() {} }, document = { hidden:false, addEventListener() {} };
  vm.runInNewContext(script, {window, document, fetch:async () => { throw Error('offline'); }, Math});
  const player = window.SixBonesDiceAudio.create();
  assert.equal(await player.play('roll-large'), false); assert.equal(await player.prepare(['roll-large']), 0);
});

test('the real server delivers the eight table audio assets and loads the adapter before the UI', async () => {
  const {server} = await import('../server.js');
  const manifest = JSON.parse(await readFile(new URL('../public/audio/seis-ossos/dice-sources.json', import.meta.url), 'utf8'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(manifest.clips.length, 8);
    for (const clip of manifest.clips) {
      const response = await fetch(base + clip.file);
      assert.equal(response.status, 200, clip.file);
      assert.equal(response.headers.get('content-type'), 'audio/mpeg');
      assert.equal((await response.arrayBuffer()).byteLength, clip.bytes);
      assert.ok(clip.peak < .9 && clip.rms > .001);
    }
    for (const [route, ui] of [['/dados', '/dice.js']]) {
      const response = await fetch(base + route), html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(html.includes('/dice-audio.js'));
      assert.ok(html.indexOf('/dice-audio.js') < html.indexOf(ui));
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
