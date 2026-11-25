import type { MatchConfigDto, MatchRecord } from '../../api/contracts/matches';
import { createRandom } from '../../game/simulation/random';

export const FIXTURE_CAPTAINS = [
  'Captain Flint',
  'Red Sparrow',
  'Storm Rider',
  'Sea Wolf',
  'Anne Tidebreaker',
  'Old Barnacle',
  'Iron Hook',
  'Mara Saltwind',
  'Blackwater Bess',
  'Coral Jack',
  'Gale Morgan',
  'Silver Finn',
  'Rusty Anchor',
  'Nell Firebrand',
  'Cutlass Kai',
  'Dread Ivy',
] as const;

export const FIXTURE_CONFIGS: readonly { config: MatchConfigDto; count: number }[] = [
  { config: { durationSeconds: 120, spawnIntervalSeconds: 4 }, count: 30 },
  { config: { durationSeconds: 60, spawnIntervalSeconds: 4 }, count: 12 },
  { config: { durationSeconds: 180, spawnIntervalSeconds: 4 }, count: 12 },
  { config: { durationSeconds: 120, spawnIntervalSeconds: 2 }, count: 10 },
  { config: { durationSeconds: 90, spawnIntervalSeconds: 3 }, count: 6 },
];

const FIXTURE_SEED = 20_260_901;
const FIXTURE_BASE_TIME = Date.parse('2026-11-01T18:00:00.000Z');
const HOUR = 3_600_000;

function fixtureRecord(
  index: number,
  config: MatchConfigDto,
  random: ReturnType<typeof createRandom>,
): MatchRecord {
  const captainIndex = Math.floor(random.next() * FIXTURE_CAPTAINS.length);
  const captain = FIXTURE_CAPTAINS[captainIndex] ?? 'Captain Flint';
  const survived = random.next() > 0.35;
  const durationSeconds = survived
    ? config.durationSeconds
    : Math.round(random.range(config.durationSeconds * 0.3, config.durationSeconds * 0.95) * 100) / 100;
  const pace = random.range(0.08, 0.3) * (4 / config.spawnIntervalSeconds);
  return {
    matchId: `fixture-${String(index).padStart(4, '0')}`,
    playerId: `fixture-player-${String(captainIndex).padStart(2, '0')}`,
    playerName: captain,
    playedAt: new Date(FIXTURE_BASE_TIME - index * 5 * HOUR - Math.floor(random.next() * HOUR)).toISOString(),
    score: Math.max(0, Math.round(durationSeconds * pace)),
    durationSeconds,
    endReason: survived ? 'time_up' : 'player_destroyed',
    config,
  };
}

export function createFixtureRecords(extraPerConfig = 0, seed = FIXTURE_SEED): MatchRecord[] {
  const random = createRandom(seed);
  const records: MatchRecord[] = [];
  let index = 0;
  for (const { config, count } of FIXTURE_CONFIGS) {
    for (let item = 0; item < count + extraPerConfig; item += 1) {
      records.push(fixtureRecord(index, config, random));
      index += 1;
    }
  }
  return records;
}
