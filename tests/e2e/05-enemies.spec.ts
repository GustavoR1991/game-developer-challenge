import { advance, advanceUntil, expect, openApp, startMatch, test } from '../fixtures/pirate';

test.describe('Enemies and spawning', () => {
  test('chaser pursues the player and explodes on impact without scoring', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: {
        spawn: { initialDelaySeconds: 0.5, openingSequence: ['chaser'], weights: { chaser: 1, shooter: 0 } },
      },
    });
    await startMatch(page);
    const spawned = await advanceUntil(page, (current) => current.enemies.length === 1, { maxSeconds: 2 });
    const chaser = spawned.enemies[0]!;
    const initialDistance = Math.hypot(chaser.x - spawned.player.x, chaser.y - spawned.player.y);
    expect(initialDistance).toBeGreaterThanOrEqual(480);

    const later = await advance(page, 2);
    const moved = later.enemies[0]!;
    expect(Math.hypot(moved.x - later.player.x, moved.y - later.player.y)).toBeLessThan(
      initialDistance - 100,
    );

    const hit = await advanceUntil(page, (current) => current.player.health < 100, { maxSeconds: 15 });
    expect(hit.player.health).toBe(80);
    expect(hit.enemies).toHaveLength(0);
    expect(hit.score).toBe(0);
    expect(hit.stats.enemiesDestroyed).toBe(1);
  });

  test('shooter approaches and fires once the player is in range', async ({ page }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 10 },
      balance: {
        spawn: { initialDelaySeconds: 0.5, openingSequence: ['shooter'], weights: { chaser: 0, shooter: 1 } },
      },
    });
    await startMatch(page);
    const firing = await advanceUntil(
      page,
      (current) => current.projectiles.some((projectile) => projectile.owner === 'enemy'),
      { maxSeconds: 20 },
    );
    const shooter = firing.enemies[0]!;
    expect(shooter.kind).toBe('shooter');
    expect(Math.hypot(shooter.x - firing.player.x, shooter.y - firing.player.y)).toBeLessThanOrEqual(
      420 + 10,
    );

    const hit = await advanceUntil(page, (current) => current.player.health < 100, { maxSeconds: 10 });
    expect(hit.player.health).toBe(90);
    expect(hit.enemies[0]?.kind).toBe('shooter');
  });

  test('spawns enemies on the configured interval, away from the player, with both kinds', async ({
    page,
  }) => {
    await openApp(page, {
      options: { durationSeconds: 120, spawnIntervalSeconds: 2 },
      balance: { spawn: { initialDelaySeconds: 1 } },
    });
    await startMatch(page);
    expect((await advance(page, 0.95)).spawn.spawned).toBe(0);
    const first = await advance(page, 0.1);
    expect(first.spawn.spawned).toBe(1);
    expect(first.enemies[0]!.kind).toBe('chaser');
    expect(
      Math.hypot(first.enemies[0]!.x - first.player.x, first.enemies[0]!.y - first.player.y),
    ).toBeGreaterThanOrEqual(480);

    expect((await advance(page, 1.8)).spawn.spawned).toBe(1);
    const second = await advance(page, 0.2);
    expect(second.spawn.spawned).toBe(2);
    expect(second.spawn.spawnedByKind).toEqual({ chaser: 1, shooter: 1 });

    const third = await advance(page, 2);
    expect(third.spawn.spawned + third.spawn.skipped).toBe(3);
  });
});
