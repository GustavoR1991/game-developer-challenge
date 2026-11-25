import { z } from 'zod';
import { endReasonSchema, matchConfigSchema } from '../api/contracts/matches';
import type { MatchResult } from '../game/session/matchResult';
import { readJson, STORAGE_KEYS, writeJson } from './localStore';

const lastResultSchema = z.object({
  matchId: z.string(),
  seed: z.number(),
  score: z.number().int().min(0),
  durationSeconds: z.number().min(0),
  endReason: endReasonSchema,
  config: matchConfigSchema,
  endedAt: z.iso.datetime(),
  stats: z.object({
    shotsFired: z.number(),
    enemiesDestroyed: z.number(),
    damageTaken: z.number(),
  }),
});

export function loadLastResult(): MatchResult | null {
  return readJson(STORAGE_KEYS.lastResult, lastResultSchema);
}

export function saveLastResult(result: MatchResult): void {
  writeJson(STORAGE_KEYS.lastResult, result);
}
