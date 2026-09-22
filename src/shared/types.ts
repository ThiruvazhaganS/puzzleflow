export type SessionStatus = 'idle' | 'running' | 'paused' | 'milestone' | 'stopped';
export type PuzzleResult = 'solved' | 'failed';

export interface Settings {
  autoNextOnFail: boolean;
  stopOnFail: boolean;
  postSolveDelayMs: number;
  postFailDelayMs: number;
  milestoneSize: number;
  dailyGoal: number;
  showOverlay: boolean;
  soundEnabled: boolean;
}

export interface PuzzleEvent {
  id: string;
  sessionId: string;
  puzzleId: string | null;
  result: PuzzleResult;
  timestamp: number;
  durationMs: number;
  indexInSession: number;
}

export interface ScreenshotMeta {
  type: 'stop' | 'milestone';
  capturedAt: number;
  storageKey: string;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  puzzleSetUrl: string;
  puzzleSetName: string | null;
  solved: number;
  failed: number;
  currentStreak: number;
  bestStreak: number;
  milestonesCompleted: number;
  timerElapsedMs: number;
  timerStartedAt: number | null;
  screenshots: ScreenshotMeta[];
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface DailyRollup {
  date: string;
  solved: number;
  failed: number;
  sessions: number;
  totalTimeMs: number;
  bestAccuracy: number;
  longestStreak: number;
}

export interface PersonalBestRecord {
  value: number;
  sessionId: string;
  date: string;
}

export interface PersonalBest {
  mostSolvedInSession: PersonalBestRecord;
  bestAccuracySession: PersonalBestRecord;
  fastest100Ms: PersonalBestRecord;
  longestStreak: PersonalBestRecord;
  totalLifetimeSolved: number;
}

export interface ActiveSessionState {
  session: Session;
  settings: Settings;
  isOnPuzzlePage: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  autoNextOnFail: true,
  stopOnFail: false,
  postSolveDelayMs: 450,
  postFailDelayMs: 900,
  milestoneSize: 100,
  dailyGoal: 200,
  showOverlay: true,
  soundEnabled: false,
};

export const DEFAULT_PERSONAL_BEST: PersonalBest = {
  mostSolvedInSession: { value: 0, sessionId: '', date: '' },
  bestAccuracySession: { value: 0, sessionId: '', date: '' },
  fastest100Ms: { value: Infinity, sessionId: '', date: '' },
  longestStreak: { value: 0, sessionId: '', date: '' },
  totalLifetimeSolved: 0,
};
