import type { Projectile, Ship } from '../types';
import type { SimulationContext } from '../context';
import { circlesOverlap } from '../../../utils/math';
import { applyDamage } from './combat';
import { hitsIsland } from './collisions';

export function updateProjectiles(context: SimulationContext, dt: number): void {
  const { state, arena } = context;

  for (const projectile of state.projectiles) {
    if (!projectile.alive || state.status !== 'running') continue;

    projectile.position.x += projectile.velocityX * dt;
    projectile.position.y += projectile.velocityY * dt;
    projectile.remainingRange -= projectile.speed * dt;

    const { x, y } = projectile.position;
    if (x < 0 || y < 0 || x > arena.width || y > arena.height) {
      projectile.alive = false;
      continue;
    }

    if (hitsIsland(projectile.position, projectile.radius, arena)) {
      projectile.alive = false;
      context.emit({ type: 'projectileImpact', surface: 'island', x, y });
      continue;
    }

    const target = findTarget(context, projectile);
    if (target) {
      projectile.alive = false;
      context.emit({ type: 'projectileImpact', surface: 'ship', x, y });
      applyDamage(context, target, projectile.damage, 'projectile', projectile.owner === 'player');
      continue;
    }

    if (projectile.remainingRange <= 0) {
      projectile.alive = false;
      context.emit({ type: 'projectileImpact', surface: 'water', x, y });
    }
  }
}

function findTarget(context: SimulationContext, projectile: Projectile): Ship | null {
  const { player, enemies } = context.state;
  if (projectile.owner === 'enemy') {
    return player.alive &&
      circlesOverlap(projectile.position, projectile.radius, player.position, player.radius)
      ? player
      : null;
  }
  for (const enemy of enemies) {
    if (enemy.alive && circlesOverlap(projectile.position, projectile.radius, enemy.position, enemy.radius)) {
      return enemy;
    }
  }
  return null;
}
