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
  | 'wallCannonHorizontal'
  | 'gate'
  | 'dinghy'
  | 'dinghyLarge'
  | 'looseCannon'
  | 'crew';

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LandmassDefinition {
  id: string;
  sand: readonly TileRect[];
  grass: readonly TileRect[];
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
  grass: Rect[];
}

export interface ArenaLayout {
  width: number;
  height: number;
  tileSize: number;
  bounds: Rect;
  view: { width: number; height: number };
  landmasses: Landmass[];
  islands: Island[];
  decorations: Decoration[];
  playerStart: Vec2 & { angle: number };
}

const COLLIDER_INSET_RATIO = 0.04;
const COLLIDER_CORNER_RATIO = 0.55;

export const LANDMASS_DEFINITIONS: readonly LandmassDefinition[] = [
  {
    id: 'fortress',
    sand: [
      { x: 1, y: 1, w: 8.5, h: 2.5 },
      { x: 2, y: 3.5, w: 4.5, h: 2.5 },
      { x: 6.5, y: 3.5, w: 1.5, h: 1 },
    ],
    grass: [
      { x: 3, y: 1.5, w: 5, h: 2 },
      { x: 3, y: 3.5, w: 3, h: 1.5 },
    ],
  },
  {
    id: 'bay',
    sand: [
      { x: 7, y: 9.5, w: 6, h: 2.5 },
      { x: 13, y: 7.5, w: 8, h: 4.5 },
    ],
    grass: [
      { x: 8, y: 10.5, w: 4.5, h: 1 },
      { x: 15, y: 8.5, w: 5, h: 3 },
    ],
  },
  {
    id: 'grove',
    sand: [{ x: 16, y: 1.5, w: 3, h: 2.5 }],
    grass: [{ x: 16.5, y: 2, w: 2, h: 1.5 }],
  },
  { id: 'reef', sand: [{ x: 13.5, y: 3.5, w: 1.5, h: 1.5 }], grass: [] },
  { id: 'cove', sand: [{ x: 1, y: 8, w: 2.5, h: 2.5 }], grass: [] },
];

export const DECORATION_DEFINITIONS: readonly DecorationDefinition[] = [
  { kind: 'tower', tileX: 2.5, tileY: 1.9, scale: 1, rotation: 0 },
  { kind: 'wallCannonHorizontal', tileX: 3.5, tileY: 1.9, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 4.5, tileY: 1.9, scale: 1, rotation: 0 },
  { kind: 'wallHorizontal', tileX: 5.5, tileY: 1.9, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 6.5, tileY: 1.9, scale: 1, rotation: 0 },
  { kind: 'wallCannon', tileX: 4.5, tileY: 2.9, scale: 1, rotation: 0 },
  { kind: 'wallCannon', tileX: 6.5, tileY: 2.9, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 4.5, tileY: 3.9, scale: 1, rotation: 0 },
  { kind: 'gate', tileX: 5.5, tileY: 3.9, scale: 1, rotation: 0 },
  { kind: 'tower', tileX: 6.5, tileY: 3.9, scale: 1, rotation: 0 },
  { kind: 'palm', tileX: 2.4, tileY: 4.2, scale: 1.1, rotation: 0.3 },
  { kind: 'palm', tileX: 3.2, tileY: 5.4, scale: 0.85, rotation: -0.4 },
  { kind: 'bush', tileX: 7.8, tileY: 1.6, scale: 0.9, rotation: 0.2 },
  { kind: 'mossyRock', tileX: 7.4, tileY: 4, scale: 0.9, rotation: 0 },
  { kind: 'rock', tileX: 1.5, tileY: 1.5, scale: 0.8, rotation: 0.4 },
  { kind: 'rock', tileX: 9, tileY: 2.9, scale: 0.6, rotation: 0.2 },
  { kind: 'palm', tileX: 17.5, tileY: 2.6, scale: 1, rotation: 0.2 },
  { kind: 'rock', tileX: 18.6, tileY: 3.6, scale: 0.6, rotation: 0.5 },
  { kind: 'rock', tileX: 14.2, tileY: 4.2, scale: 0.7, rotation: 0.4 },
  { kind: 'mossyRock', tileX: 1.9, tileY: 8.8, scale: 0.8, rotation: 0 },
  { kind: 'dinghyLarge', tileX: 2.9, tileY: 9.9, scale: 0.6, rotation: -0.7 },
  { kind: 'dinghy', tileX: 9.4, tileY: 9.9, scale: 0.55, rotation: 0.4 },
  { kind: 'mossyRock', tileX: 12.3, tileY: 10.9, scale: 0.9, rotation: 0 },
  { kind: 'dinghy', tileX: 13.8, tileY: 8, scale: 0.55, rotation: -0.5 },
  { kind: 'crew', tileX: 14.6, tileY: 8.1, scale: 0.3, rotation: 0.6 },
  { kind: 'looseCannon', tileX: 15.4, tileY: 7.95, scale: 0.42, rotation: -0.4 },
  { kind: 'palm', tileX: 18.6, tileY: 10.4, scale: 1.2, rotation: -0.2 },
  { kind: 'bush', tileX: 16.2, tileY: 9.4, scale: 0.8, rotation: 0.3 },
  { kind: 'looseCannon', tileX: 20.4, tileY: 8.3, scale: 0.4, rotation: 0.9 },
  { kind: 'dinghy', tileX: 10.2, tileY: 6.9, scale: 0.55, rotation: 1.9 },
];

