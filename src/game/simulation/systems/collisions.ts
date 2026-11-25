import type { Ship } from '../types';
import type { ArenaLayout } from '../world/arenaLayout';
import {
  circleInsideRect,
  circleIntersectsRoundedRect,
  circleRoundedRectPenetration,
} from '../world/geometry';
import { clamp, type Vec2 } from '../../../utils/math';

const MAX_RESOLVE_PASSES = 3;

export function resolveShipAgainstWorld(ship: Ship, arena: ArenaLayout): boolean {
  let collided = false;

  for (let pass = 0; pass < MAX_RESOLVE_PASSES; pass += 1) {
    let pushed = false;
    for (const island of arena.islands) {
      const penetration = circleRoundedRectPenetration(ship.position, ship.radius, island.collider);
      if (!penetration) continue;
      ship.position.x += penetration.normalX * penetration.depth;
      ship.position.y += penetration.normalY * penetration.depth;
      pushed = true;
      collided = true;
    }
    if (!pushed) break;
  }

  const clampedX = clamp(ship.position.x, ship.radius, arena.width - ship.radius);
  const clampedY = clamp(ship.position.y, ship.radius, arena.height - ship.radius);
  if (clampedX !== ship.position.x || clampedY !== ship.position.y) collided = true;
  ship.position.x = clampedX;
  ship.position.y = clampedY;

  return collided;
}

export function hitsIsland(point: Vec2, radius: number, arena: ArenaLayout): boolean {
  return arena.islands.some((island) => circleIntersectsRoundedRect(point, radius, island.collider));
}

export function isAreaBlocked(point: Vec2, radius: number, arena: ArenaLayout): boolean {
  return !circleInsideRect(point, radius, arena.bounds) || hitsIsland(point, radius, arena);
}

export function separateShips(a: Ship, b: Ship): boolean {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const minDistance = a.radius + b.radius;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= minDistance * minDistance) return false;

  const dist = Math.sqrt(distanceSq);
  const normalX = dist > 1e-6 ? dx / dist : 1;
  const normalY = dist > 1e-6 ? dy / dist : 0;
  const push = (minDistance - dist) / 2;
  a.position.x -= normalX * push;
  a.position.y -= normalY * push;
  b.position.x += normalX * push;
  b.position.y += normalY * push;
  return true;
}
