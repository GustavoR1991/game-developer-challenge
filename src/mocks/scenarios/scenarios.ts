import type { Dataset } from '../db/matchDatabase';

export type MockEndpoint = 'ranking' | 'history' | 'submit';

export type FailureMode =
  | { kind: 'none' }
  | { kind: 'http'; status: number; code: string; message: string }
  | { kind: 'network' }
  | { kind: 'timeout' }
  | { kind: 'timeout-after-commit' };

export type LatencyMode =
  | { kind: 'fixed'; ms: number }
  | { kind: 'random'; minMs: number; maxMs: number }
  | { kind: 'out-of-order'; slowMs: number; fastMs: number };

export interface EndpointBehavior {
  latency: LatencyMode;
  failure: FailureMode;
}

export interface ScenarioDefinition {
  id: string;
  label: string;
  description: string;
  dataset: Dataset;
  endpoints: Record<MockEndpoint, EndpointBehavior>;
}

const NONE: FailureMode = { kind: 'none' };
const FAST: LatencyMode = { kind: 'fixed', ms: 150 };

function uniform(latency: LatencyMode, failure: FailureMode = NONE): Record<MockEndpoint, EndpointBehavior> {
  return {
    ranking: { latency, failure },
    history: { latency, failure },
    submit: { latency, failure },
  };
}

function only(
  endpoint: MockEndpoint,
  failure: FailureMode,
  latency: LatencyMode = FAST,
): Record<MockEndpoint, EndpointBehavior> {
  return { ...uniform(FAST), [endpoint]: { latency, failure } };
}

const SERVER_ERROR: FailureMode = {
  kind: 'http',
  status: 503,
  code: 'service_unavailable',
  message: 'The harbour master is unavailable. Try again soon.',
};

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'success',
    label: 'Success',
    description: 'Every request succeeds quickly.',
    dataset: 'default',
    endpoints: uniform(FAST),
  },
  {
    id: 'empty',
    label: 'Empty lists',
    description: 'Ranking and history return no records.',
    dataset: 'empty',
    endpoints: uniform(FAST),
  },
  {
    id: 'many-pages',
    label: 'Many pages',
    description: 'Large datasets with many pages in both tabs.',
    dataset: 'many-pages',
    endpoints: uniform(FAST),
  },
  {
    id: 'slow',
    label: 'Slow network',
    description: 'Every response takes 2.5 seconds.',
    dataset: 'default',
    endpoints: uniform({ kind: 'fixed', ms: 2500 }),
  },
  {
    id: 'variable-latency',
    label: 'Variable latency',
    description: 'Seeded random latency between 200 ms and 2 s.',
    dataset: 'default',
    endpoints: uniform({ kind: 'random', minMs: 200, maxMs: 2000 }),
  },
  {
    id: 'out-of-order',
    label: 'Out-of-order responses',
    description: 'Consecutive reads alternate slow and fast answers, so older requests finish last.',
    dataset: 'default',
    endpoints: {
      ranking: { latency: { kind: 'out-of-order', slowMs: 1800, fastMs: 150 }, failure: NONE },
      history: { latency: { kind: 'out-of-order', slowMs: 1800, fastMs: 150 }, failure: NONE },
      submit: { latency: FAST, failure: NONE },
    },
  },
  {
    id: 'timeout',
    label: 'Timeout',
    description: 'No request is answered before the client timeout.',
    dataset: 'default',
    endpoints: uniform(FAST, { kind: 'timeout' }),
  },
  {
    id: 'network-error',
    label: 'Connection failure',
    description: 'Every request fails at the network level.',
    dataset: 'default',
    endpoints: uniform(FAST, { kind: 'network' }),
  },
  {
    id: 'server-error',
    label: 'HTTP 5xx',
    description: 'Every request answers 503 Service Unavailable.',
    dataset: 'default',
    endpoints: uniform(FAST, SERVER_ERROR),
  },
  {
    id: 'client-error',
    label: 'HTTP 4xx',
    description: 'Every request answers 400 Bad Request (not retried).',
    dataset: 'default',
    endpoints: uniform(FAST, {
      kind: 'http',
      status: 400,
      code: 'bad_request',
      message: 'The request was rejected by the server.',
    }),
  },
  {
    id: 'ranking-fails',
    label: 'Ranking fails',
    description: 'Only the ranking endpoint answers 500.',
    dataset: 'default',
    endpoints: only('ranking', {
      kind: 'http',
      status: 500,
      code: 'ranking_failed',
      message: 'The ranking could not be loaded.',
    }),
  },
  {
    id: 'history-fails',
    label: 'History fails',
    description: 'Only the match history endpoint answers 500.',
    dataset: 'default',
    endpoints: only('history', {
      kind: 'http',
      status: 500,
      code: 'history_failed',
      message: 'The match history could not be loaded.',
    }),
  },
  {
    id: 'submit-timeout-after-commit',
    label: 'Submit timeout after commit',
    description:
      'The server stores the match but answers after the client timeout. The retry must not duplicate it.',
    dataset: 'default',
    endpoints: only('submit', { kind: 'timeout-after-commit' }),
  },
  {
    id: 'offline-at-match-end',
    label: 'Unavailable at match end',
    description: 'Match registration fails while this scenario is active. Switch back to Success to recover.',
    dataset: 'default',
    endpoints: only('submit', { kind: 'network' }),
  },
];

export const DEFAULT_SCENARIO_ID = 'success';

export function findScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
