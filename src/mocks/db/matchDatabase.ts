import { z } from 'zod';
import {
  compareRanking,
  matchRecordSchema,
  sameConfig,
  type HistoryPage,
  type MatchConfigDto,
  type MatchRecord,
  type RankingPage,
} from '../../api/contracts/matches';
import { readJson, removeKey, STORAGE_KEYS, writeJson } from '../../storage/localStore';
import { createFixtureRecords } from '../fixtures/matchFixtures';

const databaseSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().min(0),
  records: z.array(matchRecordSchema),
});

type DatabaseState = z.infer<typeof databaseSchema>;

export type Dataset = 'default' | 'empty' | 'many-pages';

export type UpsertResult =
  | { kind: 'created'; record: MatchRecord; revision: number }
  | { kind: 'existing'; record: MatchRecord; revision: number }
  | { kind: 'conflict'; record: MatchRecord };

const MANY_PAGES_EXTRA = 40;
const MANY_PAGES_PLAYER_MATCHES = 30;

function initialState(): DatabaseState {
  return { version: 1, revision: 1, records: createFixtureRecords() };
}

function sameSubmission(a: MatchRecord, b: MatchRecord): boolean {
  return (
    a.playerId === b.playerId &&
    a.score === b.score &&
    a.durationSeconds === b.durationSeconds &&
    a.endReason === b.endReason &&
    sameConfig(a.config, b.config)
  );
}

function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, totalItems, totalPages };
}

export class MatchDatabase {
  private state: DatabaseState;

  constructor() {
    this.state = readJson(STORAGE_KEYS.mockDatabase, databaseSchema) ?? initialState();
  }

  get revision(): number {
    return this.state.revision;
  }

  get size(): number {
    return this.state.records.length;
  }

  find(matchId: string): MatchRecord | undefined {
    return this.state.records.find((record) => record.matchId === matchId);
  }

  upsert(record: MatchRecord): UpsertResult {
    const existing = this.find(record.matchId);
    if (existing) {
      return sameSubmission(existing, record)
        ? { kind: 'existing', record: existing, revision: this.state.revision }
        : { kind: 'conflict', record: existing };
    }
    this.state = {
      ...this.state,
      revision: this.state.revision + 1,
      records: [...this.state.records, record],
    };
    this.persist();
    return { kind: 'created', record, revision: this.state.revision };
  }

  ranking(config: MatchConfigDto, page: number, pageSize: number, dataset: Dataset): RankingPage {
    const bestByPlayer = new Map<string, MatchRecord>();
    for (const record of this.records(dataset)) {
      if (!sameConfig(record.config, config)) continue;
      const best = bestByPlayer.get(record.playerId);
      if (!best || compareRanking(record, best) < 0) bestByPlayer.set(record.playerId, record);
    }
    const ranked = [...bestByPlayer.values()]
      .sort(compareRanking)
      .map((record, index) => ({ ...record, rank: index + 1 }));
    return { ...paginate(ranked, page, pageSize), revision: this.state.revision };
  }

  history(playerId: string, page: number, pageSize: number, dataset: Dataset): HistoryPage {
    const synthetic =
      dataset === 'many-pages'
        ? createFixtureRecords(0, 11)
            .slice(0, MANY_PAGES_PLAYER_MATCHES)
            .map((record) => ({ ...record, matchId: `bulk-player-${record.matchId}`, playerId }))
        : [];
    const history = [...this.records(dataset), ...synthetic]
      .filter((record) => record.playerId === playerId)
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt) || b.matchId.localeCompare(a.matchId));
    return { ...paginate(history, page, pageSize), revision: this.state.revision };
  }

  reset(): void {
    removeKey(STORAGE_KEYS.mockDatabase);
    this.state = initialState();
  }

  private records(dataset: Dataset): readonly MatchRecord[] {
    if (dataset === 'empty') return [];
    if (dataset === 'many-pages') {
      const extra = createFixtureRecords(MANY_PAGES_EXTRA, 7).map((record, index) => ({
        ...record,
        matchId: `bulk-${record.matchId}`,
        playerId: `bulk-player-${String(index).padStart(4, '0')}`,
        playerName: `Corsair ${index + 1}`,
      }));
      return [...this.state.records, ...extra];
    }
    return this.state.records;
  }

  private persist(): void {
    writeJson(STORAGE_KEYS.mockDatabase, this.state);
  }
}

export const matchDatabase = new MatchDatabase();
