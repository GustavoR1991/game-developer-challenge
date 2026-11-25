import { Container, NineSliceSprite, Sprite, TilingSprite, type Texture } from 'pixi.js';
import type { Rect } from '../simulation/world/geometry';
import type { ArenaLayout, DecorationKind, Landmass } from '../simulation/world/arenaLayout';
import { frame, GRASS_CROP, type CombatTextures } from './combatTextures';

const SOURCE_TILE = 64;
const GRASS_SOURCE_SIZE = 256;

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

const SHALLOW_MARGIN_RATIO = 0.6;
const WATER_TILE_SCALE = 1.5;

export class ArenaView extends Container {
  private readonly textures: CombatTextures;

  constructor(textures: CombatTextures, arena: ArenaLayout) {
    super();
    this.textures = textures;
    this.label = 'arena';
    this.eventMode = 'none';
    this.buildWater(textures.water, arena);
    this.buildShallows(arena);
    for (const landmass of arena.landmasses) this.buildLandmass(landmass, arena.tileSize);
    this.buildDecorations(arena);
  }

  private buildWater(texture: Texture, arena: ArenaLayout): void {
    const water = new TilingSprite({ texture, width: arena.width, height: arena.height });
    water.tileScale.set((arena.tileSize * WATER_TILE_SCALE) / texture.width);
    water.label = 'water';
    this.addChild(water);
  }

  private buildShallows(arena: ArenaLayout): void {
    const shallows = new Container({ label: 'shallows' });
    const margin = arena.tileSize * SHALLOW_MARGIN_RATIO;
    for (const island of arena.islands) {
      const { x, y, width, height } = island.tiles;
      shallows.addChild(
        this.nineSlice(
          this.textures.islands.shallow,
          { x: x - margin, y: y - margin, width: width + margin * 2, height: height + margin * 2 },
          arena.tileSize,
        ),
      );
    }
    this.addChild(shallows);
  }

  private buildLandmass(landmass: Landmass, tileSize: number): void {
    const container = new Container({ label: `landmass-${landmass.id}` });
    for (const rect of landmass.sand) container.addChild(this.sandSprite(rect, tileSize));
    for (const join of landmass.joins) {
      const patch = new Sprite(this.textures.islands.sandCenter);
      patch.position.set(join.x, join.y);
      patch.setSize(join.width, join.height);
      container.addChild(patch);
    }
    for (const rect of landmass.grass) {
      const grass = new Sprite(this.textures.islands.grass);
      const crop = (rect.width * GRASS_CROP) / GRASS_SOURCE_SIZE;
      grass.position.set(rect.x + crop, rect.y + crop);
      grass.setSize(rect.width - crop * 2, rect.height - crop * 2);
      container.addChild(grass);
    }
    this.addChild(container);
  }

  private sandSprite(rect: Rect, tileSize: number): NineSliceSprite {
    return this.nineSlice(this.textures.islands.sand, rect, tileSize);
  }

  private nineSlice(texture: Texture, rect: Rect, tileSize: number): NineSliceSprite {
    const border = SOURCE_TILE * this.textures.islands.scale;
    const scale = tileSize / border;
    const sprite = new NineSliceSprite({
      texture,
      leftWidth: border,
      rightWidth: border,
      topHeight: border,
      bottomHeight: border,
      width: rect.width / scale,
      height: rect.height / scale,
    });
    sprite.position.set(rect.x, rect.y);
    sprite.scale.set(scale);
    return sprite;
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
