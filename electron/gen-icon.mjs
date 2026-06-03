/**
 * gen-icon.mjs — gera icon.png para o StudyQuest usando sharp + SVG embutido
 * Uso: node gen-icon.mjs
 */
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <!-- Squircle clip -->
    <clipPath id="sq">
      <rect width="512" height="512" rx="118" ry="118"/>
    </clipPath>

    <!-- Background gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%"   stop-color="#252d3d"/>
      <stop offset="55%"  stop-color="#161c28"/>
      <stop offset="100%" stop-color="#0e1318"/>
    </linearGradient>

    <!-- Top gold glow -->
    <radialGradient id="glow1" cx="50%" cy="-5%" r="65%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#f0c060" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#f0c060" stop-opacity="0"/>
    </radialGradient>

    <!-- Bottom blue glow -->
    <radialGradient id="glow2" cx="88%" cy="105%" r="60%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#58a6ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#58a6ff" stop-opacity="0"/>
    </radialGradient>

    <!-- Blade gradient (bright top → mid gold) -->
    <linearGradient id="blade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#fff8e0"/>
      <stop offset="30%"  stop-color="#ffe39b"/>
      <stop offset="70%"  stop-color="#f0c060"/>
      <stop offset="100%" stop-color="#c8963c"/>
    </linearGradient>

    <!-- Blade bevel (left bright) -->
    <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="50%"  stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Guard gradient -->
    <linearGradient id="guard" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#a07028"/>
      <stop offset="35%"  stop-color="#f0c060"/>
      <stop offset="50%"  stop-color="#ffe39b"/>
      <stop offset="65%"  stop-color="#f0c060"/>
      <stop offset="100%" stop-color="#a07028"/>
    </linearGradient>

    <!-- Pommel gradient -->
    <radialGradient id="pommel" cx="38%" cy="35%" r="65%">
      <stop offset="0%"   stop-color="#7ee787"/>
      <stop offset="40%"  stop-color="#4fa85a"/>
      <stop offset="100%" stop-color="#1f4a28"/>
    </radialGradient>

    <!-- Pommel rim -->
    <linearGradient id="pomRim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#a0d8a8"/>
      <stop offset="100%" stop-color="#2a6a34"/>
    </linearGradient>

    <!-- Grip wrap gradient -->
    <linearGradient id="grip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#5a3a1a"/>
      <stop offset="50%"  stop-color="#8a6030"/>
      <stop offset="100%" stop-color="#5a3a1a"/>
    </linearGradient>

    <!-- Blade shadow/depth on right side -->
    <linearGradient id="shadow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.28"/>
    </linearGradient>

    <!-- Blade inner glow -->
    <filter id="bladeGlow" x="-50%" y="-20%" width="200%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Drop shadow for sword -->
    <filter id="swordShadow" x="-30%" y="-10%" width="160%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
    </filter>

    <!-- Outer glow for whole sword -->
    <filter id="goldGlow" x="-25%" y="-10%" width="150%" height="120%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feFlood flood-color="#f0c060" flood-opacity="0.25" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="colorBlur"/>
      <feMerge><feMergeNode in="colorBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Top sheen -->
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#sq)">
    <!-- Background -->
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="url(#glow1)"/>
    <rect width="512" height="512" fill="url(#glow2)"/>
    <!-- Top sheen -->
    <rect width="512" height="130" fill="url(#sheen)"/>

    <!-- ── Sword group (centered, pointing up) ──────────────────────── -->
    <g filter="url(#swordShadow)">
    <g filter="url(#goldGlow)" transform="translate(256,300) scale(1.35)">

      <!-- Blade tip to shoulder (tapered) -->
      <!-- Main blade face -->
      <polygon
        points="0,-170  14,-55  -14,-55"
        fill="url(#blade)"
      />
      <!-- Blade bevel (left bright edge) -->
      <polygon
        points="0,-170  3,-55  -14,-55"
        fill="url(#bevel)"
        opacity="0.7"
      />
      <!-- Blade right shadow -->
      <polygon
        points="0,-170  14,-55  3,-55"
        fill="url(#shadow)"
        opacity="0.5"
      />
      <!-- Blade center ridge highlight -->
      <line x1="0" y1="-168" x2="0" y2="-58" stroke="#fff8e0" stroke-width="1.5" stroke-opacity="0.55"/>

      <!-- Ricasso (blade widening near guard) -->
      <rect x="-14" y="-60" width="28" height="20" fill="url(#blade)"/>
      <rect x="-14" y="-60" width="10" height="20" fill="url(#bevel)" opacity="0.5"/>

      <!-- ── Crossguard ─────────────────────────────────────────────── -->
      <rect x="-45" y="-40" width="90" height="12" rx="6" fill="url(#guard)"/>
      <!-- Guard top bevel -->
      <rect x="-45" y="-40" width="90" height="3" rx="1.5" fill="#ffffff" opacity="0.18"/>
      <!-- Guard bottom shadow -->
      <rect x="-45" y="-31" width="90" height="3" rx="1.5" fill="#000000" opacity="0.22"/>

      <!-- ── Grip / handle ──────────────────────────────────────────── -->
      <rect x="-9" y="-28" width="18" height="60" rx="3" fill="url(#grip)"/>
      <!-- Grip wrapping leather -->
      <rect x="-9" y="-24" width="18" height="3" rx="1" fill="#3a2010" opacity="0.60"/>
      <rect x="-9" y="-16" width="18" height="3" rx="1" fill="#3a2010" opacity="0.60"/>
      <rect x="-9" y="-8"  width="18" height="3" rx="1" fill="#3a2010" opacity="0.60"/>
      <rect x="-9" y="0"   width="18" height="3" rx="1" fill="#3a2010" opacity="0.60"/>
      <rect x="-9" y="8"   width="18" height="3" rx="1" fill="#3a2010" opacity="0.60"/>
      <rect x="-9" y="16"  width="18" height="3" rx="1" fill="#3a2010" opacity="0.60"/>
      <rect x="-9" y="24"  width="18" height="3" rx="1" fill="#3a2010" opacity="0.60"/>
      <!-- Grip highlight -->
      <rect x="-9" y="-28" width="5" height="60" rx="2" fill="#ffffff" opacity="0.07"/>

      <!-- ── Pommel (green gem) ──────────────────────────────────────── -->
      <!-- Rim ring (gold) -->
      <circle cx="0" cy="40" r="16" fill="url(#guard)"/>
      <!-- Gem fill -->
      <circle cx="0" cy="40" r="12" fill="url(#pommel)"/>
      <!-- Gem highlight -->
      <ellipse cx="-3" cy="35" rx="4" ry="2.5" fill="#ffffff" opacity="0.5" transform="rotate(-20,-3,35)"/>
      <!-- Gem inner glow -->
      <circle cx="0" cy="40" r="8" fill="#7ee787" opacity="0.25"/>

    </g>
    </g>



    <!-- ── Squircle inner border ─────────────────────────────────────── -->
    <rect width="512" height="512" rx="118" ry="118"
          fill="none" stroke="#f0c060" stroke-width="2.5" stroke-opacity="0.22"/>
    <!-- Inner top sheen arc -->
    <rect width="512" height="512" rx="118" ry="118"
          fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.08"/>
  </g>
</svg>`;

const outDir = resolve(__dirname, 'icons');
if (!existsSync(outDir)) mkdirSync(outDir);
const outPath = resolve(outDir, 'icon.png');

await sharp(Buffer.from(SVG))
  .resize(512, 512)
  .png()
  .toFile(outPath);

console.log(`✓ Icon saved → ${outPath}`);
