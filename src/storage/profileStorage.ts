import { z } from 'zod';
import { playerNameSchema } from '../api/contracts/matches';
import { readJson, STORAGE_KEYS, writeJson } from './localStore';
import { createId } from '../utils/id';

const profileSchema = z.object({
  playerId: z.string().min(8),
  playerName: playerNameSchema,
});

export type PlayerProfile = z.infer<typeof profileSchema>;

export function loadProfile(): PlayerProfile {
  const stored = readJson(STORAGE_KEYS.profile, profileSchema);
  if (stored) return stored;
  const playerId = `player-${createId()}`;
  const profile: PlayerProfile = {
    playerId,
    playerName: `Captain ${playerId.slice(-4).toUpperCase()}`,
  };
  writeJson(STORAGE_KEYS.profile, profile);
  return profile;
}

export function savePlayerName(playerName: string): PlayerProfile | null {
  const parsed = playerNameSchema.safeParse(playerName);
  if (!parsed.success) return null;
  const profile = { ...loadProfile(), playerName: parsed.data };
  writeJson(STORAGE_KEYS.profile, profile);
  return profile;
}

export function validatePlayerName(playerName: string): string | null {
  const parsed = playerNameSchema.safeParse(playerName);
  return parsed.success ? null : 'Captain name must have between 2 and 20 characters.';
}
