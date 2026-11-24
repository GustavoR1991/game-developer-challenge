import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { submissionStore } from '../../api/submissions/submissionStore';
import { useAppServices } from '../../app/AppServices';
import { navigate } from '../../app/router';
import { playGameEvents, playSound, preloadSounds, stopAllSounds } from '../../game/audio/soundManager';
import { loadCombatTextures, type CombatTextures } from '../../game/assets/combatAssets';
import { GameSession } from '../../game/bridge/GameSession';
import type { HudStore } from '../../game/bridge/HudStore';
import type { MatchResult } from '../../game/bridge/matchResult';
import { createRandomSeed } from '../../game/core/random';
import type { InputAction } from '../../game/input/commands';
import { balancedBaseConfig, registerSession, testControls } from '../../game/testing/testHooks';
import { saveLastResult } from '../../storage/lastResultStorage';
import { loadOptions } from '../../storage/optionsStorage';
import { createId } from '../../utils/id';
import { Dialog } from '../components/Dialog';
import { GameButton } from '../components/GameButton';
import { Hud } from '../components/Hud';
import { TouchControls } from '../components/TouchControls';

type LoadState =
  | { kind: 'loading'; progress: number }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; textures: CombatTextures };

const DEFAULT_RESULT_DELAY_SECONDS = 1.4;
const PORTRAIT_TOUCH_QUERY = '(orientation: portrait) and (hover: none) and (pointer: coarse)';

const PAUSE_TEXT: Record<string, string> = {
  manual: 'The battle is paused.',
  focus: 'Paused because the game window lost focus.',
  hidden: 'Paused because the tab was hidden.',
  orientation: 'Paused. Rotate your device to landscape to keep playing.',
};

