import { useSyncExternalStore } from 'react';
import { submissionStore } from './submissionStore';

export function useSubmissions() {
  return useSyncExternalStore(submissionStore.subscribe, submissionStore.getSnapshot);
}

export function useSubmission(matchId: string | undefined) {
  const entries = useSubmissions();
  return matchId ? entries.find((entry) => entry.record.matchId === matchId) : undefined;
}

export function retrySubmission(matchId: string): void {
  submissionStore.requeue(matchId);
}
