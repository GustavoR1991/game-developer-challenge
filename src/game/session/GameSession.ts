import type { Ticker } from 'pixi.js';
import type { CombatTextures } from '../render/combatTextures';
import {
  createMatchConfig,
  type GameConfig,
  type MatchConfig,
  type MatchOptions,
} from '../config/gameConfig';
import { FixedStepClock } from '../simulation/fixedStepClock';
import type { GameEvent } from '../simulation/types';
import { InputController } from '../input/InputController';
import type { InputAction } from '../input/commands';
import { GameRenderer } from '../render/GameRenderer';
import { GameSimulation } from '../simulation/GameSimulation';
import { createArenaLayout } from '../simulation/world/arenaLayout';
import { HudStore, type HudSnapshot, type PauseReason, type SessionPhase } from './HudStore';
import type { MatchResult } from './matchResult';

export interface GameSessionOptions {
  host: HTMLElement;
  textures: CombatTextures;
  options: MatchOptions;
  baseConfig?: GameConfig | undefined;
  seed: number;
  manualClock: boolean;
  resultDelaySeconds: number;
  createMatchId: () => string;
  onEnded: (result: MatchResult) => void;
  onEvents?: (events: readonly GameEvent[]) => void;
}

export const SIMULATION_STEP_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.25;
const MAX_ANIMATION_SECONDS = 0.1;
const MAX_MANUAL_ANIMATION_SECONDS = 2;

export class GameSession {
  readonly hud: HudStore;
  readonly input: InputController;
  readonly config: MatchConfig;
  readonly simulation: GameSimulation;
  readonly matchOptions: MatchOptions;
  private readonly renderer: GameRenderer;
  private readonly clock: FixedStepClock;
  private readonly options: GameSessionOptions;
  private phase: SessionPhase = 'running';
  private pauseReason: PauseReason | null = null;
  private manualClock: boolean;
  private skipNextDelta = false;
  private endTimer = 0;
  private reported = false;
  private destroyed = false;
  private frameTimes: number[] = [];

  private constructor(
    options: GameSessionOptions,
    config: MatchConfig,
    renderer: GameRenderer,
    simulation: GameSimulation,
  ) {
    this.options = options;
    this.config = config;
    this.matchOptions = { ...options.options };
    this.renderer = renderer;
    this.simulation = simulation;
    this.manualClock = options.manualClock;
    this.clock = new FixedStepClock({
      stepSeconds: SIMULATION_STEP_SECONDS,
      maxFrameSeconds: MAX_FRAME_SECONDS,
    });
    this.input = new InputController({ target: window, onPauseRequested: () => this.pause('manual') });
    this.hud = new HudStore(this.buildSnapshot());

    this.input.attach();
    this.input.setEnabled(true);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
    renderer.app.ticker.add(this.tick);
    renderer.sync(simulation.state, 1);
    if (this.manualClock) renderer.render();
    else renderer.app.ticker.start();
  }

  static async create(options: GameSessionOptions, isCancelled: () => boolean): Promise<GameSession | null> {
    const config = createMatchConfig(options.options, options.baseConfig);
    const arena = createArenaLayout(config.arena);
    const simulation = new GameSimulation({ config, arena, seed: options.seed });
    const renderer = await GameRenderer.create(options.host, options.textures, arena);
    if (isCancelled()) {
      renderer.destroy();
      return null;
    }
    return new GameSession(options, config, renderer, simulation);
  }

  get currentPhase(): SessionPhase {
    return this.phase;
  }

  get seed(): number {
    return this.simulation.seed;
  }

  pause(reason: PauseReason): void {
    if (this.phase !== 'running' || this.destroyed) return;
    this.phase = 'paused';
    this.pauseReason = reason;
    this.input.setEnabled(false);
    this.clock.reset();
    this.publishHud();
  }

  resume(): void {
    if (this.phase !== 'paused' || this.destroyed) return;
    this.phase = 'running';
    this.pauseReason = null;
    this.clock.reset();
    this.skipNextDelta = true;
    this.input.reset();
    this.input.setEnabled(true);
    this.publishHud();
  }

  setTouchAction(action: InputAction, pressed: boolean): void {
    this.input.setTouchAction(action, pressed);
  }

  setManualClock(manual: boolean): void {
    this.manualClock = manual;
    this.clock.reset();
    if (manual) {
      this.renderer.app.ticker.stop();
      this.renderer.render();
    } else {
      this.skipNextDelta = true;
      this.renderer.app.ticker.start();
    }
  }

  advance(seconds: number): void {
    if (this.destroyed) return;
    const steps = Math.round(seconds / SIMULATION_STEP_SECONDS);
    for (let index = 0; index < steps; index += 1) {
      if (this.phase === 'running') this.stepOnce(SIMULATION_STEP_SECONDS);
      if (this.phase === 'ended') this.endTimer += SIMULATION_STEP_SECONDS;
    }
    this.afterFrame(Math.min(seconds, MAX_MANUAL_ANIMATION_SECONDS), 1);
    this.maybeReport();
    this.renderer.render();
  }

