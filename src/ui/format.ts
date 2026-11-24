import type { EndReason } from '../game/entities/types';

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  return `${formatClock(seconds)}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatPlayedAt(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

export function endReasonLabel(reason: EndReason): string {
  return reason === 'time_up' ? 'Time up' : 'Ship destroyed';
}

export function configLabel(config: { durationSeconds: number; spawnIntervalSeconds: number }): string {
  return `${config.durationSeconds} s battles · ${config.spawnIntervalSeconds} s spawn interval`;
}
