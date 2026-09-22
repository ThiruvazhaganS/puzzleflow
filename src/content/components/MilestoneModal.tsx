interface MilestoneModalProps {
  solved: number;
  failed: number;
  milestoneNumber: number;
  quote: string;
  onContinue: () => void;
  onStop: () => void;
}

export function MilestoneModal({
  solved,
  failed,
  milestoneNumber,
  quote,
  onContinue,
  onStop,
}: MilestoneModalProps) {
  const total = solved + failed;
  const acc = total > 0 ? Math.round((solved / total) * 100) : 100;

  return (
    <div className="pf-milestone-backdrop">
      <div className="pf-milestone">
        <div className="pf-milestone__confetti" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="pf-confetti-piece" style={{ left: `${8 + i * 7}%`, animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
        <div className="pf-milestone__badge">Milestone {milestoneNumber}</div>
        <h2 className="pf-milestone__title pf-serif">
          <span className="pf-gold-text">{total} positions</span> complete
        </h2>
        <p className="pf-milestone__subtitle">Outstanding work. You are building real pattern memory.</p>
        <div className="pf-milestone__stats">
          <div><span>{solved}</span><label>Solved</label></div>
          <div><span>{failed}</span><label>Failed</label></div>
          <div><span>{acc}%</span><label>Accuracy</label></div>
        </div>
        <blockquote className="pf-milestone__quote pf-serif">&ldquo;{quote}&rdquo;</blockquote>
        <div className="pf-milestone__actions">
          <button className="pf-btn pf-btn-primary" onClick={onContinue}>
            Continue training
          </button>
          <button className="pf-btn pf-btn-ghost" onClick={onStop}>
            Stop & save session
          </button>
        </div>
      </div>
    </div>
  );
}
