import {
  advance,
  advanceUntil,
  angleBetween,
  expect,
  hold,
  openApp,
  startMatch,
  state,
  test,
  turnTo,
} from '../fixtures/pirate';

const NO_ENEMIES = { spawn: { initialDelaySeconds: 999 } };

const SLOW_TARGET = {
  spawn: { initialDelaySeconds: 0.5, openingSequence: ['chaser'], weights: { chaser: 1, shooter: 0 } },
  chaser: { moveSpeed: 45 },
};

test.describe('Combat', () => {
  test('front cannon respects its cooldown', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const held = await hold(page, ['Space'], 0.9);
    expect(held.stats.shotsFired).toBe(2);
    expect(held.player.cooldowns.front).toBeGreaterThan(0);

    const later = await hold(page, ['Space'], 0.1);
    expect(later.stats.shotsFired).toBe(2);
    const afterCooldown = await hold(page, ['Space'], 0.2);
    expect(afterCooldown.stats.shotsFired).toBe(3);
  });

  test('broadsides fire three parallel cannonballs per side with their own cooldown', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const before = await state(page);

    const left = await hold(page, ['q'], 1 / 60, 1 / 60);
    const leftBalls = left.projectiles.filter((projectile) => projectile.owner === 'player');
    expect(leftBalls).toHaveLength(3);
    for (const ball of leftBalls) expect(ball.x).toBeLessThan(before.player.x);
    const ys = leftBalls.map((ball) => ball.y).sort((a, b) => a - b);
    expect(ys[1]! - ys[0]!).toBeCloseTo(ys[2]! - ys[1]!, 3);

    const repeated = await hold(page, ['q'], 0.2);
    expect(repeated.projectiles.filter((projectile) => projectile.x < before.player.x)).toHaveLength(3);

    const right = await hold(page, ['e'], 1 / 60, 1 / 60);
    expect(right.projectiles.filter((projectile) => projectile.x > before.player.x)).toHaveLength(3);
    expect(right.player.cooldowns.left).toBeGreaterThan(0);
    expect(right.player.cooldowns.right).toBeGreaterThan(0);
  });

  test('cannonballs damage enemies once and destroying one scores a single point', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: SLOW_TARGET,
    });
    await startMatch(page);
    let snapshot = await advanceUntil(page, (current) => current.enemies.length === 1, { maxSeconds: 3 });
    expect(snapshot.enemies[0]!.kind).toBe('chaser');

    const healthSeen = new Set<number>();
    for (let guard = 0; guard < 150 && snapshot.enemies.length > 0; guard += 1) {
      const target = snapshot.enemies[0]!;
      healthSeen.add(target.health);
      await turnTo(page, angleBetween(snapshot.player, target), 0.03);
      snapshot = await hold(page, ['Space'], 0.1);
      for (const enemy of snapshot.enemies) healthSeen.add(enemy.health);
    }

    expect(snapshot.enemies).toHaveLength(0);
    expect(snapshot.player.health).toBe(100);
    expect([...healthSeen].every((health) => health % 20 === 0)).toBe(true);
    expect(healthSeen.has(20)).toBe(true);
    expect(snapshot.score).toBe(1);
    expect(snapshot.stats.enemiesDestroyed).toBe(1);
    await expect(page.getByTestId('hud-score')).toHaveText('1');

    const settled = await hold(page, ['Space'], 2);
    expect(settled.score).toBe(1);
    expect(settled.stats.enemiesDestroyed).toBe(1);
  });

  test('island blocks cannonballs', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const start = await state(page);
    const island = start.arena.islands.find((candidate) => candidate.id === 'north')!;
    const center = {
      x: island.collider.x + island.collider.width / 2,
      y: island.collider.y + island.collider.height / 2,
    };
    await turnTo(page, angleBetween(start.player, center), 0.02);
    const fired = await hold(page, ['Space'], 1 / 60, 1 / 60);
    expect(fired.projectiles).toHaveLength(1);
    const after = await advance(page, 0.6);
    expect(after.projectiles).toHaveLength(0);
  });
});
