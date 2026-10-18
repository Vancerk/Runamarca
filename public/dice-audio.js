(() => {
  'use strict';
  const path = name => `/audio/seis-ossos/${name}.mp3`;
  const cues = Object.freeze({
    'roll-small': { files:['roll-two-a', 'roll-two-b'], level:.31, group:'roll' },
    'roll-medium': { files:['roll-three-a', 'roll-three-b'], level:.32, group:'roll' },
    'roll-large': { files:['roll-six-a', 'roll-six-b'], level:.33, group:'roll' },
    combo: { files:['combo'], level:.22, group:'score' },
    'combo-grand': { files:['combo-grand'], level:.27, group:'score' }
  });
  const instances = new Set();
  function create({ enabled = true } = {}) {
    let context = null, generation = 0;
    const buffers = new Map(), active = new Set(), last = new Map();
    const stats = { provider:'Epidemic Sound', played:0, stopped:0, failed:0 };
    function getContext() {
      if (context) return context;
      try { context = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
      return context;
    }
    function load(name) {
      if (buffers.has(name)) return buffers.get(name);
      const ctx = getContext(); if (!ctx) return Promise.resolve(null);
      const promise = fetch(path(name)).then(response => {
        if (!response.ok) throw Error('Sound unavailable');
        return response.arrayBuffer();
      }).then(bytes => ctx.decodeAudioData(bytes)).catch(() => {
        buffers.delete(name); stats.failed++; return null;
      });
      buffers.set(name, promise); return promise;
    }
    function halt(voice) {
      // Disconnect immediately so mute and reset also silence scheduled cues.
      try { voice.source.stop(); } catch { /* It may already have ended. */ }
      voice.source.disconnect(); voice.gain.disconnect(); active.delete(voice); stats.stopped++;
    }
    function stop() { generation++; for (const voice of [...active]) halt(voice); }
    async function unlock() {
      if (!enabled) return false;
      const ctx = getContext(); if (!ctx) return false;
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { return false; } }
      return ctx.state === 'running';
    }
    function prepare(keys = Object.keys(cues)) {
      const names = [...new Set(keys.flatMap(key => cues[key]?.files || []))];
      return Promise.all(names.map(load)).then(results => results.filter(Boolean).length);
    }
    async function play(key) {
      if (!enabled || document.hidden || !cues[key]) return false;
      const version = generation, cue = cues[key];
      const choices = cue.files.filter(name => name !== last.get(key));
      const names = choices.length ? choices : cue.files;
      const name = names[Math.floor(Math.random() * names.length)];
      // Resume in the original user gesture, while the file loads in parallel.
      const [unlocked, buffer] = await Promise.all([unlock(), load(name)]);
      if (!unlocked || !buffer || !enabled || version !== generation || document.hidden) return false;
      if (cue.group === 'roll' || cue.group === 'score') {
        for (const voice of [...active]) if (voice.group === cue.group) halt(voice);
      }
      // Bound concurrent table notifications without clipping or stale playback.
      while (active.size >= 4) halt(active.values().next().value);
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; gain.gain.value = cue.level;
      source.connect(gain); gain.connect(context.destination);
      const voice = { source, gain, group:cue.group };
      active.add(voice); last.set(key, name);
      source.onended = () => { source.disconnect(); gain.disconnect(); active.delete(voice); };
      source.start(); stats.played++; return true;
    }
    const instance = Object.freeze({
      prepare, unlock, play, stop,
      setEnabled(value) { enabled = Boolean(value); if (!enabled) stop(); },
      diagnostics() { return { ...stats, enabled, active:active.size, cached:buffers.size, context:context?.state || 'unavailable' }; }
    });
    instances.add(instance); return instance;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) for (const instance of instances) instance.stop(); });
  window.addEventListener('pagehide', () => { for (const instance of instances) instance.stop(); });
  window.SixBonesDiceAudio = Object.freeze({ create, cues });
})();
