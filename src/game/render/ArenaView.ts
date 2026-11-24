import { Container, Sprite, TilingSprite, type Spritesheet, type Texture } from 'pixi.js';
import { frame } from '../assets/combatAssets';
import type { ArenaLayout, DecorationKind, Island } from '../world/arenaLayout';

const SAND_GRID = [
  [1, 2, 3],
  [17, 18, 19],
  [33, 34, 35],
];
const SHALLOW_GRID = [
  [10, 11, 12],
  [26, 27, 28],
  [42, 43, 44],
];
const GRASS_GRID = [
  [6, 7, 8, 9],
  [22, 23, 24, 25],
  [38, 39, 40, 41],
  [54, 55, 56, 57],
];
const DECORATION_TILES: Readonly<Record<DecorationKind, string>> = {
  palm: 'tile_71',
  bush: 'tile_72',
  rock: 'tile_49',
  mossyRock: 'tile_66',
  sprout: 'tile_87',
};
const SHALLOW_MARGIN_RATIO = 0.28;
const SHALLOW_ALPHA = 0.55;
const TILE_OVERLAP = 1;

function nineSliceIndex(grid: number[][], index: number, count: number): number[] {
  if (index === 0) return grid[0] ?? [];
  if (index === count - 1) return grid[grid.length - 1] ?? [];
  return grid[Math.min(index, grid.length - 2)] ?? [];
}

function nineSliceTile(grid: number[][], column: number, row: number, columns: number, rows: number): number {
  const rowTiles = nineSliceIndex(grid, row, rows);
  if (column === 0) return rowTiles[0] ?? 0;
  if (column === columns - 1) return rowTiles[rowTiles.length - 1] ?? 0;
  return rowTiles[Math.min(column, rowTiles.length - 2)] ?? 0;
}

export class ArenaView extends Container {
  private readonly tiles: Spritesheet;

  constructor(tiles: Spritesheet, water: Texture, arena: ArenaLayout) {
    super();
    this.tiles = tiles;
    this.label = 'arena';
    this.eventMode = 'none';
    this.buildWater(water, arena);
    for (const island of arena.islands) this.buildShallows(island, arena.tileSize);
    for (const island of arena.islands) this.buildIsland(island, arena.tileSize);
    this.buildDecorations(arena);
  }

  private tile(index: number, x: number, y: number, size: number): Sprite {
    const sprite = new Sprite(frame(this.tiles, `tile_${index}`));
    sprite.position.set(x - TILE_OVERLAP / 2, y - TILE_OVERLAP / 2);
    sprite.setSize(size + TILE_OVERLAP, size + TILE_OVERLAP);
    return sprite;
  }

  private buildWater(texture: Texture, arena: ArenaLayout): void {
    const water = new TilingSprite({ texture, width: arena.width, height: arena.height });
    water.tileScale.set(arena.tileSize / texture.width);
    water.label = 'water';
    this.addChild(water);
  }

  private buildShallows(island: Island, tileSize: number): void {
    const columns = island.tiles.width / tileSize;
    const rows = island.tiles.height / tileSize;
    const shallows = new Container();
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = nineSliceTile(SHALLOW_GRID, column, row, columns, rows);
        shallows.addChild(this.tile(index, column * tileSize, row * tileSize, tileSize));
      }
    }
    const margin = tileSize * SHALLOW_MARGIN_RATIO;
    const scaleX = (island.tiles.width + margin * 2) / island.tiles.width;
    const scaleY = (island.tiles.height + margin * 2) / island.tiles.height;
    shallows.scale.set(scaleX, scaleY);
    shallows.position.set(island.tiles.x - margin, island.tiles.y - margin);
    shallows.alpha = SHALLOW_ALPHA;
    shallows.tint = 0xe8fbff;
    this.addChild(shallows);
  }

  private buildIsland(island: Island, tileSize: number): void {
    const columns = island.tiles.width / tileSize;
    const rows = island.tiles.height / tileSize;
    const container = new Container();
    container.label = `island-${island.id}`;
    container.position.set(island.tiles.x, island.tiles.y);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index =
          island.style === 'grass'
            ? (GRASS_GRID[row]?.[column] ?? 23)
            : nineSliceTile(SAND_GRID, column, row, columns, rows);
        container.addChild(this.tile(index, column * tileSize, row * tileSize, tileSize));
      }
    }
    this.addChild(container);
  }

  private buildDecorations(arena: ArenaLayout): void {
    for (const decoration of arena.decorations) {
      const sprite = new Sprite(frame(this.tiles, DECORATION_TILES[decoration.kind]));
      sprite.anchor.set(0.5);
      sprite.setSize(decoration.size, decoration.size);
      sprite.position.set(decoration.x, decoration.y);
      sprite.rotation = decoration.rotation;
      this.addChild(sprite);
    }
  }
}
