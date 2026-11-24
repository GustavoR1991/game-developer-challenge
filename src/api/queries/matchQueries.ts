import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchHistory, fetchRanking } from '../client/matchesApi';
import { DEFAULT_PAGE_SIZE, type MatchConfigDto } from '../contracts/matches';

export const matchQueryKeys = {
  all: ['matches'] as const,
  rankingRoot: ['matches', 'ranking'] as const,
  ranking: (config: MatchConfigDto, page: number, pageSize: number) =>
    ['matches', 'ranking', config.durationSeconds, config.spawnIntervalSeconds, page, pageSize] as const,
  historyRoot: ['matches', 'history'] as const,
  history: (playerId: string, page: number, pageSize: number) =>
    ['matches', 'history', playerId, page, pageSize] as const,
};

export function useRankingQuery(config: MatchConfigDto, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: matchQueryKeys.ranking(config, page, pageSize),
    queryFn: ({ signal }) => fetchRanking({ config, page, pageSize }, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useHistoryQuery(playerId: string, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: matchQueryKeys.history(playerId, page, pageSize),
    queryFn: ({ signal }) => fetchHistory({ playerId, page, pageSize }, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}
