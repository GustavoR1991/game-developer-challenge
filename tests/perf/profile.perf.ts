import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CDPSession, Page } from '@playwright/test';
import { expect, openApp, startMatch, state, test } from '../fixtures/pirate';

const OUTPUT_DIR = join(process.cwd(), 'docs', 'profiling');
const MATCH_SECONDS = 180;

interface EnvironmentInfo {
  userAgent: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  devicePixelRatio: number;
  viewport: { width: number; height: number };
  webglRenderer: string;
  webglVendor: string;
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function environment(page: Page): Promise<EnvironmentInfo> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    const nav = navigator as Navigator & { deviceMemory?: number };
    return {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: nav.deviceMemory ?? null,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      webglRenderer: gl && debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unknown',
      webglVendor: gl && debug ? String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : 'unknown',
    };
  });
}

async function heapUsedMb(client: CDPSession): Promise<number> {
  await client.send('HeapProfiler.collectGarbage');
  await client.send('HeapProfiler.collectGarbage');
  const { metrics } = await client.send('Performance.getMetrics');
  const used = metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0;
  return round(used / 1024 / 1024);
}

async function windowListenerCount(client: CDPSession): Promise<number> {
  const { result } = await client.send('Runtime.evaluate', { expression: 'window' });
  if (!result.objectId) return -1;
  const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  return listeners.length;
}

async function documentListenerCount(client: CDPSession): Promise<number> {
  const { result } = await client.send('Runtime.evaluate', { expression: 'document' });
  if (!result.objectId) return -1;
  const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  return listeners.length;
}

test.describe('Performance profile', () => {
  test('three-minute combat', async ({ page }) => {
    await openApp(page, {
      manualClock: false,
      seed: 7,
      options: { durationSeconds: MATCH_SECONDS, spawnIntervalSeconds: 1 },
      balance: { player: { maxHealth: 1_000_000 } },
      resultDelaySeconds: 30,
    });
    const env = await environment(page);
    await startMatch(page);

    await page.evaluate(() => {
      const target = window as Window & { __frames?: number[] };
      target.__frames = [];
      let last = performance.now();
      const loop = (now: number) => {
        target.__frames?.push(now - last);
        last = now;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });

    const samples: { t: number; enemies: number; projectiles: number; effects: number; ships: number }[] = [];
    const pattern = [
      ['Space', 'w'],
      ['Space', 'a', 'e'],
      ['Space', 'w', 'q'],
      ['Space', 'd'],
    ];
    let held: string[] = [];
    for (let second = 0; second < MATCH_SECONDS + 5; second += 1) {
      if (second % 3 === 0) {
        for (const key of held) await page.keyboard.up(key);
        held = pattern[(second / 3) % pattern.length] ?? [];
        for (const key of held) await page.keyboard.down(key);
      }
      await page.waitForTimeout(1000);
      const snapshot = await state(page);
      samples.push({
        t: round(snapshot.elapsedSeconds, 1),
        enemies: snapshot.enemies.length,
        projectiles: snapshot.projectiles.length,
        effects: snapshot.renderer.effects,
        ships: snapshot.renderer.ships,
      });
      if (snapshot.phase === 'ended') break;
    }
    for (const key of held) await page.keyboard.up(key);

    const frames = await page.evaluate(() => (window as Window & { __frames?: number[] }).__frames ?? []);
    const measured = frames.slice(30);
    const totalMs = measured.reduce((sum, value) => sum + value, 0);
    const final = await state(page);
    const peak = (key: 'enemies' | 'projectiles' | 'effects' | 'ships') =>
      Math.max(...samples.map((sample) => sample[key]));
    const mean = (key: 'enemies' | 'projectiles' | 'effects' | 'ships') =>
      round(samples.reduce((sum, sample) => sum + sample[key], 0) / Math.max(1, samples.length), 1);

    const report = {
      generatedAt: new Date().toISOString(),
      environment: env,
      match: {
        durationSeconds: MATCH_SECONDS,
        spawnIntervalSeconds: 1,
        seed: 7,
        note: 'Player health raised so the profile always lasts the full three minutes; bot holds fire and alternates turns.',
        endedBy: final.endReason,
        elapsedSeconds: round(final.elapsedSeconds, 2),
        enemiesDestroyed: final.stats.enemiesDestroyed,
        shotsFired: final.stats.shotsFired,
      },
      frames: {
        count: measured.length,
        averageFps: round((measured.length / totalMs) * 1000, 1),
        meanFrameMs: round(totalMs / measured.length),
        p50FrameMs: round(percentile(measured, 0.5)),
        p95FrameMs: round(percentile(measured, 0.95)),
        p99FrameMs: round(percentile(measured, 0.99)),
        maxFrameMs: round(Math.max(...measured)),
        framesOver20ms: measured.filter((value) => value > 20).length,
      },
      entities: {
        peak: {
          enemies: peak('enemies'),
          projectiles: peak('projectiles'),
          effects: peak('effects'),
          ships: peak('ships'),
        },
        mean: {
          enemies: mean('enemies'),
          projectiles: mean('projectiles'),
          effects: mean('effects'),
          ships: mean('ships'),
        },
      },
      samples,
    };
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(join(OUTPUT_DIR, 'combat-profile.json'), `${JSON.stringify(report, null, 2)}\n`);
    expect(final.phase).toBe('ended');
  });

  test('memory after five start/play/leave cycles', async ({ page }) => {
    await openApp(page, { manualClock: false, seed: 11, balance: { player: { maxHealth: 1_000_000 } } });
    const env = await environment(page);
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    await expect(page.getByTestId('ranking-row').first()).toBeVisible();

    const baseline = {
      heapMb: await heapUsedMb(client),
      windowListeners: await windowListenerCount(client),
      documentListeners: await documentListenerCount(client),
    };
    const cycles: {
      cycle: number;
      heapInMatchMb: number;
      heapAfterLeaveMb: number;
      windowListeners: number;
      documentListeners: number;
      canvases: number;
    }[] = [];

    for (let cycle = 1; cycle <= 5; cycle += 1) {
      await startMatch(page);
      await page.keyboard.down('Space');
      await page.keyboard.down('a');
      await page.waitForTimeout(12_000);
      await page.keyboard.up('a');
      await page.keyboard.up('Space');
      const heapInMatchMb = await heapUsedMb(client);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Main Menu' }).click();
      await expect(page.getByTestId('main-menu')).toBeVisible();
      await page.waitForTimeout(500);
      cycles.push({
        cycle,
        heapInMatchMb,
        heapAfterLeaveMb: await heapUsedMb(client),
        windowListeners: await windowListenerCount(client),
        documentListeners: await documentListenerCount(client),
        canvases: await page.locator('canvas').count(),
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      environment: env,
      procedure:
        'Menu loaded, then five cycles of: Play, 12 s of real-time combat holding fire and turning, pause, Main Menu. Heap measured after forced GC (CDP HeapProfiler.collectGarbage).',
      baseline,
      cycles,
      growthAfterFirstCycleMb: round(
        (cycles.at(-1)?.heapAfterLeaveMb ?? 0) - (cycles[0]?.heapAfterLeaveMb ?? 0),
      ),
    };
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(join(OUTPUT_DIR, 'memory-cycles.json'), `${JSON.stringify(report, null, 2)}\n`);
    for (const entry of cycles) {
      expect(entry.canvases).toBe(0);
      expect(entry.windowListeners).toBe(cycles[0]?.windowListeners);
    }
  });
});
