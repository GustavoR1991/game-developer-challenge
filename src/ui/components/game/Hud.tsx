import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { HudSnapshot, HudStore } from '../../../game/session/HudStore';
import { formatClock } from '../../format';
import { hudIcon } from '../../uiAssets';
import { RoundIconButton } from '../common/RoundIconButton';

interface HudProps {
  store: HudStore;
  onPause: () => void;
}

const TIME_ANNOUNCEMENTS = new Set([60, 30, 10, 5]);
const LOW_TIME_SECONDS = 10;
const FRAME_WIDTH = 256;
const FILL_START = 30;
const FILL_WIDTH = 196;
const PHASE_LABELS = { running: 'In progress', paused: 'Paused', ended: 'Finished' } as const;

function describeChange(before: HudSnapshot, after: HudSnapshot): string | null {
  if (after.phase !== before.phase) {
    if (after.phase === 'paused') return 'Game paused.';
    if (after.phase === 'running') return 'Game resumed.';
    return after.endReason === 'player_destroyed'
      ? `Your ship was destroyed. Final score ${after.score}.`
      : `Time is up. Final score ${after.score}.`;
  }
  if (after.score !== before.score) return `Score ${after.score}.`;
  if (after.remainingSeconds !== before.remainingSeconds && TIME_ANNOUNCEMENTS.has(after.remainingSeconds)) {
    return `${after.remainingSeconds} seconds left.`;
  }
  if (after.health / after.maxHealth <= 0.3 && before.health / before.maxHealth > 0.3)
    return 'Hull integrity low!';
  return null;
}

function healthLevel(ratio: number): 'green' | 'amber' | 'red' {
  if (ratio > 0.6) return 'green';
  if (ratio > 0.3) return 'amber';
  return 'red';
}

export function Hud({ store, onPause }: HudProps) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef(store.getSnapshot());

  useEffect(
    () =>
      store.subscribe(() => {
        const message = describeChange(previous.current, store.getSnapshot());
        previous.current = store.getSnapshot();
        if (message) setAnnouncement(message);
      }),
    [store],
  );

  const ratio = snapshot.maxHealth > 0 ? snapshot.health / snapshot.maxHealth : 0;
  const level = healthLevel(ratio);
  const lowTime = snapshot.remainingSeconds <= LOW_TIME_SECONDS;

  return (
    <header className="hud" data-testid="hud">
      <h1 className="sr-only">Pirate Battle — battle in progress</h1>
      <div className="hud__group">
        <div className="hud-health">
          <img src={hudIcon('heart')} alt="" />
          <div
            className="hud-health__bar"
            role="meter"
            aria-label="Ship health"
            aria-valuemin={0}
            aria-valuemax={snapshot.maxHealth}
            aria-valuenow={snapshot.health}
            data-testid="hud-health"
          >
            <div
              className="hud-health__fill"
              data-level={level}
              style={{ width: `${((FILL_START + FILL_WIDTH * Math.max(0, ratio)) / FRAME_WIDTH) * 100}%` }}
            />
            <span className="hud-health__label">
              {snapshot.health} / {snapshot.maxHealth}
            </span>
          </div>
        </div>
      </div>
      <dl className="hud__group hud__counters">
        <div className="hud-counter">
          <dt>
            <img src={hudIcon('score')} alt="Score" />
          </dt>
          <dd style={{ margin: 0 }} data-testid="hud-score">
            {snapshot.score}
          </dd>
        </div>
        <div className={`hud-counter${lowTime ? ' hud-counter--warning' : ''}`}>
          <dt>
            <img src={hudIcon('time')} alt="Time left" />
          </dt>
          <dd style={{ margin: 0 }} data-testid="hud-time">
            <time dateTime={`PT${snapshot.remainingSeconds}S`}>{formatClock(snapshot.remainingSeconds)}</time>
          </dd>
        </div>
        <div className="sr-only">
          <dt>Battle status</dt>
          <dd data-testid="hud-phase">{PHASE_LABELS[snapshot.phase]}</dd>
        </div>
      </dl>
      <RoundIconButton
        icon="pause"
        label="Pause game"
        className="hud-pause"
        onClick={onPause}
        disabled={snapshot.phase !== 'running'}
        data-testid="pause-button"
      />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="hud-announcer">
        {announcement}
      </p>
    </header>
  );
}
