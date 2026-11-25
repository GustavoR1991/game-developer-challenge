import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { submissionStore } from '../../api/submissions/submissionStore';
import { useAppServices } from '../../app/AppServices';
import { navigate } from '../../app/router';
import { playGameEvents, playSound, preloadSounds, stopAllSounds } from '../../game/audio/soundManager';
import { loadCombatTextures, type CombatTextures } from '../../game/render/combatTextures';
import { GameSession } from '../../game/session/GameSession';
import type { HudStore } from '../../game/session/HudStore';
import type { MatchResult } from '../../game/session/matchResult';
import { createRandomSeed } from '../../game/simulation/random';
import type { InputAction } from '../../game/input/commands';
import { balancedBaseConfig, registerSession, testControls } from '../../game/testing/testHooks';
import { saveLastResult } from '../../storage/lastResultStorage';
import { loadOptions } from '../../storage/optionsStorage';
import { createId } from '../../utils/id';
import { AppFooter } from '../components/common/AppFooter';
import { Dialog } from '../components/common/Dialog';
import { OptionsForm } from '../components/menu/OptionsForm';
import { GameButton } from '../components/common/GameButton';
import { Hud } from '../components/game/Hud';
import { TouchControls } from '../components/game/TouchControls';

type LoadState =
  | { kind: 'loading'; progress: number }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; textures: CombatTextures };

const DEFAULT_RESULT_DELAY_SECONDS = 1.4;

const PAUSE_TEXT: Record<string, string> = {
  manual: 'Ready when you are.',
  focus: 'Paused because the game window lost focus.',
  hidden: 'Paused because the tab was hidden.',
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
      if (cancelled) return;
      setState((current) =>
        current.kind === 'loading'
          ? { kind: 'loading', progress: Math.max(current.progress, progress) }
          : current,
      );
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
  const [pauseView, setPauseView] = useState<'menu' | 'options'>('menu');
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
  }, [assets, handleEnded]);

  const handlePhase = useCallback((nextPhase: string, reason: string | null) => {
    setPhase({ phase: nextPhase, reason });
  }, []);

  const handleTouch = useCallback(
    (action: InputAction, pressed: boolean) => session?.setTouchAction(action, pressed),
    [session],
  );

  const resume = () => {
    setPauseView('menu');
    playSound('resume');
    session?.resume();
    stageRef.current?.focus({ preventScroll: true });
  };

  const pause = () => {
    playSound('pause');
    session?.pause('manual');
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

        <AppFooter variant="game" />
      </main>

      {session && phase.phase === 'paused' && pauseView === 'menu' ? (
        <Dialog
          title="Paused"
          description={PAUSE_TEXT[phase.reason ?? 'manual']}
          testId="pause-dialog"
          initialFocus="container"
          onEscape={resume}
        >
          <div className="stack">
            <GameButton onClick={resume}>Resume</GameButton>
            <GameButton onClick={() => setPauseView('options')}>Options</GameButton>
            <GameButton onClick={() => navigate('menu')}>Main Menu</GameButton>
          </div>
        </Dialog>
      ) : null}
      {session && phase.phase === 'paused' && pauseView === 'options' ? (
        <Dialog
          title="Options"
          description="Changes apply to your next battle."
          testId="pause-options"
          onEscape={() => setPauseView('menu')}
        >
          <OptionsForm
            backLabel="Back"
            onBack={() => setPauseView('menu')}
            savedMessage="Options saved. They apply to your next battle."
          />
        </Dialog>
      ) : null}
    </div>
  );
}
