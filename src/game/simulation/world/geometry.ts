import type { Vec2 } from '../../../utils/math';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoundedRect extends Rect {
  cornerRadius: number;
}

export interface Penetration {
  normalX: number;
  normalY: number;
  depth: number;
}

export function circleRoundedRectPenetration(
  center: Vec2,
  radius: number,
  shape: RoundedRect,
): Penetration | null {
  const corner = Math.min(shape.cornerRadius, shape.width / 2, shape.height / 2);
  const innerLeft = shape.x + corner;
  const innerTop = shape.y + corner;
  const innerRight = shape.x + shape.width - corner;
  const innerBottom = shape.y + shape.height - corner;

  const closestX = Math.min(Math.max(center.x, innerLeft), innerRight);
  const closestY = Math.min(Math.max(center.y, innerTop), innerBottom);
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  const distanceSq = dx * dx + dy * dy;
  const reach = radius + corner;

  if (distanceSq >= reach * reach) return null;

  if (distanceSq > 1e-9) {
    const dist = Math.sqrt(distanceSq);
    return { normalX: dx / dist, normalY: dy / dist, depth: reach - dist };
  }

  const toLeft = center.x - shape.x;
  const toRight = shape.x + shape.width - center.x;
  const toTop = center.y - shape.y;
  const toBottom = shape.y + shape.height - center.y;
  const nearest = Math.min(toLeft, toRight, toTop, toBottom);

  if (nearest === toLeft) return { normalX: -1, normalY: 0, depth: toLeft + radius };
  if (nearest === toRight) return { normalX: 1, normalY: 0, depth: toRight + radius };
  if (nearest === toTop) return { normalX: 0, normalY: -1, depth: toTop + radius };
  return { normalX: 0, normalY: 1, depth: toBottom + radius };
}

export function circleIntersectsRoundedRect(center: Vec2, radius: number, shape: RoundedRect): boolean {
  return circleRoundedRectPenetration(center, radius, shape) !== null;
}

export function circleInsideRect(center: Vec2, radius: number, rect: Rect): boolean {
  return (
    center.x - radius >= rect.x &&
    center.x + radius <= rect.x + rect.width &&
    center.y - radius >= rect.y &&
    center.y + radius <= rect.y + rect.height
  );
}
