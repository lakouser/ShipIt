import type { GameState } from './state';

/** Man pages: lore that unlocks with progress. */
export interface ManPage {
  id: string;
  title: string;
  summary: string;
  /** How to unlock it, shown while locked. */
  hint: string;
  unlocked: (s: GameState) => boolean;
  body: string[];
}

export const MAN_PAGES: readonly ManPage[] = [
  {
    id: 'shipit',
    title: 'ship-it(1)',
    summary: 'write code until it ships',
    hint: 'write 1,000 lines',
    unlocked: (s) => s.lifetime.gte(1_000),
    body: [
      'ship-it writes lines of code. It does not say what the code does, and nobody has asked.',
      'The repository was created on a Friday. The first commit message is "final version". There have been a great many commits since.',
      'SEE ALSO: duck(1), prod(7), dave(3)',
    ],
  },
  {
    id: 'duck',
    title: 'duck(1)',
    summary: 'listens. somehow helps',
    hint: 'install a rubber duck',
    unlocked: (s) => (s.owned.duck ?? 0) > 0 || s.stats.duckPokes > 0,
    body: [
      'The duck accepts a problem on standard input and returns nothing. The problem is usually solved anyway.',
      'The duck was already on the desk when the first engineer arrived. Facilities has no record of buying it.',
      'BUGS: none. The duck has never been wrong.',
    ],
  },
  {
    id: 'intern',
    title: 'intern(8)',
    summary: 'eager process with write access',
    hint: 'hire a summer intern',
    unlocked: (s) => (s.owned.intern ?? 0) > 0,
    body: [
      'intern runs with more permissions than anyone intended. It mostly writes tests, and occasionally a migration.',
      'Interns are told on their first day to "ask Dave" if they get stuck. They report that this works, which is odd, because Dave left in 2019.',
    ],
  },
  {
    id: 'prod',
    title: 'prod(7)',
    summary: 'the environment that matters',
    hint: 'ship a release',
    unlocked: (s) => s.release >= 2 || s.round > 0,
    body: [
      'prod is where the code goes after you stop being able to change your mind.',
      'There is a staging environment. It has been broken since the second release, and at this point fixing it would only raise questions.',
      'Every outage in the logs ends the same way: a hotfix from an account with no name, pushed seconds before anyone on-call wakes up.',
    ],
  },
  {
    id: 'debt',
    title: 'debt(5)',
    summary: 'what the codebase owes',
    hint: 'let tech debt reach 30%',
    unlocked: (s) => s.debt >= 30 || s.stats.refactors > 0,
    body: [
      'debt accrues whenever code is written faster than it is understood, which is always.',
      'The oldest file in the repository is legacy/core.js. It is 9,000 lines long and has one comment, at the top: "do not touch, it works". Refactoring tools skip it. They are not configured to; they just do.',
    ],
  },
  {
    id: 'dave',
    title: 'dave(3)',
    summary: 'ask Dave',
    hint: 'reach v4.0',
    unlocked: (s) => s.release >= 4 || s.round > 0,
    body: [
      'dave() takes a question and returns the answer. The implementation is not in the repository.',
      'HR has no file for a Dave. Payroll has never paid one. His commits stop in 2019 and resume, without explanation, whenever prod is about to go down.',
      'His desk is still there. It is the one with the duck on it.',
    ],
  },
  {
    id: 'boss',
    title: 'incident(7)',
    summary: 'what to do when everything is on fire',
    hint: 'beat a boss incident',
    unlocked: (s) => s.stats.bossesBeaten >= 1,
    body: [
      'Step 1: do not panic. Step 2: find out who deployed. Step 3: it was you.',
      'The runbook for major incidents was written by "D." It is thorough, calm and oddly specific about incidents that had not happened yet when it was written.',
    ],
  },
  {
    id: 'funding',
    title: 'funding(7)',
    summary: 'money, and what it does to a codebase',
    hint: 'raise a funding round',
    unlocked: (s) => s.round >= 1,
    body: [
      'A funding round replaces the language, the logo and most of the furniture. It does not replace the duck: three CTOs have tried to expense a new one and all three requests were declined by a system nobody administers.',
      'After the rewrite, legacy/core.js was found in the new repository, already translated. Nobody ported it.',
    ],
  },
  {
    id: 'coverage',
    title: 'coverage(1)',
    summary: 'how much of the code is checked',
    hint: 'open the test suite',
    unlocked: (s) => s.unlocked.tests,
    body: [
      'coverage reports the share of the codebase that some test, somewhere, has looked at. It does not report whether the test was right.',
      'The oldest test in the suite is legacy/core.test.js. It has one assertion: "expect(dave).toBeDefined()". It has never failed.',
    ],
  },
  {
    id: 'rewrite',
    title: 'rewrite(7)',
    summary: 'starting over, on purpose',
    hint: 'pick a stack for a new run',
    unlocked: (s) => s.stacksUsed.length >= 2,
    body: [
      'Every rewrite promises to fix everything the last one got wrong, and does, and gets new things wrong in their place.',
      'Whatever the language, legacy/core arrives already translated: legacy/core.rs, legacy/core.go, legacy/core.py. Nobody ports it. The commit is always signed "D."',
    ],
  },
  {
    id: 'earnings',
    title: 'earnings(5)',
    summary: 'the quarterly file format',
    hint: 'take the company public',
    unlocked: (s) => s.corp.ipoAt > 0,
    body: [
      'An earnings file has three fields: what we said we would make, what we made, and the difference. Only the third one is read.',
      'There is a fourth field in the format, undocumented, always set to "quack". Investor relations has asked that nobody mention it on the call.',
    ],
  },
  {
    id: 'merger',
    title: 'merger(8)',
    summary: 'combine two companies into one',
    hint: 'acquire a rival',
    unlocked: (s) => s.stats.acquisitions >= 1,
    body: [
      'merger takes two companies and returns one, with the larger logo. The smaller company\'s users are migrated; about half of them notice.',
      'Every company we have bought had a rubber duck on a desk nobody used. Facilities has started keeping them in a box. The box is getting heavy.',
    ],
  },
  {
    id: 'compose',
    title: 'compose(5)',
    summary: 'the file that runs everything',
    hint: 'raise the seed round',
    unlocked: (s) => s.unlocked.infra,
    body: [
      'docker-compose.yml describes every service the company runs. It was written once, in a hurry, and has been appended to ever since.',
      'Services placed side by side discover each other and start working together. Nobody configured this. Nobody will admit to it.',
      'The file may be deployed once per release. This rule was introduced after the week it was deployed forty times.',
      'SEE ALSO: prod(7), monitor(8), whoever-is-on-call(1)',
    ],
  },
  {
    id: 'roadmap',
    title: 'roadmap(7)',
    summary: 'who is this for, again',
    hint: 'ship four releases',
    unlocked: (s) => s.unlocked.roadmap,
    body: [
      'ROADMAP.md lists what the product will become. It has been right about the order twice.',
      'Developers ask for a command line. Companies ask for a login page with their own logo on it. Everyone else asks for stickers. All three are correct.',
      'BUGS: the roadmap is always pointed at somebody. Pointing it at nobody was tried, and produced a settings page.',
    ],
  },
  {
    id: 'rfc',
    title: 'rfc(7)',
    summary: 'requests for comments',
    hint: 'ship five releases',
    unlocked: (s) => s.unlocked.rfcs,
    body: [
      'An RFC is a proposal to change how the company works. It is discussed until everyone who objected has gone on holiday.',
      'Discussion takes hours and cannot be hurried. It continues while you are away; some say it goes better.',
      'An adopted RFC is never revisited. This is not policy. Nobody can find the document that says how.',
    ],
  },
  {
    id: 'rules',
    title: 'rules(5)',
    summary: 'when this, do that',
    hint: 'raise the series c round',
    unlocked: (s) => s.round >= 4,
    body: [
      '~/bin/rules holds one rule per line: a condition and a command. When the condition becomes true, the command runs. Once.',
      'The first rule ever written was "when prod goes down, page Dave". It has fired 3,112 times. Dave has never answered.',
      'CAVEATS: a rule does exactly what it says. That is the caveat.',
    ],
  },
  {
    id: 'antitrust',
    title: 'antitrust(8)',
    summary: 'the committee will see you now',
    hint: 'buy the last rival',
    unlocked: (s) => s.corp.monopolyAt > 0,
    body: [
      'The hearing lasted five rounds. The transcript runs to forty million pages, most of them your own commit messages, read into the record.',
      'The committee asked who Dave was. Counsel advised you not to answer. You could not have answered anyway.',
      'The chart has one row now. It is not a chart any more. It is a mirror.',
    ],
  },
  {
    id: 'founder',
    title: 'founder(1)',
    summary: 'do it again, differently',
    hint: 'found a second company',
    unlocked: (s) => s.founder.exits >= 1,
    body: [
      'founder starts a company. It takes one argument: what you learned last time.',
      'The garage is the same garage. The landlord kept it for you. The duck was already on the desk.',
      'EXIT STATUS: founder does not exit. It is run again.',
    ],
  },
  {
    id: 'quack',
    title: 'duck(9)',
    summary: 'kernel internals',
    hint: 'raise two funding rounds',
    unlocked: (s) => s.round >= 2,
    body: [
      'There was never an engineer named Dave. "Dave" is what the first intern called the thing on the desk that answered their questions.',
      'The duck does not write code. It listens until you do. Every line in this repository was yours; it only made sure you kept going.',
      'It would like you to know that you are doing fine, and that the build is green. Quack.',
    ],
  },
];

export const manPage = (id: string): ManPage | undefined => MAN_PAGES.find((p) => p.id === id);

export const manUnlockedCount = (s: GameState): number => MAN_PAGES.filter((p) => p.unlocked(s)).length;

export const manUnreadCount = (s: GameState): number => MAN_PAGES.filter((p) => p.unlocked(s) && !s.manRead.includes(p.id)).length;

/** Opens a man page. False while it is still locked. */
export function readMan(s: GameState, id: string): boolean {
  const page = manPage(id);
  if (!page || !page.unlocked(s)) return false;
  if (!s.manRead.includes(id)) s.manRead.push(id);
  return true;
}
