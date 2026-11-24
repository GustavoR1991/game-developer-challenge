import type { MatchOptions } from '../config/gameConfig';
import type { EndReason } from '../entities/types';
import type { MatchStats } from '../simulation/context';

export interface MatchResult {
  matchId: string;
  seed: number;
  score: number;
  durationSeconds: number;
  endReason: EndReason;
  config: MatchOptions;
  endedAt: string;
  stats: MatchStats;
}
