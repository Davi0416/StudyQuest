// StudyQuest — "O Caminho da Serpente" cave map renderer.
import { fbm, ridged, valueNoise, mulberry32 } from './noise';

export const W = 512, H = 288;            // logical pixel-art resolution (16:9)
const idx = (x, y) => y * W + x;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  // ---- trail SHAPE control points (normalised 0..1) — a long, windy 4-sweep
  //      serpentine from bottom-left to the boss at top-right. Node markers are
  //      placed independently, at even arc-length intervals along this curve. ----
  const SHAPE = [
    [0.085, 0.875],                                            // start (bottom-left)
    [0.22, 0.895], [0.40, 0.905], [0.57, 0.86], [0.71, 0.79],  // sweep 1  L -> R
    [0.785, 0.715],                                            // turn up
    [0.66, 0.675], [0.49, 0.705], [0.33, 0.665], [0.185, 0.61],// sweep 2  R -> L
    [0.135, 0.535],                                            // turn up
    [0.27, 0.505], [0.44, 0.535], [0.61, 0.495], [0.75, 0.445],// sweep 3  L -> R
    [0.81, 0.375],                                             // turn up
    [0.68, 0.35], [0.51, 0.375], [0.36, 0.335], [0.25, 0.285], // sweep 4  R -> L
    [0.33, 0.225], [0.50, 0.205], [0.67, 0.175],               // climb up-right
    [0.88, 0.125],                                             // boss (top-right)
  ];
  const BOSS = SHAPE[SHAPE.length - 1];

  const NODES = [
    { t: 'Variáveis',               st: 'done' },
    { t: 'Tipos & Strings',         st: 'done' },
    { t: 'Entrada / Saída',         st: 'done' },
    { t: 'Operadores',              st: 'done' },
    { t: 'Condições',               st: 'done' },
    { t: 'Laços de Repetição',      st: 'active' },
    { t: 'Listas & Tuplas',         st: 'lock' },
    { t: 'Dicionários & Conjuntos', st: 'lock' },
    { t: 'Compreensão de Listas',   st: 'lock' },
    { t: 'Funções',                 st: 'lock' },
    { t: 'Parâmetros & Escopo',     st: 'lock' },
    { t: 'Módulos & Pacotes',       st: 'lock' },
    { t: 'Tratamento de Erros',     st: 'lock' },
    { t: 'Arquivos & I/O',          st: 'lock' },
    { t: 'Classes & Objetos',       st: 'lock' },
    { t: 'Herança & Polimorfismo',  st: 'lock' },
    { t: 'Decoradores & Geradores', st: 'lock' },
  ];

  // place N markers at even arc-length fractions [s0..s1] along a sampled curve
  function placeNodes(centre, count, s0, s1) {
    const cum = [0];
    for (let i = 1; i < centre.length; i++) {
      const dx = centre[i][0] - centre[i - 1][0], dy = centre[i][1] - centre[i - 1][1];
      cum.push(cum[i - 1] + Math.hypot(dx, dy));
    }
    const L = cum[cum.length - 1], out = [];
    for (let n = 0; n < count; n++) {
      const f = s0 + (s1 - s0) * (count === 1 ? 0.5 : n / (count - 1));
      const target = f * L;
      let i = 1; while (i < cum.length - 1 && cum[i] < target) i++;
      const t = (target - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
      out.push([(centre[i - 1][0] + (centre[i][0] - centre[i - 1][0]) * t) / W,
                (centre[i - 1][1] + (centre[i][1] - centre[i - 1][1]) * t) / H]);
    }
    return out;
  }

  // ---------- Catmull-Rom centreline ----------
  function buildCentreline(anchors) {
    const pts = anchors.map(([x, y]) => [x * W, y * H]);
    // phantom ends
    const first = [pts[0][0] - (pts[1][0] - pts[0][0]), pts[0][1] - (pts[1][1] - pts[0][1])];
    const n = pts.length;
    const last = [pts[n - 1][0] + (pts[n - 1][0] - pts[n - 2][0]), pts[n - 1][1] + (pts[n - 1][1] - pts[n - 2][1])];
    const P = [first, ...pts, last];
    const out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      const steps = 26;
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        out.push([x, y]);
      }
    }
    out.push([P[P.length - 2][0], P[P.length - 2][1]]);
    return out;
  }

  // ---------- separable box blur on a Float32 buffer ----------
  function boxBlur(src, r) {
    const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < H; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[idx(clamp(x, 0, W - 1), y)];
      for (let x = 0; x < W; x++) {
        tmp[idx(x, y)] = acc * inv;
        const xl = clamp(x - r, 0, W - 1), xr = clamp(x + r + 1, 0, W - 1);
        acc += src[idx(xr, y)] - src[idx(xl, y)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[idx(x, clamp(y, 0, H - 1))];
      for (let y = 0; y < H; y++) {
        out[idx(x, y)] = acc * inv;
        const yl = clamp(y - r, 0, H - 1), yr = clamp(y + r + 1, 0, H - 1);
        acc += tmp[idx(x, yr)] - tmp[idx(x, yl)];
      }
    }
    return out;
  }

export function makeRenderer(displayCanvas) {
  const ctx = displayCanvas.getContext('2d');
    displayCanvas.width = W; displayCanvas.height = H;
    ctx.imageSmoothingEnabled = false;

    const base = document.createElement('canvas'); base.width = W; base.height = H;
    const bctx = base.getContext('2d');
    const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
    const sctx = scratch.getContext('2d');

    const img = bctx.createImageData(W, H);
    const px = img.data;
    const LR = new Float32Array(W * H), LG = new Float32Array(W * H), LB = new Float32Array(W * H);

    const centre = buildCentreline(SHAPE);
    const nodePositions = placeNodes(centre, NODES.length + 1, 0.04, 0.97);

    // pre-computed nearest-distance to path centre (for moss / glow concentration)
    // built later via coverage; declare holders
    let pathSolid, pathEdge; // Uint8 / Float

    function setPx(p, r, g, b) { const o = p * 4; px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255; }
    function addLight(p, r, g, b) { LR[p] += r; LG[p] += g; LB[p] += b; }

    function coverage(drawFn) {
      sctx.clearRect(0, 0, W, H);
      sctx.save(); sctx.fillStyle = '#fff'; sctx.strokeStyle = '#fff'; drawFn(sctx); sctx.restore();
      const d = sctx.getImageData(0, 0, W, H).data;
      const cov = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) cov[i] = d[i * 4 + 3] / 255;
      return cov;
    }

    // ---------------------------------------------------------------- decor data
    const rnd = mulberry32(20260606);
    const lavaPools = [
      { x: 0.62 * W, y: 0.16 * H, rx: 30, ry: 22 },
      { x: 0.86 * W, y: 0.205 * H, rx: 18, ry: 14 },
      { x: 0.835 * W, y: 0.33 * H, rx: 26, ry: 19 },
    ];
    const cyanPools = [
      { x: 0.12 * W, y: 0.74 * H, rx: 28, ry: 17 },
      { x: 0.30 * W, y: 0.92 * H, rx: 24, ry: 14 },
    ];

    // mushrooms (purple) clustered left; cyan tufts clustered right
    const mushrooms = [], tufts = [], carvings = [];
    function farFromPath(x, y, d) {
      for (let i = 0; i < centre.length; i += 3) {
        const dx = x - centre[i][0], dy = y - centre[i][1];
        if (dx * dx + dy * dy < d * d) return false;
      }
      return true;
    }
    function farFromPools(x, y, d) {
      for (const p of lavaPools) { if (Math.hypot(x - p.x, y - p.y) < p.rx + d) return false; }
      for (const p of cyanPools) { if (Math.hypot(x - p.x, y - p.y) < p.rx + d) return false; }
      return true;
    }
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = rnd() * H;
      const leftBias = (x / W) < 0.55 + rnd() * 0.15;
      if (!leftBias) continue;
      if (!farFromPath(x, y, 22) || !farFromPools(x, y, 8)) continue;
      if (x > BOSS[0] * W - 70 && y < BOSS[1] * H + 70) continue;
      mushrooms.push({ x: Math.round(x), y: Math.round(y), h: 3 + Math.floor(rnd() * 4), cap: 2 + rnd() * 2.4, hue: rnd() });
    }
    for (let i = 0; i < 150; i++) {
      const x = (0.45 + rnd() * 0.55) * W, y = rnd() * H;
      if (!farFromPath(x, y, 16) || !farFromPools(x, y, 6)) continue;
      if (x > BOSS[0] * W - 64 && y < BOSS[1] * H + 64) continue;
      tufts.push({ x: Math.round(x), y: Math.round(y), s: 2 + rnd() * 2.2 });
    }
    for (let i = 0; i < 16; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!farFromPools(x, y, 14)) continue;
      if (x > BOSS[0] * W - 70 && y < BOSS[1] * H + 70) continue;
      carvings.push({ x: Math.round(x), y: Math.round(y), r: 7 + rnd() * 6, rot: rnd() * 6.28, k: Math.floor(rnd() * 3) });
    }

    // ---------------------------------------------------------------- 1. FLOOR
    function paintFloor() {
      const dark = [9, 14, 15], mid = [23, 31, 29], light = [38, 48, 41];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const p = idx(x, y);
          const f1 = fbm(x / 46, y / 46, 4, 1);
          const f2 = fbm(x / 13, y / 13, 3, 2);
          const g = valueNoise(x / 2.3, y / 2.3, 3);
          let v = f1 * 0.62 + f2 * 0.3 + g * 0.08;
          let r = lerp(dark[0], mid[0], v), gg = lerp(dark[1], mid[1], v), b = lerp(dark[2], mid[2], v);
          if (v > 0.62) { const k = sstep(0.62, 0.9, v); r = lerp(r, light[0], k); gg = lerp(gg, light[1], k); b = lerp(b, light[2], k); }
          // cracks
          const cr = ridged(x / 17, y / 17, 4, 5);
          if (cr > 0.80) { const k = sstep(0.80, 0.96, cr) * 0.9; r *= (1 - k); gg *= (1 - k); b *= (1 - k); }
          // grain
          const gr = (g - 0.5) * 9;
          r += gr; gg += gr * 0.9; b += gr * 0.8;
          // green ambient bias
          gg += 3;
          setPx(p, clamp(r, 0, 255), clamp(gg, 0, 255), clamp(b, 0, 255));
          // living bioluminescent veins through the rock
          const vn = ridged(x / 24, y / 22, 4, 7);
          if (vn > 0.845) {
            const k = sstep(0.845, 0.97, vn);
            addLight(p, k * 10, k * 46, k * 24);
            const o = p * 4; px[o] = clamp(px[o] + k * 8, 0, 255); px[o + 1] = clamp(px[o + 1] + k * 30, 0, 255); px[o + 2] = clamp(px[o + 2] + k * 16, 0, 255);
          }
        }
      }
    }

    // ---------------------------------------------------------------- 2. POOLS
    function ellipseField(x, y, p) { const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry; return dx * dx + dy * dy; }
    function paintLava() {
      for (const p of lavaPools) {
        const x0 = Math.max(0, p.x - p.rx - 6 | 0), x1 = Math.min(W, p.x + p.rx + 7 | 0);
        const y0 = Math.max(0, p.y - p.ry - 6 | 0), y1 = Math.min(H, p.y + p.ry + 7 | 0);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const wob = (fbm(x / 7 + p.x, y / 7, 3, 9) - 0.5) * 0.5;
          let f = ellipseField(x, y, p) + wob;
          const pi = idx(x, y);
          if (f < 1.0) {
            // molten surface with crust cracks
            const hot = ridged(x / 4.5, y / 4.5, 3, 11);
            const t = 1 - clamp(f, 0, 1);
            let r = 200, g = 70, b = 20;
            if (hot > 0.62) { r = 255; g = 180 + 40 * (hot - 0.62) * 6; b = 60; } // bright fissures
            else { const k = sstep(0, 0.62, hot); r = lerp(120, 230, k); g = lerp(34, 96, k); b = lerp(14, 26, k); }
            const edge = sstep(0.75, 1.0, f);
            r = lerp(r, 40, edge); g = lerp(g, 16, edge); b = lerp(b, 12, edge);
            setPx(pi, r, g, b);
            addLight(pi, t * 70 + (hot > 0.62 ? 60 : 0), t * 26 + (hot > 0.62 ? 30 : 0), t * 6);
          } else if (f < 1.5) {
            // glowing rim cast on rock
            const k = sstep(1.5, 1.0, f) * 0.5;
            addLight(pi, k * 60, k * 22, k * 5);
          }
        }
      }
    }
    function paintCyanPools() {
      for (const p of cyanPools) {
        const x0 = Math.max(0, p.x - p.rx - 6 | 0), x1 = Math.min(W, p.x + p.rx + 7 | 0);
        const y0 = Math.max(0, p.y - p.ry - 6 | 0), y1 = Math.min(H, p.y + p.ry + 7 | 0);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const wob = (fbm(x / 8 + p.y, y / 8, 3, 14) - 0.5) * 0.45;
          let f = ellipseField(x, y, p) + wob;
          const pi = idx(x, y);
          if (f < 1.0) {
            const sh = ridged(x / 5, y / 5, 3, 16);
            const t = 1 - clamp(f, 0, 1);
            let r = 18, g = 90, b = 120;
            if (sh > 0.66) { r = 120; g = 240; b = 230; }
            const edge = sstep(0.7, 1.0, f); r = lerp(r, 26, edge); g = lerp(g, 40, edge); b = lerp(b, 46, edge);
            setPx(pi, r, g, b);
            addLight(pi, t * 6, t * 40 + (sh > 0.66 ? 40 : 0), t * 52 + (sh > 0.66 ? 40 : 0));
          } else if (f < 1.5) {
            const k = sstep(1.5, 1.0, f) * 0.45; addLight(pi, k * 6, k * 34, k * 44);
          }
        }
      }
    }

    // ---------------------------------------------------------------- 3. DECOR
    function paintMushrooms() {
      for (const m of mushrooms) {
        // stem
        for (let i = 0; i < m.h; i++) { const p = idx(clamp(m.x, 0, W - 1), clamp(m.y - i, 0, H - 1)); setPx(p, 60, 58, 70); }
        const cy = m.y - m.h;
        const baseHue = m.hue > 0.5 ? [165, 70, 220] : [120, 60, 210];
        for (let dy = -Math.ceil(m.cap); dy <= 1; dy++) for (let dx = -Math.ceil(m.cap); dx <= Math.ceil(m.cap); dx++) {
          const d = Math.hypot(dx, dy * 1.5);
          if (d <= m.cap && dy <= 0.5) {
            const X = clamp(m.x + dx, 0, W - 1), Y = clamp(cy + dy, 0, H - 1), p = idx(X, Y);
            const k = 1 - d / m.cap;
            setPx(p, lerp(70, baseHue[0], k * 0.9), lerp(40, baseHue[1], k * 0.9), lerp(90, baseHue[2], k));
            addLight(p, baseHue[0] / 9 * k, baseHue[1] / 14 * k, baseHue[2] / 7 * k);
          }
        }
        // glow halo
        addLight(idx(clamp(m.x, 0, W - 1), clamp(cy, 0, H - 1)), 26, 12, 40);
      }
    }
    function paintTufts() {
      for (const t of tufts) {
        const blades = 3;
        for (let b = 0; b < blades; b++) {
          const ox = b - 1;
          for (let i = 0; i < t.s; i++) {
            const X = clamp(t.x + Math.round(ox * i * 0.5), 0, W - 1), Y = clamp(t.y - i, 0, H - 1), p = idx(X, Y);
            const k = i / t.s;
            setPx(p, lerp(20, 70, k), lerp(120, 240, k), lerp(130, 220, k));
            addLight(p, 2, 16 * (0.4 + k), 20 * (0.4 + k));
          }
        }
        addLight(idx(clamp(t.x, 0, W - 1), clamp(t.y - 1, 0, H - 1)), 3, 18, 24);
      }
    }
    function paintCarvings() {
      // ancient reptile glyphs engraved into the rock (subtle, faint green)
      for (const c of carvings) {
        const seg = 30;
        for (let i = 0; i <= seg; i++) {
          const a = c.rot + (i / seg) * Math.PI * 2;
          let rr = c.r;
          if (c.k === 0) rr = c.r * (0.6 + 0.4 * Math.sin(a * 3));      // serpentine ring
          else if (c.k === 1) rr = c.r * (0.5 + 0.5 * Math.abs(Math.sin(a * 1.5))); // eye glyph
          else rr = c.r * (0.7 + 0.3 * Math.sin(a * 5));               // scaled rune
          const X = Math.round(c.x + Math.cos(a) * rr), Y = Math.round(c.y + Math.sin(a) * rr * 0.85);
          if (X < 1 || X >= W - 1 || Y < 1 || Y >= H - 1) continue;
          const p = idx(X, Y), o = p * 4;
          px[o] = clamp(px[o] - 16, 0, 255); px[o + 1] = clamp(px[o + 1] - 6, 0, 255); px[o + 2] = clamp(px[o + 2] - 12, 0, 255);
          addLight(p, 1, 4, 2);
        }
      }
    }

    // ---------------------------------------------------------------- 4. TRAIL
    function paintPath() {
      // smooth band coverage, then blur to get a soft rim for irregular edges
      const PATH_W = 25;
      const cov = coverage((s) => {
        s.lineJoin = 'round'; s.lineCap = 'round'; s.lineWidth = PATH_W;
        s.beginPath(); s.moveTo(centre[0][0], centre[0][1]);
        for (let i = 1; i < centre.length; i++) s.lineTo(centre[i][0], centre[i][1]);
        s.stroke();
      });
      const soft = boxBlur(cov, 4);
      pathSolid = new Uint8Array(W * H);
      pathEdge = new Float32Array(W * H);

      const sDark = [27, 31, 31], sMid = [55, 58, 53], sLight = [82, 85, 75];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = idx(x, y);
        const core = cov[p];
        const t = soft[p];
        if (t < 0.18 && core < 0.5) continue;
        const n = fbm(x / 6.5, y / 6.5, 4, 21);
        const solid = core > 0.62 || (t + (n - 0.5) * 0.85) > 0.5;
        if (!solid) {
          // jagged rocky lip just outside the trail
          if (t > 0.1 && (t + (n - 0.5) * 0.85) > 0.36) {
            const o = p * 4; px[o] = clamp(px[o] * 0.7, 0, 255); px[o + 1] = clamp(px[o + 1] * 0.7, 0, 255); px[o + 2] = clamp(px[o + 2] * 0.72, 0, 255);
          }
          continue;
        }
        pathSolid[p] = 1;
        const prox = clamp((t - 0.5) / 0.45, 0, 1); // 0 edge .. 1 centre
        pathEdge[p] = prox;
        // stone base
        const s1 = fbm(x / 11, y / 11, 4, 31), s2 = valueNoise(x / 3.2, y / 3.2, 32);
        let v = s1 * 0.72 + s2 * 0.28;
        let r = lerp(sDark[0], sMid[0], v), g = lerp(sDark[1], sMid[1], v), b = lerp(sDark[2], sMid[2], v);
        if (v > 0.6) { const k = sstep(0.6, 0.92, v); r = lerp(r, sLight[0], k); g = lerp(g, sLight[1], k); b = lerp(b, sLight[2], k); }
        // deep carved cracks across the stone
        const cr = ridged(x / 6.5, y / 6.5, 4, 33);
        if (cr > 0.74) { const k = sstep(0.74, 0.95, cr); r = lerp(r, 12, k * 0.85); g = lerp(g, 14, k * 0.85); b = lerp(b, 14, k * 0.85); }
        // edge ambient occlusion + outer rim line
        const ao = sstep(0.0, 0.5, prox);
        r *= 0.55 + 0.45 * ao; g *= 0.55 + 0.45 * ao; b *= 0.55 + 0.45 * ao;
        if (prox < 0.06) { r *= 0.5; g *= 0.5; b *= 0.55; }
        // moss clinging to the edges
        if (prox < 0.4) {
          const mo = fbm(x / 5, y / 5, 3, 44);
          if (mo > 0.52) { const k = sstep(0.52, 0.8, mo) * (1 - prox / 0.4); r = lerp(r, 46, k); g = lerp(g, 74, k); b = lerp(b, 40, k); addLight(p, k * 3, k * 9, k * 4); }
        }
        setPx(p, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
        // living green veins crawling along the trail
        const vn = ridged(x / 8.5, y / 9, 4, 47);
        if (vn > 0.80) {
          const k = sstep(0.80, 0.96, vn);
          const o = p * 4; px[o] = clamp(px[o] + k * 14, 0, 255); px[o + 1] = clamp(px[o + 1] + k * 50, 0, 255); px[o + 2] = clamp(px[o + 2] + k * 26, 0, 255);
          addLight(p, k * 12, k * 52, k * 28);
        }
      }
      // engraved serpent runes down the centre of the trail
      for (let i = 14; i < centre.length - 8; i += 30) {
        const c = centre[i];
        carveRune(Math.round(c[0]), Math.round(c[1]), i);
      }
    }
    function carveRune(cx, cy, seed) {
      const seg = 26, r = 5.5;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const rr = r * (0.55 + 0.45 * Math.sin(a * 3 + seed));
        const X = Math.round(cx + Math.cos(a) * rr), Y = Math.round(cy + Math.sin(a) * rr * 0.8);
        if (X < 1 || X >= W - 1 || Y < 1 || Y >= H - 1) continue;
        const p = idx(X, Y); if (!pathSolid[p]) continue;
        const o = p * 4; px[o] = clamp(px[o] - 18, 0, 255); px[o + 1] = clamp(px[o + 1] + 6, 0, 255); px[o + 2] = clamp(px[o + 2] - 6, 0, 255);
        addLight(p, 2, 9, 5);
      }
    }

    // ---------------------------------------------------------------- 5. BOSS
    const bx = BOSS[0] * W, by = BOSS[1] * H;
    const bossEyes = []; // filled during build
    function paintBoss() {
      // ritual arena ring beneath her
      for (let a = 0; a < 360; a += 1) {
        const rad = a * Math.PI / 180;
        for (const R of [58, 50]) {
          const X = Math.round(bx + Math.cos(rad) * R), Y = Math.round(by + Math.sin(rad) * R * 0.9);
          if (X < 0 || X >= W || Y < 0 || Y >= H) continue;
          const p = idx(X, Y), o = p * 4;
          px[o] = clamp(px[o] + 6, 0, 255); px[o + 1] = clamp(px[o + 1] + 22, 0, 255); px[o + 2] = clamp(px[o + 2] + 12, 0, 255);
          addLight(p, 2, 9, 5);
        }
      }
      // dark aura base
      for (let y = 0; y < H; y++) for (let x = bx - 90 | 0; x < W; x++) {
        if (x < 0) continue; const d = Math.hypot(x - bx, (y - by) * 1.05);
        if (d < 78) { const k = sstep(78, 30, d); const p = idx(x, y); addLight(p, k * 8, k * 30, k * 16); }
      }

      // coiled body — three stacked spiral loops (top-down)
      const bodyCov = coverage((s) => {
        s.lineCap = 'round'; s.lineJoin = 'round';
        // spiral
        s.lineWidth = 13;
        s.beginPath();
        for (let i = 0; i <= 120; i++) {
          const a = i / 120 * Math.PI * 4.4;
          const rr = 44 - i / 120 * 30;
          const X = bx + Math.cos(a) * rr, Y = by + Math.sin(a) * rr * 0.86 + 6;
          if (i === 0) s.moveTo(X, Y); else s.lineTo(X, Y);
        }
        s.stroke();
      });
      // hood (flared cobra hood) behind head
      const hoodCov = coverage((s) => {
        s.translate(bx, by - 6);
        s.beginPath();
        s.moveTo(0, -34);
        s.bezierCurveTo(40, -30, 40, 18, 12, 24);
        s.bezierCurveTo(6, 30, -6, 30, -12, 24);
        s.bezierCurveTo(-40, 18, -40, -30, 0, -34);
        s.fill();
      });
      const headCov = coverage((s) => {
        s.translate(bx, by - 8);
        s.beginPath();
        s.moveTo(0, -20); s.lineTo(11, -2); s.lineTo(7, 16); s.lineTo(-7, 16); s.lineTo(-11, -2); s.closePath(); s.fill();
      });

      const scaleHi = [70, 150, 90], scaleLo = [16, 40, 26], hoodHi = [90, 170, 110], hoodLo = [20, 46, 30];
      for (let y = 0; y < H; y++) for (let x = bx - 70 | 0; x < W; x++) {
        if (x < 0) continue; const p = idx(x, y);
        const hood = hoodCov[p], body = bodyCov[p], head = headCov[p];
        if (head > 0.5) {
          const sc = fbm(x / 3, y / 3, 3, 71);
          const dxh = (x - bx) / 11, dyh = (y - (by - 8)) / 18;
          const dome = clamp(1 - (dxh * dxh + dyh * dyh), 0, 1);
          let r = lerp(scaleLo[0], scaleHi[0], sc * 0.6 + dome * 0.5);
          let g = lerp(scaleLo[1], scaleHi[1], sc * 0.6 + dome * 0.5);
          let b = lerp(scaleLo[2], scaleHi[2], sc * 0.6 + dome * 0.5);
          setPx(p, r, g, b);
        } else if (hood > 0.5) {
          const sc = fbm(x / 3.4, y / 3.4, 3, 72);
          const lx = (x - bx) / 40; // ridge highlight near centre spine
          const spine = clamp(1 - Math.abs(lx) * 3.2, 0, 1);
          let r = lerp(hoodLo[0], hoodHi[0], sc * 0.55 + spine * 0.5);
          let g = lerp(hoodLo[1], hoodHi[1], sc * 0.55 + spine * 0.5);
          let b = lerp(hoodLo[2], hoodHi[2], sc * 0.55 + spine * 0.5);
          // dark rim of hood
          if (hood < 0.75) { r *= 0.5; g *= 0.5; b *= 0.55; }
          setPx(p, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
        } else if (body > 0.5) {
          const sc = fbm(x / 3, y / 3, 3, 73);
          const band = Math.sin((x + y) * 0.7) * 0.5 + 0.5; // scale banding
          let r = lerp(scaleLo[0], scaleHi[0], sc * 0.5 + band * 0.35);
          let g = lerp(scaleLo[1], scaleHi[1], sc * 0.5 + band * 0.35);
          let b = lerp(scaleLo[2], scaleHi[2], sc * 0.5 + band * 0.35);
          if (body < 0.72) { r *= 0.5; g *= 0.5; b *= 0.55; } // coil shadow
          setPx(p, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
          const vn = ridged(x / 5, y / 5, 3, 74);
          if (vn > 0.8) { const k = sstep(0.8, 0.96, vn); const o = p * 4; px[o + 1] = clamp(px[o + 1] + k * 40, 0, 255); addLight(p, k * 6, k * 30, k * 16); }
        }
      }
      // hood "spectacle" glyph (faint glowing markings)
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * Math.PI * 2;
        for (const off of [-14, 14]) {
          const X = Math.round(bx + off + Math.cos(a) * 6), Y = Math.round(by - 8 + Math.sin(a) * 6);
          const p = idx(clamp(X, 0, W - 1), clamp(Y, 0, H - 1)); addLight(p, 4, 16, 9);
          const o = p * 4; px[o + 1] = clamp(px[o + 1] + 14, 0, 255);
        }
      }
      // record eye centres for animated glow
      bossEyes.length = 0;
      bossEyes.push({ x: bx - 4, y: by - 14 }, { x: bx + 4, y: by - 14 });
      // fang hint
      for (const fx of [-3, 3]) for (let i = 0; i < 3; i++) { const p = idx(clamp(bx + fx, 0, W - 1), clamp(by + 6 + i, 0, H - 1)); setPx(p, 210, 220, 200); }
    }

    // ---------------------------------------------------------------- 6. FOG
    function paintFog() {
      const blobs = [
        { x: 0.5 * W, y: 0.66 * H, r: 60 }, { x: 0.27 * W, y: 0.40 * H, r: 52 },
        { x: 0.66 * W, y: 0.50 * H, r: 46 }, { x: 0.42 * W, y: 0.83 * H, r: 44 },
      ];
      for (const f of blobs) for (let y = f.y - f.r | 0; y < f.y + f.r; y++) for (let x = f.x - f.r | 0; x < f.x + f.r; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const d = Math.hypot(x - f.x, y - f.y); if (d > f.r) continue;
        const n = fbm(x / 14, y / 14, 3, 80);
        const k = sstep(f.r, f.r * 0.3, d) * n * 0.5;
        const p = idx(x, y), o = p * 4;
        px[o] = clamp(px[o] + k * 14, 0, 255); px[o + 1] = clamp(px[o + 1] + k * 22, 0, 255); px[o + 2] = clamp(px[o + 2] + k * 18, 0, 255);
      }
    }

    // ---------------------------------------------------------------- composite
    function composite() {
      const gR = boxBlur(LR, 3), gG = boxBlur(LG, 3), gB = boxBlur(LB, 3);
      const gR2 = boxBlur(LR, 7), gG2 = boxBlur(LG, 7), gB2 = boxBlur(LB, 7);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = idx(x, y), o = p * 4;
        let lr = gR[p] + gR2[p] * 0.5, lg = gG[p] + gG2[p] * 0.5, lb = gB[p] + gB2[p] * 0.5;
        // screen blend the bloom over the base
        px[o] = 255 - (255 - px[o]) * (255 - clamp(lr, 0, 255)) / 255;
        px[o + 1] = 255 - (255 - px[o + 1]) * (255 - clamp(lg, 0, 255)) / 255;
        px[o + 2] = 255 - (255 - px[o + 2]) * (255 - clamp(lb, 0, 255)) / 255;
        // green ambient grade + vignette (boss corner kept bright)
        const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
        let vig = 1 - (dx * dx + dy * dy) * 0.42;
        const toBoss = 1 - clamp(Math.hypot(x - bx, y - by) / 150, 0, 1);
        vig = clamp(vig + toBoss * 0.18, 0.42, 1.08);
        px[o] = clamp(px[o] * vig * 0.97, 0, 255);
        px[o + 1] = clamp(px[o + 1] * vig * 1.0 + 2, 0, 255);
        px[o + 2] = clamp(px[o + 2] * vig * 0.98, 0, 255);
      }
      bctx.putImageData(img, 0, 0);
    }

    // motes (cyan floating creatures) — animated
    const motes = [];
    for (let i = 0; i < 46; i++) {
      const right = i % 3 !== 0;
      motes.push({ x: (right ? 0.5 + Math.random() * 0.5 : Math.random()) * W, y: Math.random() * H, r: 0.7 + Math.random() * 1.4, ph: Math.random() * 6.28, sp: 0.1 + Math.random() * 0.25, cyan: right });
    }

    function buildStatic() {
      paintFloor();
      paintLava(); paintCyanPools();
      paintCarvings(); paintMushrooms(); paintTufts();
      paintPath();
      paintBoss();
      paintFog();
      composite();
    }

    function glowSprite(cx, cy, r, rr, gg, bb, a) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${rr},${gg},${bb},${a})`);
      g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
    }

    function frame(time) {
      const t = time / 1000;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(base, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      // lava flicker
      for (const p of lavaPools) { const fl = 0.6 + 0.4 * Math.sin(t * 2 + p.x); glowSprite(p.x, p.y, p.rx * 1.7, 255, 120, 30, 0.12 * fl); }
      // cyan pool shimmer
      for (const p of cyanPools) { const fl = 0.6 + 0.4 * Math.sin(t * 1.3 + p.y); glowSprite(p.x, p.y, p.rx * 1.6, 60, 220, 220, 0.10 * fl); }
      // boss aura pulse + eyes
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
      glowSprite(bx, by, 70, 30, 200, 120, 0.10 + 0.06 * pulse);
      for (const e of bossEyes) glowSprite(e.x, e.y, 6, 150, 255, 120, 0.6 + 0.4 * pulse);
      // forked tongue flick
      const flick = Math.sin(t * 3.2);
      if (flick > 0.4) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#d83a4a'; ctx.lineWidth = 1;
        const ty = by + 16 + (flick - 0.4) * 12;
        ctx.beginPath(); ctx.moveTo(bx, by + 14); ctx.lineTo(bx, ty);
        ctx.moveTo(bx, ty); ctx.lineTo(bx - 2, ty + 3); ctx.moveTo(bx, ty); ctx.lineTo(bx + 2, ty + 3); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
      }
      // floating motes
      for (const m of motes) {
        const mx = (m.x + Math.sin(t * m.sp + m.ph) * 6);
        const my = (m.y + t * m.sp * 4 + Math.cos(t * m.sp * 1.3 + m.ph) * 4) % (H + 8);
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + m.ph);
        if (m.cyan) glowSprite(mx, my, 3 + m.r, 70, 230, 230, 0.10 + 0.14 * tw);
        else glowSprite(mx, my, 3 + m.r, 150, 90, 220, 0.06 + 0.10 * tw);
        ctx.fillStyle = m.cyan ? `rgba(160,255,255,${0.5 + 0.5 * tw})` : `rgba(200,150,255,${0.4 + 0.4 * tw})`;
        ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(frame);
    }

  return {
    // paint the static scene to the display canvas synchronously, THEN start the
    // animation loop — so the map is visible even when rAF is throttled/paused.
    build() { buildStatic(); ctx.drawImage(base, 0, 0); frame(performance.now()); },
    nodeAnchors: nodePositions, nodes: NODES, boss: BOSS, W, H,
  };
}
