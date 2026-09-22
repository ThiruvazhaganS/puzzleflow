import { formatDuration } from '@/shared/utils';

interface TimerRingProps {
  elapsedMs: number;
  running: boolean;
  progress: number; // 0-100 toward daily goal or milestone
}

export function TimerRing({ elapsedMs, running, progress }: TimerRingProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="pf-timer-ring">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(212,168,83,0.12)" strokeWidth="4" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0c674" />
            <stop offset="100%" stopColor="#d4a853" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pf-timer-ring__center">
        <span className="pf-timer-ring__time">{formatDuration(elapsedMs)}</span>
        <span className={`pf-timer-ring__dot ${running ? 'pf-timer-ring__dot--live' : ''}`} />
      </div>
    </div>
  );
}
