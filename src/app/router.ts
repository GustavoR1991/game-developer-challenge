import { useSyncExternalStore } from 'react';

export const ROUTES = ['menu', 'options', 'play', 'result', 'ranking', 'history'] as const;
export type Route = (typeof ROUTES)[number];

const DEFAULT_ROUTE: Route = 'menu';

function parseHash(hash: string): Route {
  const value = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return (ROUTES as readonly string[]).includes(value) ? (value as Route) : DEFAULT_ROUTE;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

function getSnapshot(): Route {
  return parseHash(window.location.hash);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const hash = `#/${route}`;
  if (window.location.hash === hash) return;
  if (options.replace) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

export function currentRoute(): Route {
  return getSnapshot();
}
