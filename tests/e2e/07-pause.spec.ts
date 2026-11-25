import { advance, expect, hold, openApp, startMatch, state, test } from '../fixtures/pirate';

const NO_ENEMIES = { spawn: { initialDelaySeconds: 999 } };

test.describe('Pause', () => {
  test('manual pause suspends timer, cooldowns and simulation until the player resumes', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const fired = await hold(page, ['w', 'Space'], 0.5);

    await page.getByRole('button', { name: 'Pause game' }).click();
    const dialog = page.getByRole('dialog', { name: 'Paused' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();

    const paused = await state(page);
    expect(paused.phase).toBe('paused');
    await page.keyboard.down('w');
    await page.keyboard.down('Space');
    const during = await advance(page, 3);
    await page.keyboard.up('w');
    await page.keyboard.up('Space');
    expect(during.elapsedSeconds).toBe(paused.elapsedSeconds);
    expect(during.player).toEqual(paused.player);
    expect(during.projectiles).toEqual(paused.projectiles);
    expect(during.stats.shotsFired).toBe(fired.stats.shotsFired);

    await expect(dialog).toContainText('Ready when you are.');
    await dialog.getByRole('button', { name: 'Options' }).click();
    const optionsDialog = page.getByRole('dialog', { name: 'Options' });
    await expect(optionsDialog.getByLabel('Game session time', { exact: true })).toBeVisible();
    await optionsDialog.getByRole('button', { name: 'Back' }).click();
    expect((await advance(page, 1)).elapsedSeconds).toBe(paused.elapsedSeconds);

    await dialog.getByRole('button', { name: 'Resume' }).click();
    await expect(dialog).toBeHidden();
    const resumed = await advance(page, 0.5);
    expect(resumed.phase).toBe('running');
    expect(resumed.elapsedSeconds).toBeCloseTo(paused.elapsedSeconds + 0.5, 5);
    expect(resumed.stats.shotsFired).toBe(fired.stats.shotsFired);
  });

  test('pauses automatically on focus loss and when the tab is hidden', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    await advance(page, 0.5);

    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.getByRole('dialog', { name: 'Paused' })).toContainText('lost focus');
    expect((await state(page)).pauseReason).toBe('focus');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeHidden();
    expect((await state(page)).phase).toBe('running');

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByRole('dialog', { name: 'Paused' })).toContainText('tab was hidden');
    expect((await state(page)).pauseReason).toBe('hidden');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(300);
    expect((await state(page)).phase).toBe('paused');
  });

  test('real-time clock does not advance while paused', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES, manualClock: false });
    await startMatch(page);
    await page.waitForTimeout(600);
    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
    const paused = await state(page);
    await page.waitForTimeout(1500);
    expect((await state(page)).elapsedSeconds).toBe(paused.elapsedSeconds);

    const resumedAt = Date.now();
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.waitForTimeout(500);
    const later = await state(page);
    const wallSeconds = (Date.now() - resumedAt) / 1000;
    const simulated = later.elapsedSeconds - paused.elapsedSeconds;
    expect(simulated).toBeGreaterThan(0.3);
    expect(simulated).toBeLessThanOrEqual(wallSeconds + 0.05);
  });
});
