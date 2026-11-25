import { Container, Graphics, Sprite, TilingSprite, type Texture } from 'pixi.js';
import type { ArenaLayout, DecorationKind, Landmass } from '../simulation/world/arenaLayout';
import { frame, type CombatTextures } from './combatTextures';
import { buildOutlines } from './terrainShapes';

type DecorationSource = { tile: number } | { atlas: string };

const DECORATION_SOURCES: Readonly<Record<DecorationKind, DecorationSource>> = {
  palm: { tile: 71 },
  bush: { tile: 72 },
  rock: { tile: 49 },
  mossyRock: { tile: 66 },
  sprout: { tile: 87 },
  tower: { tile: 13 },
  wallHorizontal: { tile: 16 },
  wallVertical: { tile: 15 },
  wallCannon: { tile: 31 },
  wallCannonHorizontal: { tile: 47 },
  gate: { tile: 76 },
  dinghy: { atlas: 'dinghy_small_1' },
  dinghyLarge: { atlas: 'dinghy_large_2' },
  looseCannon: { atlas: 'cannon_loose' },
  crew: { atlas: 'crew_3' },
};

const TERRAIN = {
  shallowOuter: { width: 2.3, alpha: 0.2 },
  shallowInner: { width: 1.2, alpha: 0.22 },
  sand: 0xe2bd88,
  wetSand: { color: 0xc4945d, width: 26, alpha: 0.4 },
  sandOutline: { color: 0x9c6f43, width: 3, alpha: 0.7 },
  grass: 0x5f9e31,
  grassLight: 0x7dba45,
  grassEdge: { color: 0x3f7b22, width: 7, alpha: 0.85 },
  sandCorner: 0.62,
  sandConcave: 0.18,
  grassCorner: 0.5,
  sandWobble: 4,
  grassWobble: 9,
  tufts: [87, 88],
};

const WATER_TILE_SCALE = 1.5;
const SHALLOW_RESOLUTION = 0.5;

function pseudoRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export class ArenaView extends Container {
  private readonly textures: CombatTextures;

  constructor(textures: CombatTextures, arena: ArenaLayout) {
    super();
    this.textures = textures;
    this.label = 'arena';
    this.eventMode = 'none';
    this.buildWater(textures.water, arena);

    const sandOutlines = arena.landmasses.map((landmass, index) =>
      buildOutlines(landmass.sand, {
        cellSize: arena.tileSize / 2,
        cornerRadius: arena.tileSize * TERRAIN.sandCorner,
        concaveRadius: arena.tileSize * TERRAIN.sandConcave,
        wobble: TERRAIN.sandWobble,
        wavelength: arena.tileSize * 0.9,
        seed: index + 1,
      }),
    );
    this.buildShallows(sandOutlines.flat(), arena.tileSize);
    arena.landmasses.forEach((landmass, index) =>
      this.buildLandmass(landmass, sandOutlines[index] ?? [], arena.tileSize, index),
    );
    this.buildDecorations(arena);
  }

  private buildWater(texture: Texture, arena: ArenaLayout): void {
    const water = new TilingSprite({ texture, width: arena.width, height: arena.height });
    water.tileScale.set((arena.tileSize * WATER_TILE_SCALE) / texture.width);
    water.label = 'water';
    this.addChild(water);
  }

  private buildShallows(outlines: number[][], tileSize: number): void {
    const shallows = new Container({ label: 'shallows' });
    for (const band of [TERRAIN.shallowOuter, TERRAIN.shallowInner]) {
      const layer = new Graphics();
      for (const outline of outlines) {
        layer.poly(outline, true).fill(0xffffff);
        layer.poly(outline, true).stroke({ width: band.width * tileSize, color: 0xffffff, join: 'round' });
      }
      const holder = new Container();
      holder.addChild(layer);
      holder.cacheAsTexture({ resolution: SHALLOW_RESOLUTION, antialias: true });
      holder.alpha = band.alpha;
      shallows.addChild(holder);
    }
    this.addChild(shallows);
  }

  private buildLandmass(landmass: Landmass, sandOutlines: number[][], tileSize: number, index: number): void {
    const land = new Graphics({ label: `landmass-${landmass.id}` });
    for (const outline of sandOutlines) {
      land.poly(outline, true).fill(TERRAIN.sand);
      land.poly(outline, true).stroke({ ...TERRAIN.wetSand, join: 'round' });
      land.poly(outline, true).stroke({ ...TERRAIN.sandOutline, join: 'round' });
    }

    const grassOutlines = buildOutlines(landmass.grass, {
      cellSize: tileSize / 2,
      cornerRadius: tileSize * TERRAIN.grassCorner,
      concaveRadius: tileSize * TERRAIN.grassCorner,
      wobble: TERRAIN.grassWobble,
      wavelength: tileSize * 0.55,
      seed: (index + 1) * 7,
    });
    for (const outline of grassOutlines) {
      land.poly(outline, true).fill(TERRAIN.grass);
      land.poly(outline, true).stroke({ ...TERRAIN.grassEdge, join: 'round' });
    }
    this.addChild(land);

    if (grassOutlines.length > 0) this.buildGrassDetails(landmass, grassOutlines, tileSize, index);
  }

  private buildGrassDetails(
    landmass: Landmass,
    grassOutlines: number[][],
    tileSize: number,
    index: number,
  ): void {
    const random = pseudoRandom(9_000 + index * 131);
    const details = new Container({ label: `grass-details-${landmass.id}` });
    const blotches = new Graphics();
    const mask = new Graphics();
    for (const outline of grassOutlines) mask.poly(outline, true).fill(0xffffff);

    for (const rect of landmass.grass) {
      const area = (rect.width * rect.height) / (tileSize * tileSize);
      for (let blotch = 0; blotch < Math.ceil(area * 0.7); blotch += 1) {
        blotches.ellipse(
          rect.x + random() * rect.width,
          rect.y + random() * rect.height,
          tileSize * (0.4 + random() * 0.5),
          tileSize * (0.22 + random() * 0.3),
        );
      }
      const margin = tileSize * 0.3;
      for (let tuft = 0; tuft < Math.ceil(area * 0.6); tuft += 1) {
        const tileIndex = TERRAIN.tufts[tuft % TERRAIN.tufts.length] ?? 87;
        const sprite = new Sprite(this.textures.tile(tileIndex));
        sprite.anchor.set(0.5);
        sprite.scale.set((tileSize * (0.45 + random() * 0.25)) / sprite.texture.width);
        sprite.position.set(
          rect.x + margin + random() * Math.max(1, rect.width - margin * 2),
          rect.y + margin + random() * Math.max(1, rect.height - margin * 2),
        );
        sprite.rotation = random() * Math.PI * 2;
        sprite.alpha = 0.65;
        details.addChild(sprite);
      }
    }
    blotches.fill({ color: TERRAIN.grassLight, alpha: 0.32 });
    details.addChildAt(blotches, 0);
    details.addChild(mask);
    details.mask = mask;
    this.addChild(details);
  }

  private buildDecorations(arena: ArenaLayout): void {
    for (const decoration of arena.decorations) {
      const source = DECORATION_SOURCES[decoration.kind];
      const texture =
        'tile' in source ? this.textures.tile(source.tile) : frame(this.textures.ships, source.atlas);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set(decoration.size / Math.max(texture.width, texture.height));
      sprite.position.set(decoration.x, decoration.y);
      sprite.rotation = decoration.rotation;
      this.addChild(sprite);
    }
  }
}
