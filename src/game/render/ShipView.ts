import { Container, Sprite, type Spritesheet, type Texture } from 'pixi.js';
import { frame } from '../assets/combatAssets';
import type { Ship, ShipKind } from '../entities/types';
import { shortestAngleDelta } from '../../utils/math';
import { HealthBar, type HealthBarTextures } from './HealthBar';
import {
  COLORS,
  damageStage,
  EFFECT_DURATIONS,
  FIRE_POSITIONS,
  HEALTH_BAR,
  SHIP_SCALE,
  shipFrameName,
  SPRITE_FORWARD_OFFSET,
} from './renderConfig';

const FIRE_FRAME_SECONDS = 0.12;

export class ShipView extends Container {
  readonly shipId: number;
  readonly kind: ShipKind;
  private readonly ships: Spritesheet;
  private readonly hull: Container;
  private readonly body: Sprite;
  private readonly fires: Sprite[];
  private readonly fireTextures: readonly Texture[];
  private readonly healthBar: HealthBar;
  private stage = -1;
  private flashRemaining = 0;
  private fireClock = 0;

  constructor(ship: Ship, ships: Spritesheet, healthBars: HealthBarTextures) {
    super();
    this.shipId = ship.id;
    this.kind = ship.kind;
    this.ships = ships;
    this.label = `ship-${ship.kind}-${ship.id}`;

    this.hull = new Container();
    this.hull.scale.set(SHIP_SCALE[ship.kind]);
    this.body = new Sprite(frame(ships, shipFrameName(ship.kind, 0)));
    this.body.anchor.set(0.5);
    this.hull.addChild(this.body);

    this.fireTextures = [frame(ships, 'fire_1'), frame(ships, 'fire_2')];
    this.fires = FIRE_POSITIONS.map((position) => {
      const fire = new Sprite(this.fireTextures[0]);
      fire.anchor.set(0.5, 0.85);
      fire.position.set(position.x, position.y);
      fire.visible = false;
      this.hull.addChild(fire);
      return fire;
    });

    this.healthBar = new HealthBar(healthBars, ship.kind === 'player' ? 'green' : 'red');
    this.healthBar.position.set(0, HEALTH_BAR.offsetY);

    this.addChild(this.hull, this.healthBar);
    this.sync(ship, 1);
  }

  flash(): void {
    this.flashRemaining = EFFECT_DURATIONS.hitFlash;
  }

  sync(ship: Ship, alpha: number): void {
    const x = ship.previousPosition.x + (ship.position.x - ship.previousPosition.x) * alpha;
    const y = ship.previousPosition.y + (ship.position.y - ship.previousPosition.y) * alpha;
    const angle = ship.previousAngle + shortestAngleDelta(ship.previousAngle, ship.angle) * alpha;
    this.position.set(x, y);
    this.hull.rotation = angle + SPRITE_FORWARD_OFFSET;
    this.healthBar.setRatio(ship.health / ship.maxHealth);

    const stage = Math.min(damageStage(ship.health, ship.maxHealth), 2);
    if (stage !== this.stage) {
      this.stage = stage;
      this.body.texture = frame(this.ships, shipFrameName(this.kind, stage));
      this.fires.forEach((fire, index) => {
        fire.visible = index < stage;
      });
    }
  }

  animate(frameSeconds: number): void {
    this.fireClock += frameSeconds;
    const fireFrame = Math.floor(this.fireClock / FIRE_FRAME_SECONDS) % this.fireTextures.length;
    for (const [index, fire] of this.fires.entries()) {
      if (!fire.visible) continue;
      fire.texture = this.fireTextures[(fireFrame + index) % this.fireTextures.length] ?? fire.texture;
    }

    if (this.flashRemaining > 0) {
      this.flashRemaining = Math.max(0, this.flashRemaining - frameSeconds);
      this.body.tint = this.flashRemaining > 0 ? COLORS.hitFlash : 0xffffff;
    }
  }
}