function useAssets(): [LoadState, () => void] {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading', progress: 0 });
  const retry = useCallback(() => {
    setState({ kind: 'loading', progress: 0 });
    setAttempt((value) => value + 1);
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadCombatTextures(window.devicePixelRatio || 1, (progress) => {
      if (!cancelled) setState({ kind: 'loading', progress });
    })
      .then((textures) => {
        if (!cancelled) setState({ kind: 'ready', textures });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: 'The game assets could not be loaded. Check your connection and try again.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return [state, retry];
}

function GamePhaseSync({
  store,
  onPhase,
}: {
  store: HudStore;
  onPhase: (phase: string, reason: string | null) => void;
}) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    onPhase(snapshot.phase, snapshot.pauseReason);
  }, [snapshot.phase, snapshot.pauseReason, onPhase]);
  return null;
}

export function GameScreen() {
  const { profile } = useAppServices();
  const [matchKey, setMatchKey] = useState(0);
  const [assets, retryAssets] = useAssets();
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [phase, setPhase] = useState<{ phase: string; reason: string | null }>({
    phase: 'running',
    reason: null,
  });
  const [sessionError, setSessionError] = useState<string | null>(null);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    document.title = 'Battle · Pirate Battle';
    preloadSounds();
    return () => stopAllSounds();
  }, []);

  const handleEnded = useCallback((result: MatchResult) => {
    const { playerId, playerName } = profileRef.current;
    saveLastResult(result);
    submissionStore.enqueue({
      matchId: result.matchId,
      playerId,
      playerName,
      playedAt: result.endedAt,
      score: result.score,
      durationSeconds: result.durationSeconds,
      endReason: result.endReason,
      config: result.config,
    });
    navigate('result');
  }, []);

  useEffect(() => {
    if (assets.kind !== 'ready' || !hostRef.current) return;
    const host = hostRef.current;
    let cancelled = false;
    let created: GameSession | null = null;
    const controls = testControls();

    setSessionError(null);
    GameSession.create(
      {
        host,
        textures: assets.textures,
        options: loadOptions(),
        baseConfig: balancedBaseConfig(),
        seed: controls.seed ?? createRandomSeed(),
        manualClock: controls.manualClock,
        resultDelaySeconds: controls.resultDelaySeconds ?? DEFAULT_RESULT_DELAY_SECONDS,
        createMatchId: () => `match-${createId()}`,
        onEnded: handleEnded,
        onEvents: playGameEvents,
      },
      () => cancelled,
    )
      .then((instance) => {
        if (!instance) return;
        created = instance;
        registerSession(instance);
        setSession(instance);
        playSound('start');
        stageRef.current?.focus({ preventScroll: true });
      })
      .catch(() => {
        if (!cancelled) setSessionError('The battle could not start on this device.');
      });

    return () => {
      cancelled = true;
      registerSession(null);
      created?.destroy();
      setSession(null);
    };
  }, [assets, matchKey, handleEnded]);

  useEffect(() => {
    if (!session) return;
    const query = window.matchMedia(PORTRAIT_TOUCH_QUERY);
    const check = () => {
      if (query.matches) session.pause('orientation');
    };
    check();
    query.addEventListener('change', check);
    return () => query.removeEventListener('change', check);
  }, [session]);

  const handlePhase = useCallback((nextPhase: string, reason: string | null) => {
    setPhase({ phase: nextPhase, reason });
  }, []);

  const handleTouch = useCallback(
    (action: InputAction, pressed: boolean) => session?.setTouchAction(action, pressed),
    [session],
  );

  const resume = () => {
    if (window.matchMedia(PORTRAIT_TOUCH_QUERY).matches) return;
    playSound('resume');
    session?.resume();
    stageRef.current?.focus({ preventScroll: true });
  };

  const pause = () => {
    playSound('pause');
    session?.pause('manual');
  };

  const restart = () => {
    setSession(null);
    setPhase({ phase: 'running', reason: null });
    setMatchKey((key) => key + 1);
  };

  const forceTouch = new URLSearchParams(window.location.search).get('touch') === '1';

  return (
    <div className="game-screen" data-testid="game-screen">
      {session ? (
        <>
          <Hud store={session.hud} onPause={pause} />
          <GamePhaseSync store={session.hud} onPhase={handlePhase} />
        </>
      ) : (
        <header className="hud">
          <h1 className="sr-only">Pirate Battle — preparing battle</h1>
        </header>
      )}
      <main
        className="game-stage"
        ref={stageRef}
        tabIndex={-1}
        aria-label="Battle arena. Use the keyboard or touch controls to sail and fire."
        data-testid="game-stage"
      >
        <div className="game-canvas-host" ref={hostRef} />
        {session ? (
          <TouchControls onAction={handleTouch} disabled={phase.phase !== 'running'} force={forceTouch} />
        ) : null}

        {assets.kind === 'loading' ? (
          <div className="overlay" data-testid="loading-overlay">
            <div className="stack">
              <p id="loading-label">Loading the fleet…</p>
              <div
                className="loading-bar"
                role="progressbar"
                aria-labelledby="loading-label"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(assets.progress * 100)}
              >
                <div
                  className="loading-bar__fill"
                  style={{ width: `${Math.round(assets.progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {assets.kind === 'error' || sessionError ? (
          <div className="overlay">
            <Dialog title="Could not start the battle" testId="asset-error">
              <p className="error-text" role="alert">
                {assets.kind === 'error' ? assets.message : sessionError}
              </p>
              <div className="stack">
                <GameButton
                  onClick={() => {
                    setSessionError(null);
                    retryAssets();
                  }}
                >
                  Retry
                </GameButton>
                <GameButton variant="secondary" onClick={() => navigate('menu')}>
                  Main Menu
                </GameButton>
              </div>
            </Dialog>
          </div>
        ) : null}

        <div className="overlay rotate-notice" aria-hidden={phase.reason !== 'orientation'}>
          <p className="panel" style={{ width: 'auto' }}>
            Rotate your device to landscape to play.
          </p>
        </div>
      </main>

      {session && phase.phase === 'paused' ? (
        <Dialog
          title="Paused"
          description={PAUSE_TEXT[phase.reason ?? 'manual']}
          testId="pause-dialog"
          initialFocus="container"
          onEscape={resume}
        >
          <div className="stack">
            <GameButton onClick={resume}>Resume</GameButton>
            <GameButton onClick={restart}>Restart</GameButton>
            <GameButton variant="secondary" onClick={() => navigate('menu')}>
              Main Menu
            </GameButton>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
