export const TILE = 8;
export const SCALE = 4;
export const COLS = 54;
export const ROWS = 38;
export const TPX = TILE * SCALE;
export const WORLD_W = COLS * TPX;
export const WORLD_H = ROWS * TPX;

export const PAL = {
  grass: { base: '#2c5e38', hi: '#3a7a45', lo: '#214a2c', ac: '#7ee787' },
  stone: { base: '#4b515a', hi: '#5c6571', lo: '#3a3f47', ac: '#79828d' },
  forest: { base: '#1f4a30', hi: '#2a6440', lo: '#163a25', ac: '#3fa05a' },
  mountain: { base: '#544f4b', hi: '#675f59', lo: '#3f3a37', ac: '#8a827b' },
  snow: { base: '#aab4bf', hi: '#d2dae2', lo: '#828d99', ac: '#ffffff' },
  cave: { base: '#221b2e', hi: '#2f2643', lo: '#150f1e', ac: '#e06c75' },
  water: { base: '#1f4e6b', hi: '#2f739a', lo: '#163a52', ac: '#58a6ff' },
  path: { base: '#a98f60', hi: '#c9b079', lo: '#806842', ac: '#e6d2a3' },
} as const;

export type BiomeKey = keyof typeof PAL;

export const MM_BIOME: Record<string, string> = {
  grass: '#2c5e38', stone: '#4b515a', forest: '#1f4a30', mountain: '#544f4b',
  snow: '#aab4bf', cave: '#221b2e', water: '#1f4e6b', path: '#a98f60',
};

export const ZONES = [
  { b: 'grass', c: 6, r: 31 }, { b: 'grass', c: 14, r: 27 }, { b: 'grass', c: 9, r: 21 }, { b: 'grass', c: 3, r: 34 },
  { b: 'stone', c: 21, r: 26 }, { b: 'stone', c: 18, r: 31 },
  { b: 'forest', c: 29, r: 20 }, { b: 'forest', c: 37, r: 15 }, { b: 'forest', c: 33, r: 26 },
  { b: 'mountain', c: 43, r: 12 }, { b: 'mountain', c: 45, r: 19 },
  { b: 'cave', c: 48, r: 6 }, { b: 'cave', c: 51, r: 11 },
];

export const LAKE = { c: 5, r: 16, rad: 3.6 };

export const HTML_DECO = [
  { type: 'torch' as const, tile: [25, 24] as [number, number] },
  { type: 'torch' as const, tile: [31, 17] as [number, number] },
  { type: 'torch' as const, tile: [44, 9] as [number, number] },
  { type: 'torch' as const, tile: [46, 8] as [number, number] },
  { type: 'torch' as const, tile: [39, 18] as [number, number] },
  { type: 'flag' as const, tile: [8, 30] as [number, number] },
  { type: 'flag' as const, tile: [19, 25] as [number, number] },
];

const SPR_TREE = ['..FFF..', '.FFFFF.', 'FFFFFFF', 'FFFFFFF', 'FFOFFOF', '.FFFFF.', '..FFF..', '...T...', '...T...'];
const SPR_PINE = ['...G...', '..GGG..', '.GGGGG.', '...G...', '..GGG..', '.GGGGG.', 'GGGGGGG', '...T...'];
const SPR_ROCK = ['..RRR..', '.RRHHR.', 'RRRRRRR', '.RRRRR.'];
const SPR_FLOWER = ['.A.', 'AYA', '.G.'];

function hash2(x: number, y: number) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function key(c: number, r: number) {
  return `${c},${r}`;
}

export function buildBiomeGrid(): string[][] {
  const grid: string[][] = [];
  for (let c = 0; c < COLS; c++) {
    grid[c] = [];
    for (let r = 0; r < ROWS; r++) {
      const dl = Math.hypot(c - LAKE.c, r - LAKE.r) + (hash2(c, r) - 0.5) * 1.6;
      if (dl < LAKE.rad) {
        grid[c][r] = 'water';
        continue;
      }
      let best = 1e9;
      let pick = 'grass';
      for (const z of ZONES) {
        let d = Math.hypot(c - z.c, r - z.r);
        d += (hash2(c * 3 + z.c, r * 3 + z.r) - 0.5) * 5.0;
        if (d < best) {
          best = d;
          pick = z.b;
        }
      }
      if (pick === 'mountain' && r <= 9 && hash2(c, r) > 0.25) pick = 'snow';
      grid[c][r] = pick;
    }
  }
  return grid;
}

