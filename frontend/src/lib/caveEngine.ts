// caveEngine.ts — Cave terrain renderer (Caminho da Serpente)

export const TILE = 8;
export const SCALE = 4;
export const COLS = 56;
export const ROWS = 42;
export const TPX = TILE * SCALE;
export const WORLD_W = COLS * TPX;
export const WORLD_H = ROWS * TPX;
const SW = COLS * TILE;
const SH = ROWS * TILE;

// ── Biome zones — idênticos ao HTML original ─────────────────────────────────
const ZONES = [
  { z: 'entrance', c: 8,  r: 37, col: [184, 132, 63]  as [number,number,number] },
  { z: 'entrance', c: 20, r: 35, col: [184, 132, 63]  as [number,number,number] },
  { z: 'crystal',  c: 40, r: 30, col: [70, 199, 255]  as [number,number,number] },
  { z: 'crystal',  c: 31, r: 23, col: [70, 199, 255]  as [number,number,number] },
  { z: 'crystal',  c: 47, r: 25, col: [70, 199, 255]  as [number,number,number] },
  { z: 'fungal',   c: 19, r: 20, col: [157, 107, 255] as [number,number,number] },
  { z: 'fungal',   c: 12, r: 14, col: [157, 107, 255] as [number,number,number] },
  { z: 'fungal',   c: 24, r: 13, col: [157, 107, 255] as [number,number,number] },
  { z: 'lava',     c: 34, r: 9,  col: [224, 133, 47]  as [number,number,number] },
  { z: 'lava',     c: 44, r: 9,  col: [224, 133, 47]  as [number,number,number] },
  { z: 'lava',     c: 50, r: 5,  col: [224, 133, 47]  as [number,number,number] },
  { z: 'summit',   c: 49, r: 5,  col: [200, 180, 80]  as [number,number,number] },
  { z: 'summit',   c: 46, r: 4,  col: [220, 200, 100] as [number,number,number] },
];

// Pools idênticos ao HTML original
export const CAVE_POOLS = [
  { c: 7,  r: 31, rad: 3.2, kind: 'water' },
  { c: 14, r: 39, rad: 2.6, kind: 'water' },
  { c: 46, r: 13, rad: 3.0, kind: 'lava'  },
  { c: 52, r: 8,  rad: 2.4, kind: 'lava'  },
  { c: 38, r: 6,  rad: 2.6, kind: 'lava'  },
];

export const CAVE_ZONE_COLORS: Record<string, string> = {
  entrance: '#2a2218', crystal: '#16283a', fungal: '#241a35', lava: '#321c14', summit: '#201e08',
};

export const CAVE_NODE_THEME: Record<string, { plat: string; frame: string }> = {
  entrance: { plat: '#2c2620', frame: '#b8843f' },
  crystal:  { plat: '#1f2a3a', frame: '#46c7ff' },
  fungal:   { plat: '#2a1f3a', frame: '#9d6bff' },
  lava:     { plat: '#3a201a', frame: '#e0852f' },
  summit:   { plat: '#252210', frame: '#d4c060' },
};

export const CAVE_BIOME_LABEL: Record<string, string> = {
  entrance: 'Setor · Gruta da Entrada',
  crystal:  'Setor · Galeria de Cristais',
  fungal:   'Setor · Câmara Fúngica',
  lava:     'Setor · Covil de Lava',
  summit:   'Setor · Cume da Serpente',
};

