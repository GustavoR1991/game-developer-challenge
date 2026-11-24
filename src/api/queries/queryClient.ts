import { QueryCache, QueryClient, replaceEqualDeep } from '@tanstack/react-query';
import { apiSettings, retryDelay } from '../client/apiRuntime';
import { isRetryableError } from '../client/apiError';

interface Revisioned {
  revision: number;
}

function isRevisioned(value: unknown): value is Revisioned {
  return typeof value === 'object' && value !== null && typeof (value as Revisioned).revision === 'number';
}

export function keepNewestRevision(oldData: unknown, newData: unknown): unknown {
  if (isRevisioned(oldData) && isRevisioned(newData) && newData.revision < oldData.revision) return oldData;
  return replaceEqualDeep(oldData, newData);
}

export type QuerySuccessListener = () => void;

export function createQueryClient(onQuerySuccess?: QuerySuccessListener): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onSuccess: () => onQuerySuccess?.(),
    }),
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          failureCount < apiSettings().maxQueryRetries && isRetryableError(error),
        retryDelay,
        structuralSharing: keepNewestRevision,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
