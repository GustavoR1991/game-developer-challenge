import type { PlayerWeapon } from '../entities/types';
import type { InputCommands } from '../input/commands';
import type { SimulationContext } from '../simulation/context';
import { emitShot, spawnProjectile } from './combat';
import { resolveShipAgainstWorld } from './collisions';
import { moveShip } from './movement';

const MUZZLE_GAP = 4;

export function updatePlayer(context: SimulationContext, input: InputCommands, dt: number): void {
  const { player } = context.state;
  const stats = context.config.player;
  if (!player.alive) return;

  const turn = (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
  moveShip(player, stats, input.forward ? 1 : 0, turn, dt);
  resolveShipAgainstWorld(player, context.arena);

  player.cooldowns.front = Math.max(0, player.cooldowns.front - dt);
  player.cooldowns.left = Math.max(0, player.cooldowns.left - dt);
  player.cooldowns.right = Math.max(0, player.cooldowns.right - dt);

  if (input.fireFront && player.cooldowns.front <= 0) fireFrontCannon(context);
  if (input.fireLeft && player.cooldowns.left <= 0) fireBroadside(context, 'left');
  if (input.fireRight && player.cooldowns.right <= 0) fireBroadside(context, 'right');
}

function fireFrontCannon(context: SimulationContext): void {
  const { player } = context.state;
  const weapon = context.config.player.frontCannon;
  const distance = player.radius + MUZZLE_GAP;
  const x = player.position.x + Math.cos(player.angle) * distance;
  const y = player.position.y + Math.sin(player.angle) * distance;

  spawnProjectile(context, 'player', x, y, player.angle, weapon.projectile);
  emitShot(context, 'player', 'front', x, y, player.angle);
  player.cooldowns.front = weapon.cooldownSeconds;
}

function fireBroadside(context: SimulationContext, side: Exclude<PlayerWeapon, 'front'>): void {
  const { player } = context.state;
  const weapon = context.config.player.broadside;
  const sideAngle = player.angle + (side === 'left' ? -Math.PI / 2 : Math.PI / 2);
  const forwardX = Math.cos(player.angle);
  const forwardY = Math.sin(player.angle);
  const sideX = Math.cos(sideAngle);
  const sideY = Math.sin(sideAngle);
  const sideDistance = player.radius * 0.6 + MUZZLE_GAP;
  const middle = (weapon.projectileCount - 1) / 2;

  for (let index = 0; index < weapon.projectileCount; index += 1) {
    const offset = (index - middle) * weapon.spacing;
    const x = player.position.x + forwardX * offset + sideX * sideDistance;
    const y = player.position.y + forwardY * offset + sideY * sideDistance;
    spawnProjectile(context, 'player', x, y, sideAngle, weapon.projectile);
  }

  emitShot(
    context,
    'player',
    side,
    player.position.x + sideX * sideDistance,
    player.position.y + sideY * sideDistance,
    sideAngle,
  );
  player.cooldowns[side] = weapon.cooldownSeconds;
}
