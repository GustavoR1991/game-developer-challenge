import { expect, openApp, test } from '../fixtures/pirate';

test.describe('Ranking and Match History tabs', () => {
  test('ranking is ordered, filtered by configuration and paginated', async ({ page }) => {
    await openApp(page);
    const panel = page.getByTestId('ranking-panel');
    await expect(panel.getByTestId('ranking-row')).toHaveCount(8);
    await expect(panel).toContainText('120 s battles · 4 s spawn interval');
    await expect(panel.getByText('Page 1 of 4')).toBeVisible();

    const points = await panel
      .getByTestId('ranking-row')
      .evaluateAll((rows) => rows.map((row) => Number(row.querySelectorAll('td')[2]?.textContent)));
    expect([...points].sort((a, b) => b - a)).toEqual(points);
    await expect(panel.getByTestId('ranking-row').first().locator('td').first()).toHaveText('01');

    await panel.getByRole('button', { name: 'Next page' }).click();
    await expect(panel.getByText('Page 2 of 4')).toBeVisible();
    await expect(panel.getByTestId('ranking-row').first().locator('td').first()).toHaveText('09');
    await panel.getByRole('button', { name: 'Previous page' }).click();
    await expect(panel.getByText('Page 1 of 4')).toBeVisible();

    await panel.getByLabel('Battle duration for the ranking').selectOption('90');
    await panel.getByLabel('Enemy spawn interval for the ranking').selectOption('3');
    await expect(panel.getByTestId('ranking-row')).toHaveCount(6);
    await expect(panel.getByText(/Page \d of/)).toHaveCount(0);
  });

  test('match history paginates the player battles', async ({ page }) => {
    await openApp(page, { scenario: 'many-pages' });
    await page.getByRole('tab', { name: 'Match History' }).click();
    const panel = page.getByTestId('history-panel');
    await expect(panel.getByTestId('history-row')).toHaveCount(8);
    await expect(panel.getByText('Page 1 of 4')).toBeVisible();
    await panel.getByRole('button', { name: 'Next page' }).click();
    await expect(panel.getByText('Page 2 of 4')).toBeVisible();
    await expect(panel.getByTestId('history-row')).toHaveCount(8);
  });

  test('shows loading states', async ({ page }) => {
    await openApp(page, { scenario: 'slow', latencyMs: null });
    await expect(page.getByRole('status').filter({ hasText: 'Loading the ranking…' })).toBeVisible();
    await expect(page.getByTestId('ranking-row').first()).toBeVisible({ timeout: 6000 });
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Loading your match history…' })).toBeVisible();
  });

  test('shows empty states', async ({ page }) => {
    await openApp(page, { scenario: 'empty' });
    await expect(page.getByText('No battles recorded with this configuration yet.')).toBeVisible();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByText('No battles yet. Press Play to set sail!')).toBeVisible();
  });

  test('shows errors with retry and keeps the rest of the app available', async ({ page }) => {
    await openApp(page, { scenario: 'ranking-fails' });
    const alert = page.getByTestId('ranking-panel').getByRole('alert');
    await expect(alert).toContainText('Could not load the ranking. The ranking could not be loaded.');
    await expect(alert.getByRole('button', { name: 'Try again' })).toBeEnabled();

    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('No battles yet');

    await page.getByTestId('network-panel').locator('summary').click();
    await page.getByLabel('Scenario').selectOption('success');
    await page.getByRole('tab', { name: 'Ranking' }).click();
    await expect(page.getByTestId('ranking-row')).toHaveCount(8);

    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  });

  test('history failure shows an error message', async ({ page }) => {
    await openApp(page, { scenario: 'history-fails' });
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-panel').getByRole('alert')).toContainText(
      'Could not load your match history.',
    );
  });
});
