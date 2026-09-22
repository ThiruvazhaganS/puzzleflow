import type { PersonalBest, PuzzleResult, Session, Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { accuracy, todayKey, uuid } from '@/shared/utils';
import { db, ensurePersonalBest } from './db';

const SETTINGS_KEY = 'settings';
const ACTIVE_SESSION_KEY = 'activeSessionId';

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function getActiveSession(): Promise<Session | null> {
  const { activeSessionId } = await chrome.storage.local.get(ACTIVE_SESSION_KEY);
  if (!activeSessionId) return null;
  return (await db.sessions.get(activeSessionId as string)) ?? null;
}

export async function startSession(puzzleSetUrl: string, puzzleSetName: string | null): Promise<Session> {
  const existing = await getActiveSession();
  if (existing && (existing.status === 'running' || existing.status === 'paused' || existing.status === 'milestone')) {
    return existing;
  }

  const session: Session = {
    id: uuid(),
    startedAt: Date.now(),
    endedAt: null,
    status: 'running',
    puzzleSetUrl,
    puzzleSetName,
    solved: 0,
    failed: 0,
    currentStreak: 0,
    bestStreak: 0,
    milestonesCompleted: 0,
    timerElapsedMs: 0,
    timerStartedAt: Date.now(),
    screenshots: [],
    syncStatus: 'pending',
  };

  await db.sessions.add(session);
  await chrome.storage.local.set({ [ACTIVE_SESSION_KEY]: session.id });
  return session;
}

function elapsedMs(session: Session): number {
  if (session.status === 'running' && session.timerStartedAt) {
    return session.timerElapsedMs + (Date.now() - session.timerStartedAt);
  }
  return session.timerElapsedMs;
}

export async function pauseSession(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session || session.status !== 'running') return session;

  session.timerElapsedMs = elapsedMs(session);
  session.timerStartedAt = null;
  session.status = 'paused';
  await db.sessions.put(session);
  return session;
}

export async function resumeSession(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session || (session.status !== 'paused' && session.status !== 'milestone')) return session;

  session.timerStartedAt = Date.now();
  session.status = 'running';
  await db.sessions.put(session);
  return session;
}

export async function recordPuzzleResult(
  result: PuzzleResult,
  puzzleId: string | null,
  durationMs: number,
  settings: Settings,
): Promise<{ session: Session; milestoneHit: boolean }> {
  const session = await getActiveSession();
  if (!session || session.status === 'stopped' || session.status === 'idle') {
    throw new Error('No active session');
  }

  const event = {
    id: uuid(),
    sessionId: session.id,
    puzzleId,
    result,
    timestamp: Date.now(),
    durationMs,
    indexInSession: session.solved + session.failed + 1,
  };
  await db.events.add(event);

  if (result === 'solved') {
    session.solved += 1;
    session.currentStreak += 1;
    session.bestStreak = Math.max(session.bestStreak, session.currentStreak);
  } else {
    session.failed += 1;
    session.currentStreak = 0;
  }

  const total = session.solved + session.failed;
  const milestoneHit =
    total > 0 &&
    total % settings.milestoneSize === 0 &&
    session.status === 'running';

  if (milestoneHit) {
    session.status = 'milestone';
    session.timerElapsedMs = elapsedMs(session);
    session.timerStartedAt = null;
    session.milestonesCompleted += 1;
  }

  await db.sessions.put(session);
  return { session, milestoneHit };
}

export async function continueAfterMilestone(): Promise<Session | null> {
  return resumeSession();
}

export async function stopSession(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session) return null;

  session.timerElapsedMs = elapsedMs(session);
  session.timerStartedAt = null;
  session.endedAt = Date.now();
  session.status = 'stopped';
  session.syncStatus = 'pending';

  await db.sessions.put(session);
  await updateDailyRollup(session);
  await updatePersonalBest(session);
  await enqueueSync(session);
  await chrome.storage.local.remove(ACTIVE_SESSION_KEY);
  return session;
}

async function updateDailyRollup(session: Session): Promise<void> {
  const date = todayKey();
  const existing = (await db.dailyRollups.get(date)) ?? {
    date,
    solved: 0,
    failed: 0,
    sessions: 0,
    totalTimeMs: 0,
    bestAccuracy: 0,
    longestStreak: 0,
  };

  existing.solved += session.solved;
  existing.failed += session.failed;
  existing.sessions += 1;
  existing.totalTimeMs += session.timerElapsedMs;
  existing.bestAccuracy = Math.max(existing.bestAccuracy, accuracy(session.solved, session.failed));
  existing.longestStreak = Math.max(existing.longestStreak, session.bestStreak);

  await db.dailyRollups.put(existing);
}

async function updatePersonalBest(session: Session): Promise<void> {
  const pb = await ensurePersonalBest();
  const date = todayKey();
  const acc = accuracy(session.solved, session.failed);
  let updated = false;

  if (session.solved > pb.mostSolvedInSession.value) {
    pb.mostSolvedInSession = { value: session.solved, sessionId: session.id, date };
    updated = true;
  }
  if (session.solved + session.failed >= 100 && acc > pb.bestAccuracySession.value) {
    pb.bestAccuracySession = { value: acc, sessionId: session.id, date };
    updated = true;
  }
  if (session.solved >= 100) {
    const msPer100 = session.timerElapsedMs;
    if (msPer100 < pb.fastest100Ms.value) {
      pb.fastest100Ms = { value: msPer100, sessionId: session.id, date };
      updated = true;
    }
  }
  if (session.bestStreak > pb.longestStreak.value) {
    pb.longestStreak = { value: session.bestStreak, sessionId: session.id, date };
    updated = true;
  }
  pb.totalLifetimeSolved += session.solved;

  if (updated || session.solved > 0) {
    await db.personalBest.put({ id: 'default', ...pb });
  }
}

async function enqueueSync(session: Session): Promise<void> {
  const events = await db.events.where('sessionId').equals(session.id).toArray();
  await db.syncQueue.add({
    id: uuid(),
    op: 'upsert_session',
    payload: { session, events },
    createdAt: Date.now(),
    retryCount: 0,
    lastError: null,
  });
}

export async function addScreenshot(
  sessionId: string,
  type: 'stop' | 'milestone',
  dataUrl: string,
): Promise<void> {
  const key = `${sessionId}-${type}-${Date.now()}`;
  await db.screenshots.put({ key, dataUrl, capturedAt: Date.now() });

  const session = await db.sessions.get(sessionId);
  if (session) {
    session.screenshots.push({ type, capturedAt: Date.now(), storageKey: key });
    await db.sessions.put(session);
  }
}

export async function getRecentSessions(limit = 20): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().limit(limit).toArray();
}

export async function getDailyStats(days = 14): Promise<import('@/shared/types').DailyRollup[]> {
  const all = await db.dailyRollups.orderBy('date').reverse().limit(days).toArray();
  return all.reverse();
}

export async function exportAllData(): Promise<string> {
  const [sessions, events, dailyRollups, personalBest, syncQueue] = await Promise.all([
    db.sessions.toArray(),
    db.events.toArray(),
    db.dailyRollups.toArray(),
    db.personalBest.toArray(),
    db.syncQueue.toArray(),
  ]);
  return JSON.stringify({ sessions, events, dailyRollups, personalBest, syncQueue }, null, 2);
}
