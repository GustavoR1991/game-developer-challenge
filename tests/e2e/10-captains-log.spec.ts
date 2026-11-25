import { expect, openApp, test } from '../fixtures/pirate';

test.describe('Ranking and Match History', () => {
  test('menu opens the tabs and the ranking is ordered, one row per captain and paginated', async ({
    page,
  }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Ranking' }).click();
    const panel = page.getByTestId('ranking-panel');
    await expect(panel.getByTestId('ranking-row')).toHaveCount(5);
    await expect(panel).toContainText('120 second battles · 4 second spawn interval');
    await expect(panel.getByText(/Page 1 of \d/)).toBeVisible();

    const rows = await panel.getByTestId('ranking-row').evaluateAll((elements) =>
      elements.map((row) => ({
        points: Number(row.querySelectorAll('td')[2]?.textContent),
        captain: row.querySelectorAll('td')[1]?.textContent ?? '',
      })),
    );
    const points = rows.map((row) => row.points);
    expect([...points].sort((a, b) => b - a)).toEqual(points);
    expect(new Set(rows.map((row) => row.captain)).size).toBe(rows.length);
    await expect(panel.getByTestId('ranking-row').first().locator('td').first()).toHaveText('01');
    await expect(panel.getByRole('img', { name: 'Top captain' })).toBeVisible();

    await panel.getByRole('button', { name: 'Next page' }).click();
    await expect(panel.getByText(/Page 2 of \d/)).toBeVisible();
    await expect(panel.getByTestId('ranking-row').first().locator('td').first()).toHaveText('06');
    await panel.getByRole('button', { name: 'Previous page' }).click();
    await expect(panel.getByText(/Page 1 of \d/)).toBeVisible();

    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByTestId('main-menu')).toBeVisible();
  });

  test('ranking compares only battles with the configured setup', async ({ page }) => {
    await openApp(page, { route: 'ranking', options: { durationSeconds: 90, spawnIntervalSeconds: 3 } });
    const panel = page.getByTestId('ranking-panel');
    await expect(panel).toContainText('90 second battles · 3 second spawn interval');
    const count = await panel.getByTestId('ranking-row').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);
    await expect(panel.getByText(/Page \d of/)).toHaveCount(0);
  });

  test('match history paginates the player battles', async ({ page }) => {
    await openApp(page, { scenario: 'many-pages', route: 'history' });
    const panel = page.getByTestId('history-panel');
    await expect(panel.getByTestId('history-row')).toHaveCount(5);
    await expect(panel.getByText('Page 1 of 6')).toBeVisible();
    await panel.getByRole('button', { name: 'Next page' }).click();
    await expect(panel.getByText('Page 2 of 6')).toBeVisible();
    await expect(panel.getByTestId('history-row')).toHaveCount(5);
  });

  test('shows loading states', async ({ page }) => {
    await openApp(page, { scenario: 'slow', latencyMs: null, route: 'ranking' });
    await expect(page.getByRole('status').filter({ hasText: 'Loading the ranking…' })).toBeVisible();
    await expect(page.getByTestId('ranking-row').first()).toBeVisible({ timeout: 6000 });
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Loading your match history…' })).toBeVisible();
  });

  test('shows empty states', async ({ page }) => {
    await openApp(page, { scenario: 'empty', route: 'ranking' });
    await expect(page.getByText('No battles recorded with this configuration yet.')).toBeVisible();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByText('No battles yet. Press Play to set sail!')).toBeVisible();
  });

  test('shows errors with retry and keeps the rest of the app available', async ({ page }) => {
    await openApp(page, { scenario: 'ranking-fails', route: 'ranking' });
    const alert = page.getByTestId('ranking-panel').getByRole('alert');
    await expect(alert).toContainText('Could not load the ranking. The ranking could not be loaded.');
    await expect(alert.getByRole('button', { name: 'Try again' })).toBeEnabled();

    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('No battles yet');

    await page.goto('/#/options');
    await page.getByTestId('network-panel').locator('summary').click();
    await page.getByLabel('Scenario').selectOption('success');
    await page.goto('/#/ranking');
    await expect(page.getByTestId('ranking-row')).toHaveCount(5);

    await page.goto('/#/menu');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  });

  test('history failure shows an error message', async ({ page }) => {
    await openApp(page, { scenario: 'history-fails', route: 'history' });
    await expect(page.getByTestId('history-panel').getByRole('alert')).toContainText(
      'Could not load your match history.',
    );
  });
});
