import type { ApiRuntimeSettings } from '../../api/client/apiRuntime';
import type { NetworkControl } from '../../app/networkControl';
import type { GameSession } from '../session/GameSession';
import { DEFAULT_GAME_CONFIG, type GameConfig } from '../config/gameConfig';

export type BalanceOverrides = {
  [K in keyof GameConfig]?: Partial<GameConfig[K]>;
};

export interface TestControls {
  seed: number | null;
  manualClock: boolean;
  resultDelaySeconds: number | null;
  balance: BalanceOverrides | null;
}

export interface PirateBattleTestApi {
  controls: TestControls;
  session(): Record<string, unknown> | null;
  advance(seconds: number): boolean;
  setManualClock(manual: boolean): void;
  hudFrameTimes(): number[];
  network: NetworkControl;
  configureApi(settings: Partial<ApiRuntimeSettings>): ApiRuntimeSettings;
}

declare global {
  interface Window {
    __PIRATE_BATTLE__?: PirateBattleTestApi;
  }
}

const SESSION_FLAG = 'pirate-battle:e2e';

const controls: TestControls = { seed: null, manualClock: false, resultDelaySeconds: null, balance: null };
let activeSession: GameSession | null = null;

export function testHooksEnabled(): boolean {
  if (import.meta.env.VITE_ENABLE_TEST_HOOKS === 'true') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('e2e') === '1') window.sessionStorage.setItem(SESSION_FLAG, '1');
    return window.sessionStorage.getItem(SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

export function testControls(): TestControls {
  return controls;
}

export function balancedBaseConfig(): GameConfig | undefined {
  if (!controls.balance) return undefined;
  const base = structuredClone(DEFAULT_GAME_CONFIG);
  for (const [section, values] of Object.entries(controls.balance) as [keyof GameConfig, object][]) {
    Object.assign(base[section], values);
  }
  return base;
}

export function registerSession(session: GameSession | null): void {
  activeSession = session;
}

export function installTestHooks(
  network: NetworkControl,
  configureApi: (settings: Partial<ApiRuntimeSettings>) => ApiRuntimeSettings,
): void {
  if (!testHooksEnabled()) return;
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  if (seed !== null && Number.isInteger(Number(seed))) controls.seed = Number(seed);
  if (params.get('manualClock') === '1') controls.manualClock = true;

  window.__PIRATE_BATTLE__ = {
    controls,
    session: () => (activeSession ? activeSession.debugState() : null),
    advance: (seconds) => {
      if (!activeSession) return false;
      activeSession.advance(seconds);
      return true;
    },
    setManualClock: (manual) => {
      controls.manualClock = manual;
      activeSession?.setManualClock(manual);
    },
    hudFrameTimes: () => activeSession?.recentFrameTimes() ?? [],
    network,
    configureApi,
  };
}
