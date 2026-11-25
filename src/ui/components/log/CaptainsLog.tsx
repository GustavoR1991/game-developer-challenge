import { useRef, type KeyboardEvent } from 'react';
import { navigate } from '../../../app/router';
import type { MatchOptions } from '../../../game/config/gameConfig';
import { GameButton } from '../common/GameButton';
import { HistoryPanel } from './HistoryPanel';
import { RankingPanel } from './RankingPanel';

export type LogTab = 'ranking' | 'history';

const TABS: readonly { id: LogTab; label: string }[] = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'history', label: 'Match History' },
];

interface CaptainsLogProps {
  active: LogTab;
  playerId: string;
  playerName: string;
  config: MatchOptions;
}

export function CaptainsLog({ active, playerId, playerName, config }: CaptainsLogProps) {
  const tabRefs = useRef<Record<LogTab, HTMLButtonElement | null>>({ ranking: null, history: null });

  const select = (tab: LogTab, focus: boolean) => {
    navigate(tab, { replace: true });
    if (focus) requestAnimationFrame(() => tabRefs.current[tab]?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.id === active);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TABS.length - 1;
    const next = nextIndex === null ? undefined : TABS[nextIndex];
    if (!next) return;
    event.preventDefault();
    select(next.id, true);
  };

  return (
    <section className="panel panel--wide" aria-labelledby="log-title">
      <h1 id="log-title" className="panel__title">
        Captain&apos;s Log
      </h1>
      <div className="tablist" role="tablist" aria-label="Captain's log" onKeyDown={handleKeyDown}>
        {TABS.map((tab) => (
          <GameButton
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            id={`log-tab-${tab.id}`}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`log-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            variant="secondary"
            size="small"
            className="game-button--tab"
            onClick={() => select(tab.id, false)}
          >
            {tab.label}
          </GameButton>
        ))}
      </div>
      <div id={`log-panel-${active}`} role="tabpanel" aria-labelledby={`log-tab-${active}`} tabIndex={0}>
        {active === 'ranking' ? (
          <RankingPanel playerId={playerId} config={config} />
        ) : (
          <HistoryPanel playerId={playerId} playerName={playerName} />
        )}
      </div>
      <div className="stack log-footer">
        <GameButton onClick={() => navigate('menu')}>Main Menu</GameButton>
      </div>
    </section>
  );
}
