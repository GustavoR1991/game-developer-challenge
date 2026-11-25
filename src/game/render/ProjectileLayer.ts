import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Projectile } from '../simulation/types';
import { COLORS } from './renderConfig';

const TRAIL_LENGTH = 90;

export class ProjectileLayer extends Container {
  private readonly texture: Texture;
  private readonly pool: Sprite[] = [];
  private readonly trails = new Graphics();

  constructor(texture: Texture) {
    super();
    this.texture = texture;
    this.label = 'projectiles';
    this.eventMode = 'none';
    this.addChild(this.trails);
  }

  sync(projectiles: readonly Projectile[], alpha: number): void {
    this.trails.clear();
    for (let index = 0; index < projectiles.length; index += 1) {
      const projectile = projectiles[index];
      if (!projectile) continue;
      const sprite = this.spriteAt(index);
      sprite.visible = true;
      sprite.tint = projectile.owner === 'enemy' ? COLORS.enemyProjectile : 0xffffff;
      sprite.position.set(
        projectile.previousPosition.x + (projectile.position.x - projectile.previousPosition.x) * alpha,
        projectile.previousPosition.y + (projectile.position.y - projectile.previousPosition.y) * alpha,
      );
      sprite.setSize(projectile.radius * 2.2, projectile.radius * 2.2);
      const directionX = projectile.velocityX / projectile.speed;
      const directionY = projectile.velocityY / projectile.speed;
      const middleX = sprite.x - directionX * TRAIL_LENGTH * 0.45;
      const middleY = sprite.y - directionY * TRAIL_LENGTH * 0.45;
      this.trails
        .moveTo(sprite.x, sprite.y)
        .lineTo(middleX, middleY)
        .stroke({ width: projectile.radius * 0.9, color: 0xffffff, alpha: 0.7, cap: 'round' })
        .moveTo(middleX, middleY)
        .lineTo(sprite.x - directionX * TRAIL_LENGTH, sprite.y - directionY * TRAIL_LENGTH)
        .stroke({ width: projectile.radius * 0.6, color: 0xffffff, alpha: 0.3, cap: 'round' });
    }
    for (let index = projectiles.length; index < this.pool.length; index += 1) {
      const sprite = this.pool[index];
      if (sprite) sprite.visible = false;
    }
  }

  get activeCount(): number {
    return this.pool.reduce((count, sprite) => count + (sprite.visible ? 1 : 0), 0);
  }

  private spriteAt(index: number): Sprite {
    const existing = this.pool[index];
    if (existing) return existing;
    const sprite = new Sprite(this.texture);
    sprite.anchor.set(0.5);
    this.pool.push(sprite);
    this.addChild(sprite);
    return sprite;
  }
}
