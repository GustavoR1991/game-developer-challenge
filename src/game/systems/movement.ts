import type { DeepReadonly, ShipStats } from '../config/gameConfig';
import type { Ship } from '../entities/types';
import { approach, clamp, shortestAngleDelta, wrapAngle } from '../../utils/math';

export function moveShip(
  ship: Ship,
  stats: DeepReadonly<ShipStats>,
  throttle: number,
  turn: number,
  dt: number,
): void {
  ship.angle = wrapAngle(ship.angle + clamp(turn, -1, 1) * stats.turnSpeed * dt);
  ship.speed = approach(ship.speed, clamp(throttle, 0, 1) * stats.moveSpeed, stats.acceleration * dt);
  ship.position.x += Math.cos(ship.angle) * ship.speed * dt;
  ship.position.y += Math.sin(ship.angle) * ship.speed * dt;
}

export function turnInputToward(ship: Ship, targetAngle: number, turnSpeed: number, dt: number): number {
  const maxStep = turnSpeed * dt;
  if (maxStep <= 0) return 0;
  return clamp(shortestAngleDelta(ship.angle, targetAngle) / maxStep, -1, 1);
}
