import { useEffect } from 'react';
import { useAppServices } from '../../app/AppServices';
import { loadOptions } from '../../storage/optionsStorage';
import { CaptainsLog, type LogTab } from '../components/log/CaptainsLog';

export function CaptainsLogScreen({ tab }: { tab: LogTab }) {
  const { profile } = useAppServices();
  const options = loadOptions();

  useEffect(() => {
    document.title = `${tab === 'ranking' ? 'Ranking' : 'Match History'} · Pirate Battle`;
  }, [tab]);

  return (
    <main className="screen" data-testid="captains-log">
      <CaptainsLog
        active={tab}
        playerId={profile.playerId}
        playerName={profile.playerName}
        config={options}
      />
    </main>
  );
}
