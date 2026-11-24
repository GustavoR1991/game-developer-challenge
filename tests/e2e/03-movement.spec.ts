import {
  advance,
  angleBetween,
  expect,
  hold,
  openApp,
  penetrationDepth,
  shortestAngleDelta,
  startMatch,
  state,
  test,
  turnTo,
} from '../fixtures/pirate';

const NO_ENEMIES = { spawn: { initialDelaySeconds: 999 } };

test.describe('Movement and arena', () => {
  test('starts a match, sails forward and rotates both ways while firing', async ({
    page,
    consoleErrors,
  }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const start = await state(page);
    expect(start.phase).toBe('running');
    expect(start.remainingSeconds).toBe(120);
    expect(start.player.health).toBe(100);
    await expect(page.getByTestId('hud-time')).toHaveText('02:00');

    const forward = await hold(page, ['w'], 1);
    expect(forward.player.y).toBeLessThan(start.player.y - 80);
    expect(Math.abs(forward.player.x - start.player.x)).toBeLessThan(0.5);

    const right = await hold(page, ['d'], 0.5);
    expect(shortestAngleDelta(forward.player.angle, right.player.angle)).toBeCloseTo(1.3, 1);
    const left = await hold(page, ['a'], 0.5);
    expect(shortestAngleDelta(right.player.angle, left.player.angle)).toBeCloseTo(-1.3, 1);

    const combo = await hold(page, ['w', 'Space'], 0.3);
    expect(combo.player.speed).toBeGreaterThan(0);
    expect(combo.stats.shotsFired).toBe(1);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps the ship inside the arena limits', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    await turnTo(page, Math.PI / 2);
    await page.keyboard.down('w');
    let snapshot = await state(page);
    for (let index = 0; index < 50; index += 1) {
      snapshot = await advance(page, 0.1);
      expect(snapshot.player.y).toBeLessThanOrEqual(snapshot.arena.height - snapshot.player.radius + 0.01);
    }
    await page.keyboard.up('w');
    expect(snapshot.player.y).toBeCloseTo(snapshot.arena.height - snapshot.player.radius, 1);
  });

  test('cannot sail through islands', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const start = await state(page);
    const island = start.arena.islands.find((candidate) => candidate.id === 'north');
    if (!island) throw new Error('north island missing');
    const center = {
      x: island.collider.x + island.collider.width / 2,
      y: island.collider.y + island.collider.height / 2,
    };

    await turnTo(page, angleBetween(start.player, center), 0.02);
    await page.keyboard.down('w');
    let snapshot = await state(page);
    for (let index = 0; index < 30; index += 1) {
      snapshot = await advance(page, 0.1);
      expect(penetrationDepth(snapshot.player, snapshot.player.radius, island.collider)).toBeLessThan(0.5);
    }
    await page.keyboard.up('w');
    const travelled = Math.hypot(snapshot.player.x - start.player.x, snapshot.player.y - start.player.y);
    const straightLine = Math.hypot(center.x - start.player.x, center.y - start.player.y);
    expect(travelled).toBeLessThan(straightLine);
    expect(Math.hypot(snapshot.player.x - center.x, snapshot.player.y - center.y)).toBeGreaterThan(
      island.collider.height / 2 + snapshot.player.radius - 1,
    );
  });
});
