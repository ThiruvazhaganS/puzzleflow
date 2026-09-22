import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import type { DailyRollup, Session } from '@/shared/types';
import { sendMessage } from '@/shared/messages';
import { accuracy, formatDurationLong } from '@/shared/utils';
import '@/styles/tokens.css';
import '@/styles/global.css';
import './options.css';

function Options() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [daily, setDaily] = useState<DailyRollup[]>([]);

  useEffect(() => {
    sendMessage({ type: 'GET_HISTORY' }).then((r) => {
      if (r.ok && r.sessions) setSessions(r.sessions);
    });
    sendMessage({ type: 'GET_DAILY_STATS' }).then((r) => {
      if (r.ok && r.daily) setDaily(r.daily);
    });
  }, []);

  const totalSolved = daily.reduce((s, d) => s + d.solved, 0);
  const totalFailed = daily.reduce((s, d) => s + d.failed, 0);
  const totalSessions = daily.reduce((s, d) => s + d.sessions, 0);

  return (
    <div className="options">
      <header className="options__header">
        <h1 className="pf-gold-text pf-serif">Training History</h1>
        <p>Offline-first progress tracking — syncs to cloud when API is connected.</p>
      </header>

      <div className="options__grid">
        <div className="options__card">
          <div className="options__card-value" style={{ color: 'var(--pf-emerald)' }}>{totalSolved}</div>
          <div className="options__card-label">Solved (14 days)</div>
        </div>
        <div className="options__card">
          <div className="options__card-value" style={{ color: 'var(--pf-rose)' }}>{totalFailed}</div>
          <div className="options__card-label">Failed (14 days)</div>
        </div>
        <div className="options__card">
          <div className="options__card-value">{totalSessions}</div>
          <div className="options__card-label">Sessions</div>
        </div>
        <div className="options__card">
          <div className="options__card-value">
            {totalSolved + totalFailed > 0 ? Math.round((totalSolved / (totalSolved + totalFailed)) * 100) : 100}%
          </div>
          <div className="options__card-label">Accuracy</div>
        </div>
      </div>

      <section className="options__section">
        <h2>Daily activity</h2>
        <div className="options__heatmap">
          {daily.map((d) => (
            <div
              key={d.date}
              className={`options__heatmap-day ${d.solved > 0 ? 'options__heatmap-day--active' : ''}`}
              title={`${d.date}: ${d.solved} solved, ${d.failed} failed`}
            >
              {new Date(d.date + 'T12:00:00').getDate()}
            </div>
          ))}
        </div>
      </section>

      <section className="options__section">
        <h2>Recent sessions</h2>
        <table className="options__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Solved</th>
              <th>Failed</th>
              <th>Accuracy</th>
              <th>Duration</th>
              <th>Milestones</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--pf-text-muted)', textAlign: 'center' }}>
                  No sessions yet — start training from the popup.
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.startedAt).toLocaleDateString()}</td>
                <td style={{ color: 'var(--pf-emerald)' }}>{s.solved}</td>
                <td style={{ color: 'var(--pf-rose)' }}>{s.failed}</td>
                <td>{accuracy(s.solved, s.failed)}%</td>
                <td>{formatDurationLong(s.timerElapsedMs)}</td>
                <td>{s.milestonesCompleted || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="options__api-note">
        <strong>Future API sync</strong> — Sessions are queued in IndexedDB sync outbox.
        When ready, point <code>api/sync.ts</code> to your backend <code>POST /v1/sync</code> endpoint.
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Options />);
