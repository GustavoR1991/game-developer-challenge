import { describeApiError } from '../../api/client/apiError';
import { GameButton } from './GameButton';

interface QueryLoadingProps {
  label: string;
}

export function QueryLoading({ label }: QueryLoadingProps) {
  return (
    <div className="query-state" role="status" aria-live="polite">
      <span>Loading {label}…</span>
    </div>
  );
}

interface QueryErrorProps {
  label: string;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}

export function QueryError({ label, error, onRetry, retrying }: QueryErrorProps) {
  return (
    <div className="query-state" role="alert">
      <p className="error-text">
        Could not load {label}. {describeApiError(error)}
      </p>
      <GameButton size="small" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </GameButton>
    </div>
  );
}

interface QueryEmptyProps {
  message: string;
}

export function QueryEmpty({ message }: QueryEmptyProps) {
  return (
    <div className="query-state" role="status">
      <p className="muted">{message}</p>
    </div>
  );
}

interface FetchIndicatorProps {
  active: boolean;
  stale: boolean;
}

export function FetchIndicator({ active, stale }: FetchIndicatorProps) {
  return (
    <p className="fetch-indicator" role="status" aria-live="polite">
      {active ? 'Updating…' : stale ? 'Showing saved data. Latest update failed.' : ''}
    </p>
  );
}
