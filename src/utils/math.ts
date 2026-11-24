export const TAU = Math.PI * 2;

export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

export function wrapAngle(angle: number): number {
  let wrapped = angle % TAU;
  if (wrapped <= -Math.PI) wrapped += TAU;
  if (wrapped > Math.PI) wrapped -= TAU;
  return wrapped;
}

export function shortestAngleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function distanceSquared(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt(distanceSquared(a, b));
}

export function circlesOverlap(a: Vec2, radiusA: number, b: Vec2, radiusB: number): boolean {
  const radii = radiusA + radiusB;
  return distanceSquared(a, b) <= radii * radii;
}
