import { useEffect, useRef } from 'react';
import { navigate } from '../../app/router';
import { ControlsHelp } from '../components/menu/ControlsHelp';
import { GameButton } from '../components/common/GameButton';
import { menuImage, shipIconStyle } from '../uiAssets';

export function MainMenuScreen() {
  const playRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = 'Pirate Battle';
    playRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="screen" data-testid="main-menu">
      <section className="panel panel--menu" aria-labelledby="menu-title">
        <h1 id="menu-title" className="menu-title">
          <img
            className="title-art"
            src={menuImage('title_pirate_battle')}
            alt="Pirate Battle"
            width={384}
            height={128}
          />
        </h1>
        <p className="tagline">Set sail. Take command.</p>
        <div className="stack">
          <GameButton ref={playRef} onClick={() => navigate('play')}>
            Play
          </GameButton>
          <GameButton onClick={() => navigate('options')}>Options</GameButton>
        </div>
        <span className="menu-ship" style={shipIconStyle(58)} aria-hidden="true" />
        <p className="menu-subtitle">Navigate the islands. Survive the battle.</p>
        <ControlsHelp />
        <nav className="row menu-log-links" aria-label="Captain's log">
          <GameButton variant="secondary" size="small" onClick={() => navigate('ranking')}>
            Ranking
          </GameButton>
          <GameButton variant="secondary" size="small" onClick={() => navigate('history')}>
            Match History
          </GameButton>
        </nav>
      </section>
    </main>
  );
}
