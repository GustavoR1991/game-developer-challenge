import { z } from 'zod';
import { OPTION_LIMITS } from '../../game/config/gameConfig';

export const END_REASONS = ['time_up', 'player_destroyed'] as const;
export const endReasonSchema = z.enum(END_REASONS);

export const matchConfigSchema = z.object({
  durationSeconds: z
    .number()
    .int()
    .min(OPTION_LIMITS.durationSeconds.min)
    .max(OPTION_LIMITS.durationSeconds.max),
  spawnIntervalSeconds: z
    .number()
    .min(OPTION_LIMITS.spawnIntervalSeconds.min)
    .max(OPTION_LIMITS.spawnIntervalSeconds.max),
});

export const playerNameSchema = z.string().trim().min(2).max(20);

export const matchRecordSchema = z.object({
  matchId: z.string().min(8).max(64),
  playerId: z.string().min(8).max(64),
  playerName: playerNameSchema,
  playedAt: z.iso.datetime(),
  score: z.number().int().min(0),
  durationSeconds: z.number().min(0).max(OPTION_LIMITS.durationSeconds.max),
  endReason: endReasonSchema,
  config: matchConfigSchema,
});

export const rankingEntrySchema = matchRecordSchema.extend({
  rank: z.number().int().min(1),
});

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    revision: z.number().int().min(0),
  });
}

export const rankingPageSchema = pageSchema(rankingEntrySchema);
export const historyPageSchema = pageSchema(matchRecordSchema);

export const submitMatchResponseSchema = z.object({
  record: matchRecordSchema,
  created: z.boolean(),
  revision: z.number().int().min(0),
});

export const apiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type EndReasonDto = z.infer<typeof endReasonSchema>;
export type MatchConfigDto = z.infer<typeof matchConfigSchema>;
export type MatchRecord = z.infer<typeof matchRecordSchema>;
export type RankingEntry = z.infer<typeof rankingEntrySchema>;
export type RankingPage = z.infer<typeof rankingPageSchema>;
export type HistoryPage = z.infer<typeof historyPageSchema>;
export type SubmitMatchResponse = z.infer<typeof submitMatchResponseSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface RankingRequest extends PageRequest {
  config: MatchConfigDto;
}

export interface HistoryRequest extends PageRequest {
  playerId: string;
}

export const DEFAULT_PAGE_SIZE = 8;
export const MAX_PAGE_SIZE = 50;

export const API_ROUTES = {
  ranking: '/ranking',
  playerMatches: (playerId: string) => `/players/${encodeURIComponent(playerId)}/matches`,
  match: (matchId: string) => `/matches/${encodeURIComponent(matchId)}`,
} as const;

export function configKey(config: MatchConfigDto): string {
  return `${config.durationSeconds}s-${config.spawnIntervalSeconds}s`;
}

export function compareRanking(a: MatchRecord, b: MatchRecord): number {
  return (
    b.score - a.score ||
    b.durationSeconds - a.durationSeconds ||
    a.playedAt.localeCompare(b.playedAt) ||
    a.matchId.localeCompare(b.matchId)
  );
}

export function sameConfig(a: MatchConfigDto, b: MatchConfigDto): boolean {
  return a.durationSeconds === b.durationSeconds && a.spawnIntervalSeconds === b.spawnIntervalSeconds;
}
