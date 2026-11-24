import { expect, openApp, test } from '../fixtures/pirate';
import { playUntilResult, QUICK_DEATH } from './helpers/endMatch';

test.describe('Network resilience', () => {
  test('a submit that times out after commit is retried without duplication', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: QUICK_DEATH,
      scenario: 'submit-timeout-after-commit',
      apiTimeoutMs: 700,
    });
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().includes('/api/matches/')) requests.push(request.url());
    });

    await playUntilResult(page);
    const status = page.getByTestId('submission-status');
    await expect(status).toHaveAttribute('data-status', 'confirmed', { timeout: 8000 });
    expect(requests.length).toBeGreaterThanOrEqual(2);
    expect(new Set(requests).size).toBe(1);

    const stored = await page.evaluate(() => {
      const result = JSON.parse(window.localStorage.getItem('pirate-battle:last-result:v1') ?? '{}') as {
        matchId: string;
      };
      const db = JSON.parse(
        window.localStorage.getItem('pirate-battle:mock-server:v1') ?? '{"records":[]}',
      ) as {
        records: { matchId: string }[];
      };
      return db.records.filter((record) => record.matchId === result.matchId).length;
    });
    expect(stored).toBe(1);

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-row')).toHaveCount(1);
  });

  test('a late response does not overwrite newer data', async ({ page }) => {
    await openApp(page, { scenario: 'success' });
    const panel = page.getByTestId('ranking-panel');
    await expect(panel.getByText('Page 1 of 4')).toBeVisible();

    await page.evaluate(() => window.__PIRATE_BATTLE__?.network.selectScenario('out-of-order'));
    await expect(panel.getByText('Updating…')).toBeVisible();
    await panel.getByRole('button', { name: 'Next page' }).click();
    await expect(panel.getByText('Page 2 of 4')).toBeVisible();
    const pageTwoFirstRank = panel.getByTestId('ranking-row').first().locator('td').first();
    await expect(pageTwoFirstRank).toHaveText('09');

    await page.waitForTimeout(2200);
    await expect(panel.getByText('Page 2 of 4')).toBeVisible();
    await expect(pageTwoFirstRank).toHaveText('09');
  });

  test('timeouts surface an error and API failures never block the game', async ({ page }) => {
    await openApp(page, { scenario: 'timeout', apiTimeoutMs: 400 });
    await expect(page.getByTestId('ranking-panel').getByRole('alert')).toContainText(
      'The server took too long to answer.',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByTestId('game-canvas')).toBeVisible();
    await expect(page.getByTestId('hud')).toBeVisible();
  });
});
