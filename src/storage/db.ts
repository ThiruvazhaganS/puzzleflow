import Dexie, { type Table } from 'dexie';
import type { DailyRollup, PersonalBest, PuzzleEvent, Session } from '@/shared/types';
import { DEFAULT_PERSONAL_BEST } from '@/shared/types';

export interface ScreenshotBlob {
  key: string;
  dataUrl: string;
  capturedAt: number;
}

export interface SyncQueueItem {
  id: string;
  op: 'upsert_session' | 'upsert_events';
  payload: unknown;
  createdAt: number;
  retryCount: number;
  lastError: string | null;
}

class PuzzleFlowDB extends Dexie {
  sessions!: Table<Session>;
  events!: Table<PuzzleEvent>;
  dailyRollups!: Table<DailyRollup>;
  personalBest!: Table<PersonalBest & { id: string }>;
  screenshots!: Table<ScreenshotBlob>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('PuzzleFlowDB');
    this.version(1).stores({
      sessions: 'id, startedAt, status, syncStatus',
      events: 'id, sessionId, timestamp, [sessionId+indexInSession]',
      dailyRollups: 'date',
      personalBest: 'id',
      screenshots: 'key, capturedAt',
      syncQueue: 'id, createdAt',
    });
  }
}

export const db = new PuzzleFlowDB();

export async function ensurePersonalBest(): Promise<PersonalBest> {
  const existing = await db.personalBest.get('default');
  if (existing) return existing;
  const pb = { id: 'default', ...DEFAULT_PERSONAL_BEST };
  await db.personalBest.put(pb);
  return pb;
}
