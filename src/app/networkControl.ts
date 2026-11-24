import type { QueryClient } from '@tanstack/react-query';
import { submissionStore } from '../api/submissions/submissionStore';
import { matchDatabase } from '../mocks/db/matchDatabase';
import { scenarioStore } from '../mocks/scenarios/scenarioStore';
import { SCENARIOS } from '../mocks/scenarios/scenarios';
import { matchQueryKeys } from '../api/queries/matchQueries';

export interface NetworkControl {
  scenarios: readonly { id: string; label: string; description: string }[];
  selectScenario(id: string): void;
  setSeed(seed: number): void;
  setLatencyOverride(ms: number | null): void;
  resetAll(): Promise<void>;
}

export function createNetworkControl(queryClient: QueryClient): NetworkControl {
  return {
    scenarios: SCENARIOS.map(({ id, label, description }) => ({ id, label, description })),
    selectScenario(id) {
      scenarioStore.update({ scenarioId: id });
      void queryClient.invalidateQueries({ queryKey: matchQueryKeys.all });
    },
    setSeed(seed) {
      scenarioStore.update({ seed });
    },
    setLatencyOverride(ms) {
      scenarioStore.update({ latencyOverrideMs: ms });
    },
    async resetAll() {
      scenarioStore.reset();
      matchDatabase.reset();
      submissionStore.reset();
      await queryClient.cancelQueries({ queryKey: matchQueryKeys.all });
      queryClient.removeQueries({ queryKey: matchQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: matchQueryKeys.all });
    },
  };
}
