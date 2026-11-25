import { Assets, Rectangle, Spritesheet, Texture } from 'pixi.js';
import { assetUrl } from '../../utils/assetUrl';

export interface IslandTextures {
  sand: Texture;
  shallow: Texture;
  sandCenter: Texture;
  grass: Texture;
  scale: number;
}

export interface HealthBarSources {
  frame: Texture;
  green: Texture;
  red: Texture;
}

export interface CombatTextures {
  ships: Spritesheet;
  water: Texture;
  islands: IslandTextures;
  healthBars: HealthBarSources;
  tile(index: number): Texture;
}

export type AssetProgressListener = (progress: number) => void;

const HIGH_DENSITY_THRESHOLD = 1.5;
const SHEET_BASE_WIDTH = 1024;
const SHEET_COLUMNS = 16;
const SOURCE_TILE = 64;
export const GRASS_CROP = 40;
const textureCache = new Map<string, CombatTextures>();

interface SheetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SAND_BLOCK: SheetRect = { x: 0, y: 0, width: 192, height: 192 };
const SHALLOW_BLOCK: SheetRect = { x: 576, y: 0, width: 192, height: 192 };
const SAND_CENTER: SheetRect = { x: 72, y: 72, width: 48, height: 48 };
const GRASS_BLOCK: SheetRect = {
  x: 320 + GRASS_CROP,
  y: GRASS_CROP,
  width: 256 - GRASS_CROP * 2,
  height: 256 - GRASS_CROP * 2,
};

function highDensity(devicePixelRatio: number): boolean {
  return devicePixelRatio >= HIGH_DENSITY_THRESHOLD;
}

export function combatAssetUrls(devicePixelRatio: number) {
  const retina = highDensity(devicePixelRatio);
  return {
    ships: assetUrl('assets/sheets/ships.json'),
    tileSheet: assetUrl(retina ? 'assets/sheets/tiles@2x.png' : 'assets/sheets/tiles.png'),
    water: assetUrl(retina ? 'assets/tiles/water@2x.png' : 'assets/tiles/water.png'),
    healthFrame: assetUrl('assets/ui/default/hud/enemy_health_frame.png'),
    healthGreen: assetUrl('assets/ui/default/hud/enemy_health_fill_green.png'),
    healthRed: assetUrl('assets/ui/default/hud/enemy_health_fill_red.png'),
  };
}

export class AssetLoadError extends Error {
  constructor(cause: unknown) {
    super('Could not load the game assets.', { cause });
    this.name = 'AssetLoadError';
  }
}

function subTexture(sheet: Texture, rect: SheetRect, scale: number, inset = 1): Texture {
  return new Texture({
    source: sheet.source,
    frame: new Rectangle(
      rect.x * scale + inset,
      rect.y * scale + inset,
      rect.width * scale - inset * 2,
      rect.height * scale - inset * 2,
    ),
  });
}

export async function loadCombatTextures(
  devicePixelRatio: number,
  onProgress: AssetProgressListener,
): Promise<CombatTextures> {
  const urls = combatAssetUrls(devicePixelRatio);
  const cacheKey = Object.values(urls).join('|');
  const cached = textureCache.get(cacheKey);
  if (cached) {
    onProgress(1);
    return cached;
  }
  try {
    const loaded = await Assets.load<Spritesheet | Texture>(Object.values(urls), onProgress);
    const texture = (url: string): Texture => {
      const asset = loaded[url];
      if (!(asset instanceof Texture)) throw new Error(`Asset ${url} is not a texture`);
      return asset;
    };
    const ships = loaded[urls.ships];
    if (!(ships instanceof Spritesheet)) throw new Error('Ship atlas is missing');

    const tileSheet = texture(urls.tileSheet);
    const scale = tileSheet.source.width / SHEET_BASE_WIDTH;
    const tiles = new Map<number, Texture>();
    const textures: CombatTextures = {
      ships,
      water: texture(urls.water),
      islands: {
        sand: subTexture(tileSheet, SAND_BLOCK, scale),
        shallow: subTexture(tileSheet, SHALLOW_BLOCK, scale),
        sandCenter: subTexture(tileSheet, SAND_CENTER, scale),
        grass: subTexture(tileSheet, GRASS_BLOCK, scale),
        scale,
      },
      healthBars: {
        frame: texture(urls.healthFrame),
        green: texture(urls.healthGreen),
        red: texture(urls.healthRed),
      },
      tile(index) {
        const cached = tiles.get(index);
        if (cached) return cached;
        const column = (index - 1) % SHEET_COLUMNS;
        const row = Math.floor((index - 1) / SHEET_COLUMNS);
        const created = subTexture(
          tileSheet,
          { x: column * SOURCE_TILE, y: row * SOURCE_TILE, width: SOURCE_TILE, height: SOURCE_TILE },
          scale,
          0,
        );
        tiles.set(index, created);
        return created;
      },
    };
    textureCache.set(cacheKey, textures);
    onProgress(1);
    return textures;
  } catch (error) {
    throw new AssetLoadError(error);
  }
}

export function frame(sheet: Spritesheet, name: string): Texture {
  const texture = sheet.textures[name];
  if (!texture) throw new Error(`Missing texture "${name}"`);
  return texture;
}
