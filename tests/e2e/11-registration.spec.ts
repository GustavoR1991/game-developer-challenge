import { expect, openApp, PLAYER_NAME, test } from '../fixtures/pirate';
import { playUntilResult, QUICK_DEATH } from './helpers/endMatch';

const OPTIONS = { durationSeconds: 120, spawnIntervalSeconds: 10 };

async function storedRecords(page: import('@playwright/test').Page, matchId: string): Promise<number> {
  return page.evaluate((id) => {
    const raw = window.localStorage.getItem('pirate-battle:mock-server:v1');
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { records: { matchId: string }[] };
    return parsed.records.filter((record) => record.matchId === id).length;
  }, matchId);
}

async function lastMatchId(page: import('@playwright/test').Page): Promise<string> {
  const id = await page.evaluate(() => {
    const raw = window.localStorage.getItem('pirate-battle:last-result:v1');
    return raw ? (JSON.parse(raw) as { matchId: string }).matchId : null;
  });
  if (!id) throw new Error('No last result');
  return id;
}

test.describe('Match registration', () => {
  test('registers a finished match once and refreshes both tabs', async ({ page }) => {
    await openApp(page, { options: OPTIONS, balance: QUICK_DEATH });
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByText('No battles yet. Press Play to set sail!')).toBeVisible();

    await playUntilResult(page);
    await expect(page.getByTestId('submission-status')).toHaveAttribute('data-status', 'confirmed');
    const matchId = await lastMatchId(page);
    expect(await storedRecords(page, matchId)).toBe(1);

    await page.getByRole('button', { name: 'Main Menu' }).click();
    const ranking = page.getByTestId('ranking-panel');
    await ranking.getByLabel('Enemy spawn interval for the ranking').selectOption('10');
    await expect(ranking.getByTestId('ranking-row')).toHaveCount(1);
    await expect(ranking.getByTestId('ranking-row')).toContainText(PLAYER_NAME);
    await expect(ranking.getByTestId('ranking-row')).toContainText('YOU');

    await page.getByRole('tab', { name: 'Match History' }).click();
    const history = page.getByTestId('history-panel');
    await expect(history.getByTestId('history-row')).toHaveCount(1);
    await expect(history.getByTestId('history-row')).toContainText('Ship destroyed');
    await expect(history.getByTestId('history-row')).toContainText('120 s / 10 s');
  });

  test('keeps a pending registration across refresh and registers it after recovery', async ({ page }) => {
    await openApp(page, { options: OPTIONS, balance: QUICK_DEATH, scenario: 'offline-at-match-end' });
    await playUntilResult(page);
    const status = page.getByTestId('submission-status');
    await expect(status).toHaveAttribute('data-status', 'failed');
    await expect(status).toContainText('Not saved yet');
    const matchId = await lastMatchId(page);

    await page.getByRole('button', { name: 'Play Again' }).click();
    await expect(page.getByTestId('game-canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Pause game' }).click();
    await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Main Menu' }).click();

    await page.reload();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-pending')).toHaveText('1 battle is waiting to be saved.');
    await expect(page.getByText('No battles yet. Press Play to set sail!')).toBeVisible();

    await page.getByTestId('network-panel').locator('summary').click();
    await page.getByLabel('Scenario').selectOption('success');
    await page.goto('/#/result');
    await expect(page.getByTestId('submission-status')).toHaveAttribute('data-status', 'failed');
    await page.getByRole('button', { name: 'Retry save' }).click();
    await expect(page.getByTestId('submission-status')).toHaveAttribute('data-status', 'confirmed');
    expect(await storedRecords(page, matchId)).toBe(1);

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-row')).toHaveCount(1);
    await expect(page.getByTestId('history-pending')).toHaveCount(0);
  });
});
