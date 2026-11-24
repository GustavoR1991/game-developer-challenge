interface PirateBattleE2eApi {
  controls: {
    seed: number | null;
    manualClock: boolean;
    resultDelaySeconds: number | null;
    balance: Record<string, Record<string, unknown>> | null;
  };
  session(): Record<string, unknown> | null;
  advance(seconds: number): boolean;
  setManualClock(manual: boolean): void;
  hudFrameTimes(): number[];
  network: {
    selectScenario(id: string): void;
    setSeed(seed: number): void;
    setLatencyOverride(ms: number | null): void;
    resetAll(): Promise<void>;
  };
  configureApi(settings: Record<string, number>): unknown;
}

interface Window {
  __PIRATE_BATTLE__?: PirateBattleE2eApi;
}
