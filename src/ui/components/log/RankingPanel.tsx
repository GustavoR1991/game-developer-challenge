import { useState } from 'react';
import { useRankingQuery } from '../../../api/queries/matchQueries';
import type { MatchOptions } from '../../../game/config/gameConfig';
import { configLabel, formatPlayedAt } from '../../format';
import { hudIcon } from '../../uiAssets';
import { Pagination } from '../common/Pagination';
import { FetchIndicator, QueryEmpty, QueryError, QueryLoading } from '../common/QueryState';

interface RankingPanelProps {
  playerId: string;
  config: MatchOptions;
}

export function RankingPanel({ playerId, config }: RankingPanelProps) {
  const [page, setPage] = useState(1);
  const query = useRankingQuery(config, page);
  const data = query.data;

  return (
    <div data-testid="ranking-panel">
      <p className="log-meta">{configLabel(config)}</p>
      {query.isPending ? (
        <QueryLoading label="the ranking" />
      ) : query.isError && !data ? (
        <QueryError
          label="the ranking"
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : data && data.items.length === 0 ? (
        <QueryEmpty message="No battles recorded with this configuration yet." />
      ) : data ? (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Best battle of each captain with this configuration, ordered by points. Ties are broken by
                longer survival, then earlier date.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Captain</th>
                  <th scope="col">Points</th>
                  <th scope="col">Played</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => {
                  const isPlayer = entry.playerId === playerId;
                  return (
                    <tr
                      key={entry.matchId}
                      className={isPlayer ? 'is-player' : undefined}
                      data-testid="ranking-row"
                    >
                      <td className="numeric">{String(entry.rank).padStart(2, '0')}</td>
                      <td className="captain-cell">
                        {entry.rank === 1 ? (
                          <img className="rank-star" src={hudIcon('score')} alt="Top captain" />
                        ) : null}
                        <strong>{entry.playerName}</strong>
                        {isPlayer ? <span className="badge">YOU</span> : null}
                      </td>
                      <td className="numeric">{entry.score}</td>
                      <td className="date-cell">{formatPlayedAt(entry.playedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            label="Ranking"
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
