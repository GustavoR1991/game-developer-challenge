import { useEffect, useRef } from 'react';
import { retrySubmission, useSubmission } from '../../api/submissions/submissionHooks';
import type { SubmissionEntry } from '../../api/submissions/submissionStore';
import { navigate } from '../../app/router';
import { loadLastResult } from '../../storage/lastResultStorage';
import { endReasonLabel, formatClock } from '../format';
import { GameButton } from '../components/common/GameButton';

function SubmissionStatus({ entry }: { entry: SubmissionEntry | undefined }) {
  if (!entry) {
    return (
      <p
        className="submission-status muted"
        role="status"
        data-testid="submission-status"
        data-status="unknown"
      >
        This battle is not in the local registration queue.
      </p>
    );
  }
  const { status, lastError, record } = entry;
  return (
    <div
      className="submission-status"
      role="status"
      aria-live="polite"
      data-testid="submission-status"
      data-status={status}
    >
      {status === 'confirmed' ? (
        <p className="success-text" style={{ margin: 0 }}>
          Saved to your match history.
        </p>
      ) : status === 'failed' ? (
        <>
          <p className="error-text" style={{ margin: '0 0 8px' }}>
            Not saved yet. {lastError}
          </p>
          <p className="muted" style={{ margin: '0 0 10px' }}>
            It stays queued on this device. You can retry now or start another battle.
          </p>
          <GameButton size="small" onClick={() => retrySubmission(record.matchId)}>
            Retry save
          </GameButton>
        </>
      ) : (
        <p style={{ margin: 0 }}>
          {status === 'sending' ? 'Saving your battle…' : 'Waiting to save your battle…'}
        </p>
      )}
    </div>
  );
}

export function ResultScreen() {
  const result = loadLastResult();
  const entry = useSubmission(result?.matchId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = 'Battle result · Pirate Battle';
    headingRef.current?.focus();
  }, []);

  if (!result) {
    return (
      <main className="screen" data-testid="result-screen">
        <section className="panel">
          <h1 ref={headingRef} tabIndex={-1} className="panel__title">
            No battle yet
          </h1>
          <p className="muted">Finish a battle to see its result here.</p>
          <GameButton onClick={() => navigate('menu')}>Main Menu</GameButton>
        </section>
      </main>
    );
  }

  return (
    <main className="screen" data-testid="result-screen">
      <section className="panel panel--result" aria-labelledby="result-title">
        <h1 id="result-title" ref={headingRef} tabIndex={-1} className="panel__title">
          Battle complete
        </h1>
        <p className="result-score" data-testid="result-score" aria-label={`${result.score} points`}>
          {result.score}
        </p>
        <p className="result-summary">
          <span>Points</span> ·{' '}
          <span data-testid="result-duration">{formatClock(result.durationSeconds)}</span> ·{' '}
          <span data-testid="result-reason">{endReasonLabel(result.endReason)}</span>
        </p>
        <SubmissionStatus entry={entry} />
        <div className="stack">
          <GameButton onClick={() => navigate('play')}>Play Again</GameButton>
          <GameButton onClick={() => navigate('menu')}>Main Menu</GameButton>
        </div>
      </section>
    </main>
  );
}
