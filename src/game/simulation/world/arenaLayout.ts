import type { Vec2 } from '../../../utils/math';
import type { Rect, RoundedRect } from './geometry';

export type DecorationKind =
  | 'palm'
  | 'bush'
  | 'rock'
  | 'mossyRock'
  | 'sprout'
  | 'tower'
  | 'wallHorizontal'
  | 'wallVertical'
  | 'wallCannon'
  | 'dinghy'
  | 'dinghyLarge'
  | 'looseCannon'
  | 'crew';

export interface TileRect {
  tileX: number;
  tileY: number;
  tilesWide: number;
  tilesHigh: number;
}

export interface LandmassDefinition {
  id: string;
  sand: readonly TileRect[];
  grass: readonly { tileX: number; tileY: number }[];
}

export interface DecorationDefinition {
  kind: DecorationKind;
  tileX: number;
  tileY: number;
  scale: number;
  rotation: number;
}

export interface Decoration {
  kind: DecorationKind;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface Island {
  id: string;
  tiles: Rect;
  collider: RoundedRect;
}

export interface Landmass {
  id: string;
  sand: Rect[];
  joins: Rect[];
  grass: Rect[];
}

export interface ArenaLayout {
  width: number;
  height: number;
  tileSize: number;
  bounds: Rect;
  view: { width: number; height: number };
  islands: Island[];
  landmasses: Landmass[];
  decorations: Decoration[];
  playerStart: Vec2 & { angle: number };
}

const COLLIDER_INSET_RATIO = 0.16;
const COLLIDER_CORNER_RATIO = 0.55;
const GRASS_BLOCK_TILES = 3;

export const LANDMASS_DEFINITIONS: readonly LandmassDefinition[] = [
  {
    id: 'fortress',
    sand: [
      { tileX: 2, tileY: 1, tilesWide: 7, tilesHigh: 3 },
      { tileX: 4, tileY: 3, tilesWide: 3, tilesHigh: 3 },
    ],
    grass: [{ tileX: 5, tileY: 1 }],
  },
  {
    id: 'bay',
    sand: [
      { tileX: 12, tileY: 8, tilesWide: 8, tilesHigh: 3 },
      { tileX: 16, tileY: 6, tilesWide: 4, tilesHigh: 5 },
    ],
    grass: [
      { tileX: 16.5, tileY: 7.5 },
      { tileX: 12.5, tileY: 8.2 },
    ],
  },
  { id: 'reef', sand: [{ tileX: 14, tileY: 2, tilesWide: 2, tilesHigh: 2 }], grass: [] },
  { id: 'cove', sand: [{ tileX: 3, tileY: 9, tilesWide: 2, tilesHigh: 2 }], grass: [] },
  { id: 'islet', sand: [{ tileX: 8, tileY: 8, tilesWide: 2, tilesHigh: 2 }], grass: [] },
];

export const DECORATION_DEFINITIONS: readonly DecorationDefinition[] = [
  { kind: 'tower', tileX: 2.6, tileY: 1.6, scale: 1.2, rotation: 0 },
  { kind: 'wallHorizontal', tileX: 3.6, tileY: 1.6, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 4.6, tileY: 1.6, scale: 1.2, rotation: 0 },
  { kind: 'wallCannon', tileX: 4.6, tileY: 2.6, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 4.6, tileY: 3.6, scale: 1.2, rotation: 0 },
  { kind: 'palm', tileX: 2.9, tileY: 3.1, scale: 1, rotation: 0.3 },
  { kind: 'mossyRock', tileX: 8.2, tileY: 1.6, scale: 0.85, rotation: 0 },
  { kind: 'palm', tileX: 6, tileY: 4.6, scale: 0.95, rotation: -0.4 },
  { kind: 'looseCannon', tileX: 7.7, tileY: 3.4, scale: 0.4, rotation: 0.6 },
  { kind: 'dinghy', tileX: 8.9, tileY: 3.7, scale: 0.55, rotation: 2.2 },
  { kind: 'rock', tileX: 14.6, tileY: 2.6, scale: 0.75, rotation: 0.4 },
  { kind: 'sprout', tileX: 15.3, tileY: 3.3, scale: 0.8, rotation: 0 },
  { kind: 'bush', tileX: 3.6, tileY: 9.7, scale: 0.75, rotation: 0.2 },
  { kind: 'dinghyLarge', tileX: 4.8, tileY: 10.6, scale: 0.6, rotation: -0.6 },
  { kind: 'rock', tileX: 8.7, tileY: 8.8, scale: 0.7, rotation: 0.2 },
  { kind: 'mossyRock', tileX: 12.6, tileY: 10.2, scale: 0.9, rotation: 0 },
  { kind: 'palm', tileX: 14.9, tileY: 9.4, scale: 1.1, rotation: 0 },
  { kind: 'rock', tileX: 16.6, tileY: 6.6, scale: 0.8, rotation: 0.3 },
  { kind: 'palm', tileX: 18.4, tileY: 9.3, scale: 1.15, rotation: -0.2 },
  { kind: 'looseCannon', tileX: 17.2, tileY: 6.5, scale: 0.4, rotation: -0.5 },
  { kind: 'crew', tileX: 15.8, tileY: 8.4, scale: 0.3, rotation: 0.4 },
  { kind: 'dinghy', tileX: 15.2, tileY: 7.6, scale: 0.55, rotation: 0.9 },
  { kind: 'crew', tileX: 9.4, tileY: 3.4, scale: 0.3, rotation: -1.2 },
];

function tileRect(rect: TileRect, tileSize: number): Rect {
  return {
    x: rect.tileX * tileSize,
    y: rect.tileY * tileSize,
    width: rect.tilesWide * tileSize,
    height: rect.tilesHigh * tileSize,
  };
}

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

function toLandmass(definition: LandmassDefinition, tileSize: number): Landmass {
  const sand = definition.sand.map((rect) => tileRect(rect, tileSize));
  const joins: Rect[] = [];
  for (let i = 0; i < sand.length; i += 1) {
    for (let j = i + 1; j < sand.length; j += 1) {
      const first = sand[i];
      const second = sand[j];
      if (!first || !second) continue;
      const overlap = intersect(first, second);
      if (overlap) joins.push(overlap);
    }
  }
  return {
    id: definition.id,
    sand,
    joins,
    grass: definition.grass.map((patch) =>
      tileRect({ ...patch, tilesWide: GRASS_BLOCK_TILES, tilesHigh: GRASS_BLOCK_TILES }, tileSize),
    ),
  };
}

function toIslands(landmass: Landmass, tileSize: number): Island[] {
  const inset = tileSize * COLLIDER_INSET_RATIO;
  return landmass.sand.map((tiles, index) => ({
    id: `${landmass.id}-${index}`,
    tiles,
    collider: {
      x: tiles.x + inset,
      y: tiles.y + inset,
      width: tiles.width - inset * 2,
      height: tiles.height - inset * 2,
      cornerRadius: tileSize * COLLIDER_CORNER_RATIO,
    },
  }));
}

function toDecoration(definition: DecorationDefinition, tileSize: number): Decoration {
  return {
    kind: definition.kind,
    x: definition.tileX * tileSize,
    y: definition.tileY * tileSize,
    size: tileSize * definition.scale,
    rotation: definition.rotation,
  };
}

export function createArenaLayout(arena: {
  width: number;
  height: number;
  tileSize: number;
  viewWidth: number;
  viewHeight: number;
}): ArenaLayout {
  const landmasses = LANDMASS_DEFINITIONS.map((definition) => toLandmass(definition, arena.tileSize));
  return {
    width: arena.width,
    height: arena.height,
    tileSize: arena.tileSize,
    bounds: { x: 0, y: 0, width: arena.width, height: arena.height },
    view: { width: arena.viewWidth, height: arena.viewHeight },
    landmasses,
    islands: landmasses.flatMap((landmass) => toIslands(landmass, arena.tileSize)),
    decorations: DECORATION_DEFINITIONS.map((definition) => toDecoration(definition, arena.tileSize)),
    playerStart: { x: arena.width / 2, y: arena.height / 2, angle: -Math.PI / 2 },
  };
}
