import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiSettings, retryDelay } from '../client/apiRuntime';
import { describeApiError, isRetryableError } from '../client/apiError';
import { submitMatch } from '../client/matchesApi';
import type { MatchRecord } from '../contracts/matches';
import { matchQueryKeys } from '../queries/matchQueries';
import { useSubmissions } from './submissionHooks';
import { submissionStore } from './submissionStore';

const AUTO_RETRY_COOLDOWN_MS = 4000;

export function SubmissionWorker() {
  const queryClient = useQueryClient();
  const entries = useSubmissions();

  const mutation = useMutation({
    mutationKey: ['matches', 'submit'],
    scope: { id: 'match-submissions' },
    mutationFn: (record: MatchRecord) => submitMatch(record),
    retry: (failureCount, error) => failureCount < apiSettings().maxSubmitRetries && isRetryableError(error),
    retryDelay,
    onSuccess: async (response, record) => {
      submissionStore.markConfirmed(record.matchId, response.record);
      await queryClient.invalidateQueries({ queryKey: matchQueryKeys.all });
    },
    onError: (error, record) => {
      submissionStore.markFailed(record.matchId, describeApiError(error));
    },
  });
  const { mutate } = mutation;

  useEffect(() => {
    for (const entry of entries) {
      if (entry.status !== 'pending') continue;
      if (submissionStore.markSending(entry.record.matchId)) mutate(entry.record);
    }
  }, [entries, mutate]);

  useEffect(() => {
    const retryFailed = () => submissionStore.requeueFailed(AUTO_RETRY_COOLDOWN_MS);
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') retryFailed();
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.includes('submissions')) submissionStore.reload();
    };
    window.addEventListener('online', retryFailed);
    window.addEventListener('storage', handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('online', retryFailed);
      window.removeEventListener('storage', handleStorage);
    };
  }, [queryClient]);

  return null;
}
