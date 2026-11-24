import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { readJson, STORAGE_PREFIX, writeJson } from '../../storage/localStore';

const KEY = `${STORAGE_PREFIX}sound:v1`;
const schema = z.object({ muted: z.boolean() });

type Listener = () => void;
const listeners = new Set<Listener>();
let muted = readJson(KEY, schema)?.muted ?? false;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeJson(KEY, { muted });
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, isMuted);
}
