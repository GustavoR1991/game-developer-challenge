import { useEffect, useRef } from 'react';
import { useAppServices } from '../../app/AppServices';
import { navigate } from '../../app/router';
import { loadOptions } from '../../storage/optionsStorage';
import { CaptainsLog } from '../components/CaptainsLog';
import { ControlsHelp } from '../components/ControlsHelp';
import { GameButton } from '../components/GameButton';
import { NetworkScenarioPanel } from '../components/NetworkScenarioPanel';
import { menuImage } from '../uiAssets';

export function MainMenuScreen() {
  const { networkControl, profile } = useAppServices();
  const options = loadOptions();
  const playRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = 'Pirate Battle';
    playRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="screen" data-testid="main-menu">
      <div className="menu-layout">
        <section className="panel" aria-labelledby="menu-title">
          <h1 id="menu-title" style={{ margin: 0 }}>
            <img
              className="title-art"
              src={menuImage('title_pirate_battle')}
              alt="Pirate Battle"
              width={340}
              height={113}
            />
          </h1>
          <p className="tagline">Set sail. Take command.</p>
          <p className="muted" style={{ marginTop: 0 }}>
            Sailing as <strong>{profile.playerName}</strong> · {options.durationSeconds} s battles ·{' '}
            {options.spawnIntervalSeconds} s spawns
          </p>
          <div className="stack">
            <GameButton ref={playRef} onClick={() => navigate('play')}>
              Play
            </GameButton>
            <GameButton onClick={() => navigate('options')}>Options</GameButton>
          </div>
          <ControlsHelp />
          <NetworkScenarioPanel control={networkControl} />
        </section>
        <CaptainsLog playerId={profile.playerId} defaultConfig={options} />
      </div>
    </main>
  );
}
