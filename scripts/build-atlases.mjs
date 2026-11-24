import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'public', 'assets');
const outDir = join(assets, 'atlases');
mkdirSync(outDir, { recursive: true });

function frameEntry(x, y, w, h) {
  return {
    frame: { x, y, w, h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w, h },
    sourceSize: { w, h },
  };
}

function writeAtlas(fileName, frames, image, size, scale) {
  const atlas = {
    frames,
    meta: { app: 'scripts/build-atlases.mjs', image, format: 'RGBA8888', size, scale: String(scale) },
  };
  writeFileSync(join(outDir, fileName), `${JSON.stringify(atlas, null, 2)}\n`);
  console.log(`${fileName}: ${Object.keys(frames).length} frames`);
}

function convertStarlingXml(xmlFile, fileName, image, size) {
  const xml = readFileSync(join(assets, 'spritesheet', xmlFile), 'utf8');
  const frames = {};
  const pattern = /<SubTexture name="([^"]+)\.png" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"\/>/g;
  for (const match of xml.matchAll(pattern)) {
    const [, name, x, y, w, h] = match;
    frames[name] = frameEntry(Number(x), Number(y), Number(w), Number(h));
  }
  writeAtlas(fileName, frames, image, size, 1);
}

function buildTileGrid(fileName, image, tilePixels, columns, rows, scale) {
  const frames = {};
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column + 1;
      frames[`tile_${index}`] = frameEntry(column * tilePixels, row * tilePixels, tilePixels, tilePixels);
    }
  }
  writeAtlas(fileName, frames, image, { w: columns * tilePixels, h: rows * tilePixels }, scale);
}

convertStarlingXml(
  'ships_miscellaneous_sheet.xml',
  'ships.json',
  '../spritesheet/ships_miscellaneous_sheet.png',
  { w: 1024, h: 512 },
);
buildTileGrid('tiles.json', '../tilesheet/tiles_sheet.png', 64, 16, 6, 1);
buildTileGrid('tiles@2x.json', '../tilesheet/tiles_sheet_retina.png', 128, 16, 6, 2);
