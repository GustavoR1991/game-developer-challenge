import { expect, test as base, type Page } from '@playwright/test';

export interface ShipState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  health: number;
  radius: number;
  alive?: boolean;
  cooldowns?: { front: number; left: number; right: number };
}

export interface EnemyState extends ShipState {
  id: number;
  kind: 'chaser' | 'shooter';
}

export interface RoundedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface SessionState {
  phase: 'running' | 'paused' | 'ended';
  pauseReason: string | null;
  seed: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  score: number;
  endReason: 'time_up' | 'player_destroyed' | null;
  arena: { width: number; height: number; islands: { id: string; collider: RoundedRect }[] };
  player: ShipState & { cooldowns: { front: number; left: number; right: number } };
  enemies: EnemyState[];
  projectiles: { id: number; owner: 'player' | 'enemy'; x: number; y: number }[];
  spawn: {
    spawned: number;
    spawnedByKind: { chaser: number; shooter: number };
    timer: number;
    skipped: number;
  };
  stats: { shotsFired: number; enemiesDestroyed: number; damageTaken: number };
  renderer: { ships: number; projectiles: number; effects: number };
}

export interface AppSetup {
  seed?: number;
  manualClock?: boolean;
  scenario?: string;
  latencyMs?: number | null;
  options?: { durationSeconds: number; spawnIntervalSeconds: number };
  playerName?: string;
  route?: 'menu' | 'options' | 'play' | 'result';
  balance?: Record<string, Record<string, unknown>>;
  resultDelaySeconds?: number;
  apiTimeoutMs?: number;
  retryBaseDelayMs?: number;
}

export const PLAYER_ID = 'player-e2e-0000-0000-captain';
export const PLAYER_NAME = 'Captain Tester';

export async function openApp(page: Page, setup: AppSetup = {}): Promise<void> {
  await page.addInitScript(
    ({ profile, options }) => {
      if (window.sessionStorage.getItem('pirate-battle:e2e-seeded') === '1') return;
      window.sessionStorage.setItem('pirate-battle:e2e-seeded', '1');
      window.localStorage.setItem('pirate-battle:profile:v1', JSON.stringify(profile));
      window.localStorage.setItem('pirate-battle:sound:v1', JSON.stringify({ muted: true }));
      if (options) window.localStorage.setItem('pirate-battle:options:v1', JSON.stringify(options));
    },
    {
      profile: { playerId: PLAYER_ID, playerName: setup.playerName ?? PLAYER_NAME },
      options: setup.options ?? null,
    },
  );

  const params = new URLSearchParams({ e2e: '1' });
  params.set('seed', String(setup.seed ?? 42));
  if (setup.manualClock !== false) params.set('manualClock', '1');
  params.set('scenario', setup.scenario ?? 'success');
  if (setup.latencyMs !== null) params.set('mockLatency', String(setup.latencyMs ?? 0));
  await page.goto(`/?${params.toString()}#/${setup.route ?? 'menu'}`);
  await page.waitForFunction(() => window.__PIRATE_BATTLE__ !== undefined);
  await page.evaluate(
    ({ balance, resultDelaySeconds, apiTimeoutMs, retryBaseDelayMs }) => {
      const api = window.__PIRATE_BATTLE__;
      if (!api) return;
      api.controls.balance = balance;
      api.controls.resultDelaySeconds = resultDelaySeconds;
      api.configureApi({ timeoutMs: apiTimeoutMs, retryBaseDelayMs });
    },
    {
      balance: setup.balance ?? null,
      resultDelaySeconds: setup.resultDelaySeconds ?? 0.2,
      apiTimeoutMs: setup.apiTimeoutMs ?? 2000,
      retryBaseDelayMs: setup.retryBaseDelayMs ?? 50,
    },
  );
}

export async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await waitForSession(page);
}

export async function waitForSession(page: Page): Promise<void> {
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await page.waitForFunction(() => window.__PIRATE_BATTLE__?.session() != null);
}

export async function state(page: Page): Promise<SessionState> {
  const snapshot = await page.evaluate(() => window.__PIRATE_BATTLE__?.session() ?? null);
  if (!snapshot) throw new Error('No active game session');
  return snapshot as unknown as SessionState;
}

export async function advance(page: Page, seconds: number): Promise<SessionState> {
  const snapshot = await page.evaluate((value) => {
    const api = window.__PIRATE_BATTLE__;
    if (!api?.advance(value)) return null;
    return api.session();
  }, seconds);
  if (!snapshot) throw new Error('No active game session');
  return snapshot as unknown as SessionState;
}

export async function advanceUntil(
  page: Page,
  predicate: (snapshot: SessionState) => boolean,
  options: { step?: number; maxSeconds?: number } = {},
): Promise<SessionState> {
  const step = options.step ?? 0.1;
  const maxSeconds = options.maxSeconds ?? 30;
  let elapsed = 0;
  let snapshot = await state(page);
  while (!predicate(snapshot) && elapsed < maxSeconds) {
    snapshot = await advance(page, step);
    elapsed += step;
  }
  return snapshot;
}

export async function hold(page: Page, keys: string[], seconds: number, step = 0.1): Promise<SessionState> {
  for (const key of keys) await page.keyboard.down(key);
  let snapshot = await state(page);
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) {
    snapshot = await advance(page, Math.min(step, seconds - elapsed));
  }
  for (const key of keys) await page.keyboard.up(key);
  return snapshot;
}

export function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta <= -Math.PI) delta += Math.PI * 2;
  if (delta > Math.PI) delta -= Math.PI * 2;
  return delta;
}

const TURN_RADIANS_PER_STEP = 2.6 / 60;

export async function turnTo(page: Page, target: number, tolerance = 0.05): Promise<SessionState> {
  let snapshot = await state(page);
  for (let guard = 0; guard < 20; guard += 1) {
    const delta = shortestAngleDelta(snapshot.player.angle, target);
    if (Math.abs(delta) <= tolerance) return snapshot;
    const steps = Math.max(1, Math.round(Math.abs(delta) / TURN_RADIANS_PER_STEP));
    const key = delta > 0 ? 'd' : 'a';
    await page.keyboard.down(key);
    snapshot = await advance(page, steps / 60);
    await page.keyboard.up(key);
  }
  return snapshot;
}

export function angleBetween(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function penetrationDepth(
  center: { x: number; y: number },
  radius: number,
  shape: RoundedRect,
): number {
  const corner = Math.min(shape.cornerRadius, shape.width / 2, shape.height / 2);
  const closestX = Math.min(Math.max(center.x, shape.x + corner), shape.x + shape.width - corner);
  const closestY = Math.min(Math.max(center.y, shape.y + corner), shape.y + shape.height - corner);
  const distance = Math.hypot(center.x - closestX, center.y - closestY);
  return Math.max(0, radius + corner - distance);
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, provide) => {
    await provide(collectConsoleErrors(page));
  },
});

export { expect };
