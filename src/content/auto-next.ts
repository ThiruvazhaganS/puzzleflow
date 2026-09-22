import type { Settings } from '@/shared/types';
import { delay } from '@/shared/utils';
import { clickNext, detectOutcome, getPuzzleId, resetOutcomeState } from './adapters/chesscom';

export class AutoNextController {
  private enabled = false;
  private processing = false;
  private puzzleStartedAt = Date.now();
  private observer: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private settings: Settings,
    private onResult: (
      result: 'solved' | 'failed',
      durationMs: number,
      puzzleId: string | null,
      stopOnFail: boolean,
    ) => void | Promise<void>,
  ) {}

  start(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.puzzleStartedAt = Date.now();
    resetOutcomeState();

    this.observer = new MutationObserver(() => this.check());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    this.pollTimer = setInterval(() => this.check(), 400);
  }

  stop(): void {
    this.enabled = false;
    this.observer?.disconnect();
    this.observer = null;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  onNewPuzzle(): void {
    this.puzzleStartedAt = Date.now();
    resetOutcomeState();
  }

  private async check(): Promise<void> {
    if (!this.enabled || this.processing) return;

    const outcome = detectOutcome();
    if (outcome === 'idle') return;

    this.processing = true;
    const durationMs = Date.now() - this.puzzleStartedAt;

    await this.onResult(outcome, durationMs, getPuzzleId(), this.settings.stopOnFail);

    if (outcome === 'failed' && this.settings.stopOnFail) {
      this.stop();
      this.processing = false;
      return;
    }

    if (outcome === 'failed' && !this.settings.autoNextOnFail) {
      this.processing = false;
      return;
    }

    const waitMs =
      outcome === 'solved' ? this.settings.postSolveDelayMs : this.settings.postFailDelayMs;
    await delay(waitMs + Math.random() * 200);

    if (this.enabled) {
      clickNext();
      this.puzzleStartedAt = Date.now();
    }

    this.processing = false;
  }
}
