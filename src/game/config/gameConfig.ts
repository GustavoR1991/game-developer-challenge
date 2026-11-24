export const ENEMY_KINDS = ['chaser', 'shooter'] as const;
export type EnemyKind = (typeof ENEMY_KINDS)[number];

export interface ProjectileConfig {
  speed: number;
  damage: number;
  maxRange: number;
  radius: number;
}

export interface WeaponConfig {
  cooldownSeconds: number;
  projectile: ProjectileConfig;
}

export interface BroadsideConfig extends WeaponConfig {
  projectileCount: number;
  spacing: number;
}

export interface ShipStats {
  maxHealth: number;
  moveSpeed: number;
  acceleration: number;
  turnSpeed: number;
  collisionRadius: number;
}

export interface PlayerConfig extends ShipStats {
  frontCannon: WeaponConfig;
  broadside: BroadsideConfig;
}

export interface ChaserConfig extends ShipStats {
  ramDamage: number;
}

export interface ShooterConfig extends ShipStats {
  attackRange: number;
  preferredDistance: number;
  aimToleranceRadians: number;
  cannon: WeaponConfig;
}

export interface SpawnConfig {
  intervalSeconds: number;
  initialDelaySeconds: number;
  weights: Record<EnemyKind, number>;
  openingSequence: EnemyKind[];
  minDistanceFromPlayer: number;
  obstacleClearance: number;
  maxPlacementAttempts: number;
  maxAliveEnemies: number;
}

export interface NavigationConfig {
  lookAheadDistance: number;
  minTurnThrottle: number;
  avoidanceAngles: number[];
}

export interface ArenaConfig {
  width: number;
  height: number;
  tileSize: number;
}

export interface GameConfig {
  match: { durationSeconds: number };
  arena: ArenaConfig;
  spawn: SpawnConfig;
  navigation: NavigationConfig;
  player: PlayerConfig;
  chaser: ChaserConfig;
  shooter: ShooterConfig;
}

export interface MatchOptions {
  durationSeconds: number;
  spawnIntervalSeconds: number;
}

export const OPTION_LIMITS = {
  durationSeconds: { min: 60, max: 180, step: 1 },
  spawnIntervalSeconds: { min: 1, max: 10, step: 0.5 },
} as const;

export const DEFAULT_GAME_CONFIG: GameConfig = {
  match: { durationSeconds: 120 },
  arena: { width: 1536, height: 864, tileSize: 96 },
  spawn: {
    intervalSeconds: 4,
    initialDelaySeconds: 1.5,
    weights: { chaser: 0.55, shooter: 0.45 },
    openingSequence: ['chaser', 'shooter'],
    minDistanceFromPlayer: 480,
    obstacleClearance: 24,
    maxPlacementAttempts: 40,
    maxAliveEnemies: 10,
  },
  navigation: {
    lookAheadDistance: 90,
    minTurnThrottle: 0.2,
    avoidanceAngles: [0.45, 0.9, 1.35, 1.8, 2.4],
  },
  player: {
    maxHealth: 100,
    moveSpeed: 150,
    acceleration: 260,
    turnSpeed: 2.6,
    collisionRadius: 30,
    frontCannon: {
      cooldownSeconds: 0.5,
      projectile: { speed: 480, damage: 20, maxRange: 520, radius: 6 },
    },
    broadside: {
      cooldownSeconds: 1.6,
      projectileCount: 3,
      spacing: 26,
      projectile: { speed: 420, damage: 20, maxRange: 380, radius: 6 },
    },
  },
  chaser: {
    maxHealth: 40,
    moveSpeed: 100,
    acceleration: 200,
    turnSpeed: 2,
    collisionRadius: 27,
    ramDamage: 20,
  },
  shooter: {
    maxHealth: 60,
    moveSpeed: 80,
    acceleration: 160,
    turnSpeed: 1.7,
    collisionRadius: 30,
    attackRange: 420,
    preferredDistance: 300,
    aimToleranceRadians: 0.18,
    cannon: {
      cooldownSeconds: 2.2,
      projectile: { speed: 320, damage: 10, maxRange: 460, radius: 6 },
    },
  },
};

export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
  durationSeconds: DEFAULT_GAME_CONFIG.match.durationSeconds,
  spawnIntervalSeconds: DEFAULT_GAME_CONFIG.spawn.intervalSeconds,
};

export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export type MatchConfig = DeepReadonly<GameConfig>;

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

export function createMatchConfig(
  options: MatchOptions,
  base: GameConfig = DEFAULT_GAME_CONFIG,
): MatchConfig {
  const config = structuredClone(base);
  config.match.durationSeconds = options.durationSeconds;
  config.spawn.intervalSeconds = options.spawnIntervalSeconds;
  return deepFreeze(config);
}
