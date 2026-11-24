import type { EnemyKind, MatchConfig } from '../config/gameConfig';
import type { Random } from '../core/random';
import type { EndReason, EnemyShip, GameEvent, PlayerShip, Projectile } from '../entities/types';
import type { ArenaLayout } from '../world/arenaLayout';

export type MatchStatus = 'running' | 'ended';

export interface SpawnState {
  timer: number;
  spawned: number;
  spawnedByKind: Record<EnemyKind, number>;
  skipped: number;
}

export interface MatchStats {
  shotsFired: number;
  enemiesDestroyed: number;
  damageTaken: number;
}

export interface SimulationState {
  status: MatchStatus;
  endReason: EndReason | null;
  elapsedSeconds: number;
  score: number;
  player: PlayerShip;
  enemies: EnemyShip[];
  projectiles: Projectile[];
  spawn: SpawnState;
  stats: MatchStats;
}

export interface SimulationContext {
  readonly config: MatchConfig;
  readonly arena: ArenaLayout;
  readonly random: Random;
  readonly state: SimulationState;
  emit(event: GameEvent): void;
  nextId(): number;
}
