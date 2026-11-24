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

    await page.getByRole('button', { name: 'Resume' }).click();
    const resumed = await state(page);
    expect(resumed.elapsedSeconds - paused.elapsedSeconds).toBeLessThan(0.6);
    await page.waitForTimeout(500);
    const later = await state(page);
    expect(later.elapsedSeconds - paused.elapsedSeconds).toBeGreaterThan(0.3);
    expect(later.elapsedSeconds - paused.elapsedSeconds).toBeLessThan(1.2);
  });
});
