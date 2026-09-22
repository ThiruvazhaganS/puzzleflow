/**
 * Future cloud sync client.
 * Sessions are queued locally in IndexedDB (syncQueue table).
 * Call flushSyncQueue() when a backend is available.
 */

import { db } from '@/storage/db';

const API_BASE = ''; // Set to e.g. 'https://api.puzzleflow.app' when ready

export interface SyncPayload {
  deviceId: string;
  clientUpdatedAt: number;
  sessions: unknown[];
  events: unknown[];
  dailyRollups: unknown[];
}

async function getDeviceId(): Promise<string> {
  const key = 'deviceId';
  const stored = await chrome.storage.local.get(key);
  if (stored[key]) return stored[key] as string;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [key]: id });
  return id;
}

export async function flushSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (!API_BASE) return { synced: 0, failed: 0 };

  const pending = await db.syncQueue.orderBy('createdAt').toArray();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${API_BASE}/v1/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          clientUpdatedAt: Date.now(),
          ...(item.payload as object),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await db.syncQueue.delete(item.id);
      synced++;
    } catch (err) {
      await db.syncQueue.update(item.id, {
        retryCount: item.retryCount + 1,
        lastError: err instanceof Error ? err.message : 'Unknown error',
      });
      failed++;
    }
  }

  return { synced, failed };
}
