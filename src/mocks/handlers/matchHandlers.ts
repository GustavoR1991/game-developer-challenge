import { delay, HttpResponse, type JsonBodyType } from 'msw';
import { http } from 'msw/http';
import { z } from 'zod';
import { apiSettings } from '../../api/client/apiRuntime';
import { API_BASE_URL } from '../../api/client/httpClient';
import {
  API_ROUTE_PATTERNS,
  DEFAULT_PAGE_SIZE,
  matchConfigSchema,
  matchRecordSchema,
  MAX_PAGE_SIZE,
} from '../../api/contracts/matches';
import { matchDatabase } from '../db/matchDatabase';
import { scenarioStore } from '../scenarios/scenarioStore';
import type { LatencyMode, MockEndpoint } from '../scenarios/scenarios';

const TIMEOUT_MARGIN_MS = 1000;

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const rankingQuerySchema = pageQuerySchema.extend({
  durationSeconds: z.coerce.number(),
  spawnIntervalSeconds: z.coerce.number(),
});

function url(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

function latencyMs(latency: LatencyMode): number {
  const override = scenarioStore.getSnapshot().latencyOverrideMs;
  switch (latency.kind) {
    case 'fixed':
      return override ?? latency.ms;
    case 'random':
      return (
        override ?? Math.round(latency.minMs + scenarioStore.nextRandom() * (latency.maxMs - latency.minMs))
      );
    case 'out-of-order':
      return scenarioStore.nextRequestIndex() % 2 === 1 ? latency.slowMs : latency.fastMs;
  }
}

const delayedCommits = new Set<string>();

async function respond(
  endpoint: MockEndpoint,
  produce: () => Response | Promise<Response>,
  commit?: { key: string; run: () => void },
): Promise<Response> {
  const behavior = scenarioStore.scenario.endpoints[endpoint];
  await delay(latencyMs(behavior.latency));

  switch (behavior.failure.kind) {
    case 'network':
      return HttpResponse.error();
    case 'timeout':
      await delay(apiSettings().timeoutMs + TIMEOUT_MARGIN_MS);
      return HttpResponse.error();
    case 'http':
      return errorResponse(behavior.failure.status, behavior.failure.code, behavior.failure.message);
    case 'timeout-after-commit': {
      if (!commit || delayedCommits.has(commit.key)) return produce();
      delayedCommits.add(commit.key);
      commit.run();
      const response = await produce();
      await delay(apiSettings().timeoutMs + TIMEOUT_MARGIN_MS);
      return response;
    }
    default:
      return produce();
  }
}

function json(body: JsonBodyType, status = 200) {
  return HttpResponse.json(body, { status });
}

export const matchHandlers = [
  http.get(url(API_ROUTE_PATTERNS.ranking), ({ request }) =>
    respond('ranking', () => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      const query = rankingQuerySchema.safeParse(params);
      if (!query.success) return errorResponse(400, 'invalid_query', 'Invalid ranking query.');
      const config = matchConfigSchema.safeParse(query.data);
      if (!config.success) return errorResponse(400, 'invalid_config', 'Unsupported match configuration.');
      return json(
        matchDatabase.ranking(
          config.data,
          query.data.page,
          query.data.pageSize,
          scenarioStore.scenario.dataset,
        ),
      );
    }),
  ),

  http.get(url(API_ROUTE_PATTERNS.playerMatches), ({ request, params }) =>
    respond('history', () => {
      const query = pageQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      const playerId = typeof params.playerId === 'string' ? params.playerId : '';
      if (!query.success || !playerId) return errorResponse(400, 'invalid_query', 'Invalid history query.');
      return json(
        matchDatabase.history(playerId, query.data.page, query.data.pageSize, scenarioStore.scenario.dataset),
      );
    }),
  ),

  http.put(url(API_ROUTE_PATTERNS.match), async ({ request, params }) => {
    const body: unknown = await request.json().catch(() => null);
    const parsed = matchRecordSchema.safeParse(body);
    const matchId = typeof params.matchId === 'string' ? params.matchId : '';
    let outcome: ReturnType<typeof matchDatabase.upsert> | null = null;
    const commit = () => {
      if (parsed.success && parsed.data.matchId === matchId && !outcome)
        outcome = matchDatabase.upsert(parsed.data);
    };

    return respond(
      'submit',
      () => {
        if (!parsed.success) return errorResponse(400, 'invalid_match', 'The match record is invalid.');
        if (parsed.data.matchId !== matchId) return errorResponse(400, 'id_mismatch', 'Match id mismatch.');
        commit();
        const result = outcome ?? matchDatabase.upsert(parsed.data);
        if (result.kind === 'conflict') {
          return errorResponse(409, 'match_conflict', 'A different match was already stored with this id.');
        }
        return json(
          { record: result.record, created: result.kind === 'created', revision: result.revision },
          result.kind === 'created' ? 201 : 200,
        );
      },
      { key: matchId, run: commit },
    );
  }),
];
