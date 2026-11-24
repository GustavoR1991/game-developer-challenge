import { Container, Sprite, type Texture } from 'pixi.js';
import type { Projectile } from '../entities/types';
import { COLORS } from './renderConfig';

export class ProjectileLayer extends Container {
  private readonly texture: Texture;
  private readonly pool: Sprite[] = [];

  constructor(texture: Texture) {
    super();
    this.texture = texture;
    this.label = 'projectiles';
    this.eventMode = 'none';
  }

  sync(projectiles: readonly Projectile[], alpha: number): void {
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
