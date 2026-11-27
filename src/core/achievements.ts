import { BOSS_KINDS, CHALLENGE, CHALLENGES, DEBT, FUNDING, PROJECTS, RIVALS, UPGRADES } from './content';
import { lastShippingWorkflow } from './workflows';
import { isUpgradeAvailable, owned, teamSlots } from './economy';
import { perSecond, perTap } from './economy';
import { PERKS } from './content';
import type { GameState } from './state';

export interface AchievementContext {
  /** Taps per second over the last two seconds. */
  tapRate: number;
  /** Local hour of day (0–23). */
  hour: number;
  now: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Secret achievements hide their description until unlocked. */
  secret?: boolean;
  unlocked(s: GameState, ctx: AchievementContext): boolean;
}

const lifetime = (n: number) => (s: GameState) => s.lifetime.gte(n);

/** Each unlocked achievement adds ACHIEVEMENT_BONUS (1%) to all output. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // lines written
  { id: 'hello', name: 'Hello, world', description: 'Write 100 lines', unlocked: lifetime(100) },
  { id: 'commit', name: 'First commit', description: 'Write 1,000 lines', unlocked: lifetime(1e3) },
  { id: 'wom', name: 'Works on my machine', description: 'Write 10,000 lines', unlocked: lifetime(1e4) },
  { id: 'kloc', name: 'Kilo-LOC', description: 'Write 100,000 lines', unlocked: lifetime(1e5) },
  { id: 'bigo', name: 'Big O', description: 'Write 1,000,000 lines', unlocked: lifetime(1e6) },
  { id: 'legacy', name: 'Legacy codebase', description: 'Write 100 million lines', unlocked: lifetime(1e8) },
  { id: 'monorepo', name: 'Monorepo', description: 'Write 10 billion lines', unlocked: lifetime(1e10) },
  { id: 'heat', name: 'Heat death of the backlog', description: 'Write 1 trillion lines', unlocked: lifetime(1e12) },
  // output
  { id: 'fingers', name: 'Strong fingers', description: 'Write 100 lines per tap', unlocked: (s, c) => perTap(s, c.now).gte(100) },
  { id: 'fingers2', name: 'Hands of steel', description: 'Write 10,000 lines per tap', unlocked: (s, c) => perTap(s, c.now).gte(1e4) },
  { id: 'handsoff', name: 'Hands off', description: 'Automate 100 lines per second', unlocked: (s, c) => perSecond(s, c.now).gte(100) },
  { id: 'auto', name: 'Fully automated', description: 'Automate 10,000 lines per second', unlocked: (s, c) => perSecond(s, c.now).gte(1e4) },
  { id: 'lightsout', name: 'Lights-out factory', description: 'Automate 1 million lines per second', unlocked: (s, c) => perSecond(s, c.now).gte(1e6) },
  // tapping
  { id: 'taps1k', name: 'Keyboard warrior', description: 'Tap 1,000 times', unlocked: (s) => s.stats.taps >= 1e3 },
  { id: 'taps10k', name: 'Mechanical sympathy', description: 'Tap 10,000 times', unlocked: (s) => s.stats.taps >= 1e4 },
  { id: 'taps100k', name: 'Worn-out spacebar', description: 'Tap 100,000 times', unlocked: (s) => s.stats.taps >= 1e5 },
  { id: '10x', name: '10x engineer', description: 'Hit 8 taps per second', unlocked: (_s, c) => c.tapRate >= 8 },
  { id: 'flow', name: 'Flow state', description: 'Fill the flow meter', unlocked: (s) => s.stats.flowMaxed >= 1 },
  { id: 'crit', name: 'Critical path', description: 'Land a critical tap', unlocked: (s) => s.stats.crits >= 1 },
  { id: 'crit100', name: 'Crit happens', description: 'Land 100 critical taps', unlocked: (s) => s.stats.crits >= 100 },
  // packages
  { id: 'install', name: 'npm install everything', description: 'Install 100 packages', unlocked: (s) => s.stats.purchases >= 100 },
  { id: 'double', name: 'Doubling down', description: 'Have 25 of one package', unlocked: (s) => s.stats.maxOfOne >= 25 },
  { id: 'lockin', name: 'Vendor lock-in', description: 'Have 100 of one package', unlocked: (s) => s.stats.maxOfOne >= 100 },
  { id: 'fullstack', name: 'Full stack', description: 'Have at least one of every package', unlocked: (s) => UPGRADES.filter((u) => isUpgradeAvailable(s, u)).every((u) => owned(s, u.id) > 0) },
  // bugs and incidents
  { id: 'feature', name: "It's a feature", description: 'Squash your first bug', unlocked: (s) => s.stats.bugs >= 1 },
  { id: 'ext', name: 'Exterminator', description: 'Squash 5 bugs', unlocked: (s) => s.stats.bugs >= 5 },
  { id: 'zero', name: 'Zero bugs policy', description: 'Squash 25 bugs', unlocked: (s) => s.stats.bugs >= 25 },
  { id: 'ento', name: 'Entomologist', description: 'Squash 100 bugs', unlocked: (s) => s.stats.bugs >= 100 },
  { id: 'known', name: 'Shipped with known issues', description: 'Let a bug escape', unlocked: (s) => s.stats.bugsEscaped >= 1 },
  { id: 'coffee', name: 'Caffeinated', description: 'Grab a coffee', unlocked: (s) => s.stats.coffees >= 1 },
  { id: 'beans', name: 'Bean counter', description: 'Grab 10 coffees', unlocked: (s) => s.stats.coffees >= 10 },
  { id: 'oncall', name: 'On-call hero', description: 'Fix an outage', unlocked: (s) => s.stats.outagesFixed >= 1 },
  { id: 'conflict', name: 'Conflict resolution', description: 'Resolve a merge conflict', unlocked: (s) => s.stats.conflictsResolved >= 1 },
  { id: 'rebase', name: 'Rebase wizard', description: 'Resolve 10 merge conflicts', unlocked: (s) => s.stats.conflictsResolved >= 10 },
  // sprints, scripts, todo
  { id: 'agile', name: 'Agile', description: 'Merge a sprint', unlocked: (s) => s.stats.sprints >= 1 },
  { id: 'velocity', name: 'Velocity', description: 'Merge 10 sprints', unlocked: (s) => s.stats.sprints >= 10 },
  { id: 'scrum', name: 'Scrum master', description: 'Merge 50 sprints', unlocked: (s) => s.stats.sprints >= 50 },
  { id: 'crunch', name: 'Crunch time', description: 'Finish a sprint with under 3 seconds left', unlocked: (s) => !!s.flags.crunch },
  { id: 'chmod', name: 'chmod +x', description: 'Run a script', unlocked: (s) => s.stats.scriptsRun >= 1 },
  { id: 'kiddie', name: 'Script kiddie', description: 'Run 25 scripts', unlocked: (s) => s.stats.scriptsRun >= 25 },
  { id: 'inbox', name: 'Inbox zero', description: 'Finish 10 TODO tasks', unlocked: (s) => s.stats.quests >= 10 },
  { id: 'roadmap', name: 'On the roadmap', description: 'Complete a release milestone', unlocked: (s) => s.stats.milestones >= 1 },
  // releases and dotfiles
  { id: 'ship', name: 'Shipped', description: 'Ship your first release', unlocked: (s) => s.stats.ships >= 1 || s.release > 1 },
  { id: 'lts', name: 'Long-term support', description: 'Ship 10 releases', unlocked: (s) => s.stats.ships >= 10 },
  { id: 'releases25', name: 'Release train', description: 'Ship 25 releases', unlocked: (s) => s.stats.ships >= 25 },
  { id: 'releases100', name: 'Continuous delivery', description: 'Ship 100 releases', unlocked: (s) => s.stats.ships >= 100 },
  { id: 'stars500', name: 'Rising star', description: 'Earn 500 stars in total', unlocked: (s) => s.stats.starsEarned >= 500 },
  { id: 'stars10k', name: 'Awesome list', description: 'Earn 10,000 stars in total', unlocked: (s) => s.stats.starsEarned >= 1e4 },
  { id: 'stars1m', name: 'Most starred', description: 'Earn 1,000,000 stars in total', unlocked: (s) => s.stats.starsEarned >= 1e6 },
  { id: 'roadmap10', name: 'Roadmap delivered', description: 'Complete 10 release milestones', unlocked: (s) => s.stats.milestones >= 10 },
  { id: 'pipeline', name: 'Everything is a pipeline', description: 'Unlock every workflow earned by shipping', unlocked: (s) => s.stats.ships >= lastShippingWorkflow() },
  { id: 'autoship', name: 'Release on green', description: 'Let release.yml ship a release', unlocked: (s) => s.stats.autoShips >= 1 },
  { id: 'zsh', name: 'Oh my zsh', description: 'Buy a level of .zshrc', unlocked: (s) => (s.perks.zshrc ?? 0) >= 1 },
  { id: 'semver', name: 'Semantic versioning', description: 'Cut v1.0, your first major version', unlocked: (s) => s.major >= 1 },
  { id: 'breaking', name: 'Breaking changes', description: 'Reach v3.0', unlocked: (s) => s.major >= 3 },
  { id: 'majorleague', name: 'Major league', description: 'Reach v10.0', unlocked: (s) => s.major >= 10 },
  { id: 'resume', name: 'Resume-driven development', description: 'Learn a skill', unlocked: (s) => Object.keys(s.skills).length > 0 },
  { id: 'flagged', name: 'Feature flagged', description: 'Complete a challenge release', unlocked: (s) => s.challengesDone.length >= 1 },
  { id: 'hardmode', name: 'Hard mode', description: 'Complete every challenge release', unlocked: (s) => s.challengesDone.length >= CHALLENGES.length },
  { id: 'users1k', name: 'Early adopters', description: 'Reach 1,000 users', unlocked: (s) => s.market.peak >= 1e3 },
  { id: 'users1m', name: 'Product-market fit', description: 'Reach 1 million users', unlocked: (s) => s.market.peak >= 1e6 },
  { id: 'users1b', name: 'Household name', description: 'Reach 1 billion users', unlocked: (s) => s.market.peak >= 1e9 },
  { id: 'fivestar', name: 'Five stars', description: 'Ship a release reviewed 5.0', unlocked: (s) => s.stats.fiveStars >= 1 },
  { id: 'scoop', name: 'Scooped', description: "Ship before a rival's launch and steal the headline", unlocked: (s) => s.stats.steals >= 1 },
  { id: 'top3', name: 'Top three', description: 'Reach #3 in the charts', unlocked: (s) => s.market.passed.length >= RIVALS.length - 2 },
  { id: 'number1', name: 'Number one', description: 'Reach #1 in the charts', unlocked: (s) => s.market.passed.length >= RIVALS.length },
  { id: 'stars10', name: 'Trending', description: 'Earn 10 stars', unlocked: (s) => s.stars >= 10 },
  { id: 'stars50', name: 'Starred repo', description: 'Earn 50 stars', unlocked: (s) => s.stars >= 50 },
  { id: 'ricing', name: 'Ricing', description: 'Buy a dotfiles perk', unlocked: (s) => s.stats.perksBought >= 1 },
  { id: 'perfect', name: 'Dotfile perfectionist', description: 'Max out a dotfiles perk', unlocked: (s) => PERKS.some((p) => (s.perks[p.id] ?? 0) >= p.maxLevel) },
  { id: 'standup', name: 'Daily standup', description: 'Play 3 days in a row', unlocked: (s) => s.streak.count >= 3 },
  { id: 'green', name: 'Green squares', description: 'Play 7 days in a row', unlocked: (s) => s.streak.count >= 7 },
  // tech debt, forks, the team, bosses, projects, funding, mail
  { id: 'refactor', name: 'Leave it better', description: 'Refactor away your tech debt', unlocked: (s) => s.stats.refactors >= 1 },
  { id: 'bankrupt', name: 'Technical bankruptcy', description: 'Let tech debt reach 100%', unlocked: (s) => !!s.flags.bankrupt || s.debt >= DEBT.max },
  { id: 'fork', name: 'Breaking change', description: 'Pick a package upgrade', unlocked: (s) => s.stats.forksChosen >= 1 },
  { id: 'forks25', name: 'Dependency hell', description: 'Pick 25 package upgrades', unlocked: (s) => s.stats.forksChosen >= 25 },
  { id: 'hire', name: "We're hiring", description: 'Hire a developer', unlocked: (s) => s.stats.hires >= 1 },
  { id: 'fullteam', name: 'Two-pizza team', description: 'Fill every team slot', unlocked: (s) => s.team.length >= teamSlots(s) },
  { id: 'boss', name: 'Incident commander', description: 'Beat a boss incident', unlocked: (s) => s.stats.bossesBeaten >= 1 },
  { id: 'boss10', name: 'War room veteran', description: 'Beat 10 boss incidents', unlocked: (s) => s.stats.bossesBeaten >= 10 },
  { id: 'bossall', name: 'Seen it all', description: 'Beat every kind of boss incident', unlocked: (s) => BOSS_KINDS.every((k) => s.bossKinds.includes(k)) },
  { id: 'pivot', name: 'Pivot', description: 'Ship something other than a web app', unlocked: (s) => s.projectsShipped.some((p) => p !== 'webapp') },
  { id: 'portfolio', name: 'Portfolio', description: 'Ship every kind of project', unlocked: (s) => PROJECTS.every((p) => s.projectsShipped.includes(p.id)) },
  { id: 'raise', name: 'Term sheet', description: 'Raise a funding round', unlocked: (s) => s.round >= 1 },
  { id: 'ipo', name: 'Ring the bell', description: 'Take the company public', unlocked: (s) => s.round >= FUNDING.maxRounds },
  { id: 'replyall', name: 'Reply all', description: 'Answer 10 emails', unlocked: (s) => s.stats.mailAnswered >= 10 },
  // tests, issues, stacks, challenges, the public company
  { id: 'tdd', name: 'Test-driven', description: 'Ship a release with 50% test coverage', unlocked: (s) => s.releaseLog.some((r) => (r.coverage ?? 0) >= 0.5) },
  { id: 'fullcov', name: '100% coverage', description: 'Ship a release with every line covered', unlocked: (s) => s.releaseLog.some((r) => (r.coverage ?? 0) >= 1) },
  { id: 'caught', name: 'Caught in CI', description: 'Let the tests catch 25 bugs', unlocked: (s) => s.stats.testsCaught >= 25 },
  { id: 'triage', name: 'Triage', description: 'Close 100 user issues', unlocked: (s) => s.stats.issuesClosed >= 100 },
  { id: 'polyglot', name: 'Polyglot', description: 'Write a run in four different stacks', unlocked: (s) => s.stacksUsed.length >= 4 },
  { id: 'mastered', name: 'Mastered', description: 'Clear a challenge release five times', unlocked: (s) => Object.values(s.challengeLevels).some((l) => (l ?? 0) >= CHALLENGE.maxLevel) },
  { id: 'beat', name: 'Beat and raise', description: 'Beat a quarter\'s guidance', unlocked: (s) => s.corp.beats >= 1 },
  { id: 'streak4', name: 'Four in a row', description: 'Beat guidance four quarters in a row', unlocked: (s) => s.corp.streak >= 4 },
  { id: 'acquihire', name: 'Acqui-hire', description: 'Acquire a rival company', unlocked: (s) => s.stats.acquisitions >= 1 },
  { id: 'monopoly', name: 'Monopoly', description: 'Acquire every rival company', unlocked: (s) => s.market.acquired.length >= RIVALS.length },
  { id: 'rtfm', name: 'RTFM', description: 'Read 5 man pages', unlocked: (s) => s.manRead.length >= 5 },
  // secrets
  { id: 'sudo', name: 'sudo make me a sandwich', description: 'Type sudo on a keyboard', secret: true, unlocked: (s) => !!s.flags.sudo },
  { id: 'rmrf', name: 'Living dangerously', description: 'Type rm -rf on a keyboard', secret: true, unlocked: (s) => !!s.flags.rmrf },
  { id: 'owl', name: 'Night owl', description: 'Play between 2 and 5 a.m.', secret: true, unlocked: (s, c) => !!s.flags.nightOwl || (c.hour >= 2 && c.hour < 5 && s.stats.taps > 0) },
  { id: 'backup', name: 'Backup strategy', description: 'Export your save', secret: true, unlocked: (s) => !!s.flags.exported },
  { id: 'quack', name: 'Rubber duck debugging', description: 'Talk to the duck 10 times', secret: true, unlocked: (s) => s.stats.duckPokes >= 10 },
  { id: 'grass', name: 'Touch grass', description: 'Come back after 2 hours away', secret: true, unlocked: (s) => !!s.flags.touchGrass },
  { id: 'cobol', name: 'Legacy code', description: 'Write a run in COBOL', secret: true, unlocked: (s) => s.stacksUsed.includes('cob') },
];

/** How far along a countable achievement is, as [done, needed], for the trophies list. */
type Progress = (s: GameState) => [number, number];
const stat = (key: keyof GameState['stats'], n: number): Progress => (s) => [Number(s.stats[key]) || 0, n];
const lines = (n: number): Progress => (s) => [s.lifetime.toNumber(), n];