export function buildPathSet(nodeTiles: [number, number][], edges: [number, number][]) {
  const pathSet = new Set<string>();
  const markPath = (a: [number, number], b: [number, number]) => {
    const [ax, ay] = a;
    const [bx, by] = b;
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4 + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = ax + (bx - ax) * t;
      const cy = ay + (by - ay) * t;
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const tc = Math.round(cx + dc);
          const tr = Math.round(cy + dr);
          if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) continue;
          if (Math.hypot(cx - tc, cy - tr) < 1.15) pathSet.add(key(tc, tr));
        }
      }
    }
  };
  edges.forEach(([ai, bi]) => markPath(nodeTiles[ai], nodeTiles[bi]));
  return pathSet;
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  map: string[],
  px: number,
  py: number,
  colors: Record<string, string>
) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      const ch = map[r][c];
      if (ch === '.' || !colors[ch]) continue;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(px + c, py + r, 1, 1);
    }
  }
}

export type MapEngineState = {
  biome: string[][];
  pathSet: Set<string>;
  waterTiles: [number, number][];
  paintWaterTile: (c: number, r: number, frame: number) => void;
};

export function createMapEngine(
  canvas: HTMLCanvasElement,
  nodeTiles: [number, number][],
  edges: [number, number][]
): MapEngineState {
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  canvas.style.width = `${WORLD_W}px`;
  canvas.style.height = `${WORLD_H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const biome = buildBiomeGrid();
  const pathSet = buildPathSet(nodeTiles, edges);
  const waterTiles: [number, number][] = [];

  const paintWaterTile = (c: number, r: number, frame: number) => {
    const x = c * TILE;
    const y = r * TILE;
    const pal = PAL.water;
    ctx.fillStyle = pal.base;
    ctx.fillRect(x, y, TILE, TILE);
    for (let yy = 0; yy < TILE; yy++) {
      for (let xx = 0; xx < TILE; xx++) {
        const wv = Math.sin((xx + yy * 1.7 + frame * 2 + c * 3 + r * 2) * 0.9);
        if (wv > 0.75) {
          ctx.fillStyle = pal.hi;
          ctx.fillRect(x + xx, y + yy, 1, 1);
        } else if (wv < -0.85 && hash2(c + xx, r + yy + frame) > 0.7) {
          ctx.fillStyle = pal.ac;
          ctx.fillRect(x + xx, y + yy, 1, 1);
        }
      }
    }
  };

  const paintTile = (c: number, r: number) => {
    const x = c * TILE;
    const y = r * TILE;
    const isPath = pathSet.has(key(c, r));
    const b = biome[c][r];
    const pal = isPath ? PAL.path : (PAL[b as BiomeKey] ?? PAL.grass);

    ctx.fillStyle = pal.base;
    ctx.fillRect(x, y, TILE, TILE);

    const rng = (i: number) => hash2(c * 7 + i * 13, r * 7 + i * 29);
    if (isPath) {
      for (let i = 0; i < 7; i++) {
        const v = rng(i);
        const px = x + ((rng(i + 40) * TILE) | 0);
        const py = y + ((rng(i + 80) * TILE) | 0);
        ctx.fillStyle = v > 0.6 ? pal.hi : v < 0.25 ? pal.lo : pal.ac;
        ctx.fillRect(px, py, 1, 1);
      }
    } else if (b === 'water') {
      paintWaterTile(c, r, 0);
      return;
    } else {
      const n = b === 'forest' || b === 'cave' ? 5 : 6;
      for (let i = 0; i < n; i++) {
        const v = rng(i);
        const px = x + ((rng(i + 40) * TILE) | 0);
        const py = y + ((rng(i + 80) * TILE) | 0);
        ctx.fillStyle = v > 0.66 ? pal.hi : v < 0.30 ? pal.lo : v > 0.6 ? pal.ac : pal.hi;
        ctx.fillRect(px, py, 1, 1);
      }
      if (b === 'cave' && hash2(c + 5, r + 9) > 0.86) {
        ctx.fillStyle = PAL.cave.ac;
        ctx.fillRect(x + (hash2(c, r) * 6 | 0), y + (hash2(r, c) * 6 | 0), 1, 1);
      }
      if (b === 'snow') {
        ctx.fillStyle = PAL.snow.hi;
        ctx.fillRect(x + 2, y + 2, 2, 1);
      }
    }
  };

  const nearNode = (c: number, r: number) =>
    nodeTiles.some(([nc, nr]) => Math.abs(nc - c) <= 1 && Math.abs(nr - r) <= 1);

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      paintTile(c, r);
      if (biome[c][r] === 'water') waterTiles.push([c, r]);
    }
  }

  const decoList: [string, number, number][] = [];
  for (let c = 1; c < COLS - 1; c++) {
    for (let r = 1; r < ROWS - 1; r++) {
      if (pathSet.has(key(c, r)) || nearNode(c, r)) continue;
      const b = biome[c][r];
      const h = hash2(c * 11, r * 13);
      if (b === 'forest' && h > 0.55) decoList.push(['tree', c, r]);
      else if (b === 'grass' && h > 0.9) decoList.push(['tree', c, r]);
      else if (b === 'grass' && h > 0.78 && h < 0.83) decoList.push(['flower', c, r]);
      else if (b === 'mountain' && h > 0.7) decoList.push(['pine', c, r]);
      else if (b === 'snow' && h > 0.78) decoList.push(['pine', c, r]);
      else if (b === 'stone' && h > 0.8) decoList.push(['rock', c, r]);
      else if ((b === 'cave' || b === 'mountain') && h > 0.62 && h < 0.7) decoList.push(['rock', c, r]);
    }
  }

  for (const [type, c, r] of decoList) {
    const px = c * TILE;
    const py = r * TILE;
    if (type === 'tree') {
      const isGrass = biome[c][r] === 'grass';
      drawSprite(ctx, SPR_TREE, px, py - 2, {
        F: isGrass ? '#3a7a45' : '#27623b',
        O: isGrass ? '#7ee787' : '#3fa05a',
        T: '#5a3f22',
      });
    } else if (type === 'pine') {
      drawSprite(ctx, SPR_PINE, px, py - 1, {
        G: biome[c][r] === 'snow' ? '#3a6b4a' : '#2f5a3c',
        T: '#4a3119',
      });
    } else if (type === 'rock') {
      drawSprite(ctx, SPR_ROCK, px + 1, py + 1, { R: '#5c6571', H: '#79828d' });
    } else if (type === 'flower') {
      const col = hash2(c, r) > 0.5 ? '#f0c060' : '#58a6ff';
      drawSprite(ctx, SPR_FLOWER, px + 2, py + 2, { A: col, Y: '#ffe39b', G: '#3a7a45' });
    }
  }

  const bossTile = nodeTiles[nodeTiles.length - 1];
  if (bossTile) {
    const bx = bossTile[0] * TILE;
    const by = bossTile[1] * TILE;
    ctx.fillStyle = '#0b0810';
    ctx.fillRect(bx - 6, by - 2, 18, 12);
    ctx.fillStyle = '#150f1e';
    ctx.fillRect(bx - 8, by + 8, 22, 4);
    drawSprite(ctx, SPR_ROCK, bx - 9, by + 6, { R: '#2f2643', H: '#3f3454' });
    drawSprite(ctx, SPR_ROCK, bx + 9, by + 6, { R: '#2f2643', H: '#3f3454' });
  }

  return { biome, pathSet, waterTiles, paintWaterTile };
}

export type MinimapNode = {
  tile: [number, number];
  status: string;
  isSelected?: boolean;
};

export function drawMinimap(
  canvas: HTMLCanvasElement,
  biome: string[][],
  pathSet: Set<string>,
  nodes: MinimapNode[],
  scrollEl: HTMLElement | null
) {
  const MM_W = 120;
  const MM_H = 80;
  canvas.width = MM_W;
  canvas.height = MM_H;
  const mctx = canvas.getContext('2d');
  if (!mctx) return;

  const sx = MM_W / COLS;
  const sy = MM_H / ROWS;

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const b = pathSet.has(key(c, r)) ? 'path' : biome[c][r];
      mctx.fillStyle = MM_BIOME[b] ?? '#2c5e38';
      mctx.fillRect(Math.floor(c * sx), Math.floor(r * sy), Math.ceil(sx), Math.ceil(sy));
    }
  }

  nodes.forEach(n => {
    const x = (n.tile[0] + 0.5) * sx;
    const y = (n.tile[1] + 0.5) * sy;
    const color =
      n.isSelected ? '#f0c060'
      : n.status === 'EM_PROGRESSO' ? '#58a6ff'
      : n.status === 'CONCLUIDO' ? '#7ee787'
      : n.status === 'DISPONIVEL' ? '#58a6ff'
      : '#6e7681';
    mctx.fillStyle = color;
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
    const vw = scrollEl.clientWidth / WORLD_W * MM_W;
    const vh = scrollEl.clientHeight / WORLD_H * MM_H;
    mctx.strokeStyle = 'rgba(230,237,243,.85)';
    mctx.lineWidth = 1;
    mctx.strokeRect(vx + 0.5, vy + 0.5, Math.min(vw, MM_W - 1), Math.min(vh, MM_H - 1));
  }
}

export function tileCenter(tile: [number, number]) {
  return { x: (tile[0] + 0.5) * TPX, y: (tile[1] + 0.5) * TPX };
}
