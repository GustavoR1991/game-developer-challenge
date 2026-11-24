import type { z } from 'zod';

export const STORAGE_PREFIX = 'pirate-battle:';

export const STORAGE_KEYS = {
  options: `${STORAGE_PREFIX}options:v1`,
  profile: `${STORAGE_PREFIX}profile:v1`,
  lastResult: `${STORAGE_PREFIX}last-result:v1`,
  submissions: `${STORAGE_PREFIX}submissions:v1`,
  mockDatabase: `${STORAGE_PREFIX}mock-server:v1`,
  mockScenario: `${STORAGE_PREFIX}mock-scenario:v1`,
  testHooks: `${STORAGE_PREFIX}test-hooks`,
} as const;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, schema: z.ZodType<T>): T | null {
  const raw = storage()?.getItem(key);
  if (raw == null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    storage()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    return;
  }
}
