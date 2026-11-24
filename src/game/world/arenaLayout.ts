import type { Vec2 } from '../../utils/math';
import type { Rect, RoundedRect } from './geometry';

export type IslandStyle = 'sand' | 'grass';
export type DecorationKind = 'palm' | 'bush' | 'rock' | 'mossyRock' | 'sprout';

export interface IslandDefinition {
  id: string;
  style: IslandStyle;
  tileX: number;
  tileY: number;
  tilesWide: number;
  tilesHigh: number;
}

export interface DecorationDefinition {
  kind: DecorationKind;
  x: number;
  y: number;
  scale: number;
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
  decorations: DecorationDefinition[];
  playerStart: Vec2 & { angle: number };
}

const COLLIDER_INSET = 10;
const COLLIDER_CORNER_RADIUS = 36;

export const ISLAND_DEFINITIONS: readonly IslandDefinition[] = [
  { id: 'northwest', style: 'grass', tileX: 3, tileY: 2, tilesWide: 4, tilesHigh: 4 },
  { id: 'north', style: 'sand', tileX: 14, tileY: 2, tilesWide: 3, tilesHigh: 2 },
  { id: 'southeast', style: 'grass', tileX: 17, tileY: 8, tilesWide: 4, tilesHigh: 4 },
  { id: 'southwest', style: 'sand', tileX: 6, tileY: 10, tilesWide: 3, tilesHigh: 2 },
  { id: 'east', style: 'sand', tileX: 21, tileY: 3, tilesWide: 2, tilesHigh: 2 },
];

export const DECORATION_DEFINITIONS: readonly DecorationDefinition[] = [
  { kind: 'palm', x: 300, y: 230, scale: 1, rotation: 0.3 },
  { kind: 'bush', x: 380, y: 300, scale: 0.8, rotation: 0 },
  { kind: 'mossyRock', x: 250, y: 330, scale: 0.9, rotation: 0 },
  { kind: 'rock', x: 1010, y: 200, scale: 0.8, rotation: 0.4 },
  { kind: 'sprout', x: 960, y: 170, scale: 1, rotation: 0 },
  { kind: 'palm', x: 1180, y: 610, scale: 1.1, rotation: -0.2 },
  { kind: 'bush', x: 1230, y: 700, scale: 0.9, rotation: 0.5 },
  { kind: 'mossyRock', x: 1260, y: 600, scale: 0.8, rotation: 0 },
  { kind: 'rock', x: 470, y: 700, scale: 0.7, rotation: 0 },
  { kind: 'sprout', x: 1405, y: 250, scale: 1, rotation: 0.8 },
];

function toIsland(definition: IslandDefinition, tileSize: number): Island {
  const tiles: Rect = {
    x: definition.tileX * tileSize,
    y: definition.tileY * tileSize,
    width: definition.tilesWide * tileSize,
    height: definition.tilesHigh * tileSize,
  };
  return {
    id: definition.id,
    style: definition.style,
    tiles,
    collider: {
      x: tiles.x + COLLIDER_INSET,
      y: tiles.y + COLLIDER_INSET,
      width: tiles.width - COLLIDER_INSET * 2,
      height: tiles.height - COLLIDER_INSET * 2,
      cornerRadius: COLLIDER_CORNER_RADIUS,
    },
  };
}

export function createArenaLayout(arena: { width: number; height: number; tileSize: number }): ArenaLayout {
  return {
    width: arena.width,
    height: arena.height,
    tileSize: arena.tileSize,
    bounds: { x: 0, y: 0, width: arena.width, height: arena.height },
    islands: ISLAND_DEFINITIONS.map((definition) => toIsland(definition, arena.tileSize)),
    decorations: DECORATION_DEFINITIONS.map((decoration) => ({ ...decoration })),
    playerStart: { x: arena.width / 2, y: arena.height / 2, angle: -Math.PI / 2 },
  };
}
