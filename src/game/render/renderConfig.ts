import type { ShipKind } from '../entities/types';

export const SHIP_COLOR_INDEX: Readonly<Record<ShipKind, number>> = {
  player: 5,
  chaser: 2,
  shooter: 3,
};

export const SHIP_SCALE: Readonly<Record<ShipKind, number>> = {
  player: 0.82,
  chaser: 0.74,
  shooter: 0.82,
};

export const SHIP_COLOR_VARIANTS = 6;
export const WRECK_STAGE = 3;
export const DAMAGE_STAGE_THRESHOLDS: readonly number[] = [2 / 3, 1 / 3];

export const SPRITE_FORWARD_OFFSET = -Math.PI / 2;

export const HEALTH_BAR = {
  scale: 0.48,
  offsetY: -60,
  steps: 40,
};

export const FIRE_POSITIONS: readonly { x: number; y: number }[] = [
  { x: -12, y: -18 },
  { x: 14, y: 12 },
];

export const EFFECT_DURATIONS = {
  explosion: 0.6,
  muzzle: 0.16,
  splash: 0.45,
  islandHit: 0.35,
  wreck: 1.8,
  debris: 0.9,
  hitFlash: 0.14,
  shake: 0.25,
};

export const COLORS = {
  deepWater: 0x1b6fa8,
  splash: 0xd7f3ff,
  islandDust: 0xc9b38a,
  hitFlash: 0xff7a6b,
  enemyProjectile: 0xffd0c0,
};

export function damageStage(health: number, maxHealth: number): number {
  if (health <= 0) return WRECK_STAGE;
  const ratio = health / maxHealth;
  let stage = 0;
  for (const threshold of DAMAGE_STAGE_THRESHOLDS) {
    if (ratio <= threshold) stage += 1;
  }
  return stage;
}

export function shipFrameName(kind: ShipKind, stage: number): string {
  return `ship_${SHIP_COLOR_INDEX[kind] + SHIP_COLOR_VARIANTS * stage}`;
}
