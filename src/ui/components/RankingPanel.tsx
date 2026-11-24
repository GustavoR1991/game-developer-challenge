import { useState } from 'react';
import { OPTION_LIMITS, type MatchOptions } from '../../game/config/gameConfig';
import { useRankingQuery } from '../../api/queries/matchQueries';
import { configLabel, formatClock, formatPlayedAt } from '../format';
import { Pagination } from './Pagination';
import { FetchIndicator, QueryEmpty, QueryError, QueryLoading } from './QueryState';

interface RankingPanelProps {
  playerId: string;
  defaultConfig: MatchOptions;
}

const DURATION_PRESETS = [60, 90, 120, 150, 180];
const SPAWN_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10];

function withCurrent(values: number[], current: number): number[] {
  return Array.from(new Set([...values, current])).sort((a, b) => a - b);
}

export function RankingPanel({ playerId, defaultConfig }: RankingPanelProps) {
  const [config, setConfig] = useState<MatchOptions>(defaultConfig);
  const [page, setPage] = useState(1);
  const query = useRankingQuery(config, page);

  const updateConfig = (next: Partial<MatchOptions>) => {
    setConfig((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const data = query.data;
  const pageNotFound = data && data.totalPages > 0 && page > data.totalPages;

  return (
    <div data-testid="ranking-panel">
      <div className="row" style={{ marginBottom: 10 }}>
        <label>
          <span className="sr-only">Battle duration</span>
          <select
            value={config.durationSeconds}
            onChange={(event) => updateConfig({ durationSeconds: Number(event.target.value) })}
            aria-label="Battle duration for the ranking"
          >
            {withCurrent(DURATION_PRESETS, config.durationSeconds)
              .filter(
                (value) =>
                  value >= OPTION_LIMITS.durationSeconds.min && value <= OPTION_LIMITS.durationSeconds.max,
              )
              .map((value) => (
                <option key={value} value={value}>
                  {value} s battles
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Spawn interval</span>
          <select
            value={config.spawnIntervalSeconds}
            onChange={(event) => updateConfig({ spawnIntervalSeconds: Number(event.target.value) })}
            aria-label="Enemy spawn interval for the ranking"
          >
            {withCurrent(SPAWN_PRESETS, config.spawnIntervalSeconds).map((value) => (
              <option key={value} value={value}>
                {value} s spawn interval
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="log-meta">Ranking for {configLabel(config)}</p>

      {query.isPending ? (
        <QueryLoading label="the ranking" />
      ) : query.isError && !data ? (
        <QueryError
          label="the ranking"
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : data && (data.items.length === 0 || pageNotFound) ? (
        <QueryEmpty message="No battles recorded with this configuration yet." />
      ) : data ? (
        <>
          <div className="table-scroll">
            <table className="data-table" aria-describedby="ranking-caption">
              <caption id="ranking-caption" className="sr-only">
                Ranking, ordered by points. Ties are broken by longer survival, then earlier date.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Captain</th>
                  <th scope="col">Points</th>
                  <th scope="col">Time</th>
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
                      <td>
                        {entry.playerName}
                        {isPlayer ? <span className="badge">YOU</span> : null}
                      </td>
                      <td className="numeric">{entry.score}</td>
                      <td>{formatClock(entry.durationSeconds)}</td>
                      <td>{formatPlayedAt(entry.playedAt)}</td>
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
