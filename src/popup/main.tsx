import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import type { PersonalBest, Session, Settings } from '@/shared/types';
import { DEFAULT_PERSONAL_BEST } from '@/shared/types';
import { sendMessage } from '@/shared/messages';
import { accuracy, formatDuration, todayKey } from '@/shared/utils';
import '@/styles/tokens.css';
import '@/styles/global.css';
import './popup.css';

interface PageInfo {
  isPuzzlePage: boolean;
  puzzleSetUrl: string;
  puzzleSetName: string | null;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="popup__toggle-row">
      <span>{label}</span>
      <button
        className={`popup__toggle ${checked ? 'popup__toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span className="popup__toggle-knob" />
      </button>
    </div>
  );
}

function Popup() {
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBest>(DEFAULT_PERSONAL_BEST);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [dailySolved, setDailySolved] = useState(0);

  const refresh = useCallback(async () => {
    const [res, dailyRes] = await Promise.all([
      sendMessage({ type: 'GET_STATE' }),
      sendMessage({ type: 'GET_DAILY_STATS' }),
    ]);
    if (res.ok) {
      setSession(res.session);
      setSettings(res.settings);
      if (res.personalBest) setPersonalBest(res.personalBest);
    }
    if (dailyRes.ok && dailyRes.daily) {
      setDailySolved(dailyRes.daily.find((rollup) => rollup.date === todayKey())?.solved ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' }).then((info: PageInfo) => {
          setPageInfo(info);
        }).catch(() => {
          setPageInfo({ isPuzzlePage: false, puzzleSetUrl: tab.url ?? '', puzzleSetName: null });
        });
      }
    });
  }, [refresh]);

  useEffect(() => {
    if (!session || session.status !== 'running' || !session.timerStartedAt) return;
    const tick = () => setElapsedMs(session.timerElapsedMs + (Date.now() - session.timerStartedAt!));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [session]);

  const isActive = session && ['running', 'paused', 'milestone'].includes(session.status);

  const handleStart = async () => {
    const url = pageInfo?.puzzleSetUrl ?? '';
    const name = pageInfo?.puzzleSetName ?? null;
    const res = await sendMessage({ type: 'SESSION_START', puzzleSetUrl: url, puzzleSetName: name });
    if (res.ok) {
      setSession(res.session);
      setSettings(res.settings);
    }
  };

  const handleStop = async () => {
    const res = await sendMessage({ type: 'SESSION_STOP' });
    if (res.ok) setSession(res.session);
  };

  const updateSetting = async (partial: Partial<Settings>) => {
    const res = await sendMessage({ type: 'UPDATE_SETTINGS', settings: partial });
    if (res.ok) setSettings(res.settings);
  };

  if (loading || !settings) {
    return (
      <div className="popup">
        <div className="popup__bg" />
        <div className="popup__content" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <span className="pf-gold-text pf-serif" style={{ fontSize: 20 }}>Loading…</span>
        </div>
      </div>
    );
  }

  const acc = session ? accuracy(session.solved, session.failed) : 0;

  return (
    <div className="popup">
      <div className="popup__bg" />

      <div className="popup__content">
        <header className="popup__header">
          <div className="popup__logo-row">
            <span className="popup__logo">♞</span>
            <h1 className="popup__title pf-serif pf-gold-text">PuzzleFlow</h1>
          </div>
          <p className="popup__tagline">Train smarter on Chess.com</p>
          <div className={`popup__page-badge ${pageInfo?.isPuzzlePage ? 'popup__page-badge--active' : ''}`}>
            <span className="popup__page-dot" />
            {pageInfo?.isPuzzlePage ? 'Puzzle page detected' : 'Open a Chess.com puzzle'}
          </div>
        </header>

        {isActive && session && (
          <div className="popup__session-card popup__session-card--active">
            <div className="popup__session-label">
              {session.status === 'running' ? 'Session live' : session.status === 'milestone' ? 'Milestone reached' : 'Paused'}
              {' · '}{formatDuration(elapsedMs || session.timerElapsedMs)}
            </div>
            <div className="popup__session-stats">
              <div className="popup__session-stat">
                <span style={{ color: 'var(--pf-emerald)' }}>{session.solved}</span>
                <label>Solved</label>
              </div>
              <div className="popup__session-stat">
                <span style={{ color: 'var(--pf-rose)' }}>{session.failed}</span>
                <label>Failed</label>
              </div>
              <div className="popup__session-stat">
                <span>{acc}%</span>
                <label>Accuracy</label>
              </div>
              <div className="popup__session-stat">
                <span>{session.currentStreak}</span>
                <label>Streak</label>
              </div>
            </div>
          </div>
        )}

        {!isActive && (
          <div className="popup__daily-bar">
            <div className="popup__daily-bar-header">
              <span>Daily goal</span>
                <span>{dailySolved}/{settings.dailyGoal} today</span>
            </div>
            <div className="popup__daily-bar-track">
              <div
                className="popup__daily-bar-fill"
                style={{ width: `${Math.min(100, (dailySolved / settings.dailyGoal) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="popup__session-card">
          <Toggle
            label="Auto-next on fail"
            checked={settings.autoNextOnFail}
            onChange={(v) => updateSetting({ autoNextOnFail: v })}
          />
          <Toggle
            label="Stop on fail"
            checked={settings.stopOnFail}
            onChange={(v) => updateSetting({ stopOnFail: v })}
          />
          <Toggle
            label="Show overlay"
            checked={settings.showOverlay}
            onChange={(v) => updateSetting({ showOverlay: v })}
          />
        </div>

        <div className="popup__records">
          <h3>Personal Best</h3>
          <div className="popup__record-row">
            <span>Most solved (session)</span>
            <span>{personalBest.mostSolvedInSession.value || '—'}</span>
          </div>
          <div className="popup__record-row">
            <span>Longest streak</span>
            <span>{personalBest.longestStreak.value || '—'}</span>
          </div>
          <div className="popup__record-row">
            <span>Lifetime solved</span>
            <span>{personalBest.totalLifetimeSolved}</span>
          </div>
        </div>

        <div className="popup__cta">
          {isActive ? (
            <button className="pf-btn pf-btn-danger" onClick={handleStop}>
              Stop session
            </button>
          ) : (
            <button
              className="pf-btn pf-btn-primary"
              onClick={handleStart}
              disabled={!pageInfo?.isPuzzlePage}
            >
              Start training
            </button>
          )}
          <div className="popup__footer">
            <button
              className="pf-btn pf-btn-ghost"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              History
            </button>
            <button
              className="pf-btn pf-btn-ghost"
              onClick={() => sendMessage({ type: 'EXPORT_DATA' }).then((r) => {
                if (r.ok && r.data) {
                  const blob = new Blob([r.data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `puzzleflow-export-${Date.now()}.json`;
                  a.click();
                }
              })}
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Popup />);
