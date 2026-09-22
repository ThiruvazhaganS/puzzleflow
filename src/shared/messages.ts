import type { PuzzleResult, Session, Settings } from './types';

export type Message =
  | { type: 'GET_STATE' }
  | { type: 'SESSION_START'; puzzleSetUrl: string; puzzleSetName: string | null }
  | { type: 'SESSION_STOP' }
  | { type: 'SESSION_PAUSE' }
  | { type: 'SESSION_RESUME' }
  | { type: 'MILESTONE_CONTINUE' }
  | { type: 'MILESTONE_STOP' }
  | { type: 'PUZZLE_RESULT'; result: PuzzleResult; puzzleId: string | null; durationMs: number }
  | { type: 'PUZZLE_PAGE_STATUS'; isOnPuzzlePage: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'GET_HISTORY' }
  | { type: 'GET_DAILY_STATS' }
  | { type: 'EXPORT_DATA' };

export interface MessageSuccess {
  ok: true;
  session: Session | null;
  settings: Settings;
  personalBest?: import('./types').PersonalBest;
  sessions?: Session[];
  daily?: import('./types').DailyRollup[];
  data?: string;
}

export type MessageResponse = MessageSuccess | { ok: false; error: string };

export type BroadcastMessage =
  | { type: 'SESSION_STATE'; session: Session | null; settings: Settings }
  | { type: 'TRIGGER_MILESTONE'; solved: number; failed: number; milestoneNumber: number }
  | { type: 'SESSION_STOPPED'; session: Session; screenshotDataUrl?: string }
  | { type: 'AUTO_NEXT'; enabled: boolean }
  | { type: 'NEW_RECORD'; recordType: string; value: number };

export function sendMessage<T = MessageResponse>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export function onMessage(
  handler: (message: Message, sender: chrome.runtime.MessageSender) => Promise<MessageResponse | void> | MessageResponse | void,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    Promise.resolve(handler(message as Message, sender))
      .then((result) => sendResponse(result ?? { ok: true, session: null, settings: {} as Settings }))
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
    return true;
  });
}
