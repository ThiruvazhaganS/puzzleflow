const PUZZLE_URL_PATTERNS = [
  /chess\.com\/puzzles/,
  /chess\.com\/puzzle/,
  /chess\.com\/.*puzzle/i,
];

const NEXT_SELECTORS = [
  'button[aria-label="Next"]',
  'button[aria-label="Next Puzzle"]',
  'button[aria-label="Continue"]',
  '[aria-label*="Next"]',
  '[data-cy*="next"]',
  '[data-testid*="next"]',
  '.next-puzzle-button',
  '[data-cy="next-puzzle"]',
  'button.next',
  'a.next-puzzle',
];

const SUCCESS_INDICATORS = [
  '[class*="correct"]',
  '[class*="success"]',
  '[data-cy="puzzle-success"]',
  '.icon-font-correct',
  '.puzzle-result-success',
  '[class*="section-heading-green"]',
];

const FAIL_INDICATORS = [
  '[class*="incorrect"]',
  '[class*="wrong"]',
  '[class*="fail"]',
  '[data-cy="puzzle-fail"]',
  '.icon-font-incorrect',
  '.puzzle-result-fail',
  '[class*="section-heading-red"]',
];

export function isPuzzlePage(): boolean {
  return PUZZLE_URL_PATTERNS.some((p) => p.test(window.location.href));
}

export function getPuzzleSetName(): string | null {
  const title =
    document.querySelector('h1, h2, [class*="title"], [class*="heading"]')?.textContent?.trim();
  return title || null;
}

export function getPuzzleId(): string | null {
  const match = window.location.pathname.match(/puzzle[s]?\/(\d+)/);
  return match?.[1] ?? null;
}

function visible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function findVisible(selectors: string[]): Element | null {
  for (const sel of selectors) {
    for (const el of queryAllDeep(sel)) {
      if (visible(el)) return el;
    }
  }
  return null;
}

function queryAllDeep(selector: string): Element[] {
  const elements: Element[] = [];
  const visit = (root: Document | ShadowRoot | Element): void => {
    elements.push(...Array.from(root.querySelectorAll(selector)));
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) visit(element.shadowRoot);
    }
  };
  visit(document);
  return elements;
}

export type PuzzleOutcome = 'idle' | 'solved' | 'failed';

let lastOutcome: PuzzleOutcome = 'idle';

export function detectOutcome(): PuzzleOutcome {
  const successEl = findVisible(SUCCESS_INDICATORS);
  const failEl = findVisible(FAIL_INDICATORS);
  const successText = hasVisibleResultText(/\b(correct|nice|well done|solved)\b/i);
  const failText = hasVisibleResultText(/\b(incorrect|wrong|try again|failed)\b/i);

  if (lastOutcome !== 'idle' && !successEl && !failEl && !successText && !failText) {
    lastOutcome = 'idle';
  }

  if (successEl || successText) {
    if (lastOutcome !== 'solved') {
      lastOutcome = 'solved';
      return 'solved';
    }
    return 'idle';
  }

  if (failEl || failText) {
    if (lastOutcome !== 'failed') {
      lastOutcome = 'failed';
      return 'failed';
    }
    return 'idle';
  }

  // Reset when board looks active again (new puzzle)
  if (document.querySelector('[class*="board"], .board, #board-layout-main')) {
    lastOutcome = 'idle';
  }

  return 'idle';
}

export function resetOutcomeState(): void {
  lastOutcome = 'idle';
}

function hasVisibleResultText(pattern: RegExp): boolean {
  const resultSelectors = [
    '[class*="feedback"]',
    '[class*="result"]',
    '[class*="puzzle"]',
    '[class*="status"]',
    '[class*="section-heading"]',
    '[role="alert"]',
    '[aria-live]',
    '[data-cy*="puzzle"]',
  ];

  return resultSelectors.some((selector) =>
    queryAllDeep(selector).some(
      (el) => visible(el) && pattern.test(el.textContent ?? ''),
    ),
  );
}

export function clickNext(): boolean {
  const btn = findVisible(NEXT_SELECTORS);
  if (btn instanceof HTMLElement) {
    btn.click();
    return true;
  }

  // Fallback: buttons containing "next" or "continue"
  for (const btn of queryAllDeep('button, a, [role="button"]')) {
    const text = btn.textContent?.toLowerCase() ?? '';
    const label = `${btn.getAttribute('aria-label') ?? ''} ${btn.getAttribute('title') ?? ''}`.toLowerCase();
    if ((text.includes('next') || text.includes('continue') || label.includes('next') || label.includes('continue')) && visible(btn)) {
      (btn as HTMLElement).click();
      return true;
    }
  }

  // Keyboard fallback
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }),
  );
  return false;
}