function toRect(rect: TileRect, tileSize: number): Rect {
  return { x: rect.x * tileSize, y: rect.y * tileSize, width: rect.w * tileSize, height: rect.h * tileSize };
}

function toLandmass(definition: LandmassDefinition, tileSize: number): Landmass {
  return {
    id: definition.id,
    sand: definition.sand.map((rect) => toRect(rect, tileSize)),
    grass: definition.grass.map((rect) => toRect(rect, tileSize)),
  };
}

const EDGE_PROBE = 2;
const EDGE_STEP = 8;

function insideAny(x: number, y: number, rects: readonly Rect[]): boolean {
  return rects.some(
    (rect) => x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height,
  );
}

function sideCovered(
  rect: Rect,
  side: 'left' | 'right' | 'top' | 'bottom',
  others: readonly Rect[],
): boolean {
  const horizontal = side === 'top' || side === 'bottom';
  const length = horizontal ? rect.width : rect.height;
  for (let offset = EDGE_STEP / 2; offset < length; offset += EDGE_STEP) {
    const x =
      side === 'left'
        ? rect.x - EDGE_PROBE
        : side === 'right'
          ? rect.x + rect.width + EDGE_PROBE
          : rect.x + offset;
    const y =
      side === 'top'
        ? rect.y - EDGE_PROBE
        : side === 'bottom'
          ? rect.y + rect.height + EDGE_PROBE
          : rect.y + offset;
    if (!insideAny(x, y, others)) return false;
  }
  return true;
}

function toIslands(landmass: Landmass, tileSize: number): Island[] {
  const inset = tileSize * COLLIDER_INSET_RATIO;
  const corner = tileSize * COLLIDER_CORNER_RATIO;
  return landmass.sand.map((tiles, index) => {
    const others = landmass.sand.filter((_, other) => other !== index);
    const grow = (side: 'left' | 'right' | 'top' | 'bottom') =>
      sideCovered(tiles, side, others) ? -(inset + corner) : inset;
    const left = tiles.x + grow('left');
    const top = tiles.y + grow('top');
    const right = tiles.x + tiles.width - grow('right');
    const bottom = tiles.y + tiles.height - grow('bottom');
    return {
      id: `${landmass.id}-${index}`,
      tiles,
      collider: {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        cornerRadius: Math.min(corner, (bottom - top) / 2, (right - left) / 2),
      },
    };
  });
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
