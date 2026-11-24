import { setupWorker } from 'msw/browser';
import { matchHandlers } from './handlers/matchHandlers';
import { scenarioStore } from './scenarios/scenarioStore';

export const worker = setupWorker(...matchHandlers);

export type MockStatus = 'ready' | 'unavailable';

export async function startMockApi(): Promise<MockStatus> {
  scenarioStore.applyUrlOverrides(window.location.search);
  if (!('serviceWorker' in navigator)) return 'unavailable';
  try {
    await worker.start({
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      onUnhandledFrame: 'bypass',
      quiet: import.meta.env.PROD,
    });
    return 'ready';
  } catch (error) {
    console.warn('Mock API could not start; ranking and history will be unavailable.', error);
    return 'unavailable';
  }
}
