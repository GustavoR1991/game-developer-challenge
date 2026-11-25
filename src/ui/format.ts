import type { EndReason } from '../game/simulation/types';

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  return `${formatClock(seconds)}`;
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export function formatDay(iso: string): string {
  return DAY_FORMAT.format(new Date(iso)).toUpperCase();
}

export function formatTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

export function formatPlayedAt(iso: string): string {
  return `${formatDay(iso)} · ${formatTime(iso)}`;
}

export function endReasonLabel(reason: EndReason): string {
  return reason === 'time_up' ? 'Time up' : 'Defeated';
}

export function configLabel(config: { durationSeconds: number; spawnIntervalSeconds: number }): string {
  return `${config.durationSeconds} second battles · ${config.spawnIntervalSeconds} second spawn interval`;
}
