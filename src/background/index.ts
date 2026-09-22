import { onMessage } from '@/shared/messages';
import type { Message, MessageResponse } from '@/shared/messages';
import {
  addScreenshot,
  continueAfterMilestone,
  exportAllData,
  getActiveSession,
  getDailyStats,
  getRecentSessions,
  getSettings,
  pauseSession,
  recordPuzzleResult,
  resumeSession,
  saveSettings,
  startSession,
  stopSession,
} from '@/storage/session-repo';
import { ensurePersonalBest } from '@/storage/db';
import { randomQuote } from '@/shared/quotes';

async function captureTabScreenshot(tabId?: number): Promise<string | undefined> {
  try {
    const tab = tabId
      ? await chrome.tabs.get(tabId)
      : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.id) return undefined;
    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  } catch {
    return undefined;
  }
}

async function broadcastToTab(message: unknown, tabId?: number): Promise<void> {
  try {
    if (tabId) {
      await chrome.tabs.sendMessage(tabId, message);
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    // content script may not be loaded
  }
}

async function broadcastState(tabId?: number): Promise<void> {
  const [session, settings] = await Promise.all([getActiveSession(), getSettings()]);
  await broadcastToTab({ type: 'SESSION_STATE', session, settings }, tabId);
}

onMessage(async (message: Message, sender): Promise<MessageResponse> => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'GET_STATE': {
      const [session, settings, personalBest] = await Promise.all([
        getActiveSession(),
        getSettings(),
        ensurePersonalBest(),
      ]);
      return { ok: true, session, settings, personalBest };
    }

    case 'SESSION_START': {
      const session = await startSession(message.puzzleSetUrl, message.puzzleSetName);
      const settings = await getSettings();
      await broadcastToTab({ type: 'SESSION_STATE', session, settings }, tabId);
      await broadcastToTab({ type: 'AUTO_NEXT', enabled: true }, tabId);
      return { ok: true, session, settings };
    }

    case 'SESSION_STOP': {
      const session = await stopSession();
      const settings = await getSettings();
      let screenshotDataUrl: string | undefined;
      if (session) {
        screenshotDataUrl = await captureTabScreenshot(tabId);
        if (screenshotDataUrl) {
          await addScreenshot(session.id, 'stop', screenshotDataUrl);
        }
        await broadcastToTab(
          { type: 'SESSION_STOPPED', session, screenshotDataUrl },
          tabId,
        );
      }
      await broadcastState(tabId);
      return { ok: true, session, settings };
    }

    case 'SESSION_PAUSE': {
      const session = await pauseSession();
      const settings = await getSettings();
      await broadcastState(tabId);
      return { ok: true, session, settings };
    }

    case 'SESSION_RESUME': {
      const session = await resumeSession();
      const settings = await getSettings();
      await broadcastState(tabId);
      await broadcastToTab({ type: 'AUTO_NEXT', enabled: true }, tabId);
      return { ok: true, session, settings };
    }

    case 'MILESTONE_CONTINUE': {
      const session = await continueAfterMilestone();
      const settings = await getSettings();
      await broadcastState(tabId);
      await broadcastToTab({ type: 'AUTO_NEXT', enabled: true }, tabId);
      return { ok: true, session, settings };
    }

    case 'MILESTONE_STOP': {
      const session = await stopSession();
      const settings = await getSettings();
      let screenshotDataUrl: string | undefined;
      if (session) {
        screenshotDataUrl = await captureTabScreenshot(tabId);
        if (screenshotDataUrl) {
          await addScreenshot(session.id, 'milestone', screenshotDataUrl);
        }
      }
      await broadcastState(tabId);
      return { ok: true, session, settings };
    }

    case 'PUZZLE_RESULT': {
      const settings = await getSettings();
      const { session, milestoneHit } = await recordPuzzleResult(
        message.result,
        message.puzzleId,
        message.durationMs,
        settings,
      );

      if (milestoneHit) {
        const screenshotDataUrl = await captureTabScreenshot(tabId);
        if (screenshotDataUrl) {
          await addScreenshot(session.id, 'milestone', screenshotDataUrl);
        }
        await broadcastToTab(
          {
            type: 'TRIGGER_MILESTONE',
            solved: session.solved,
            failed: session.failed,
            milestoneNumber: session.milestonesCompleted,
            quote: randomQuote(),
            screenshotDataUrl,
          },
          tabId,
        );
      } else {
        await broadcastState(tabId);
      }

      return { ok: true, session, settings };
    }

    case 'UPDATE_SETTINGS': {
      const settings = await saveSettings(message.settings);
      await broadcastState(tabId);
      return { ok: true, session: await getActiveSession(), settings };
    }

    case 'GET_HISTORY': {
      const sessions = await getRecentSessions();
      const settings = await getSettings();
      return { ok: true, session: null, settings, sessions } as MessageResponse;
    }

    case 'GET_DAILY_STATS': {
      const daily = await getDailyStats();
      const settings = await getSettings();
      return { ok: true, session: null, settings, daily } as MessageResponse;
    }

    case 'EXPORT_DATA': {
      const data = await exportAllData();
      const settings = await getSettings();
      return { ok: true, session: null, settings, data } as MessageResponse;
    }

    default:
      return { ok: false, error: 'Unknown message type' };
  }
});

chrome.runtime.onInstalled.addListener(() => {
  ensurePersonalBest();
});
