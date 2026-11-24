import type { Vec2 } from '../../utils/math';
import type { Rect, RoundedRect } from './geometry';

export type IslandStyle = 'sand' | 'grass';
export type DecorationKind = 'palm' | 'bush' | 'rock' | 'mossyRock' | 'sprout';

export interface DecorationDefinition {
  kind: DecorationKind;
  u: number;
  v: number;
  scale: number;
  rotation: number;
}

export interface IslandDefinition {
  id: string;
  style: IslandStyle;
  tileX: number;
  tileY: number;
  tilesWide: number;
  tilesHigh: number;
  decorations: readonly DecorationDefinition[];
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
  style: IslandStyle;
  tiles: Rect;
  collider: RoundedRect;
}

export interface ArenaLayout {
  width: number;
  height: number;
  tileSize: number;
  bounds: Rect;
  islands: Island[];
  decorations: Decoration[];
  playerStart: Vec2 & { angle: number };
}

const COLLIDER_INSET_RATIO = 0.16;
const COLLIDER_CORNER_RATIO = 0.55;
const DECORATION_TILE_RATIO = 0.75;

export const ISLAND_DEFINITIONS: readonly IslandDefinition[] = [
  {
    id: 'northwest',
    style: 'grass',
    tileX: 1,
    tileY: 1,
    tilesWide: 4,
    tilesHigh: 4,
    decorations: [
      { kind: 'palm', u: 0.38, v: 0.36, scale: 1.2, rotation: 0.3 },
      { kind: 'bush', u: 0.66, v: 0.58, scale: 0.9, rotation: 0 },
      { kind: 'mossyRock', u: 0.3, v: 0.7, scale: 1, rotation: 0 },
    ],
  },
  {
    id: 'north',
    style: 'sand',
    tileX: 8,
    tileY: 1,
    tilesWide: 3,
    tilesHigh: 2,
    decorations: [
      { kind: 'rock', u: 0.7, v: 0.5, scale: 0.9, rotation: 0.4 },
      { kind: 'sprout', u: 0.3, v: 0.42, scale: 1, rotation: 0 },
    ],
  },
  {
    id: 'east',
    style: 'sand',
    tileX: 13,
    tileY: 1,
    tilesWide: 2,
    tilesHigh: 2,
    decorations: [{ kind: 'sprout', u: 0.5, v: 0.5, scale: 1, rotation: 0.8 }],
  },
  {
    id: 'southeast',
    style: 'grass',
    tileX: 11,
    tileY: 4,
    tilesWide: 4,
    tilesHigh: 4,
    decorations: [
      { kind: 'palm', u: 0.42, v: 0.44, scale: 1.25, rotation: -0.2 },
      { kind: 'bush', u: 0.64, v: 0.7, scale: 1, rotation: 0.5 },
      { kind: 'mossyRock', u: 0.7, v: 0.32, scale: 0.9, rotation: 0 },
    ],
  },
  {
    id: 'southwest',
    style: 'sand',
    tileX: 3,
    tileY: 6,
    tilesWide: 3,
    tilesHigh: 2,
    decorations: [{ kind: 'rock', u: 0.55, v: 0.5, scale: 0.8, rotation: 0 }],
  },
];

function toIsland(definition: IslandDefinition, tileSize: number): Island {
  const tiles: Rect = {
    x: definition.tileX * tileSize,
    y: definition.tileY * tileSize,
    width: definition.tilesWide * tileSize,
    height: definition.tilesHigh * tileSize,
  };
  const inset = tileSize * COLLIDER_INSET_RATIO;
  return {
    id: definition.id,
    style: definition.style,
    tiles,
    collider: {
      x: tiles.x + inset,
      y: tiles.y + inset,
      width: tiles.width - inset * 2,
      height: tiles.height - inset * 2,
      cornerRadius: tileSize * COLLIDER_CORNER_RATIO,
    },
  };
}

function toDecorations(definition: IslandDefinition, tileSize: number): Decoration[] {
  const x = definition.tileX * tileSize;
  const y = definition.tileY * tileSize;
  const width = definition.tilesWide * tileSize;
  const height = definition.tilesHigh * tileSize;
  return definition.decorations.map((decoration) => ({
    kind: decoration.kind,
    x: x + decoration.u * width,
    y: y + decoration.v * height,
    size: tileSize * DECORATION_TILE_RATIO * decoration.scale,
    rotation: decoration.rotation,
  }));
}

export function createArenaLayout(arena: { width: number; height: number; tileSize: number }): ArenaLayout {
  return {
    width: arena.width,
    height: arena.height,
    tileSize: arena.tileSize,
    bounds: { x: 0, y: 0, width: arena.width, height: arena.height },
    islands: ISLAND_DEFINITIONS.map((definition) => toIsland(definition, arena.tileSize)),
    decorations: ISLAND_DEFINITIONS.flatMap((definition) => toDecorations(definition, arena.tileSize)),
    playerStart: { x: arena.width / 2, y: arena.height / 2, angle: -Math.PI / 2 },
  };
}
