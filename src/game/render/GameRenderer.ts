import { Application, Container } from 'pixi.js';
import { frame, type CombatTextures } from '../assets/combatAssets';
import type { GameEvent, Ship } from '../entities/types';
import type { SimulationState } from '../simulation/context';
import type { ArenaLayout } from '../world/arenaLayout';
import { ArenaView } from './ArenaView';
import { EffectsLayer } from './EffectsLayer';
import { HealthBarTextures } from './HealthBar';
import { ProjectileLayer } from './ProjectileLayer';
import { COLORS, EFFECT_DURATIONS } from './renderConfig';
import { ShipView } from './ShipView';

const MAX_RESOLUTION = 2;
const SHAKE_STRENGTH = 6;

export interface RendererStats {
  ships: number;
  projectiles: number;
  effects: number;
}

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export class GameRenderer {
  readonly app: Application;
  private readonly arena: ArenaLayout;
  private readonly world: Container;
  private readonly shipLayer: Container;
  private readonly overlayLayer: Container;
  private readonly projectiles: ProjectileLayer;
  private readonly effects: EffectsLayer;
  private readonly healthBars: HealthBarTextures;
  private readonly shipViews = new Map<number, ShipView>();
  private readonly textures: CombatTextures;
  private viewport: ViewportTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  private shakeRemaining = 0;
  private destroyed = false;

  private constructor(app: Application, textures: CombatTextures, arena: ArenaLayout) {
    this.app = app;
    this.arena = arena;
    this.textures = textures;
    this.healthBars = new HealthBarTextures(frame(textures.ui, 'enemy_health_frame'), {
      green: frame(textures.ui, 'enemy_health_fill_green'),
      red: frame(textures.ui, 'enemy_health_fill_red'),
    });

    this.world = new Container({ label: 'world' });
    this.shipLayer = new Container({ label: 'ships' });
    this.overlayLayer = new Container({ label: 'overlays' });
    this.projectiles = new ProjectileLayer(frame(textures.ships, 'cannon_ball'));
    this.effects = new EffectsLayer(textures.ships);

    this.world.addChild(
      new ArenaView(textures.tiles, textures.water, arena),
      this.effects.below,
      this.shipLayer,
      this.projectiles,
      this.effects.above,
      this.overlayLayer,
    );
    app.stage.addChild(this.world);
    app.renderer.on('resize', this.layout);
    this.layout();
  }

  static async create(
    host: HTMLElement,
    textures: CombatTextures,
    arena: ArenaLayout,
  ): Promise<GameRenderer> {
    const app = new Application();
    await app.init({
      resizeTo: host,
      background: COLORS.deepWater,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, MAX_RESOLUTION),
      autoStart: false,
      sharedTicker: false,
    });
    app.canvas.setAttribute('aria-hidden', 'true');
    app.canvas.dataset.testid = 'game-canvas';
    host.appendChild(app.canvas);
    return new GameRenderer(app, textures, arena);
  }

  get transform(): ViewportTransform {
    return this.viewport;
  }

  get stats(): RendererStats {
    return {
      ships: this.shipViews.size,
      projectiles: this.projectiles.activeCount,
      effects: this.effects.activeCount,
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.viewport.offsetX) / this.viewport.scale,
      y: (screenY - this.viewport.offsetY) / this.viewport.scale,
    };
  }

  handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'shotFired':
          this.effects.muzzleFlash(event.x, event.y, event.angle);
          break;
        case 'projectileImpact':
          if (event.surface === 'water') this.effects.splash(event.x, event.y);
          else if (event.surface === 'island') this.effects.islandHit(event.x, event.y);
          else this.effects.shipHit(event.x, event.y);
          break;
        case 'shipDamaged':
          this.shipViews.get(event.shipId)?.flash();
          if (event.kind === 'player') this.shakeRemaining = EFFECT_DURATIONS.shake;
          break;
        case 'shipDestroyed':
          this.effects.wreck(event.kind, event.x, event.y, event.angle);
          this.effects.explosion(event.x, event.y, event.kind === 'player' ? 1.4 : 1);
          this.removeShipView(event.shipId);
          break;
        default:
          break;
      }
    }
  }

  sync(state: SimulationState, alpha: number): void {
    const seen = new Set<number>();
    const syncShip = (ship: Ship): void => {
      if (!ship.alive) return;
      seen.add(ship.id);
      let view = this.shipViews.get(ship.id);
      if (!view) {
        view = new ShipView(ship, this.textures.ships, this.healthBars);
        this.shipViews.set(ship.id, view);
        this.shipLayer.addChild(view);
      }
      view.sync(ship, alpha);
    };
    syncShip(state.player);
    for (const enemy of state.enemies) syncShip(enemy);
    for (const id of this.shipViews.keys()) {
      if (!seen.has(id)) this.removeShipView(id);
    }
    this.projectiles.sync(state.projectiles, alpha);
  }

  animate(frameSeconds: number): void {
    for (const view of this.shipViews.values()) view.animate(frameSeconds);
    this.effects.update(frameSeconds);
    if (this.shakeRemaining > 0) {
      this.shakeRemaining = Math.max(0, this.shakeRemaining - frameSeconds);
      const strength = (this.shakeRemaining / EFFECT_DURATIONS.shake) * SHAKE_STRENGTH;
      this.world.position.set(
        this.viewport.offsetX + (Math.random() - 0.5) * strength,
        this.viewport.offsetY + (Math.random() - 0.5) * strength,
      );
    } else {
      this.world.position.set(this.viewport.offsetX, this.viewport.offsetY);
    }
  }

  render(): void {
    if (!this.destroyed) this.app.render();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.renderer.off('resize', this.layout);
    this.effects.destroy();
    this.shipViews.clear();
    this.healthBars.destroy();
    this.app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
  }

  private removeShipView(id: number): void {
    const view = this.shipViews.get(id);
    if (!view) return;
    this.shipViews.delete(id);
    view.destroy({ children: true });
  }

  private readonly layout = (): void => {
    const { width, height } = this.app.screen;
    const scale = Math.min(width / this.arena.width, height / this.arena.height);
    this.viewport = {
      scale,
      offsetX: Math.round((width - this.arena.width * scale) / 2),
      offsetY: Math.round((height - this.arena.height * scale) / 2),
    };
    this.world.scale.set(scale);
    this.world.position.set(this.viewport.offsetX, this.viewport.offsetY);
  };
}
