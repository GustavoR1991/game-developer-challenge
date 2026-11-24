import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureApi } from './api/client/apiRuntime';
import { createQueryClient } from './api/queries/queryClient';
import { App } from './app/App';
import { createNetworkControl } from './app/networkControl';
import { currentRoute, navigate } from './app/router';
import { installTestHooks } from './game/testing/testHooks';
import { startMockApi } from './mocks/browser';
import './ui/styles/global.css';

async function bootstrap(): Promise<void> {
  if (currentRoute() === 'play') navigate('menu', { replace: true });

  await startMockApi();

  const queryClient = createQueryClient();
  const networkControl = createNetworkControl(queryClient);
  installTestHooks(networkControl, configureApi);

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element #root not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App queryClient={queryClient} networkControl={networkControl} />
    </StrictMode>,
  );
}

void bootstrap();
