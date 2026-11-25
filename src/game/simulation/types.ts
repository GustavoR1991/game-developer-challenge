import type { EnemyKind } from '../config/gameConfig';
import type { Vec2 } from '../../utils/math';

export type ShipKind = 'player' | EnemyKind;
export type ProjectileOwner = 'player' | 'enemy';
export type PlayerWeapon = 'front' | 'left' | 'right';
export type EndReason = 'time_up' | 'player_destroyed';
export type DestroyCause = 'projectile' | 'ram';

interface ShipBase {
  id: number;
  position: Vec2;
  previousPosition: Vec2;
  angle: number;
  previousAngle: number;
  speed: number;
  health: number;
  maxHealth: number;
  radius: number;
  alive: boolean;
}

export interface PlayerShip extends ShipBase {
  kind: 'player';
  cooldowns: Record<PlayerWeapon, number>;
}

export interface ChaserShip extends ShipBase {
  kind: 'chaser';
}

export interface ShooterShip extends ShipBase {
  kind: 'shooter';
  cooldown: number;
}

export type EnemyShip = ChaserShip | ShooterShip;
export type Ship = PlayerShip | EnemyShip;

export interface Projectile {
  id: number;
  owner: ProjectileOwner;
  position: Vec2;
  previousPosition: Vec2;
  velocityX: number;
  velocityY: number;
  speed: number;
  damage: number;
  radius: number;
  remainingRange: number;
  alive: boolean;
}

export type GameEvent =
  | { type: 'shotFired'; owner: ProjectileOwner; weapon: PlayerWeapon; x: number; y: number; angle: number }
  | { type: 'projectileImpact'; surface: 'ship' | 'island' | 'water'; x: number; y: number }
  | { type: 'shipDamaged'; shipId: number; kind: ShipKind; health: number; maxHealth: number }
  | {
      type: 'shipDestroyed';
      shipId: number;
      kind: ShipKind;
      cause: DestroyCause;
      x: number;
      y: number;
      angle: number;
    }
  | { type: 'shipsCollided'; x: number; y: number }
  | { type: 'enemySpawned'; shipId: number; kind: EnemyKind }
  | { type: 'scoreChanged'; score: number }
  | { type: 'matchEnded'; reason: EndReason };
