import { expect, openApp, test, waitForSession } from '../fixtures/pirate';
import { playUntilResult, QUICK_DEATH } from './helpers/endMatch';

test.describe('Result screen', () => {
  test('shows the match result and keeps it after a refresh', async ({ page, consoleErrors }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: QUICK_DEATH,
    });
    await playUntilResult(page);

    await expect(page.getByRole('heading', { name: 'Battle complete' })).toBeVisible();
    await expect(page.getByTestId('result-score')).toHaveText('0');
    await expect(page.getByTestId('result-reason')).toHaveText('Defeated');
    const duration = await page.getByTestId('result-duration').textContent();
    expect(duration).toMatch(/^00:\d\d$/);
    await expect(page.getByTestId('submission-status')).toHaveAttribute('data-status', 'confirmed');
    await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Main Menu' })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('result-screen')).toBeVisible();
    await expect(page.getByTestId('result-duration')).toHaveText(duration ?? '');
    await expect(page.getByTestId('result-reason')).toHaveText('Defeated');
    await expect(page.getByTestId('submission-status')).toHaveAttribute('data-status', 'confirmed');

    await page.getByRole('button', { name: 'Play Again' }).click();
    await waitForSession(page);
    await expect(page.getByTestId('hud-score')).toHaveText('0');
    expect(consoleErrors).toEqual([]);
  });
});
