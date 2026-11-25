import { Container, NineSliceSprite, Sprite, TilingSprite, type Texture } from 'pixi.js';
import type { Rect } from '../simulation/world/geometry';
import type { ArenaLayout, DecorationKind, Island } from '../simulation/world/arenaLayout';
import { frame, type CombatTextures } from './combatTextures';

const SOURCE_TILE = 64;

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
    for (const island of arena.islands) this.buildIsland(island, arena.tileSize);
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

  private buildIsland(island: Island, tileSize: number): void {
    const small = island.tiles.width < tileSize * 3 || island.tiles.height < tileSize * 3;
    if (island.style === 'sand' && small) {
      const sand = new Sprite(this.textures.islands.sand);
      sand.label = `island-${island.id}`;
      sand.position.set(island.tiles.x, island.tiles.y);
      sand.setSize(island.tiles.width, island.tiles.height);
      this.addChild(sand);
      return;
    }
    if (island.style === 'sand') {
      const sand = this.nineSlice(this.textures.islands.sand, island.tiles, tileSize);
      sand.label = `island-${island.id}`;
      this.addChild(sand);
      return;
    }
    const grass = this.nineSlice(this.textures.islands.grass, island.tiles, tileSize);
    grass.label = `island-${island.id}`;
    this.addChild(grass);
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
