import { useState } from 'react';
import { useHistoryQuery } from '../../../api/queries/matchQueries';
import { useSubmissions } from '../../../api/submissions/submissionHooks';
import { endReasonLabel, formatClock, formatDay, formatTime } from '../../format';
import { Pagination } from '../common/Pagination';
import { FetchIndicator, QueryEmpty, QueryError, QueryLoading } from '../common/QueryState';

interface HistoryPanelProps {
  playerId: string;
  playerName: string;
}

export function HistoryPanel({ playerId, playerName }: HistoryPanelProps) {
  const [page, setPage] = useState(1);
  const query = useHistoryQuery(playerId, page);
  const submissions = useSubmissions();
  const unsynced = submissions.filter(
    (entry) => entry.status !== 'confirmed' && entry.record.playerId === playerId,
  ).length;
  const data = query.data;

  return (
    <div data-testid="history-panel">
      <p className="log-meta">{playerName} · Your recent battles</p>
      {unsynced > 0 ? (
        <p className="muted pending-note" role="status" data-testid="history-pending">
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
              <caption className="sr-only">Your match history, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Points</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((record, index) => (
                  <tr
                    key={record.matchId}
                    className={data.page === 1 && index === 0 ? 'is-player' : undefined}
                    data-testid="history-row"
                  >
                    <td className="date-cell">
                      <strong>{formatDay(record.playedAt)}</strong> ·{' '}
                      <small>{formatTime(record.playedAt)}</small>
                    </td>
                    <td className="numeric">{record.score}</td>
                    <td>
                      <strong>{formatClock(record.durationSeconds)}</strong>
                    </td>
                    <td className={`result-cell result-cell--${record.endReason}`}>
                      {endReasonLabel(record.endReason)}
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
