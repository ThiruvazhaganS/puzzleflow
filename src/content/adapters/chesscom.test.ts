import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clickNext,
  detectOutcome,
  getPuzzleId,
  resetOutcomeState,
} from './chesscom';

function makeVisible(element: Element): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ width: 120, height: 24, top: 0, left: 0, right: 120, bottom: 24 }),
  });
}

describe('Chess.com puzzle adapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetOutcomeState();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('detects visible success feedback', () => {
    const feedback = document.createElement('div');
    feedback.className = 'puzzle-feedback';
    feedback.textContent = 'Correct';
    document.body.append(feedback);
    makeVisible(feedback);

    expect(detectOutcome()).toBe('solved');
    expect(detectOutcome()).toBe('idle');
  });

  it('allows consecutive results with the same outcome', () => {
    const first = document.createElement('div');
    first.className = 'puzzle-feedback';
    first.textContent = 'Correct';
    document.body.append(first);
    makeVisible(first);
    expect(detectOutcome()).toBe('solved');

    first.remove();
    expect(detectOutcome()).toBe('idle');

    const second = document.createElement('div');
    second.className = 'puzzle-feedback';
    second.textContent = 'Correct';
    document.body.append(second);
    makeVisible(second);
    expect(detectOutcome()).toBe('solved');
  });

  it('clicks a continue link when Chess.com renders a link instead of a button', () => {
    const continueLink = document.createElement('a');
    continueLink.textContent = 'Continue';
    let clicked = false;
    continueLink.addEventListener('click', () => {
      clicked = true;
    });
    document.body.append(continueLink);
    makeVisible(continueLink);

    expect(clickNext()).toBe(true);
    expect(clicked).toBe(true);
  });

  it('finds result feedback and next controls inside an open shadow root', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const feedback = document.createElement('div');
    feedback.className = 'section-heading-component section-heading-red';
    feedback.textContent = 'Incorrect';
    const next = document.createElement('button');
    next.setAttribute('aria-label', 'Next Puzzle');
    let clicked = false;
    next.addEventListener('click', () => {
      clicked = true;
    });
    root.append(feedback, next);
    document.body.append(host);
    makeVisible(feedback);
    makeVisible(next);

    expect(detectOutcome()).toBe('failed');
    expect(clickNext()).toBe(true);
    expect(clicked).toBe(true);
  });

  it('extracts a numeric puzzle id from the URL', () => {
    window.history.pushState({}, '', '/puzzles/123456');
    expect(getPuzzleId()).toBe('123456');
  });
});
