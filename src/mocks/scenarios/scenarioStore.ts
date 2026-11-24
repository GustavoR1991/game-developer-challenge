import { z } from 'zod';
import { createRandom, type Random } from '../../game/core/random';
import { readJson, removeKey, STORAGE_KEYS, writeJson } from '../../storage/localStore';
import { DEFAULT_SCENARIO_ID, findScenario, SCENARIOS, type ScenarioDefinition } from './scenarios';

const DEFAULT_SEED = 1;

const settingsSchema = z.object({
  scenarioId: z.string(),
  seed: z.number().int(),
  latencyOverrideMs: z.number().int().min(0).nullable(),
});

export type MockSettings = z.infer<typeof settingsSchema>;

type Listener = () => void;

function defaultSettings(): MockSettings {
  return { scenarioId: DEFAULT_SCENARIO_ID, seed: DEFAULT_SEED, latencyOverrideMs: null };
}

export class ScenarioStore {
  private settings: MockSettings;
  private random: Random;
  private requestCounter = 0;
  private readonly listeners = new Set<Listener>();

  constructor() {
    const stored = readJson(STORAGE_KEYS.mockScenario, settingsSchema);
    this.settings = stored && findScenario(stored.scenarioId) ? stored : defaultSettings();
    this.random = createRandom(this.settings.seed);
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): MockSettings => this.settings;

  get scenario(): ScenarioDefinition {
    return findScenario(this.settings.scenarioId) ?? (SCENARIOS[0] as ScenarioDefinition);
  }

  update(next: Partial<MockSettings>): MockSettings {
    const merged = { ...this.settings, ...next };
    if (!findScenario(merged.scenarioId)) throw new Error(`Unknown mock scenario "${merged.scenarioId}"`);
    this.settings = merged;
    this.random = createRandom(merged.seed);
    this.requestCounter = 0;
    writeJson(STORAGE_KEYS.mockScenario, merged);
    this.emit();
    return merged;
  }

  reset(): MockSettings {
    removeKey(STORAGE_KEYS.mockScenario);
    this.settings = defaultSettings();
    this.random = createRandom(this.settings.seed);
    this.requestCounter = 0;
    this.emit();
    return this.settings;
  }

  nextRandom(): number {
    return this.random.next();
  }

  nextRequestIndex(): number {
    this.requestCounter += 1;
    return this.requestCounter;
  }

  applyUrlOverrides(search: string): void {
    const params = new URLSearchParams(search);
    const scenarioId = params.get('scenario');
    const seed = params.get('mockSeed');
    const latency = params.get('mockLatency');
    const next: Partial<MockSettings> = {};
    if (scenarioId && findScenario(scenarioId)) next.scenarioId = scenarioId;
    if (seed !== null && Number.isInteger(Number(seed))) next.seed = Number(seed);
    if (latency !== null && Number.isInteger(Number(latency)))
      next.latencyOverrideMs = Math.max(0, Number(latency));
    if (Object.keys(next).length > 0) this.update(next);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const scenarioStore = new ScenarioStore();
