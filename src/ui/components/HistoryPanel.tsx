import { useState } from 'react';
import { useHistoryQuery } from '../../api/queries/matchQueries';
import { useSubmissions } from '../../api/submissions/submissionHooks';
import { endReasonLabel, formatClock, formatPlayedAt } from '../format';
import { Pagination } from './Pagination';
import { FetchIndicator, QueryEmpty, QueryError, QueryLoading } from './QueryState';

interface HistoryPanelProps {
  playerId: string;
}

export function HistoryPanel({ playerId }: HistoryPanelProps) {
  const [page, setPage] = useState(1);
  const query = useHistoryQuery(playerId, page);
  const submissions = useSubmissions();
  const unsynced = submissions.filter(
    (entry) => entry.status !== 'confirmed' && entry.record.playerId === playerId,
  ).length;
  const data = query.data;

  return (
    <div data-testid="history-panel">
      <p className="log-meta">Your battles, newest first</p>
      {unsynced > 0 ? (
        <p className="muted" role="status" data-testid="history-pending">
          {unsynced === 1 ? '1 battle is' : `${unsynced} battles are`} waiting to be saved.
        </p>
      ) : null}

      {query.isPending ? (
        <QueryLoading label="your match history" />
      ) : query.isError && !data ? (
        <QueryError
          label="your match history"
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : data && data.items.length === 0 ? (
        <QueryEmpty message="No battles yet. Press Play to set sail!" />
      ) : data ? (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">Your match history</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Points</th>
                  <th scope="col">Time</th>
                  <th scope="col">Result</th>
                  <th scope="col">Setup</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((record) => (
                  <tr key={record.matchId} data-testid="history-row">
                    <td>{formatPlayedAt(record.playedAt)}</td>
                    <td className="numeric">{record.score}</td>
                    <td>{formatClock(record.durationSeconds)}</td>
                    <td>{endReasonLabel(record.endReason)}</td>
                    <td>
                      {record.config.durationSeconds} s / {record.config.spawnIntervalSeconds} s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="Match history"
            page={data.page}
            totalPages={data.totalPages}
            onChange={setPage}
            disabled={query.isPlaceholderData}
          />
        </>
      ) : null}
      <FetchIndicator active={query.isFetching && !query.isPending} stale={query.isError && !!data} />
    </div>
  );
}
