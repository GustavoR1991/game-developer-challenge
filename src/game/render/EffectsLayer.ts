import { Container, Graphics, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import { frame } from './combatTextures';
import type { ShipKind } from '../simulation/types';
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
const SURVIVOR_SECONDS = 7;
const SURVIVOR_FADE_SECONDS = 1.5;
const SURVIVOR_RING_RADIUS = 22;

interface Floater {
  container: Container;
  age: number;
  duration: number;
  velocityX: number;
  velocityY: number;
  spin: number;
  bobPhase: number;
}

export class EffectsLayer {
  readonly below: Container;
  readonly above: Container;
  private readonly active: Effect[] = [];
  private readonly free: Sprite[] = [];
  private readonly ships: Spritesheet;
  private readonly explosionFrames: readonly Texture[];
  private readonly debrisTextures: readonly Texture[];
  private readonly smallBlast: Texture;
  private readonly crewTextures: readonly Texture[];
  private readonly dinghyTextures: readonly Texture[];
  private readonly floaters: Floater[] = [];

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
    this.crewTextures = [1, 2, 3, 4, 5, 6].map((index) => frame(ships, `crew_${index}`));
    this.dinghyTextures = [1, 2, 3].map((index) => frame(ships, `dinghy_small_${index}`));
  }

  get activeCount(): number {
    return this.active.length + this.floaters.length;
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

  survivors(x: number, y: number, angle: number, seed: number): void {
    const sideX = Math.cos(angle + Math.PI / 2);
    const sideY = Math.sin(angle + Math.PI / 2);
    for (let index = 0; index < 2; index += 1) {
      const direction = index === 0 ? 1 : -1;
      const container = new Container();
      const ring = new Graphics()
        .circle(0, 0, SURVIVOR_RING_RADIUS)
        .stroke({ width: 4, color: 0xffffff, alpha: 0.85 })
        .circle(0, 0, SURVIVOR_RING_RADIUS + 10)
        .stroke({ width: 3, color: 0xffffff, alpha: 0.25 });
      const crew = new Sprite(
        this.crewTextures[(seed + index) % this.crewTextures.length] ?? this.smallBlast,
      );
      crew.anchor.set(0.5);
      crew.scale.set(1.3);
      container.addChild(ring, crew);
      container.position.set(x + sideX * 46 * direction, y + sideY * 46 * direction);
      container.rotation = angle + index;
      this.below.addChild(container);
      this.floaters.push({
        container,
        age: 0,
        duration: SURVIVOR_SECONDS,
        velocityX: sideX * 14 * direction,
        velocityY: sideY * 14 * direction,
        spin: 0.3 * direction,
        bobPhase: seed + index,
      });
    }
    const dinghy = new Sprite(this.dinghyTextures[seed % this.dinghyTextures.length] ?? this.smallBlast);
    dinghy.anchor.set(0.5);
    dinghy.scale.set(1.2);
    const boat = new Container();
    boat.addChild(dinghy);
    boat.position.set(x - Math.cos(angle) * 50, y - Math.sin(angle) * 50);
    boat.rotation = angle + 0.8;
    this.below.addChild(boat);
    this.floaters.push({
      container: boat,
      age: 0,
      duration: SURVIVOR_SECONDS + 1,
      velocityX: -Math.cos(angle) * 10,
      velocityY: -Math.sin(angle) * 10,
      spin: 0.12,
      bobPhase: seed,
    });
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

  private updateFloaters(frameSeconds: number): void {
    for (let index = this.floaters.length - 1; index >= 0; index -= 1) {
      const floater = this.floaters[index];
      if (!floater) continue;
      floater.age += frameSeconds;
      if (floater.age >= floater.duration) {
        floater.container.destroy({ children: true });
        this.floaters.splice(index, 1);
        continue;
      }
      const slow = Math.max(0, 1 - floater.age / floater.duration);
      floater.container.x += floater.velocityX * frameSeconds * slow;
      floater.container.y += floater.velocityY * frameSeconds * slow;
      floater.container.rotation += floater.spin * frameSeconds * slow;
      floater.container.scale.set(1 + Math.sin(floater.age * 3 + floater.bobPhase) * 0.04);
      const fadeStart = floater.duration - SURVIVOR_FADE_SECONDS;
      floater.container.alpha =
        floater.age > fadeStart ? 1 - (floater.age - fadeStart) / SURVIVOR_FADE_SECONDS : 1;
    }
  }

  update(frameSeconds: number): void {
    this.updateFloaters(frameSeconds);
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
    for (const floater of this.floaters) floater.container.destroy({ children: true });
    this.floaters.length = 0;
    for (const sprite of this.free) sprite.destroy();
    this.free.length = 0;
    this.below.destroy({ children: true });
    this.above.destroy({ children: true });
  }
}
