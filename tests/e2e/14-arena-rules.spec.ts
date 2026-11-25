import { advance, advanceUntil, expect, hold, openApp, startMatch, state, test } from '../fixtures/pirate';

const NO_ENEMIES = { spawn: { initialDelaySeconds: 999 } };
const FRONT_SPEED = 480;
const FRONT_RANGE = 520;

test.describe('Arena, projectiles and weapon rules', () => {
  test('a cannonball keeps its direction and speed and expires at its range', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const fired = await hold(page, ['Space'], 1 / 60, 1 / 60);
    const ball = fired.projectiles[0]!;
    expect(fired.projectiles).toHaveLength(1);

    const half = await advance(page, 0.5);
    const moved = half.projectiles[0]!;
    expect(moved.id).toBe(ball.id);
    expect(moved.x).toBeCloseTo(ball.x, 3);
    expect(ball.y - moved.y).toBeCloseTo(FRONT_SPEED * 0.5, 0);

    const beforeRange = await advance(page, FRONT_RANGE / FRONT_SPEED - 0.5 - 0.1);
    expect(beforeRange.projectiles).toHaveLength(1);
    const afterRange = await advance(page, 0.15);
    expect(afterRange.projectiles).toHaveLength(0);
    expect(afterRange.player.health).toBe(100);
  });

  test('a cannonball leaving the arena is removed', async ({ page }) => {
    await openApp(page, { balance: NO_ENEMIES });
    await startMatch(page);
    const atEdge = await hold(page, ['w'], 6);
    expect(atEdge.player.y).toBeCloseTo(atEdge.player.radius, 0);
    await advanceUntil(page, (current) => current.player.speed < 1, { maxSeconds: 3 });
    const fired = await hold(page, ['Space'], 1 / 60, 1 / 60);
    expect(fired.stats.shotsFired).toBe(1);
    const after = await advance(page, 0.1);
    expect(after.projectiles).toHaveLength(0);
  });

  test('the shooter cannon respects its cooldown and only hits the player', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: {
        player: { maxHealth: 100000 },
        spawn: { initialDelaySeconds: 0.5, openingSequence: ['shooter'], weights: { chaser: 0, shooter: 1 } },
      },
    });
    await startMatch(page);
    const seen = new Map<number, number>();
    let snapshot = await state(page);
    for (let step = 0; step < 300 && snapshot.elapsedSeconds < 10.3; step += 1) {
      snapshot = await advance(page, 0.05);
      for (const projectile of snapshot.projectiles) {
        if (projectile.owner === 'enemy' && !seen.has(projectile.id))
          seen.set(projectile.id, snapshot.elapsedSeconds);
      }
    }
    const times = [...seen.values()].sort((a, b) => a - b);
    expect(times.length).toBeGreaterThanOrEqual(2);
    for (let index = 1; index < times.length; index += 1) {
      expect(times[index]! - times[index - 1]!).toBeGreaterThanOrEqual(2.2 - 0.06);
    }
    expect(snapshot.enemies.every((enemy) => enemy.health === 60)).toBe(true);
  });
});
