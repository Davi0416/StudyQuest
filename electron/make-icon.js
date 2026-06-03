/**
 * make-icon.js — gera o ícone do StudyQuest como PNG via Electron renderer
 * Uso: npx electron make-icon.js
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs   = require('fs')

const ICON_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:512px; height:512px; overflow:hidden; background:transparent; }
  canvas { display:block; }
</style>
</head>
<body>
<canvas id="c" width="512" height="512"></canvas>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');
const S = 512;

// ── Background squircle ──────────────────────────────────────────────────────
function squirclePath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const rad = S * 0.23;

// Clip to squircle
squirclePath(0, 0, S, S, rad);
ctx.save();
ctx.clip();

// Background gradient
const bg = ctx.createLinearGradient(0, 0, S * 0.5, S);
bg.addColorStop(0,   '#1c2330');
bg.addColorStop(0.55,'#11161e');
bg.addColorStop(1,   '#0c1016');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, S, S);

// Gold top-glow
const g1 = ctx.createRadialGradient(S/2, -20, 0, S/2, -20, S * 0.7);
g1.addColorStop(0,   'rgba(240,192,96,.22)');
g1.addColorStop(1,   'rgba(240,192,96,0)');
ctx.fillStyle = g1;
ctx.fillRect(0, 0, S, S);

// Blue bottom-right glow
const g2 = ctx.createRadialGradient(S * 0.9, S * 1.05, 0, S * 0.9, S * 1.05, S * 0.65);
g2.addColorStop(0,   'rgba(88,166,255,.12)');
g2.addColorStop(1,   'rgba(88,166,255,0)');
ctx.fillStyle = g2;
ctx.fillRect(0, 0, S, S);

// Top-edge sheen
const sheen = ctx.createLinearGradient(0, 0, 0, S * 0.25);
sheen.addColorStop(0,   'rgba(255,255,255,.09)');
sheen.addColorStop(1,   'rgba(255,255,255,0)');
ctx.fillStyle = sheen;
ctx.fillRect(0, 0, S, S);

ctx.restore();

// ── Symbol (sword) ────────────────────────────────────────────────────────────
// Scale factor (62% of icon)
const sym = S * 0.62;
const ox  = (S - sym) / 2;
const oy  = (S - sym) / 2;
const sc  = sym / 100; // coords in 0-100 space

// Gold gradient for symbol
const goldGrad = ctx.createLinearGradient(0, oy, 0, oy + sym);
goldGrad.addColorStop(0,   '#ffe39b');
goldGrad.addColorStop(0.4, '#f0c060');
goldGrad.addColorStop(1,   '#c8963c');

ctx.save();
ctx.translate(ox, oy);
ctx.scale(sc, sc);

// Sword blade (vertical, top to bottom)
// Blade: thin rectangle with a pointed tip at top
ctx.fillStyle = goldGrad;

// Main blade
ctx.beginPath();
ctx.moveTo(50, 5);       // tip
ctx.lineTo(53.5, 60);    // right shoulder of blade
ctx.lineTo(51.5, 60);
ctx.lineTo(51.5, 80);    // grip area
ctx.lineTo(48.5, 80);
ctx.lineTo(48.5, 60);
ctx.lineTo(46.5, 60);    // left shoulder
ctx.closePath();
ctx.fill();

// Blade shine
ctx.fillStyle = 'rgba(255,255,255,.22)';
ctx.beginPath();
ctx.moveTo(50, 6);
ctx.lineTo(52, 58);
ctx.lineTo(50, 58);
ctx.closePath();
ctx.fill();

// Crossguard
const guardGrad = ctx.createLinearGradient(28, 62, 72, 68);
guardGrad.addColorStop(0,   '#c8963c');
guardGrad.addColorStop(0.5, '#ffe39b');
guardGrad.addColorStop(1,   '#c8963c');
ctx.fillStyle = guardGrad;
ctx.beginPath();
ctx.moveTo(28, 62);
ctx.lineTo(72, 62);
ctx.lineTo(70, 70);
ctx.lineTo(30, 70);
ctx.closePath();
ctx.fill();

// Guard ornament ends (rounded)
ctx.fillStyle = '#f0c060';
ctx.beginPath(); ctx.arc(28, 66, 5, 0, Math.PI * 2); ctx.fill();
ctx.beginPath(); ctx.arc(72, 66, 5, 0, Math.PI * 2); ctx.fill();

// Pommel
const pomGrad = ctx.createRadialGradient(50, 90, 2, 50, 90, 10);
pomGrad.addColorStop(0,   '#ffe39b');
pomGrad.addColorStop(1,   '#a07028');
ctx.fillStyle = pomGrad;
ctx.beginPath(); ctx.arc(50, 90, 9, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = 'rgba(255,255,255,.18)';
ctx.beginPath(); ctx.arc(47, 87, 3, 0, Math.PI * 2); ctx.fill();

// Grip wrap lines
ctx.strokeStyle = 'rgba(0,0,0,.35)';
ctx.lineWidth   = 1.8;
for (let yy = 72; yy < 80; yy += 2.8) {
  ctx.beginPath();
  ctx.moveTo(48.5, yy);
  ctx.lineTo(51.5, yy);
  ctx.stroke();
}

// ── Stars / sparkles around blade ────────────────────────────────────────────
function star(cx, cy, r1, r2, pts) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a  = (i * Math.PI) / pts - Math.PI / 2;
    const r  = i % 2 === 0 ? r1 : r2;
    if (i === 0) ctx.moveTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
    else ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
  }
  ctx.closePath();
  ctx.fill();
}

ctx.fillStyle = 'rgba(255,227,155,.80)';
star(35, 25, 4, 1.8, 4);
star(65, 18, 3, 1.3, 4);
star(72, 40, 2.5, 1.1, 4);
star(28, 45, 2, 0.9, 4);

ctx.restore();

// ── Inner border ──────────────────────────────────────────────────────────────
squirclePath(0, 0, S, S, rad);
ctx.strokeStyle = 'rgba(240,192,96,.18)';
ctx.lineWidth   = 2;
ctx.stroke();

// Signal to Electron
document.title = 'DONE';
<\/script>
</body>
</html>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width:  512,
    height: 512,
    show:   false,
    frame:  false,
    transparent: true,
    webPreferences: { contextIsolation: false, nodeIntegration: false },
  })

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(ICON_HTML)}`)
  await new Promise(r => setTimeout(r, 400))

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 })
  const png   = image.toPNG()

  const dir = path.join(__dirname, 'icons')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)

  const outPath = path.join(dir, 'icon.png')
  fs.writeFileSync(outPath, png)
  console.log(`Icon saved to ${outPath}  (${png.length} bytes)`)

  app.quit()
})
