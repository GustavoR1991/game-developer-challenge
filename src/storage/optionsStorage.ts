import { z } from 'zod';
import { DEFAULT_MATCH_OPTIONS, OPTION_LIMITS, type MatchOptions } from '../game/config/gameConfig';
import { readJson, STORAGE_KEYS, writeJson } from './localStore';

const { durationSeconds, spawnIntervalSeconds } = OPTION_LIMITS;

export const matchOptionsSchema = z.object({
  durationSeconds: z
    .number({ error: 'Game session time must be a number.' })
    .int({ error: 'Game session time must be a whole number of seconds.' })
    .min(durationSeconds.min, { error: `Game session time must be at least ${durationSeconds.min} seconds.` })
    .max(durationSeconds.max, { error: `Game session time must be at most ${durationSeconds.max} seconds.` }),
  spawnIntervalSeconds: z
    .number({ error: 'Enemy spawn time must be a number.' })
    .min(spawnIntervalSeconds.min, {
      error: `Enemy spawn time must be at least ${spawnIntervalSeconds.min} second.`,
    })
    .max(spawnIntervalSeconds.max, {
      error: `Enemy spawn time must be at most ${spawnIntervalSeconds.max} seconds.`,
    })
    .refine((value) => Number.isInteger(value / spawnIntervalSeconds.step), {
      error: `Enemy spawn time must use steps of ${spawnIntervalSeconds.step} seconds.`,
    }),
});

export type OptionsField = keyof MatchOptions;
export type OptionsErrors = Partial<Record<OptionsField, string>>;

export function validateOptions(
  candidate: unknown,
): { ok: true; value: MatchOptions } | { ok: false; errors: OptionsErrors } {
  const parsed = matchOptionsSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: OptionsErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if ((field === 'durationSeconds' || field === 'spawnIntervalSeconds') && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}

export function loadOptions(): MatchOptions {
  return readJson(STORAGE_KEYS.options, matchOptionsSchema) ?? { ...DEFAULT_MATCH_OPTIONS };
}

export function saveOptions(options: MatchOptions): boolean {
  return writeJson(STORAGE_KEYS.options, options);
}
