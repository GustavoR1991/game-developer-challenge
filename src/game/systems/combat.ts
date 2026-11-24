import type { DeepReadonly, ProjectileConfig } from '../config/gameConfig';
import type { DestroyCause, PlayerWeapon, ProjectileOwner, Ship } from '../entities/types';
import type { SimulationContext } from '../simulation/context';

export function endMatch(context: SimulationContext, reason: 'time_up' | 'player_destroyed'): void {
  const { state } = context;
  if (state.status === 'ended') return;
  state.status = 'ended';
  state.endReason = reason;
  context.emit({ type: 'matchEnded', reason });
}

export function spawnProjectile(
  context: SimulationContext,
  owner: ProjectileOwner,
  x: number,
  y: number,
  angle: number,
  projectile: DeepReadonly<ProjectileConfig>,
): void {
  context.state.projectiles.push({
    id: context.nextId(),
    owner,
    position: { x, y },
    previousPosition: { x, y },
    velocityX: Math.cos(angle) * projectile.speed,
    velocityY: Math.sin(angle) * projectile.speed,
    speed: projectile.speed,
    damage: projectile.damage,
    radius: projectile.radius,
    remainingRange: projectile.maxRange,
    alive: true,
  });
}

export function emitShot(
  context: SimulationContext,
  owner: ProjectileOwner,
  weapon: PlayerWeapon,
  x: number,
  y: number,
  angle: number,
): void {
  if (owner === 'player') context.state.stats.shotsFired += 1;
  context.emit({ type: 'shotFired', owner, weapon, x, y, angle });
}

export function applyDamage(
  context: SimulationContext,
  ship: Ship,
  amount: number,
  cause: DestroyCause,
  awardsScore: boolean,
): void {
  const { state } = context;
  if (!ship.alive || state.status !== 'running' || amount <= 0) return;

  ship.health = Math.max(0, ship.health - amount);
  if (ship.kind === 'player') state.stats.damageTaken += amount;
  context.emit({
    type: 'shipDamaged',
    shipId: ship.id,
    kind: ship.kind,
    health: ship.health,
    maxHealth: ship.maxHealth,
  });

  if (ship.health > 0) return;

  ship.alive = false;
  ship.speed = 0;
  context.emit({
    type: 'shipDestroyed',
    shipId: ship.id,
    kind: ship.kind,
    cause,
    x: ship.position.x,
    y: ship.position.y,
    angle: ship.angle,
  });

  if (ship.kind === 'player') {
    endMatch(context, 'player_destroyed');
    return;
  }

  state.stats.enemiesDestroyed += 1;
  if (awardsScore) {
    state.score += 1;
    context.emit({ type: 'scoreChanged', score: state.score });
  }
}
