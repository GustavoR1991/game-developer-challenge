import type { EnemyKind } from '../../config/gameConfig';
import type { EnemyShip } from '../types';
import type { SimulationContext } from '../context';
import { angleTo, circlesOverlap, distanceSquared, type Vec2 } from '../../../utils/math';
import { isAreaBlocked } from './collisions';

export function updateSpawner(context: SimulationContext, dt: number): void {
  const { state, config } = context;
  state.spawn.timer -= dt;
  while (state.spawn.timer <= 0 && state.status === 'running') {
    state.spawn.timer += config.spawn.intervalSeconds;
    trySpawnEnemy(context);
  }
}

function nextEnemyKind(context: SimulationContext): EnemyKind {
  const { openingSequence, weights } = context.config.spawn;
  return openingSequence[context.state.spawn.spawned] ?? context.random.weighted(weights);
}

function findSpawnPoint(context: SimulationContext, radius: number): Vec2 | null {
  const { config, arena, random, state } = context;
  const { minDistanceFromPlayer, obstacleClearance, maxPlacementAttempts } = config.spawn;
  const margin = radius + obstacleClearance;
  const minDistanceSq = minDistanceFromPlayer * minDistanceFromPlayer;

  for (let attempt = 0; attempt < maxPlacementAttempts; attempt += 1) {
    const point = {
      x: random.range(margin, arena.width - margin),
      y: random.range(margin, arena.height - margin),
    };
    if (distanceSquared(point, state.player.position) < minDistanceSq) continue;
    if (isAreaBlocked(point, radius + obstacleClearance, arena)) continue;
    const crowded = state.enemies.some(
      (enemy) => enemy.alive && circlesOverlap(point, margin, enemy.position, enemy.radius),
    );
    if (crowded) continue;
    return point;
  }
  return null;
}

function trySpawnEnemy(context: SimulationContext): void {
  const { state, config } = context;
  const alive = state.enemies.reduce((count, enemy) => count + (enemy.alive ? 1 : 0), 0);
  if (alive >= config.spawn.maxAliveEnemies) {
    state.spawn.skipped += 1;
    return;
  }

  const kind = nextEnemyKind(context);
  const stats = config[kind];
  const point = findSpawnPoint(context, stats.collisionRadius);
  if (!point) {
    state.spawn.skipped += 1;
    return;
  }

  const angle = angleTo(point, state.player.position);
  const base = {
    id: context.nextId(),
    position: point,
    previousPosition: { x: point.x, y: point.y },
    angle,
    previousAngle: angle,
    speed: 0,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,
    radius: stats.collisionRadius,
    alive: true,
  };
  const enemy: EnemyShip =
    kind === 'chaser'
      ? { ...base, kind }
      : { ...base, kind, cooldown: config.shooter.cannon.cooldownSeconds };

  state.enemies.push(enemy);
  state.spawn.spawned += 1;
  state.spawn.spawnedByKind[kind] += 1;
  context.emit({ type: 'enemySpawned', shipId: enemy.id, kind });
}
