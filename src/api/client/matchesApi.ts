import {
  API_ROUTES,
  historyPageSchema,
  rankingPageSchema,
  submitMatchResponseSchema,
  type HistoryPage,
  type HistoryRequest,
  type MatchRecord,
  type RankingPage,
  type RankingRequest,
  type SubmitMatchResponse,
} from '../contracts/matches';
import { toApiError } from './apiError';
import { httpClient } from './httpClient';

export async function fetchRanking(request: RankingRequest, signal?: AbortSignal): Promise<RankingPage> {
  try {
    const response = await httpClient.get(API_ROUTES.ranking, {
      params: {
        durationSeconds: request.config.durationSeconds,
        spawnIntervalSeconds: request.config.spawnIntervalSeconds,
        page: request.page,
        pageSize: request.pageSize,
      },
      ...(signal ? { signal } : {}),
    });
    return rankingPageSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchHistory(request: HistoryRequest, signal?: AbortSignal): Promise<HistoryPage> {
  try {
    const response = await httpClient.get(API_ROUTES.playerMatches(request.playerId), {
      params: { page: request.page, pageSize: request.pageSize },
      ...(signal ? { signal } : {}),
    });
    return historyPageSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitMatch(record: MatchRecord): Promise<SubmitMatchResponse> {
  try {
    const response = await httpClient.put(API_ROUTES.match(record.matchId), record, {
      headers: { 'Idempotency-Key': record.matchId },
    });
    return submitMatchResponseSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}
