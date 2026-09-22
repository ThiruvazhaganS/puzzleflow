import { useEffect, useState } from 'react';
import type { Session, Settings } from '@/shared/types';
import { accuracy } from '@/shared/utils';
import { sendMessage } from '@/shared/messages';
import { TimerRing } from './TimerRing';
import { MilestoneModal } from './MilestoneModal';
import { SessionReport } from './SessionReport';

interface OverlayProps {
  session: Session | null;
  settings: Settings;
}

interface MilestoneState {
  solved: number;
  failed: number;
  milestoneNumber: number;
  quote: string;
  screenshotDataUrl?: string;
}

export function Overlay({ session, settings }: OverlayProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [milestone, setMilestone] = useState<MilestoneState | null>(null);
  const [report, setReport] = useState<{ session: Session; screenshotDataUrl?: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const running = session?.status === 'running';
  const active = session && session.status !== 'stopped' && session.status !== 'idle';

  useEffect(() => {
    if (!session) {
      setElapsedMs(0);
      return;
    }
    const compute = () => {
      if (session.status === 'running' && session.timerStartedAt) {
        setElapsedMs(session.timerElapsedMs + (Date.now() - session.timerStartedAt));
      } else {
        setElapsedMs(session.timerElapsedMs);
      }
    };
    compute();
    if (session.status !== 'running') return;
    const id = setInterval(compute, 250);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    const listener = (msg: {
      type: string;
      solved?: number;
      failed?: number;
      milestoneNumber?: number;
      quote?: string;
      screenshotDataUrl?: string;
      session?: Session;
    }) => {
      if (msg.type === 'TRIGGER_MILESTONE') {
        setMilestone({
          solved: msg.solved!,
          failed: msg.failed!,
          milestoneNumber: msg.milestoneNumber!,
          quote: msg.quote ?? '',
          screenshotDataUrl: msg.screenshotDataUrl,
        });
      }
      if (msg.type === 'SESSION_STOPPED' && msg.session) {
        setMilestone(null);
        setReport({ session: msg.session, screenshotDataUrl: msg.screenshotDataUrl });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const showSessionOverlay = settings.showOverlay && active && session;
  const total = session ? session.solved + session.failed : 0;
  const acc = session ? accuracy(session.solved, session.failed) : 0;
  const milestoneProgress = session && settings.milestoneSize > 0
    ? ((total % settings.milestoneSize) / settings.milestoneSize) * 100
    : 0;
  const dailyProgress = session && settings.dailyGoal > 0
    ? Math.min(100, (session.solved / settings.dailyGoal) * 100)
    : milestoneProgress;

  const handlePause = () => {
    if (!session) return;
    if (session.status === 'running') sendMessage({ type: 'SESSION_PAUSE' });
    else if (session.status === 'paused') sendMessage({ type: 'SESSION_RESUME' });
  };

  const handleStop = () => sendMessage({ type: 'SESSION_STOP' });

  const downloadScreenshot = () => {
    if (!report?.screenshotDataUrl) return;
    const a = document.createElement('a');
    a.href = report.screenshotDataUrl;
    a.download = `puzzleflow-${Date.now()}.png`;
    a.click();
  };

  return (
    <>
      {showSessionOverlay && session && (
      <div className={`pf-overlay ${collapsed ? 'pf-overlay--collapsed' : ''}`}>
        <div className="pf-overlay__glow" aria-hidden />
        <button
          className="pf-overlay__collapse"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '◆' : '◇'}
        </button>

        {!collapsed && (
          <>
            <div className="pf-overlay__brand">
              <span className="pf-overlay__logo">♞</span>
              <span className="pf-overlay__name">PuzzleFlow</span>
              <span className={`pf-overlay__status ${running ? 'pf-overlay__status--live' : ''}`}>
                {session.status === 'milestone' ? 'Milestone' : running ? 'Live' : 'Paused'}
              </span>
            </div>

            <TimerRing elapsedMs={elapsedMs} running={!!running} progress={dailyProgress} />

            <div className="pf-overlay__stats">
              <div className="pf-stat pf-stat--green">
                <span className="pf-stat__val">{session.solved}</span>
                <span className="pf-stat__lbl">Solved</span>
              </div>
              <div className="pf-stat pf-stat--red">
                <span className="pf-stat__val">{session.failed}</span>
                <span className="pf-stat__lbl">Failed</span>
              </div>
              <div className="pf-stat">
                <span className="pf-stat__val">{acc}%</span>
                <span className="pf-stat__lbl">Accuracy</span>
              </div>
              <div className="pf-stat">
                <span className="pf-stat__val">{session.currentStreak}</span>
                <span className="pf-stat__lbl">Streak</span>
              </div>
            </div>

            <div className="pf-overlay__progress">
              <div className="pf-overlay__progress-label">
                <span>Next milestone</span>
                <span>{total % settings.milestoneSize}/{settings.milestoneSize}</span>
              </div>
              <div className="pf-overlay__progress-bar">
                <div className="pf-overlay__progress-fill" style={{ width: `${milestoneProgress}%` }} />
              </div>
            </div>

            <div className="pf-overlay__actions">
              <button className="pf-btn pf-btn-ghost pf-btn-sm" onClick={handlePause}>
                {session.status === 'running' ? 'Pause' : 'Resume'}
              </button>
              <button className="pf-btn pf-btn-danger pf-btn-sm" onClick={handleStop}>
                Stop
              </button>
            </div>
          </>
        )}

        {collapsed && (
          <div className="pf-overlay__mini">
            <span className="pf-overlay__mini-time">{Math.floor(elapsedMs / 60000)}:{String(Math.floor((elapsedMs / 1000) % 60)).padStart(2, '0')}</span>
            <span className="pf-overlay__mini-score">{session.solved}/{session.failed}</span>
          </div>
        )}
      </div>
      )}

      {milestone && (
        <MilestoneModal
          solved={milestone.solved}
          failed={milestone.failed}
          milestoneNumber={milestone.milestoneNumber}
          quote={milestone.quote}
          onContinue={() => {
            setMilestone(null);
            sendMessage({ type: 'MILESTONE_CONTINUE' });
          }}
          onStop={() => {
            setMilestone(null);
            sendMessage({ type: 'MILESTONE_STOP' });
          }}
        />
      )}

      {report && (
        <SessionReport
          session={report.session}
          screenshotDataUrl={report.screenshotDataUrl}
          onClose={() => setReport(null)}
          onDownloadScreenshot={downloadScreenshot}
        />
      )}
    </>
  );
}