// 18 nós — COLS=56 ROWS=42 IDÊNTICO ao original
// Boss em [49,5] igual ao HTML de referência
// Nós extras usam as rows 38-40 que antes ficavam vazias na entrada
export const CAVE_STATIC_NODES: Array<{
  id: string; icon: string; tile: [number, number]; biome: string; boss?: boolean; project?: boolean;
}> = [
  { id: 'vars',    icon: '🦎', tile: [6,  40] as [number,number], biome: 'entrance' },
  { id: 'types',   icon: '🐢', tile: [16, 39] as [number,number], biome: 'entrance' },
  { id: 'strings', icon: '🦎', tile: [26, 38] as [number,number], biome: 'entrance' },
  { id: 'lists',   icon: '🐊', tile: [36, 37] as [number,number], biome: 'entrance' },
  { id: 'dicts',   icon: '🐍', tile: [44, 34] as [number,number], biome: 'crystal'  },
  { id: 'flow',    icon: '🦎', tile: [48, 30] as [number,number], biome: 'crystal'  },
  { id: 'funcs',   icon: '🐉', tile: [42, 27] as [number,number], biome: 'crystal'  },
  { id: 'lambdas', icon: '🦎', tile: [32, 25] as [number,number], biome: 'crystal'  },
  { id: 'comp',    icon: '🐲', tile: [21, 24] as [number,number], biome: 'fungal'   },
  { id: 'oop',     icon: '🦕', tile: [11, 21] as [number,number], biome: 'fungal'   },
  { id: 'exc',     icon: '🦎', tile: [7,  18] as [number,number], biome: 'fungal'   },
  { id: 'files',   icon: '🐊', tile: [14, 15] as [number,number], biome: 'fungal'   },
  { id: 'mods',    icon: '🐊', tile: [26, 13] as [number,number], biome: 'lava'     },
  { id: 'iters',   icon: '🦖', tile: [33, 11] as [number,number], biome: 'lava'     },
  { id: 'regex',   icon: '🦎', tile: [39, 10] as [number,number], biome: 'lava'     },
  { id: 'tests',   icon: '🐍', tile: [45, 8]  as [number,number], biome: 'lava'     },
  { id: 'boss',    icon: '🐍', tile: [50, 6]  as [number,number], biome: 'lava',   boss: true    },
  // project posicionado acima do boss com espaçamento adequado para evitar sobreposição
  { id: 'project', icon: '⭐', tile: [50, 2]  as [number,number], biome: 'summit', project: true },
];

export const CAVE_EDGES: [number,number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],
  [9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17]
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function hash2(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash2(xi, yi),     tr = hash2(xi + 1, yi);
  const bl = hash2(xi, yi + 1), br = hash2(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (tl * (1 - u) + tr * u) * (1 - v) + (bl * (1 - u) + br * u) * v;
}

function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
function mix(a: number, b: number, t: number) { return a + (b - a) * t; }
function smooth(t: number) { return t * t * (3 - 2 * t); }

function zoneAt(c: number, r: number) {
  let best = 1e9, p = ZONES[0];
  for (const z of ZONES) {
    const d = Math.hypot(c - z.c, r - z.r);
    if (d < best) { best = d; p = z; }
  }
  return p;
}

function keyStr(c: number, r: number) { return `${c},${r}`; }

// ── Catmull-Rom serpent path ──────────────────────────────────────────────────
function crPoint(p0: {x:number,y:number}, p1: {x:number,y:number}, p2: {x:number,y:number}, p3: {x:number,y:number}, u: number) {
  const u2 = u * u, u3 = u2 * u;
  return {
    x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*u + (2*p0.x-5*p1.x+4*p2.x-p3.x)*u2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*u3),
    y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*u + (2*p0.y-5*p1.y+4*p2.y-p3.y)*u2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*u3),
  };
}

function buildSerpentPath(nodeTiles: [number,number][]) {
  const ctrPts = nodeTiles.map(([tc, tr]) => ({ x: (tc + 0.5) * TILE, y: (tr + 0.5) * TILE }));
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < ctrPts.length - 1; i++) {
    const p0 = ctrPts[i - 1] ?? ctrPts[i];
    const p1 = ctrPts[i];
    const p2 = ctrPts[i + 1];
    const p3 = ctrPts[i + 2] ?? ctrPts[i + 1];
    for (let s = 0; s < 26; s++) raw.push(crPoint(p0, p1, p2, p3, s / 26));
  }
  raw.push(ctrPts[ctrPts.length - 1]);

  const cum = [0];
  for (let i = 1; i < raw.length; i++)
    cum[i] = cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
  const TOTLEN = cum[cum.length - 1];
  const bodyR = 1.2 * TILE;
  const samples = raw.map((p, i) => ({ x: p.x, y: p.y, t: cum[i] / TOTLEN, r: bodyR }));

  const serpDist  = new Float32Array(SW * SH).fill(Infinity);
  const serpT     = new Float32Array(SW * SH);
  const serpR     = new Float32Array(SW * SH);
  const pathTiles = new Set<string>();

  for (const s of samples) {
    const rpx = s.r;
    const x0 = Math.max(0, Math.floor(s.x - rpx - 1));
    const x1 = Math.min(SW - 1, Math.ceil(s.x + rpx + 1));
    const y0 = Math.max(0, Math.floor(s.y - rpx - 1));
    const y1 = Math.min(SH - 1, Math.ceil(s.y + rpx + 1));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - s.x, dy = py + 0.5 - s.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= rpx) {
          const idx = py * SW + px;
          if (d < serpDist[idx]) { serpDist[idx] = d; serpT[idx] = s.t; serpR[idx] = rpx; }
          pathTiles.add(keyStr((px / TILE) | 0, (py / TILE) | 0));
        }
      }
    }
  }
  return { serpDist, serpT, serpR, pathTiles, TOTLEN };
}

