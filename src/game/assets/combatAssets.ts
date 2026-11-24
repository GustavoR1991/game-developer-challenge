import { Assets, Spritesheet, Texture } from 'pixi.js';
import { assetUrl } from '../../utils/assetUrl';

export interface CombatTextures {
  ships: Spritesheet;
  tiles: Spritesheet;
  ui: Spritesheet;
  water: Texture;
}

export type AssetProgressListener = (progress: number) => void;

const HIGH_DENSITY_THRESHOLD = 1.5;

export function combatAssetUrls(devicePixelRatio: number): Record<keyof CombatTextures, string> {
  const highDensity = devicePixelRatio >= HIGH_DENSITY_THRESHOLD;
  return {
    water: assetUrl(`assets/png/${highDensity ? 'retina' : 'default'}/tiles/tile_73.png`),
    ships: assetUrl('assets/atlases/ships.json'),
    tiles: assetUrl(highDensity ? 'assets/atlases/tiles@2x.json' : 'assets/atlases/tiles.json'),
    ui: assetUrl(
      highDensity ? 'assets/spritesheet/ui_sheet_retina.json' : 'assets/spritesheet/ui_sheet.json',
    ),
  };
}

export class AssetLoadError extends Error {
  constructor(cause: unknown) {
    super('Could not load the game assets.', { cause });
    this.name = 'AssetLoadError';
  }
}

export async function loadCombatTextures(
  devicePixelRatio: number,
  onProgress: AssetProgressListener,
): Promise<CombatTextures> {
  const urls = combatAssetUrls(devicePixelRatio);
  try {
    const loaded = await Assets.load<Spritesheet | Texture>(Object.values(urls), onProgress);
    const sheet = (url: string): Spritesheet => {
      const asset = loaded[url];
      if (!(asset instanceof Spritesheet)) throw new Error(`Asset ${url} is not a spritesheet`);
      return asset;
    };
    const water = loaded[urls.water];
    if (!(water instanceof Texture)) throw new Error('Water texture is missing');
    onProgress(1);
    return { ships: sheet(urls.ships), tiles: sheet(urls.tiles), ui: sheet(urls.ui), water };
  } catch (error) {
    throw new AssetLoadError(error);
  }
}

export function frame(sheet: Spritesheet, name: string): Texture {
  const texture = sheet.textures[name];
  if (!texture) throw new Error(`Missing texture "${name}"`);
  return texture;
}
