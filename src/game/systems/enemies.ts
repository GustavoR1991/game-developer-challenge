import type { ChaserShip, EnemyShip, ShooterShip } from '../entities/types';
import type { SimulationContext } from '../simulation/context';
import { angleTo, distanceSquared, shortestAngleDelta } from '../../utils/math';
import { applyDamage, emitShot, spawnProjectile } from './combat';
import { isAreaBlocked, resolveShipAgainstWorld, separateShips } from './collisions';
import { moveShip, throttleForHeading, turnInputToward } from './movement';

const MUZZLE_GAP = 4;

export function updateEnemies(context: SimulationContext, dt: number): void {
  for (const enemy of context.state.enemies) {
    if (!enemy.alive || context.state.status !== 'running') continue;
    if (enemy.kind === 'chaser') updateChaser(context, enemy, dt);
    else updateShooter(context, enemy, dt);
  }
  if (context.state.status === 'running') resolveShipContacts(context);
}

function navigationHeading(context: SimulationContext, enemy: EnemyShip, desiredAngle: number): number {
  const { lookAheadDistance, avoidanceAngles } = context.config.navigation;
  const probeRadius = enemy.radius * 0.8;
  const blocked = (angle: number): boolean =>
    isAreaBlocked(
      {
        x: enemy.position.x + Math.cos(angle) * lookAheadDistance,
        y: enemy.position.y + Math.sin(angle) * lookAheadDistance,
      },
      probeRadius,
      context.arena,
    );

  if (!blocked(desiredAngle)) return desiredAngle;

  for (const offset of avoidanceAngles) {
    const candidates = [desiredAngle - offset, desiredAngle + offset].sort(
      (a, b) => Math.abs(shortestAngleDelta(enemy.angle, a)) - Math.abs(shortestAngleDelta(enemy.angle, b)),
    );
    for (const candidate of candidates) {
      if (!blocked(candidate)) return candidate;
    }
  }
  return desiredAngle + Math.PI;
}

function updateChaser(context: SimulationContext, chaser: ChaserShip, dt: number): void {
  const stats = context.config.chaser;
  const { player } = context.state;
  const heading = navigationHeading(context, chaser, angleTo(chaser.position, player.position));
  const throttle = throttleForHeading(chaser, heading, context.config.navigation.minTurnThrottle);
  moveShip(chaser, stats, throttle, turnInputToward(chaser, heading, stats.turnSpeed, dt), dt);
  resolveShipAgainstWorld(chaser, context.arena);
}

function updateShooter(context: SimulationContext, shooter: ShooterShip, dt: number): void {
  const stats = context.config.shooter;
  const { player } = context.state;
  const aimAngle = angleTo(shooter.position, player.position);
  const distanceSq = distanceSquared(shooter.position, player.position);
  const approaching = distanceSq > stats.preferredDistance * stats.preferredDistance;
  const heading = approaching ? navigationHeading(context, shooter, aimAngle) : aimAngle;

  const throttle = approaching
    ? throttleForHeading(shooter, heading, context.config.navigation.minTurnThrottle)
    : 0;
  moveShip(shooter, stats, throttle, turnInputToward(shooter, heading, stats.turnSpeed, dt), dt);
  resolveShipAgainstWorld(shooter, context.arena);

  shooter.cooldown = Math.max(0, shooter.cooldown - dt);
  const inRange = distanceSq <= stats.attackRange * stats.attackRange;
  const aimed = Math.abs(shortestAngleDelta(shooter.angle, aimAngle)) <= stats.aimToleranceRadians;
  if (!inRange || !aimed || shooter.cooldown > 0 || !player.alive) return;

  const muzzle = shooter.radius + MUZZLE_GAP;
  const x = shooter.position.x + Math.cos(shooter.angle) * muzzle;
  const y = shooter.position.y + Math.sin(shooter.angle) * muzzle;
  spawnProjectile(context, 'enemy', x, y, shooter.angle, stats.cannon.projectile);
  emitShot(context, 'enemy', 'front', x, y, shooter.angle);
  shooter.cooldown = stats.cannon.cooldownSeconds;
}

function resolveShipContacts(context: SimulationContext): void {
  const { state } = context;
  const { player, enemies } = state;

  for (const enemy of enemies) {
    if (!enemy.alive || !player.alive || state.status !== 'running') continue;
    if (enemy.kind === 'chaser') {
      const reach = enemy.radius + player.radius;
      if (distanceSquared(enemy.position, player.position) <= reach * reach) {
        applyDamage(context, enemy, enemy.health, 'ram', false);
        applyDamage(context, player, context.config.chaser.ramDamage, 'ram', false);
      }
      continue;
    }
    if (separateShips(player, enemy)) {
      context.emit({ type: 'shipsCollided', x: player.position.x, y: player.position.y });
      resolveShipAgainstWorld(player, context.arena);
      resolveShipAgainstWorld(enemy, context.arena);
    }
  }

  for (let i = 0; i < enemies.length; i += 1) {
    const first = enemies[i];
    if (!first?.alive) continue;
    for (let j = i + 1; j < enemies.length; j += 1) {
      const second = enemies[j];
      if (!second?.alive) continue;
      if (separateShips(first, second)) {
        resolveShipAgainstWorld(first, context.arena);
        resolveShipAgainstWorld(second, context.arena);
      }
    }
  }
}
