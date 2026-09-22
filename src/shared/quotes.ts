const QUOTES = [
  'The hardest opponent sits across from you every morning.',
  'Patterns learned today become instincts tomorrow.',
  'Every master was once a beginner who refused to quit.',
  'Tactics flow from calculation — calculation flows from practice.',
  'One hundred puzzles closer to chess mastery.',
  'Discipline beats motivation. You showed up — that is what counts.',
  'Your future self will thank you for this session.',
  'The board rewards patience. So does progress.',
  'Small daily improvements lead to stunning results.',
  'You are building a library of patterns in your mind.',
  'Consistency is the secret ingredient of improvement.',
  'Fall in love with the process, and the results will follow.',
  'Chess is war over the board. You just won another battle.',
  'Excellence is not an act, but a habit.',
  'The next level is always one puzzle away.',
];

export function randomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]!;
}
