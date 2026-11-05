// Cached noise billows, adapted from the authorized Claude consultation.
// The production seed uses the same deterministic noise baked to four tiny PNGs.
// Decode while the lobby is open, rather than synthesizing 65,536 pixels on the
// first formation frame. Other seeds / failed loads retain the procedural path.
const fogSpriteCache=new Map();
if(typeof document!=='undefined'&&document.currentScript?.src){
 const base=new URL('fog-puffs/',document.currentScript.src);
 Promise.all([0,1,2,3].map(i=>{const image=new Image();image.src=new URL(`42-${i}.png`,base).href;return image.decode().then(()=>image);})).then(images=>fogSpriteCache.set('42:128:4',images)).catch(()=>{});
}
function createFog({ seed = 7, puffs = 14, spriteSize = 128, variants = 4, resScale = 0.5 } = {}) {
  const hash = (x, y, s) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, s, oct = 4) => {
    let sum = 0, amp = 0.5, norm = 0;
    for (let i = 0; i < oct; i++, x *= 2, y *= 2, amp *= 0.5) { sum += amp * noise(x, y, s + i); norm += amp; }
    return sum / norm;
  };
  const rng = (a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // Baked once: noisy-edged, internally shaded puffs (not radial gradients).
  const sprites = fogSpriteCache.get(`${seed}:${spriteSize}:${variants}`)||Array.from({ length: variants }, (_, k) => {
    const c = document.createElement('canvas');
    c.width = c.height = spriteSize;
    const g = c.getContext('2d');
    const img = g.createImageData(spriteSize, spriteSize), d = img.data;
    const s = seed * 31 + k * 977, tint = k % 2 ? 0.82 : 1;
    for (let y = 0; y < spriteSize; y++) for (let x = 0; x < spriteSize; x++) {
      const nx = (x / spriteSize) * 2 - 1, ny = (y / spriteSize) * 2 - 1, r = Math.hypot(nx, ny);
      const w = fbm(nx * 2 + 5, ny * 2 + 5, s + 50, 3);
      const n = fbm(nx * 3 + w * 1.6, ny * 3 + w * 1.6, s);
      let a = clamp01((0.8 - r) * 2.2 + (n - 0.5) * 1.8) * clamp01((1 - r) * 4);
      a = a * a * (3 - 2 * a);
      const sh = (0.72 + 0.4 * n - 0.12 * ny) * tint, i = (y * spriteSize + x) * 4;
      d[i] = 188 * sh; d[i + 1] = 204 * sh; d[i + 2] = 206 * sh; d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });

  // Deterministic per-slot puffs in normalized slot space (anchored across rerenders).
  const cache = new Map();
  const puffsFor = (i) => {
    if (!cache.has(i)) {
      const r = rng(seed * 1009 + i * 7919), arr = [];
      for (let j = 0; j < puffs; j++) {
        const back = j < puffs * 0.45;
        arr.push({
          u: r(), v: 0.12 + r() * 0.76, k: (r() * variants) | 0, ph: r() * 6.283,
          size: back ? 0.75 + r() * 0.35 : 0.4 + r() * 0.3,
          spd: (back ? 0.012 : -0.02) * (0.6 + r() * 0.8),
          rot: r() * 6.283, rs: (r() - 0.5) * 0.15, a: back ? 0.55 : 0.8,
        });
      }
      cache.set(i, arr);
    }
    return cache.get(i);
  };

  const buf = document.createElement('canvas'), f = buf.getContext('2d');

  // slots: [{x,y,w,h}] in the same space as ctx's transform; view: {w,h} of that space.
  // t: absolute seconds (e.g. performance.now()/1000). burnX: fire-wipe x, or -Infinity.
  function draw(ctx, t, slots, view, burnX = -Infinity) {
    const bw = Math.ceil(view.w * resScale), bh = Math.ceil(view.h * resScale);
    if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, bw, bh);

    let any = false;
    slots.forEach((s, i) => {
      if (burnX > s.x + s.w * 1.3) return; // fully revealed: skip
      any = true;
      const base = Math.min(s.w, s.h) * 1.8;
      for (const p of puffsFor(i)) {
        const u = (((p.u + t * p.spd) % 1) + 1) % 1;
        const x = s.x + s.w * (-0.1 + u * 1.2 + 0.03 * Math.sin(t * 0.23 + p.ph * 1.7));
        const y = s.y + s.h * (p.v + 0.04 * Math.sin(t * 0.37 + p.ph));
        const sz = base * p.size * (1 + 0.08 * Math.sin(t * 0.5 + p.ph * 2)) * resScale;
        const rot = p.rot + t * p.rs, c = Math.cos(rot) * sz, sn = Math.sin(rot) * sz;
        f.globalAlpha = p.a * Math.sqrt(Math.sin(Math.PI * u));
        f.setTransform(c, sn, -sn, c, x * resScale, y * resScale);
        f.drawImage(sprites[p.k], -0.5, -0.5, 1, 1);
      }
    });
    if (!any) return;

    if (burnX > -1e6) { // ragged cut behind the flame front
      f.setTransform(resScale, 0, 0, resScale, 0, 0);
      f.globalAlpha = 1;
      f.globalCompositeOperation = 'destination-out';
      f.beginPath();
      f.moveTo(-1, -1);
      for (let y = 0; y <= view.h + 8; y += 8)
        f.lineTo(burnX + (fbm(y * 0.03, t * 0.8, seed + 99, 2) - 0.5) * 36, y);
      f.lineTo(-1, view.h + 8);
      f.fill();
    }
    ctx.drawImage(buf, 0, 0, view.w, view.h);
  }

  return { draw };
}

globalThis.RunaPrototypeFog={create:createFog};
