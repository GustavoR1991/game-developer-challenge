import {
  advance,
  advanceUntil,
  expect,
  hold,
  openApp,
  startMatch,
  state,
  test,
  waitForSession,
} from '../fixtures/pirate';

test.describe('Match end and restart', () => {
  test('ends when time is up and freezes the simulation', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 60, spawnIntervalSeconds: 4 },
      balance: { player: { maxHealth: 100000 } },
      resultDelaySeconds: 5,
    });
    await startMatch(page);
    await page.keyboard.down('Space');
    const ended = await advanceUntil(page, (current) => current.phase === 'ended', {
      step: 1,
      maxSeconds: 61,
    });
    await page.keyboard.up('Space');
    expect(ended.endReason).toBe('time_up');
    expect(ended.elapsedSeconds).toBe(60);
    expect(ended.remainingSeconds).toBe(0);
    await expect(page.getByTestId('hud-time')).toHaveText('00:00');

    await page.keyboard.down('w');
    await page.keyboard.down('Space');
    const frozen = await advance(page, 2);
    await page.keyboard.up('w');
    await page.keyboard.up('Space');
    expect(frozen.elapsedSeconds).toBe(60);
    expect(frozen.player).toEqual(ended.player);
    expect(frozen.enemies).toEqual(ended.enemies);
    expect(frozen.projectiles).toEqual(ended.projectiles);
    expect(frozen.spawn).toEqual(ended.spawn);
    expect(frozen.score).toBe(ended.score);
    expect(frozen.stats).toEqual(ended.stats);

    await advance(page, 4);
    await expect(page.getByTestId('result-screen')).toBeVisible();
    await expect(page.getByTestId('result-reason')).toHaveText('Time up');
    await expect(page.getByTestId('result-duration')).toHaveText('01:00');
  });

  test('ends when the player ship is destroyed', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: {
        player: { maxHealth: 20 },
        spawn: { initialDelaySeconds: 0.5, openingSequence: ['chaser'], weights: { chaser: 1, shooter: 0 } },
      },
      resultDelaySeconds: 5,
    });
    await startMatch(page);
    const ended = await advanceUntil(page, (current) => current.phase === 'ended', { maxSeconds: 20 });
    expect(ended.endReason).toBe('player_destroyed');
    expect(ended.player.health).toBe(0);
    expect(ended.score).toBe(0);
    expect(ended.remainingSeconds).toBeGreaterThan(100);

    const frozen = await hold(page, ['w', 'Space', 'q'], 1);
    expect(frozen.elapsedSeconds).toBe(ended.elapsedSeconds);
    expect(frozen.stats.shotsFired).toBe(ended.stats.shotsFired);
    expect(frozen.projectiles).toEqual(ended.projectiles);
  });

  test('restart creates a fresh match', async ({ page }) => {
    await openApp(page, { balance: { spawn: { initialDelaySeconds: 0.5 } } });
    await startMatch(page);
    await hold(page, ['w', 'Space'], 3);
    const before = await state(page);
    expect(before.elapsedSeconds).toBeGreaterThan(2.9);
    expect(before.enemies.length + before.stats.enemiesDestroyed).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    const dialog = page.getByRole('dialog', { name: 'Paused' });
    await dialog.getByRole('button', { name: 'Restart' }).click();
    await waitForSession(page);
    await page.waitForFunction(
      () => (window.__PIRATE_BATTLE__?.session() as { elapsedSeconds: number } | null)?.elapsedSeconds === 0,
    );
    const fresh = await state(page);
    expect(fresh.phase).toBe('running');
    expect(fresh.score).toBe(0);
    expect(fresh.player.health).toBe(100);
    expect(fresh.enemies).toHaveLength(0);
    expect(fresh.projectiles).toHaveLength(0);
    expect(fresh.stats).toEqual({ shotsFired: 0, enemiesDestroyed: 0, damageTaken: 0 });
    expect(fresh.player.x).toBe(768);
    expect(fresh.player.y).toBe(432);
    await expect(page.getByTestId('game-canvas')).toHaveCount(1);
  });
});
