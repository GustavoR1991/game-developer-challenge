import type { MatchConfig } from '../config/gameConfig';
import { createRandom } from '../core/random';
import type { GameEvent } from '../entities/types';
import type { InputCommands } from '../input/commands';
import { endMatch } from '../systems/combat';
import { updateEnemies } from '../systems/enemies';
import { updatePlayer } from '../systems/player';
import { updateProjectiles } from '../systems/projectiles';
import { updateSpawner } from '../systems/spawner';
import type { ArenaLayout } from '../world/arenaLayout';
import type { SimulationContext, SimulationState } from './context';

export interface GameSimulationOptions {
  config: MatchConfig;
  arena: ArenaLayout;
  seed: number;
}

const TIME_EPSILON = 1e-6;

function removeDead<T extends { alive: boolean }>(items: T[]): void {
  let write = 0;
  for (const item of items) {
    if (item.alive) {
      items[write] = item;
      write += 1;
    }
  }
  items.length = write;
}

export class GameSimulation {
  readonly config: MatchConfig;
  readonly arena: ArenaLayout;
  readonly seed: number;
  readonly state: SimulationState;
  private readonly context: SimulationContext;
  private events: GameEvent[] = [];
  private idCounter = 0;

  constructor(options: GameSimulationOptions) {
    this.config = options.config;
    this.arena = options.arena;
    this.seed = options.seed;
    this.state = this.createInitialState();
    this.context = {
      config: this.config,
      arena: this.arena,
      random: createRandom(options.seed),
      state: this.state,
      emit: (event) => {
        this.events.push(event);
      },
      nextId: () => this.nextId(),
    };
  }

  get remainingSeconds(): number {
    return Math.max(0, this.config.match.durationSeconds - this.state.elapsedSeconds);
  }

  step(dt: number, input: InputCommands): void {
    const { state, context } = this;
    if (state.status !== 'running' || dt <= 0) return;

    const stepSeconds = Math.min(dt, this.remainingSeconds);
    state.elapsedSeconds += stepSeconds;

    updatePlayer(context, input, stepSeconds);
    if (state.status === 'running') updateEnemies(context, stepSeconds);
    if (state.status === 'running') updateProjectiles(context, stepSeconds);
    if (state.status === 'running') updateSpawner(context, stepSeconds);

    removeDead(state.enemies);
    removeDead(state.projectiles);

    if (
      state.status === 'running' &&
      state.elapsedSeconds >= this.config.match.durationSeconds - TIME_EPSILON
    ) {
      state.elapsedSeconds = this.config.match.durationSeconds;
      endMatch(context, 'time_up');
    }
  }

  drainEvents(): GameEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private createInitialState(): SimulationState {
    const { player } = this.config;
    const start = this.arena.playerStart;
    return {
      status: 'running',
      endReason: null,
      elapsedSeconds: 0,
      score: 0,
      player: {
        id: this.nextId(),
        kind: 'player',
        position: { x: start.x, y: start.y },
        angle: start.angle,
        speed: 0,
        health: player.maxHealth,
        maxHealth: player.maxHealth,
        radius: player.collisionRadius,
        alive: true,
        cooldowns: { front: 0, left: 0, right: 0 },
      },
      enemies: [],
      projectiles: [],
      spawn: {
        timer: this.config.spawn.initialDelaySeconds,
        spawned: 0,
        spawnedByKind: { chaser: 0, shooter: 0 },
        skipped: 0,
      },
      stats: { shotsFired: 0, enemiesDestroyed: 0, damageTaken: 0 },
    };
  }
}
