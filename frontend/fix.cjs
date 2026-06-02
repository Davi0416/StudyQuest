const fs = require('fs');
const path = require('path');

const files = [
  'src/context/UserContext.tsx',
  'src/pages/Hub.tsx',
  'src/pages/Mapa.tsx',
  'src/pages/Missao.tsx',
  'src/pages/Revisao.tsx'
];

for(let f of files) {
  let p = path.join(__dirname, f);
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/types['"]/g, 'import type { $1 } from "../types"');
  fs.writeFileSync(p, c);
}

let apiPath = path.join(__dirname, 'src/lib/api.ts');
let ac = fs.readFileSync(apiPath, 'utf8');
ac = ac.replace('import axios, { AxiosResponse }', 'import axios, { type AxiosResponse }');
fs.writeFileSync(apiPath, ac);
