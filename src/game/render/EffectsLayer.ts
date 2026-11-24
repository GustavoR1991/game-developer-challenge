import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import { frame } from '../assets/combatAssets';
import type { ShipKind } from '../entities/types';
import {
  COLORS,
  EFFECT_DURATIONS,
  SHIP_SCALE,
  shipFrameName,
  SPRITE_FORWARD_OFFSET,
  WRECK_STAGE,
} from './renderConfig';

interface Effect {
  sprite: Sprite;
  age: number;
  duration: number;
  frames: readonly Texture[] | null;
  velocityX: number;
  velocityY: number;
  spin: number;
  startScale: number;
  endScale: number;
  startAlpha: number;
}

interface EffectSpec {
  texture: Texture;
  x: number;
  y: number;
  duration: number;
  frames?: readonly Texture[];
  rotation?: number;
  velocityX?: number;
  velocityY?: number;
  spin?: number;
  startScale?: number;
  endScale?: number;
  startAlpha?: number;
  tint?: number;
  layer?: 'below' | 'above';
}

const DEBRIS_PIECES = 4;

export class EffectsLayer {
  readonly below: Container;
  readonly above: Container;
  private readonly active: Effect[] = [];
  private readonly free: Sprite[] = [];
  private readonly ships: Spritesheet;
  private readonly explosionFrames: readonly Texture[];
  private readonly debrisTextures: readonly Texture[];
  private readonly smallBlast: Texture;

  constructor(ships: Spritesheet) {
    this.ships = ships;
    this.below = new Container({ label: 'effects-below' });
    this.above = new Container({ label: 'effects-above' });
    this.below.eventMode = 'none';
    this.above.eventMode = 'none';
    this.explosionFrames = [
      frame(ships, 'explosion_3'),
      frame(ships, 'explosion_2'),
      frame(ships, 'explosion_1'),
    ];
    this.debrisTextures = ['wood_1', 'wood_2', 'wood_3', 'wood_4'].map((name) => frame(ships, name));
    this.smallBlast = frame(ships, 'explosion_3');
  }

  get activeCount(): number {
    return this.active.length;
  }

  muzzleFlash(x: number, y: number, angle: number): void {
    this.spawn({
      texture: this.smallBlast,
      x,
      y,
      duration: EFFECT_DURATIONS.muzzle,
      rotation: angle,
      startScale: 0.35,
      endScale: 0.7,
      tint: 0xfff1c4,
      layer: 'above',
    });
  }

  splash(x: number, y: number): void {
    this.spawn({
      texture: this.smallBlast,
      x,
      y,
      duration: EFFECT_DURATIONS.splash,
      startScale: 0.2,
      endScale: 0.6,
      startAlpha: 0.8,
      tint: COLORS.splash,
      layer: 'below',
    });
  }

  islandHit(x: number, y: number): void {
    this.spawn({
      texture: this.smallBlast,
      x,
      y,
      duration: EFFECT_DURATIONS.islandHit,
      startScale: 0.25,
      endScale: 0.55,
      tint: COLORS.islandDust,
      layer: 'above',
    });
  }

  shipHit(x: number, y: number): void {
    this.spawn({
      texture: this.smallBlast,
      x,
      y,
      duration: EFFECT_DURATIONS.muzzle * 1.5,
      startScale: 0.4,
      endScale: 0.8,
      layer: 'above',
    });
  }

  explosion(x: number, y: number, scale: number): void {
    this.spawn({
      texture: this.explosionFrames[0] ?? this.smallBlast,
      frames: this.explosionFrames,
      x,
      y,
      duration: EFFECT_DURATIONS.explosion,
      startScale: 0.6 * scale,
      endScale: 1.3 * scale,
      layer: 'above',
    });
    for (let piece = 0; piece < DEBRIS_PIECES; piece += 1) {
      const direction = (piece / DEBRIS_PIECES) * Math.PI * 2 + x * 0.01;
      this.spawn({
        texture: this.debrisTextures[piece % this.debrisTextures.length] ?? this.smallBlast,
        x,
        y,
        duration: EFFECT_DURATIONS.debris,
        rotation: direction,
        velocityX: Math.cos(direction) * 70,
        velocityY: Math.sin(direction) * 70,
        spin: piece % 2 === 0 ? 4 : -4,
        startScale: 0.7,
        endScale: 0.5,
        layer: 'below',
      });
    }
  }

  wreck(kind: ShipKind, x: number, y: number, angle: number): void {
    this.spawn({
      texture: frame(this.ships, shipFrameName(kind, WRECK_STAGE)),
      x,
      y,
      duration: EFFECT_DURATIONS.wreck,
      rotation: angle + SPRITE_FORWARD_OFFSET,
      spin: 0.25,
      startScale: SHIP_SCALE[kind],
      endScale: SHIP_SCALE[kind] * 0.8,
      layer: 'below',
    });
  }

  update(frameSeconds: number): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const effect = this.active[index];
      if (!effect) continue;
      effect.age += frameSeconds;
      const progress = Math.min(1, effect.age / effect.duration);
      if (progress >= 1) {
        this.release(index);
        continue;
      }
      const { sprite } = effect;
      sprite.x += effect.velocityX * frameSeconds;
      sprite.y += effect.velocityY * frameSeconds;
      sprite.rotation += effect.spin * frameSeconds;
      sprite.scale.set(effect.startScale + (effect.endScale - effect.startScale) * progress);
      sprite.alpha = effect.startAlpha * (1 - progress * progress);
      if (effect.frames && effect.frames.length > 0) {
        const frameIndex = Math.min(effect.frames.length - 1, Math.floor(progress * effect.frames.length));
        sprite.texture = effect.frames[frameIndex] ?? sprite.texture;
      }
    }
  }

  clear(): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) this.release(index);
  }

  private spawn(spec: EffectSpec): void {
    const sprite = this.free.pop() ?? new Sprite();
    sprite.texture = spec.texture;
    sprite.anchor.set(0.5);
    sprite.position.set(spec.x, spec.y);
    sprite.rotation = spec.rotation ?? 0;
    sprite.tint = spec.tint ?? 0xffffff;
    sprite.alpha = spec.startAlpha ?? 1;
    sprite.scale.set(spec.startScale ?? 1);
    sprite.visible = true;
    (spec.layer === 'below' ? this.below : this.above).addChild(sprite);
    this.active.push({
      sprite,
      age: 0,
      duration: spec.duration,
      frames: spec.frames ?? null,
      velocityX: spec.velocityX ?? 0,
      velocityY: spec.velocityY ?? 0,
      spin: spec.spin ?? 0,
      startScale: spec.startScale ?? 1,
      endScale: spec.endScale ?? 1,
      startAlpha: spec.startAlpha ?? 1,
    });
  }

  private release(index: number): void {
    const [effect] = this.active.splice(index, 1);
    if (!effect) return;
    effect.sprite.removeFromParent();
    effect.sprite.visible = false;
    this.free.push(effect.sprite);
  }

  destroy(): void {
    this.clear();
    for (const sprite of this.free) sprite.destroy();
    this.free.length = 0;
    this.below.destroy({ children: true });
    this.above.destroy({ children: true });
  }
}
