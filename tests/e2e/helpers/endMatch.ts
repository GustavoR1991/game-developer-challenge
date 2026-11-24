import type { Page } from '@playwright/test';
import { advanceUntil, expect, startMatch } from '../../fixtures/pirate';

export const QUICK_DEATH = {
  player: { maxHealth: 20 },
  spawn: { initialDelaySeconds: 0.5, openingSequence: ['chaser'], weights: { chaser: 1, shooter: 0 } },
};

export async function playUntilResult(page: Page): Promise<void> {
  await startMatch(page);
  await advanceUntil(page, (current) => current.phase === 'ended', { maxSeconds: 30 });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const advanced = await page.evaluate(() => window.__PIRATE_BATTLE__?.advance(0.1) ?? false);
    if (!advanced) break;
  }
  await expect(page.getByTestId('result-screen')).toBeVisible();
}
