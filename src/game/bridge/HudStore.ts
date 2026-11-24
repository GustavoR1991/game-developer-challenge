import type { EndReason } from '../entities/types';

export type SessionPhase = 'running' | 'paused' | 'ended';
export type PauseReason = 'manual' | 'focus' | 'hidden' | 'orientation';

export interface HudSnapshot {
  phase: SessionPhase;
  pauseReason: PauseReason | null;
  score: number;
  health: number;
  maxHealth: number;
  remainingSeconds: number;
  endReason: EndReason | null;
}

type Listener = () => void;

export class HudStore {
  private snapshot: HudSnapshot;
  private readonly listeners = new Set<Listener>();

  constructor(initial: HudSnapshot) {
    this.snapshot = initial;
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): HudSnapshot => this.snapshot;

  update(next: HudSnapshot): void {
    const current = this.snapshot;
    if (
      current.phase === next.phase &&
      current.pauseReason === next.pauseReason &&
      current.score === next.score &&
      current.health === next.health &&
      current.maxHealth === next.maxHealth &&
      current.remainingSeconds === next.remainingSeconds &&
      current.endReason === next.endReason
    ) {
      return;
    }
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  clear(): void {
    this.listeners.clear();
  }
}
