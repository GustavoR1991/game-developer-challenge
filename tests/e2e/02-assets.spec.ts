import { expect, openApp, state, test, waitForSession } from '../fixtures/pirate';

test.describe('Asset loading', () => {
  test.use({ serviceWorkers: 'block' });

  test('shows loading progress before the battle starts', async ({ page }) => {
    await openApp(page);
    await page.route('**/assets/sheets/ships.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const progress = page.getByRole('progressbar', { name: 'Loading the fleet…' });
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute('aria-valuemin', '0');
    await waitForSession(page);
    await expect(progress).toBeHidden();
    expect((await state(page)).phase).toBe('running');
  });

  test('reports a failure and starts after a retry', async ({ page }) => {
    await openApp(page);
    await page.route('**/assets/sheets/ships.json', (route) => route.abort('failed'));
    await page.getByRole('button', { name: 'Play', exact: true }).click();

    const dialog = page.getByTestId('asset-error');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText('could not be loaded');
    await expect(page.getByTestId('game-canvas')).toHaveCount(0);

    await page.unroute('**/assets/sheets/ships.json');
    await dialog.getByRole('button', { name: 'Retry' }).click();
    await waitForSession(page);
    await expect(dialog).toBeHidden();
    expect((await state(page)).phase).toBe('running');
  });
});
