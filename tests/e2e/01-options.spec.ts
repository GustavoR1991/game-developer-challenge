import { expect, openApp, test } from '../fixtures/pirate';

test.describe('Options', () => {
  test('navigates from the menu, validates input and persists after refresh', async ({
    page,
    consoleErrors,
  }) => {
    await openApp(page);
    await expect(page.getByTestId('main-menu')).toBeVisible();
    await page.getByRole('button', { name: 'Options' }).click();
    await expect(page.getByRole('heading', { name: 'Options' })).toBeFocused();

    const duration = page.getByLabel('Game session time', { exact: true });
    const spawn = page.getByLabel('Enemy spawn time', { exact: true });
    await expect(duration).toHaveValue('120');
    await expect(spawn).toHaveValue('4');

    await duration.fill('20');
    await spawn.fill('0');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Game session time must be at least 60 seconds.')).toBeVisible();
    await expect(page.getByText('Enemy spawn time must be at least 1 second.')).toBeVisible();
    await expect(duration).toHaveAttribute('aria-invalid', 'true');
    await expect(duration).toBeFocused();

    await duration.fill('181');
    await spawn.fill('2.3');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Game session time must be at most 180 seconds.')).toBeVisible();
    await expect(page.getByText('Enemy spawn time must use steps of 0.5 seconds.')).toBeVisible();

    await duration.fill('90');
    await spawn.fill('2.5');
    await page.getByRole('button', { name: 'Increase enemy spawn time' }).click();
    await expect(spawn).toHaveValue('3');
    await page.getByLabel('Captain name').fill('Anne Bonny');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('options-status')).toHaveText(
      'Options saved. They apply to your next battle.',
    );

    await page.reload();
    await expect(page.getByLabel('Game session time', { exact: true })).toHaveValue('90');
    await expect(page.getByLabel('Enemy spawn time', { exact: true })).toHaveValue('3');
    await expect(page.getByLabel('Captain name')).toHaveValue('Anne Bonny');

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByTestId('main-menu')).toContainText('Anne Bonny');
    await expect(page.getByTestId('main-menu')).toContainText('90 s battles');
    expect(consoleErrors).toEqual([]);
  });

  test('menus are usable with the keyboard only', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Options' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('options-screen')).toBeVisible();

    await page.goto('/#/menu');
    const rankingTab = page.getByRole('tab', { name: 'Ranking' });
    await rankingTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Match History' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Match History' })).toHaveAttribute('aria-selected', 'true');
  });
});
