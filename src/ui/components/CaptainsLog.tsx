import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { MatchOptions } from '../../game/config/gameConfig';
import { GameButton } from './GameButton';
import { HistoryPanel } from './HistoryPanel';
import { RankingPanel } from './RankingPanel';

type LogTab = 'ranking' | 'history';

const TABS: readonly { id: LogTab; label: string }[] = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'history', label: 'Match History' },
];

interface CaptainsLogProps {
  playerId: string;
  defaultConfig: MatchOptions;
}

export function CaptainsLog({ playerId, defaultConfig }: CaptainsLogProps) {
  const [active, setActive] = useState<LogTab>('ranking');
  const baseId = useId();
  const tabRefs = useRef<Record<LogTab, HTMLButtonElement | null>>({ ranking: null, history: null });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === active);
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TABS.length - 1;
    const next = TABS[nextIndex];
    if (!next) return;
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <section className="panel panel--wide" aria-labelledby={`${baseId}-title`}>
      <h2 id={`${baseId}-title`} className="panel__title">
        Captain&apos;s Log
      </h2>
      <div className="tablist" role="tablist" aria-label="Captain's log" onKeyDown={handleKeyDown}>
        {TABS.map((tab) => (
          <GameButton
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            id={`${baseId}-tab-${tab.id}`}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            variant="secondary"
            size="small"
            className="game-button--tab"
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </GameButton>
        ))}
      </div>
      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={0}
        >
          {active === tab.id ? (
            tab.id === 'ranking' ? (
              <RankingPanel playerId={playerId} defaultConfig={defaultConfig} />
            ) : (
              <HistoryPanel playerId={playerId} />
            )
          ) : null}
        </div>
      ))}
    </section>
  );
}
