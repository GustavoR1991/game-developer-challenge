import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'assets-src', 'ships_miscellaneous_sheet.xml');
const output = join(root, 'public', 'assets', 'sheets', 'ships.json');

const xml = readFileSync(source, 'utf8');
const frames = {};
const pattern = /<SubTexture name="([^"]+)\.png" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"\/>/g;
for (const [, name, x, y, w, h] of xml.matchAll(pattern)) {
  const width = Number(w);
  const height = Number(h);
  frames[name] = {
    frame: { x: Number(x), y: Number(y), w: width, h: height },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: width, h: height },
    sourceSize: { w: width, h: height },
  };
}

const atlas = {
  frames,
  meta: {
    app: 'scripts/build-atlases.mjs',
    image: 'ships.png',
    format: 'RGBA8888',
    size: { w: 1024, h: 512 },
    scale: '1',
  },
};
writeFileSync(output, `${JSON.stringify(atlas, null, 2)}\n`);
console.log(`sheets/ships.json: ${Object.keys(frames).length} frames`);
