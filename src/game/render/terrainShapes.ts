import type { Vec2 } from '../../utils/math';
import type { Rect } from '../simulation/world/geometry';

export interface ShapeOptions {
  cellSize: number;
  cornerRadius: number;
  concaveRadius: number;
  wobble: number;
  wavelength: number;
  seed: number;
}

interface Grid {
  columns: number;
  rows: number;
  originX: number;
  originY: number;
  cells: boolean[];
}

const CORNER_STEPS = 8;
const RESAMPLE_SPACING = 8;

function rasterize(rects: readonly Rect[], cellSize: number): Grid {
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  const originX = minX - cellSize;
  const originY = minY - cellSize;
  const columns = Math.round((maxX - originX) / cellSize) + 1;
  const rows = Math.round((maxY - originY) / cellSize) + 1;
  const cells = new Array<boolean>(columns * rows).fill(false);
  for (const rect of rects) {
    const startColumn = Math.round((rect.x - originX) / cellSize);
    const startRow = Math.round((rect.y - originY) / cellSize);
    const endColumn = Math.round((rect.x + rect.width - originX) / cellSize);
    const endRow = Math.round((rect.y + rect.height - originY) / cellSize);
    for (let row = startRow; row < endRow; row += 1) {
      for (let column = startColumn; column < endColumn; column += 1) cells[row * columns + column] = true;
    }
  }
  return { columns, rows, originX, originY, cells };
}

function filled(grid: Grid, column: number, row: number): boolean {
  if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) return false;
  return grid.cells[row * grid.columns + column] ?? false;
}

function traceLoops(grid: Grid, cellSize: number): Vec2[][] {
  const edges = new Map<string, string>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (!filled(grid, column, row)) continue;
      if (!filled(grid, column, row - 1)) edges.set(key(column, row), key(column + 1, row));
      if (!filled(grid, column + 1, row)) edges.set(key(column + 1, row), key(column + 1, row + 1));
      if (!filled(grid, column, row + 1)) edges.set(key(column + 1, row + 1), key(column, row + 1));
      if (!filled(grid, column - 1, row)) edges.set(key(column, row + 1), key(column, row));
    }
  }

  const loops: Vec2[][] = [];
  while (edges.size > 0) {
    const first = edges.keys().next().value as string;
    const loop: Vec2[] = [];
    let current = first;
    for (let guard = 0; guard < 100_000; guard += 1) {
      const [x, y] = current.split(',').map(Number) as [number, number];
      loop.push({ x: grid.originX + x * cellSize, y: grid.originY + y * cellSize });
      const next = edges.get(current);
      edges.delete(current);
      if (!next || next === first) break;
      current = next;
    }
    loops.push(removeCollinear(loop));
  }
  return loops;
}

function removeCollinear(points: Vec2[]): Vec2[] {
  return points.filter((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    if (!previous || !next) return true;
    const cross = (point.x - previous.x) * (next.y - point.y) - (point.y - previous.y) * (next.x - point.x);
    return Math.abs(cross) > 1e-6;
  });
}

function roundCorners(points: readonly Vec2[], convexRadius: number, concaveRadius: number): Vec2[] {
  const result: Vec2[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    if (!point || !previous || !next) continue;
    const toPrevious = Math.hypot(previous.x - point.x, previous.y - point.y);
    const toNext = Math.hypot(next.x - point.x, next.y - point.y);
    const cross = (point.x - previous.x) * (next.y - point.y) - (point.y - previous.y) * (next.x - point.x);
    const radius = cross > 0 ? convexRadius : concaveRadius;
    const r = Math.min(radius, toPrevious / 2, toNext / 2);
    const start = {
      x: point.x + ((previous.x - point.x) / toPrevious) * r,
      y: point.y + ((previous.y - point.y) / toPrevious) * r,
    };
    const end = {
      x: point.x + ((next.x - point.x) / toNext) * r,
      y: point.y + ((next.y - point.y) / toNext) * r,
    };
    for (let step = 0; step <= CORNER_STEPS; step += 1) {
      const t = step / CORNER_STEPS;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      result.push({ x: a * start.x + b * point.x + c * end.x, y: a * start.y + b * point.y + c * end.y });
    }
  }
  return result;
}

function resample(points: readonly Vec2[], spacing: number): Vec2[] {
  const result: Vec2[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const from = points[index];
    const to = points[(index + 1) % points.length];
    if (!from || !to) continue;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.round(length / spacing));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      result.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    }
  }
  return result;
}

function wobble(points: readonly Vec2[], amplitude: number, wavelength: number, seed: number): Vec2[] {
  if (amplitude <= 0) return [...points];
  const phases = [seed * 1.7, seed * 2.3 + 1.1, seed * 0.9 + 2.4];
  let distance = 0;
  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length] ?? point;
    const next = points[(index + 1) % points.length] ?? point;
    if (index > 0) distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.hypot(tangentX, tangentY) || 1;
    const normalX = tangentY / length;
    const normalY = -tangentX / length;
    const s = distance / wavelength;
    const noise =
      Math.sin(s * 2.1 + (phases[0] ?? 0)) * 0.55 +
      Math.sin(s * 4.7 + (phases[1] ?? 0)) * 0.3 +
      Math.sin(s * 9.3 + (phases[2] ?? 0)) * 0.15;
    return { x: point.x + normalX * noise * amplitude, y: point.y + normalY * noise * amplitude };
  });
}

export function buildOutlines(rects: readonly Rect[], options: ShapeOptions): number[][] {
  if (rects.length === 0) return [];
  const grid = rasterize(rects, options.cellSize);
  return traceLoops(grid, options.cellSize).map((loop, index) => {
    const rounded = roundCorners(loop, options.cornerRadius, options.concaveRadius);
    const dense = resample(rounded, RESAMPLE_SPACING);
    const organic = wobble(dense, options.wobble, options.wavelength, options.seed + index);
    return organic.flatMap((point) => [point.x, point.y]);
  });
}
