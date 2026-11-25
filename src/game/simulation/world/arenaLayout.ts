import type { Vec2 } from '../../../utils/math';
import type { Rect, RoundedRect } from './geometry';

export type IslandStyle = 'sand' | 'grass';

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
  | 'wallCannonHorizontal'
  | 'gate'
  | 'dinghy'
  | 'dinghyLarge'
  | 'looseCannon'
  | 'crew';

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
  style: IslandStyle;
  tiles: Rect;
  collider: RoundedRect;
}

export interface ArenaLayout {
  width: number;
  height: number;
  tileSize: number;
  bounds: Rect;
  view: { width: number; height: number };
  islands: Island[];
  decorations: Decoration[];
  playerStart: Vec2 & { angle: number };
}

const COLLIDER_INSET_RATIO = 0.16;
const COLLIDER_CORNER_RATIO = 0.55;

export const ISLAND_DEFINITIONS: readonly IslandDefinition[] = [
  { id: 'fortress-0', style: 'sand', tileX: 2, tileY: 1, tilesWide: 6, tilesHigh: 4 },
  { id: 'reef-0', style: 'sand', tileX: 12, tileY: 1.5, tilesWide: 2, tilesHigh: 2 },
  { id: 'grove-0', style: 'grass', tileX: 16, tileY: 1, tilesWide: 4, tilesHigh: 4 },
  { id: 'cove-0', style: 'sand', tileX: 3, tileY: 8, tilesWide: 4, tilesHigh: 3 },
  { id: 'islet-0', style: 'sand', tileX: 9, tileY: 8.5, tilesWide: 2, tilesHigh: 2 },
  { id: 'bay-0', style: 'grass', tileX: 14, tileY: 7, tilesWide: 4, tilesHigh: 4 },
  { id: 'spit-0', style: 'sand', tileX: 19, tileY: 8.5, tilesWide: 2, tilesHigh: 2 },
];

export const DECORATION_DEFINITIONS: readonly DecorationDefinition[] = [
  { kind: 'tower', tileX: 2.6, tileY: 1.6, scale: 1, rotation: 0 },
  { kind: 'wallCannonHorizontal', tileX: 3.6, tileY: 1.6, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 4.6, tileY: 1.6, scale: 1, rotation: 0 },
  { kind: 'wallCannon', tileX: 4.6, tileY: 2.6, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 4.6, tileY: 3.6, scale: 1, rotation: 0 },
  { kind: 'gate', tileX: 5.6, tileY: 3.6, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 6.6, tileY: 3.6, scale: 1, rotation: 0 },
  { kind: 'palm', tileX: 7.1, tileY: 2, scale: 1, rotation: 0.3 },
  { kind: 'looseCannon', tileX: 6.2, tileY: 1.7, scale: 0.4, rotation: 0.6 },
  { kind: 'mossyRock', tileX: 2.9, tileY: 4.2, scale: 0.8, rotation: 0 },
  { kind: 'rock', tileX: 12.7, tileY: 2.3, scale: 0.75, rotation: 0.4 },
  { kind: 'sprout', tileX: 13.4, tileY: 2.9, scale: 0.8, rotation: 0 },
  { kind: 'palm', tileX: 17.4, tileY: 2.5, scale: 1, rotation: 0.2 },
  { kind: 'bush', tileX: 18.7, tileY: 3.4, scale: 0.8, rotation: 0 },
  { kind: 'rock', tileX: 3.8, tileY: 8.9, scale: 0.75, rotation: 0.3 },
  { kind: 'palm', tileX: 4.9, tileY: 9.5, scale: 1, rotation: -0.3 },
  { kind: 'looseCannon', tileX: 5.9, tileY: 8.8, scale: 0.4, rotation: -0.4 },
  { kind: 'dinghyLarge', tileX: 6.3, tileY: 10.3, scale: 0.6, rotation: -0.6 },
  { kind: 'mossyRock', tileX: 9.8, tileY: 9.4, scale: 0.8, rotation: 0 },
  { kind: 'palm', tileX: 15.4, tileY: 8.4, scale: 1, rotation: 0.4 },
  { kind: 'bush', tileX: 16.6, tileY: 9.7, scale: 0.8, rotation: 0.2 },
  { kind: 'rock', tileX: 19.6, tileY: 9.2, scale: 0.7, rotation: 0.2 },
  { kind: 'crew', tileX: 20.3, tileY: 9.8, scale: 0.3, rotation: 0.6 },
  { kind: 'dinghy', tileX: 8.2, tileY: 6.6, scale: 0.55, rotation: 0.9 },
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
  return {
    width: arena.width,
    height: arena.height,
    tileSize: arena.tileSize,
    bounds: { x: 0, y: 0, width: arena.width, height: arena.height },
    view: { width: arena.viewWidth, height: arena.viewHeight },
    islands: ISLAND_DEFINITIONS.map((definition) => toIsland(definition, arena.tileSize)),
    decorations: DECORATION_DEFINITIONS.map((definition) => toDecoration(definition, arena.tileSize)),
    playerStart: { x: arena.width / 2, y: arena.height / 2, angle: -Math.PI / 2 },
  };
}