export const ACHIEVEMENT_PROGRESS: Record<string, Progress> = {
  hello: lines(100), commit: lines(1e3), wom: lines(1e4), kloc: lines(1e5), bigo: lines(1e6), legacy: lines(1e8), monorepo: lines(1e10), heat: lines(1e12),
  taps1k: stat('taps', 1e3), taps10k: stat('taps', 1e4), taps100k: stat('taps', 1e5),
  crit100: stat('crits', 100),
  install: stat('purchases', 100), double: stat('maxOfOne', 25), lockin: stat('maxOfOne', 100),
  ext: stat('bugs', 5), zero: stat('bugs', 25), ento: stat('bugs', 100),
  beans: stat('coffees', 10), rebase: stat('conflictsResolved', 10),
  velocity: stat('sprints', 10), scrum: stat('sprints', 50),
  kiddie: stat('scriptsRun', 25), inbox: stat('quests', 10), roadmap10: stat('milestones', 10),
  lts: stat('ships', 10), releases25: stat('ships', 25), releases100: stat('ships', 100),
  pipeline: (s) => [s.stats.ships, lastShippingWorkflow()],
  stars500: stat('starsEarned', 500), stars10k: stat('starsEarned', 1e4), stars1m: stat('starsEarned', 1e6),
  stars10: (s) => [s.stars, 10], stars50: (s) => [s.stars, 50],
  breaking: (s) => [s.major, 3], majorleague: (s) => [s.major, 10],
  hardmode: (s) => [s.challengesDone.length, CHALLENGES.length],
  users1k: (s) => [s.market.peak, 1e3], users1m: (s) => [s.market.peak, 1e6], users1b: (s) => [s.market.peak, 1e9],
  top3: (s) => [s.market.passed.length, RIVALS.length - 2], number1: (s) => [s.market.passed.length, RIVALS.length],
  standup: (s) => [s.streak.count, 3], green: (s) => [s.streak.count, 7],
  forks25: stat('forksChosen', 25),
  fullteam: (s) => [s.team.length, teamSlots(s)],
  boss10: stat('bossesBeaten', 10), bossall: (s) => [BOSS_KINDS.filter((k) => s.bossKinds.includes(k)).length, BOSS_KINDS.length],
  portfolio: (s) => [PROJECTS.filter((p) => s.projectsShipped.includes(p.id)).length, PROJECTS.length],
  ipo: (s) => [s.round, FUNDING.maxRounds],
  replyall: stat('mailAnswered', 10), rtfm: (s) => [s.manRead.length, 5],
  caught: stat('testsCaught', 25), triage: stat('issuesClosed', 100), polyglot: (s) => [s.stacksUsed.length, 4],
  mastered: (s) => [Math.max(0, ...Object.values(s.challengeLevels).map((l) => l ?? 0)), CHALLENGE.maxLevel],
  streak4: (s) => [s.corp.streak, 4], monopoly: (s) => [s.market.acquired.length, RIVALS.length],
};

/** Marks newly earned achievements on the state and returns them. */
export function checkAchievements(s: GameState, ctx: AchievementContext): AchievementDef[] {
  const earned = ACHIEVEMENTS.filter((a) => !s.achievements.includes(a.id) && a.unlocked(s, ctx));
  for (const a of earned) s.achievements.push(a.id);
  return earned;
}
