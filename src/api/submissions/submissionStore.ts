import { z } from 'zod';
import { matchRecordSchema, type MatchRecord } from '../contracts/matches';
import { readJson, removeKey, STORAGE_KEYS, writeJson } from '../../storage/localStore';

export const SUBMISSION_STATUSES = ['pending', 'sending', 'failed', 'confirmed'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const entrySchema = z.object({
  record: matchRecordSchema,
  status: z.enum(SUBMISSION_STATUSES),
  attempts: z.number().int().min(0),
  lastError: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});

const storedSchema = z.array(entrySchema);

export type SubmissionEntry = z.infer<typeof entrySchema>;

const MAX_CONFIRMED = 20;

type Listener = () => void;

function now(): string {
  return new Date().toISOString();
}

export class SubmissionStore {
  private entries: readonly SubmissionEntry[];
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.entries = this.load();
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): readonly SubmissionEntry[] => this.entries;

  get(matchId: string): SubmissionEntry | undefined {
    return this.entries.find((entry) => entry.record.matchId === matchId);
  }

  enqueue(record: MatchRecord): SubmissionEntry {
    const existing = this.get(record.matchId);
    if (existing) return existing;
    const entry: SubmissionEntry = {
      record,
      status: 'pending',
      attempts: 0,
      lastError: null,
      updatedAt: now(),
    };
    this.commit([...this.entries, entry]);
    return entry;
  }

  markSending(matchId: string): boolean {
    const entry = this.get(matchId);
    if (!entry || (entry.status !== 'pending' && entry.status !== 'failed')) return false;
    this.patch(matchId, { status: 'sending', attempts: entry.attempts + 1, lastError: null });
    return true;
  }

  markConfirmed(matchId: string, record: MatchRecord): void {
    this.patch(matchId, { status: 'confirmed', lastError: null, record });
  }

  markFailed(matchId: string, message: string): void {
    this.patch(matchId, { status: 'failed', lastError: message });
  }

  requeue(matchId: string): boolean {
    const entry = this.get(matchId);
    if (!entry || entry.status !== 'failed') return false;
    this.patch(matchId, { status: 'pending' });
    return true;
  }

  requeueFailed(olderThanMs: number): number {
    const threshold = Date.now() - olderThanMs;
    const ids = this.entries
      .filter((entry) => entry.status === 'failed' && Date.parse(entry.updatedAt) <= threshold)
      .map((entry) => entry.record.matchId);
    ids.forEach((id) => this.requeue(id));
    return ids.length;
  }

  pendingCount(): number {
    return this.entries.filter((entry) => entry.status !== 'confirmed').length;
  }

  reset(): void {
    removeKey(STORAGE_KEYS.submissions);
    this.entries = [];
    this.emit();
  }

  reload(): void {
    this.entries = this.load();
    this.emit();
  }

  private load(): readonly SubmissionEntry[] {
    const stored = readJson(STORAGE_KEYS.submissions, storedSchema) ?? [];
    return stored.map((entry) => (entry.status === 'sending' ? { ...entry, status: 'pending' } : entry));
  }

  private patch(matchId: string, changes: Partial<SubmissionEntry>): void {
    this.commit(
      this.entries.map((entry) =>
        entry.record.matchId === matchId ? { ...entry, ...changes, updatedAt: now() } : entry,
      ),
    );
  }

  private commit(next: readonly SubmissionEntry[]): void {
    const confirmed = next.filter((entry) => entry.status === 'confirmed');
    const overflow = new Set(
      confirmed.slice(0, Math.max(0, confirmed.length - MAX_CONFIRMED)).map((entry) => entry.record.matchId),
    );
    this.entries = next.filter((entry) => !overflow.has(entry.record.matchId));
    writeJson(STORAGE_KEYS.submissions, this.entries);
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const submissionStore = new SubmissionStore();
