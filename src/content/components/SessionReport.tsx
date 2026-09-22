import { accuracy, formatDurationLong } from '@/shared/utils';
import type { Session } from '@/shared/types';

interface SessionReportProps {
  session: Session;
  screenshotDataUrl?: string;
  onClose: () => void;
  onDownloadScreenshot?: () => void;
}

export function SessionReport({ session, screenshotDataUrl, onClose, onDownloadScreenshot }: SessionReportProps) {
  const acc = accuracy(session.solved, session.failed);
  const total = session.solved + session.failed;

  return (
    <div className="pf-report-backdrop">
      <div className="pf-report pf-glass" id="pf-session-report">
        <div className="pf-report__header">
          <span className="pf-report__label">Session Complete</span>
          <h2 className="pf-serif pf-gold-text">Training Report</h2>
        </div>
        <div className="pf-report__grid">
          <div className="pf-report__stat pf-report__stat--success">
            <span className="pf-report__value">{session.solved}</span>
            <span className="pf-report__name">Solved</span>
          </div>
          <div className="pf-report__stat pf-report__stat--fail">
            <span className="pf-report__value">{session.failed}</span>
            <span className="pf-report__name">Failed</span>
          </div>
          <div className="pf-report__stat">
            <span className="pf-report__value">{acc}%</span>
            <span className="pf-report__name">Accuracy</span>
          </div>
          <div className="pf-report__stat">
            <span className="pf-report__value">{formatDurationLong(session.timerElapsedMs)}</span>
            <span className="pf-report__name">Duration</span>
          </div>
          <div className="pf-report__stat">
            <span className="pf-report__value">{session.bestStreak}</span>
            <span className="pf-report__name">Best Streak</span>
          </div>
          <div className="pf-report__stat">
            <span className="pf-report__value">{total}</span>
            <span className="pf-report__name">Total</span>
          </div>
        </div>
        {session.milestonesCompleted > 0 && (
          <p className="pf-report__milestones">
            {session.milestonesCompleted} milestone{session.milestonesCompleted > 1 ? 's' : ''} reached
          </p>
        )}
        {screenshotDataUrl && (
          <div className="pf-report__preview">
            <img src={screenshotDataUrl} alt="Session screenshot" />
          </div>
        )}
        <div className="pf-report__actions">
          {screenshotDataUrl && onDownloadScreenshot && (
            <button className="pf-btn pf-btn-ghost" onClick={onDownloadScreenshot}>
              Save screenshot
            </button>
          )}
          <button className="pf-btn pf-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