  recentFrameTimes(): number[] {
    return [...this.frameTimes];
  }

  debugState(): Record<string, unknown> {
    const { state } = this.simulation;
    return {
      phase: this.phase,
      pauseReason: this.pauseReason,
      seed: this.simulation.seed,
      manualClock: this.manualClock,
      elapsedSeconds: state.elapsedSeconds,
      remainingSeconds: this.simulation.remainingSeconds,
      score: state.score,
      endReason: state.endReason,
      config: this.config,
      arena: {
        width: this.simulation.arena.width,
        height: this.simulation.arena.height,
        islands: this.simulation.arena.islands.map((island) => ({
          id: island.id,
          collider: island.collider,
        })),
      },
      player: {
        x: state.player.position.x,
        y: state.player.position.y,
        angle: state.player.angle,
        speed: state.player.speed,
        health: state.player.health,
        radius: state.player.radius,
        alive: state.player.alive,
        cooldowns: { ...state.player.cooldowns },
      },
      enemies: state.enemies.map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.position.x,
        y: enemy.position.y,
        angle: enemy.angle,
        health: enemy.health,
        radius: enemy.radius,
      })),
      projectiles: state.projectiles.map((projectile) => ({
        id: projectile.id,
        owner: projectile.owner,
        x: projectile.position.x,
        y: projectile.position.y,
      })),
      spawn: { ...state.spawn, spawnedByKind: { ...state.spawn.spawnedByKind } },
      stats: { ...state.stats },
      viewport: this.renderer.transform,
      renderer: this.renderer.stats,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.input.detach();
    this.renderer.app.ticker.remove(this.tick);
    this.renderer.app.ticker.stop();
    this.renderer.destroy();
    this.hud.clear();
    this.frameTimes = [];
  }

  private readonly tick = (ticker: Ticker): void => {
    if (this.destroyed) return;
    let frameSeconds = ticker.deltaMS / 1000;
    if (this.skipNextDelta) {
      frameSeconds = 0;
      this.skipNextDelta = false;
    }
    this.recordFrameTime(ticker.deltaMS);

    if (this.phase === 'running' && !this.manualClock) {
      this.clock.advance(frameSeconds, this.stepOnce);
    }
    if (this.phase === 'ended' && !this.manualClock) this.endTimer += frameSeconds;

    const animationSeconds =
      this.phase === 'paused' || this.manualClock ? 0 : Math.min(frameSeconds, MAX_ANIMATION_SECONDS);
    const alpha = this.phase === 'running' && !this.manualClock ? this.clock.alpha : 1;
    this.afterFrame(animationSeconds, alpha);
    this.maybeReport();
  };

  private readonly stepOnce = (stepSeconds: number): void => {
    this.simulation.step(stepSeconds, this.input.read());
    const events = this.simulation.drainEvents();
    if (events.length === 0) return;
    this.renderer.handleEvents(events);
    this.options.onEvents?.(events);
    if (events.some((event) => event.type === 'matchEnded')) this.handleMatchEnded();
  };

  private afterFrame(animationSeconds: number, alpha: number): void {
    this.renderer.sync(this.simulation.state, alpha);
    this.renderer.animate(animationSeconds);
    this.publishHud();
  }

  private handleMatchEnded(): void {
    this.phase = 'ended';
    this.pauseReason = null;
    this.input.setEnabled(false);
    this.publishHud();
  }

  private maybeReport(): void {
    if (this.phase !== 'ended' || this.reported || this.endTimer < this.options.resultDelaySeconds) return;
    this.reported = true;
    this.options.onEnded(this.buildResult());
  }

  private buildResult(): MatchResult {
    const { state } = this.simulation;
    return {
      matchId: this.options.createMatchId(),
      seed: this.simulation.seed,
      score: state.score,
      durationSeconds: Math.round(state.elapsedSeconds * 100) / 100,
      endReason: state.endReason ?? 'time_up',
      config: { ...this.matchOptions },
      endedAt: new Date().toISOString(),
      stats: { ...state.stats },
    };
  }

  private buildSnapshot(): HudSnapshot {
    const { state } = this.simulation;
    return {
      phase: this.phase,
      pauseReason: this.pauseReason,
      score: state.score,
      health: Math.ceil(state.player.health),
      maxHealth: state.player.maxHealth,
      remainingSeconds: Math.ceil(this.simulation.remainingSeconds - 1e-6),
      endReason: state.endReason,
    };
  }

  private publishHud(): void {
    this.hud.update(this.buildSnapshot());
  }

  private recordFrameTime(deltaMs: number): void {
    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 600) this.frameTimes.shift();
  }

  private readonly handleBlur = (): void => {
    this.pause('focus');
  };

  private readonly handleVisibility = (): void => {
    if (document.visibilityState === 'hidden') this.pause('hidden');
  };
}