// ── Sprites ───────────────────────────────────────────────────────────────────
const SPR_STAL    = ['..H..', '..H..', '.HHL.', '.HHL.', 'HHHLL', 'HHHLL'];
const SPR_CRYSTAL = ['..C..', '.CC.C', 'C.CCC', 'BCCCB', '.BBB.'];
const SPR_MUSH    = ['.MMM.', 'MMMMM', 'MM.MM', '..S..', '..S..'];
const SPR_BONE    = ['B...B', '.BBB.', 'BBBBB', '.B.B.'];
const SPR_ROCK    = ['..RRR..', '.RRHHR.', 'RRRRRRR', '.RRRRR.'];

function drawSprite(ctx: CanvasRenderingContext2D, map: string[], px: number, py: number, colors: Record<string,string>) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      const ch = map[r][c];
      if (ch === '.' || !colors[ch]) continue;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(px + c, py + r, 1, 1);
    }
  }
}

// ── Main render ───────────────────────────────────────────────────────────────
function paintRock(ctx: CanvasRenderingContext2D) {
  const dark = [12, 15, 21], midc = [28, 35, 47], lite = [46, 56, 73];
  const img = ctx.createImageData(SW, SH);
  const data = img.data;
  for (let py = 0; py < SH; py++) {
    for (let px = 0; px < SW; px++) {
      let n = vnoise(px / 13, py / 13) * 0.66 + vnoise(px / 32, py / 32) * 0.34;
      n += (hash2(px, py) - 0.5) * 0.05;
      let v = clamp(n, 0, 1);
      const depth = (px / SW) * 0.45 + (1 - py / SH) * 0.55;
      const crk = vnoise(px / 8 + 13, py / 8 + 71);
      const crack = Math.abs(crk - 0.5) < 0.017 ? 0.42 : 1;
      const t = smooth(v);
      let R = mix(dark[0], midc[0], t), G = mix(dark[1], midc[1], t), B = mix(dark[2], midc[2], t);
      if (v > 0.72) { const u = (v - 0.72) / 0.28; R = mix(R, lite[0], u); G = mix(G, lite[1], u); B = mix(B, lite[2], u); }
      const dk = (1 - depth * 0.30) * crack;
      R *= dk; G *= dk; B *= dk;
      const z = zoneAt(px / TILE, py / TILE);
      R += (z.col[0] - R) * 0.05; G += (z.col[1] - G) * 0.05; B += (z.col[2] - B) * 0.05;
      const i = (py * SW + px) * 4;
      data[i] = R | 0; data[i + 1] = G | 0; data[i + 2] = B | 0; data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawPools(ctx: CanvasRenderingContext2D) {
  for (const p of CAVE_POOLS) {
    const cx = (p.c + 0.5) * TILE, cy = (p.r + 0.5) * TILE, R = p.rad * TILE;
    const isLava = p.kind === 'lava';
    ctx.fillStyle = '#0a0d12';
    ctx.beginPath(); ctx.ellipse(cx, cy, R + 2, (R + 2) * 0.74, 0, 0, 7); ctx.fill();
    for (let yy = -R; yy <= R; yy++) {
      for (let xx = -R; xx <= R; xx++) {
        const e = (xx * xx) / (R * R) + (yy * yy) / ((R * 0.74) * (R * 0.74));
        if (e > 1) continue;
        const px = Math.round(cx + xx), py = Math.round(cy + yy);
        const rim = e > 0.78;
        const wv = vnoise(px / 3 + (isLava ? 0 : 9), py / 3);
        let col: string;
        if (isLava) { col = rim ? '#7a2a10' : (wv > 0.62 ? '#ffce6a' : wv > 0.4 ? '#ff7a1e' : '#d9450f'); }
        else { col = rim ? '#16323f' : (wv > 0.66 ? '#5fd0e6' : wv > 0.45 ? '#2f7fa0' : '#1b4d63'); }
        ctx.fillStyle = col; ctx.fillRect(px, py, 1, 1);
      }
    }
  }
}

function paintGlows(ctx: CanvasRenderingContext2D, lights: { x: number; y: number; rad: number; col: string }[]) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter' as GlobalCompositeOperation;
  for (const L of lights) {
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.rad);
    g.addColorStop(0, L.col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(L.x - L.rad, L.y - L.rad, L.rad * 2, L.rad * 2);
  }
  ctx.restore();
}

function paintSerpentPath(ctx: CanvasRenderingContext2D, serpDist: Float32Array, serpT: Float32Array, serpR: Float32Array, TOTLEN: number) {
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.26)';
  for (let i = 0; i < SW * SH; i++) {
    if (!isFinite(serpDist[i])) continue;
    const px = i % SW, py = (i / SW) | 0;
    const tx = px + 1, ty = py + 3;
    if (tx < SW && ty < SH) ctx.fillRect(tx, ty, 1, 1);
  }
  // flagstones
  for (let i = 0; i < SW * SH; i++) {
    const d = serpDist[i];
    if (!isFinite(d)) continue;
    const r = serpR[i], t = serpT[i], e = Math.min(1, d / r);
    const px = i % SW, py = (i / SW) | 0;
    const along = t * TOTLEN;
    let R, G, B;
    if (e > 0.80) { R = 20; G = 22; B = 28; }
    else {
      const groutf = ((along % 7) + 7) % 7;
      if (groutf < 0.9) { R = 34; G = 34; B = 40; }
      else {
        const idx = Math.floor(along / 7);
        const tone = (0.85 + hash2(idx, 3) * 0.3) * (0.62 + 0.38 * (1 - e * e));
        R = (152 * tone) | 0; G = (142 * tone) | 0; B = (122 * tone) | 0;
      }
    }
    ctx.fillStyle = `rgb(${R},${G},${B})`; ctx.fillRect(px, py, 1, 1);
  }
}

function buildDecoList(pathTiles: Set<string>, nearNode: (c:number,r:number)=>boolean) {
  const decoList: [string, number, number][] = [];
  const lights: { x: number; y: number; rad: number; col: string }[] = [];
  const inPool = (c: number, r: number) => CAVE_POOLS.some(p => Math.hypot(c - p.c, r - p.r) < p.rad + 0.6);

  for (let c = 1; c < COLS - 1; c++) {
    for (let r = 1; r < ROWS - 1; r++) {
      if (pathTiles.has(keyStr(c, r)) || nearNode(c, r) || inPool(c, r)) continue;
      const z = zoneAt(c, r).z;
      const h = hash2(c * 11, r * 13);
      if (z === 'entrance') {
        if (h > 0.86) decoList.push(['stal', c, r]);
        else if (h > 0.6 && h < 0.66) decoList.push(['rock', c, r]);
      } else if (z === 'crystal') {
        if (h > 0.91) { decoList.push(['crystal', c, r]); lights.push({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE, rad: 15, col: 'rgba(70,199,255,.30)' }); }
        else if (h > 0.7 && h < 0.75) decoList.push(['stal', c, r]);
      } else if (z === 'fungal') {
        if (h > 0.91) { decoList.push(['mush', c, r]); lights.push({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE, rad: 13, col: 'rgba(157,107,255,.24)' }); }
        else if (h > 0.6 && h < 0.65) decoList.push(['stal', c, r]);
      } else if (z === 'lava') {
        if (h > 0.85) decoList.push(['bone', c, r]);
        else if (h > 0.62 && h < 0.69) decoList.push(['rock', c, r]);
      } else if (z === 'summit') {
        if (h > 0.93) { decoList.push(['crystal', c, r]); lights.push({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE, rad: 14, col: 'rgba(200,180,80,.28)' }); }
        else if (h > 0.7 && h < 0.75) decoList.push(['stal', c, r]);
      }
    }
  }
  // pool lights
  for (const p of CAVE_POOLS) {
    const x = (p.c + 0.5) * TILE, y = (p.r + 0.5) * TILE;
    lights.push({ x, y, rad: p.rad * TILE + 10, col: p.kind === 'lava' ? 'rgba(255,120,30,.42)' : 'rgba(60,170,210,.28)' });
  }
  return { decoList, lights };
}

function drawDecoSprites(ctx: CanvasRenderingContext2D, decoList: [string, number, number][]) {
  for (const [type, c, r] of decoList) {
    const px = c * TILE, py = r * TILE;
    if (type === 'stal')    drawSprite(ctx, SPR_STAL,    px + 1, py + 1, { H: '#3a4356', L: '#222a38' });
    if (type === 'crystal') drawSprite(ctx, SPR_CRYSTAL, px + 1, py + 1, { C: '#9fe6ff', B: '#2f7fa0' });
    if (type === 'mush')    drawSprite(ctx, SPR_MUSH,    px + 1, py + 2, { M: '#b98cff', S: '#e7d8ff' });
    if (type === 'bone')    drawSprite(ctx, SPR_BONE,    px + 1, py + 2, { B: '#cfc6b0' });
    if (type === 'rock')    drawSprite(ctx, SPR_ROCK,    px + 1, py + 2, { R: '#2a3140', H: '#3a4356' });
  }
}

function drawNaja(ctx: CanvasRenderingContext2D, bossTile: [number,number]) {
  const cx = (bossTile[0] + 0.5) * TILE, cy = (bossTile[1] + 0.5) * TILE;
  const hoodW = 30, hoodH = 24;
  ctx.fillStyle = '#0c1a12';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, hoodW + 3, hoodH + 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1f4a2c';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, hoodW, hoodH, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2f6b3f';
  ctx.beginPath(); ctx.ellipse(cx, cy + 4, hoodW - 7, hoodH - 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#cbe6b0';
  ctx.beginPath(); ctx.ellipse(cx - 8, cy + 5, 4, 5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 8, cy + 5, 4, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#163a23';
  ctx.beginPath(); ctx.ellipse(cx - 8, cy + 6, 1.6, 2.4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 8, cy + 6, 1.6, 2.4, 0, 0, 7); ctx.fill();
  for (let k = 0; k < 46; k++) {
    const a = hash2(k, 7) * 6.283, rr = hash2(k, 9) * hoodW;
    const x = cx + Math.cos(a) * rr, y = cy + 2 + Math.sin(a) * rr * 0.78;
    if ((x - cx) ** 2 / hoodW ** 2 + (y - cy - 2) ** 2 / hoodH ** 2 < 0.92) {
      ctx.fillStyle = hash2(k, 11) > 0.5 ? '#163a23' : '#3a7a45';
      ctx.fillRect(x | 0, y | 0, 1, 1);
    }
  }
  drawSprite(ctx, SPR_BONE, (bossTile[0] - 4) * TILE, (bossTile[1] + 3) * TILE, { B: '#cfc6b0' });
  drawSprite(ctx, SPR_BONE, (bossTile[0] + 4) * TILE, (bossTile[1] + 4) * TILE, { B: '#bdb49e' });
}

// ── Public API ────────────────────────────────────────────────────────────────
export type CaveEngineState = {
  pathTiles: Set<string>;
  lights: { x: number; y: number; rad: number; col: string }[];
};

export function createCaveEngine(canvas: HTMLCanvasElement): CaveEngineState {
  const SW_px = SW, SH_px = SH;
  canvas.width  = SW_px;
  canvas.height = SH_px;
  canvas.style.width  = `${WORLD_W}px`;
  canvas.style.height = `${WORLD_H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // O projeto não entra na spline — o caminho termina no boss
  const pathNodeTiles = CAVE_STATIC_NODES.filter(n => !n.project).map(n => n.tile);
  const allNodeTiles  = CAVE_STATIC_NODES.map(n => n.tile);
  const { serpDist, serpT, serpR, pathTiles, TOTLEN } = buildSerpentPath(pathNodeTiles);
  const nearNode = (c: number, r: number) =>
    allNodeTiles.some(([nc, nr]) => Math.abs(nc - c) <= 1 && Math.abs(nr - r) <= 1);

  const { decoList, lights } = buildDecoList(pathTiles, nearNode);

  // Boss aura
  const bossNode = CAVE_STATIC_NODES.find(n => n.boss);
  if (bossNode) {
    lights.push({ x: (bossNode.tile[0] + 0.5) * TILE, y: (bossNode.tile[1] + 0.5) * TILE, rad: 48, col: 'rgba(255,110,30,.42)' });
  }

  // Project node golden aura
  const projectNode = CAVE_STATIC_NODES.find(n => n.project);
  if (projectNode) {
    lights.push({ x: (projectNode.tile[0] + 0.5) * TILE, y: (projectNode.tile[1] + 0.5) * TILE, rad: 60, col: 'rgba(220,200,80,.32)' });
  }

  paintRock(ctx);
  drawPools(ctx);
  paintGlows(ctx, lights);
  paintSerpentPath(ctx, serpDist, serpT, serpR, TOTLEN);
  drawDecoSprites(ctx, decoList);

  if (bossNode) drawNaja(ctx, bossNode.tile);

  return { pathTiles, lights };
}

// ── Minimap ───────────────────────────────────────────────────────────────────
export type CaveMiniNode = {
  tile: [number, number];
  status: string;
  isSelected?: boolean;
};

export function drawCaveMinimap(
  canvas: HTMLCanvasElement,
  pathTiles: Set<string>,
  nodes: CaveMiniNode[],
  scrollEl: HTMLElement | null
) {
  const MM_W = 120, MM_H = 86;
  canvas.width = MM_W; canvas.height = MM_H;
  const mctx = canvas.getContext('2d');
  if (!mctx) return;

  const sx = MM_W / COLS, sy = MM_H / ROWS;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      mctx.fillStyle = pathTiles.has(keyStr(c, r)) ? '#b8843f' : CAVE_ZONE_COLORS[zoneAt(c, r).z];
      mctx.fillRect(Math.floor(c * sx), Math.floor(r * sy), Math.ceil(sx), Math.ceil(sy));
    }
  }

  nodes.forEach(n => {
    const x = (n.tile[0] + 0.5) * sx, y = (n.tile[1] + 0.5) * sy;
    const col = n.isSelected ? '#f0c060'
      : n.status === 'EM_PROGRESSO' || n.status === 'DISPONIVEL' ? '#46c7ff'
      : n.status === 'CONCLUIDO' ? '#7ee787'
      : '#6e7681';
    if ((n as any).boss) {
      mctx.fillStyle = '#e0852f';
    } else if ((n as any).project) {
      mctx.fillStyle = '#d4c060';
    } else {
      mctx.fillStyle = col;
    }
    mctx.fillRect(Math.round(x - 1.5), Math.round(y - 1.5), 3, 3);
    if (n.isSelected) {
      mctx.strokeStyle = 'rgba(240,192,96,.6)';
      mctx.lineWidth = 1;
      mctx.strokeRect(Math.round(x - 3.5), Math.round(y - 3.5), 7, 7);
    }
  });

  if (scrollEl) {
    const vx = scrollEl.scrollLeft / WORLD_W * MM_W;
    const vy = scrollEl.scrollTop / WORLD_H * MM_H;
    const vw = scrollEl.clientWidth  / WORLD_W * MM_W;
    const vh = scrollEl.clientHeight / WORLD_H * MM_H;
    mctx.strokeStyle = 'rgba(230,237,243,.85)';
    mctx.lineWidth = 1;
    mctx.strokeRect(vx + 0.5, vy + 0.5, Math.min(vw, MM_W - 1), Math.min(vh, MM_H - 1));
  }
}

export function tileCenter(tile: [number, number]) {
  return { x: (tile[0] + 0.5) * TPX, y: (tile[1] + 0.5) * TPX };
}
