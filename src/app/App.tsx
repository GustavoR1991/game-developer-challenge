import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useMemo, useState } from 'react';
import { SubmissionWorker } from '../api/submissions/SubmissionWorker';
import { loadProfile, type PlayerProfile } from '../storage/profileStorage';
import { MainMenuScreen } from '../ui/screens/MainMenuScreen';
import { OptionsScreen } from '../ui/screens/OptionsScreen';
import { ResultScreen } from '../ui/screens/ResultScreen';
import { AppServicesContext, type AppServices } from './AppServices';
import type { NetworkControl } from './networkControl';
import { useRoute } from './router';

const GameScreen = lazy(() =>
  import('../ui/screens/GameScreen').then((module) => ({ default: module.GameScreen })),
);

function GameScreenFallback() {
  return (
    <div className="game-screen" data-testid="game-screen-loading">
      <div className="overlay" role="status">
        Preparing the battle…
      </div>
    </div>
  );
}

interface AppProps {
  queryClient: QueryClient;
  networkControl: NetworkControl;
}

function CurrentScreen() {
  const route = useRoute();
  switch (route) {
    case 'options':
      return <OptionsScreen />;
    case 'play':
      return (
        <Suspense fallback={<GameScreenFallback />}>
          <GameScreen />
        </Suspense>
      );
    case 'result':
      return <ResultScreen />;
    default:
      return <MainMenuScreen />;
  }
}

export function App({ queryClient, networkControl }: AppProps) {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const services = useMemo<AppServices>(
    () => ({ networkControl, profile, setProfile }),
    [networkControl, profile],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppServicesContext.Provider value={services}>
        <SubmissionWorker />
        <div className="app-shell">
          <CurrentScreen />
        </div>
      </AppServicesContext.Provider>
    </QueryClientProvider>
  );
}
