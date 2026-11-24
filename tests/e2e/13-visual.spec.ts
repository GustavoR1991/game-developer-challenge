import { advance, expect, openApp, startMatch, test } from '../fixtures/pirate';
import { playUntilResult, QUICK_DEATH } from './helpers/endMatch';

test.describe('Visual regression', () => {
  test('main menu', async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId('ranking-row')).toHaveCount(8);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.fetch-indicator')).toHaveText('');
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      mask: [page.locator('.fetch-indicator')],
      timeout: 20_000,
    });
  });

  test('arena in a stable state', async ({ page }) => {
    await openApp(page, { balance: { spawn: { initialDelaySeconds: 1.2 } } });
    await startMatch(page);
    await page.keyboard.down('d');
    await advance(page, 0.4);
    await page.keyboard.up('d');
    await page.keyboard.down('w');
    await advance(page, 0.6);
    await page.keyboard.up('w');
    await advance(page, 0.4);
    await expect(page.getByTestId('game-screen')).toHaveScreenshot('arena.png');
  });

  test('result screen', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: QUICK_DEATH,
    });
    await playUntilResult(page);
    await expect(page.getByTestId('submission-status')).toHaveAttribute('data-status', 'confirmed');
    await expect(page).toHaveScreenshot('result.png', { fullPage: true });
  });
});
