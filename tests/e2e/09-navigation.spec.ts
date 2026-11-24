import { advance, expect, hold, openApp, startMatch, state, test } from '../fixtures/pirate';

test.describe('Navigation, abandonment and touch', () => {
  test('abandoning a match does not register it', async ({ page }) => {
    await openApp(page);
    await startMatch(page);
    await hold(page, ['w', 'Space'], 2);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByTestId('main-menu')).toBeVisible();

    await startMatch(page);
    await advance(page, 2);
    await page.reload();
    await expect(page.getByTestId('main-menu')).toBeVisible();
    expect(page.url()).toContain('#/menu');

    const submissions = await page.evaluate(() =>
      window.localStorage.getItem('pirate-battle:submissions:v1'),
    );
    expect(submissions === null || submissions === '[]').toBe(true);
    expect(await page.evaluate(() => window.localStorage.getItem('pirate-battle:last-result:v1'))).toBeNull();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByText('No battles yet. Press Play to set sail!')).toBeVisible();
  });

  test('repeated navigation between screens keeps a single canvas and a clean console', async ({
    page,
    consoleErrors,
  }) => {
    await openApp(page);
    for (let round = 0; round < 4; round += 1) {
      await startMatch(page);
      await advance(page, 0.5);
      await expect(page.locator('canvas')).toHaveCount(1);
      await page.goBack();
      await expect(page.getByTestId('main-menu')).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(0);
      await page.getByRole('button', { name: 'Options' }).click();
      await page.getByRole('button', { name: 'Main Menu' }).click();
    }
    expect(await page.evaluate(() => window.__PIRATE_BATTLE__?.session() ?? null)).toBeNull();
    expect(consoleErrors).toEqual([]);
  });

  test('touch controls sail and fire', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch controls are shown on touch devices');
    await openApp(page, { balance: { spawn: { initialDelaySeconds: 999 } } });
    await startMatch(page);
    const controls = page.getByTestId('touch-controls');
    await expect(controls).toBeVisible();
    const start = await state(page);

    const forward = page.getByTestId('touch-forward');
    const fire = page.getByTestId('touch-fireFront');
    await forward.dispatchEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
    });
    await fire.dispatchEvent('pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
      button: 0,
    });
    const moving = await advance(page, 1);
    await forward.dispatchEvent('pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
    });
    await fire.dispatchEvent('pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
      button: 0,
    });
    expect(moving.player.y).toBeLessThan(start.player.y - 80);
    expect(moving.stats.shotsFired).toBe(2);

    const turn = page.getByTestId('touch-turnRight');
    await turn.dispatchEvent('pointerdown', {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
    });
    const turned = await advance(page, 0.5);
    await turn.dispatchEvent('pointerup', { pointerId: 3, pointerType: 'touch', isPrimary: true, button: 0 });
    expect(turned.player.angle).toBeGreaterThan(moving.player.angle + 1);
    const stopped = await advance(page, 0.5);
    expect(stopped.player.angle).toBeCloseTo(turned.player.angle, 5);
  });
});
