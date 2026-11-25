/**
 * Game content and tuning. Balance changes should only need edits here.
 */

export type UpgradeKind = 'tap' | 'auto';

export interface UpgradeDef {
  id: string;
  kind: UpgradeKind;
  name: string;
  blurb: string;
  /** Price of the first copy, in lines. */
  baseCost: number;
  /** Lines per tap ('tap') or per second ('auto') for one copy, before multipliers. */
  output: number;
  /** Only offered from this funding round on (see FUNDING). */
  minRound?: number;
}

/** Upgrade names as package names: "Rubber duck" → "rubber-duck". */
export const packageName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'kb', kind: 'tap', name: 'Mechanical keyboard', blurb: 'Satisfying thock, measurable output.', baseCost: 50, output: 1 },
  { id: 'vim', kind: 'tap', name: 'Vim motions', blurb: 'You can finally exit.', baseCost: 800, output: 5 },
  { id: 'mon', kind: 'tap', name: 'Second monitor', blurb: 'More screen, more scroll.', baseCost: 15_000, output: 28 },
  { id: 'snip', kind: 'tap', name: 'Snippet library', blurb: 'Copy, paste, ship.', baseCost: 300_000, output: 160 },
  { id: 'macro', kind: 'tap', name: 'Keyboard macros', blurb: 'One key, forty keystrokes.', baseCost: 7_000_000, output: 900 },
  { id: 'llm', kind: 'tap', name: 'Autocomplete model', blurb: 'Finishes your sentences. And functions.', baseCost: 180_000_000, output: 5_000 },
  { id: 'neural', kind: 'tap', name: 'Neural interface', blurb: 'Think it, ship it.', baseCost: 5_000_000_000, output: 28_000 },
  { id: 'dilation', kind: 'tap', name: 'Time dilation desk', blurb: 'One hour of work every minute.', baseCost: 140_000_000_000, output: 160_000, minRound: 1 },
  { id: 'precog', kind: 'tap', name: 'Precognitive keyboard', blurb: 'Types what you were about to type.', baseCost: 4_000_000_000_000, output: 900_000, minRound: 1 },
  { id: 'hivemind', kind: 'tap', name: 'Hive mind', blurb: 'Every engineer who ever lived, on one branch.', baseCost: 110_000_000_000_000, output: 5_000_000, minRound: 2 },
  { id: 'duck', kind: 'auto', name: 'Rubber duck', blurb: 'Listens. Somehow helps.', baseCost: 25, output: 1 },
  { id: 'intern', kind: 'auto', name: 'Summer intern', blurb: 'Eager. Mostly writes tests.', baseCost: 400, output: 6 },
  { id: 'lint', kind: 'auto', name: 'Linter bot', blurb: 'Fixes semicolons at 3 a.m.', baseCost: 7_500, output: 35 },
  { id: 'ci', kind: 'auto', name: 'CI pipeline', blurb: 'Builds while you sleep.', baseCost: 150_000, output: 200 },
  { id: 'pair', kind: 'auto', name: 'Pair programmer', blurb: 'Two keyboards, one brain.', baseCost: 3_500_000, output: 1_200 },
  { id: 'gen', kind: 'auto', name: 'Code generator', blurb: 'Writes code that writes code.', baseCost: 85_000_000, output: 7_000 },
  { id: 'k8s', kind: 'auto', name: 'Container cluster', blurb: 'Nobody knows how it works. It works.', baseCost: 2_200_000_000, output: 40_000 },
  { id: 'agents', kind: 'auto', name: 'Agent swarm', blurb: 'A thousand tiny coworkers.', baseCost: 60_000_000_000, output: 230_000 },
  { id: 'quantum', kind: 'auto', name: 'Quantum compiler', blurb: 'Compiles every branch at once.', baseCost: 1_800_000_000_000, output: 1_300_000 },
  { id: 'dyson', kind: 'auto', name: 'Dyson build farm', blurb: 'A star, entirely for CI minutes.', baseCost: 54_000_000_000_000, output: 7_500_000, minRound: 1 },
  { id: 'simverse', kind: 'auto', name: 'Simulated universe', blurb: 'Its inhabitants also write code for you.', baseCost: 1_600_000_000_000_000, output: 43_000_000, minRound: 1 },
  { id: 'entropy', kind: 'auto', name: 'Entropy reverser', blurb: 'Unwrites bugs before they happen.', baseCost: 48_000_000_000_000_000, output: 250_000_000, minRound: 2 },
];

/** Lines per tap with no upgrades. */
export const BASE_TAP = 1;
/** Each copy of an upgrade costs this much more than the previous one. */
export const COST_GROWTH = 1.15;
/** Every this-many copies of one upgrade earn a fork (see FORKS). */
export const FORK_STEP = 25;
/** Each achievement adds this fraction to all output. */
export const ACHIEVEMENT_BONUS = 0.01;

/* ---------- flow state and critical taps ---------- */

export const FLOW = {
  /** Flow (0–1) gained per tap. */
  gainPerTap: 0.06,
  /** Flow only drains after this long without a tap. */
  idleS: 0.4,
  decayPerS: 0.5,
  /** At full flow, taps write 1 + maxBonus times as much (before perks). */
  maxBonus: 1,
};
export const CRIT = { multiplier: 5 };

/* ---------- scripts and timed effects ---------- */

export type EffectId = 'turbo' | 'nightly' | 'autotype' | 'sudo' | 'coffee';

export interface EffectDef {
  id: EffectId;
  /** Shown as ~/bin/<file> when the effect comes from a script you can run. */
  file?: string;
  description: string;
  durationS: number;
  tapMul?: number;
  autoMul?: number;
  allMul?: number;
  critChance?: number;
  autoTapsPerSecond?: number;
}

export const EFFECTS: Record<EffectId, EffectDef> = {
  turbo: { id: 'turbo', file: 'turbo.sh', description: 'x2 lines per tap', durationS: 60, tapMul: 2 },
  nightly: { id: 'nightly', file: 'nightly.sh', description: 'x2 automation', durationS: 120, autoMul: 2 },
  autotype: { id: 'autotype', file: 'autotype.sh', description: 'types 4 taps a second for you', durationS: 45, autoTapsPerSecond: 4 },
  sudo: { id: 'sudo', file: 'sudo.sh', description: '+15% critical tap chance', durationS: 45, critChance: 0.15 },
  coffee: { id: 'coffee', description: 'x3 everything', durationS: 20, allMul: 3 },
};
export const SCRIPT_IDS: readonly EffectId[] = ['turbo', 'nightly', 'autotype', 'sudo'];

/* ---------- dotfiles: permanent perks bought with stars ---------- */

export type PerkBranch = 'editor' | 'team' | 'system';

export interface PerkDef {
  id: string;
  branch: PerkBranch;
  file: string;
  summary: string;
  maxLevel: number;
  /** Stars for level n+1 = baseCost + costStep * n. */
  baseCost: number;
  costStep: number;
  requires?: { id: string; level: number };
}

export const PERKS: readonly PerkDef[] = [
  { id: 'vimrc', branch: 'editor', file: '.vimrc', summary: '+25% lines per tap per level', maxLevel: 10, baseCost: 1, costStep: 1 },
  { id: 'keybindings', branch: 'editor', file: 'keybindings.json', summary: '+3% critical tap chance per level (crits write x5)', maxLevel: 5, baseCost: 2, costStep: 1, requires: { id: 'vimrc', level: 1 } },
  { id: 'flow', branch: 'editor', file: 'flow.conf', summary: 'full flow state writes +25% more per level', maxLevel: 4, baseCost: 3, costStep: 2, requires: { id: 'vimrc', level: 2 } },
  { id: 'team', branch: 'team', file: 'team.yml', summary: '+25% automation per level', maxLevel: 10, baseCost: 1, costStep: 1 },
  { id: 'oncall', branch: 'team', file: 'oncall.yml', summary: '10% chance per level that a bug squashes itself (full reward)', maxLevel: 5, baseCost: 2, costStep: 1, requires: { id: 'team', level: 1 } },
  { id: 'retro', branch: 'team', file: 'retro.md', summary: '+20% sprint rewards per level', maxLevel: 5, baseCost: 2, costStep: 2, requires: { id: 'team', level: 2 } },
  { id: 'cache', branch: 'system', file: 'cache.conf', summary: 'packages cost 2% less per level', maxLevel: 15, baseCost: 1, costStep: 1 },
  { id: 'cron', branch: 'system', file: 'crontab', summary: '+10% offline rate and +1h offline cap per level', maxLevel: 5, baseCost: 2, costStep: 2, requires: { id: 'cache', level: 1 } },
  { id: 'timeouts', branch: 'system', file: 'timeouts.conf', summary: 'sprints get 10% more time per level', maxLevel: 5, baseCost: 2, costStep: 1, requires: { id: 'cache', level: 1 } },
  { id: 'bootstrap', branch: 'system', file: 'bootstrap.sh', summary: 'start each release with 5 keyboards and 5 ducks per level', maxLevel: 5, baseCost: 3, costStep: 3, requires: { id: 'cache', level: 3 } },
];

export const PERK_VALUES = {
  vimrcTap: 0.25,
  critPerLevel: 0.03,
  flowPerLevel: 0.25,
  teamAuto: 0.25,
  oncallChance: 0.1,
  retroReward: 0.2,
  cacheDiscount: 0.02,
  cronRate: 0.1,
  cronHours: 1,
  timeoutsBonus: 0.1,
  bootstrapCopies: 5,
};

/* ---------- sprints ---------- */

export interface SprintTier {
  durationS: number;
  /** Target as a multiple of what the player would write at ASSUMED_TAPS_PER_SECOND. */
  difficulty: number;
  /** Reward as a multiple of the target. */
  rewardMultiplier: number;
  /** Chance a merged sprint also drops a script. */
  scriptChance: number;
  /** After a sprint ends, its slot waits this long for the next standup before a fresh ticket appears. */
  cooldownS: number;
}

/** The backlog always holds one ticket per tier: quick, standard, and a long one that always drops a script. */
export const SPRINT_TIERS: readonly SprintTier[] = [
  { durationS: 20, difficulty: 0.7, rewardMultiplier: 1.6, scriptChance: 0.25, cooldownS: 60 },
  { durationS: 40, difficulty: 1.1, rewardMultiplier: 2.2, scriptChance: 0.5, cooldownS: 150 },
  { durationS: 75, difficulty: 1.5, rewardMultiplier: 3, scriptChance: 1, cooldownS: 420 },
];
export const ASSUMED_TAPS_PER_SECOND = 4;
/** Required taps per second at or below which a ticket counts as relaxed, and above which it counts as crunch. */
export const DIFFICULTY_BANDS = { relaxed: 3.5, tight: 6 };

export const TICKET_TITLES: readonly string[] = [
  'Fix the login race condition', 'Add a dark mode toggle', 'Migrate to the v3 API', 'Write the missing unit tests',
  'Refactor legacy billing', 'Hunt down a flaky test', 'Hotfix the checkout outage', 'Make the logo bigger',
  'Upgrade every dependency', 'Add retry logic to uploads', 'Speed up the image loader', 'Rename all the things',
];

/* ---------- bugs and incidents ---------- */

export const BUGS = {
  firstDelayMs: 15_000,
  minGapMs: 28_000,
  extraGapMs: 22_000,
  lifetimeMs: 9_400,
  /** Reward = this many seconds of automation + rewardTaps taps, at least minReward. */
  rewardAutoSeconds: 15,
  rewardTaps: 10,
  minReward: 25,
};

export type IncidentKind = 'coffee' | 'outage' | 'conflict';

/** Rarer events than bugs. None of them can cost the player anything: missing one only misses the reward. */
export const INCIDENTS = {
  firstDelayMs: 90_000,
  minGapMs: 70_000,
  extraGapMs: 80_000,
  weights: { coffee: 0.45, outage: 0.3, conflict: 0.25 } as Record<IncidentKind, number>,
  coffee: { lifetimeMs: 8_000 },
  /** Tap the key `taps` times before the timer runs out. */
  outage: { lifetimeMs: 10_000, taps: 30, rewardSeconds: 60 },
  /** Pick the side of the conflict that compiles. */
  conflict: { lifetimeMs: 9_000, rewardSeconds: 30 },
};

/* ---------- prestige, offline, quests, streak, unlocks ---------- */

export const SHIP = {
  /** Stars available = floor(cbrt(lines this release / linesPerStar)): 1 star at 2M, 2 at 16M, 10 at 2B. */
  linesPerStar: 2_000_000,
  /** Each star earned (spent or not) adds this fraction to all output. */
  bonusPerStar: 0.1,
};

export const OFFLINE = {
  /** Gaps longer than this (app closed, tab asleep) count as time away. */
  thresholdS: 60,
  maxSeconds: 2 * 60 * 60,
  /** Share of automation output earned while away (raised by the crontab perk). */
  rate: 0.25,
};

export const QUESTS = {
  active: 3,
  /** Permanent bonuses a finished task can grant. */
  rewards: { tap: 0.02, auto: 0.02, bug: 0.05, sprint: 0.05 },
  scriptRewardChance: 0.15,
  /** A finished task's slot refills after this long. */
  refillDelayS: 45,
};

export const STREAK = {
  /** Days kept for the contribution grid. */
  daysKept: 35,
  /** Daily bonus = this many seconds of automation, at least minLines. */
  dailyAutoSeconds: 600,
  minLines: 200,
};

/* ---------- forks: chosen every FORK_STEP copies of a package ---------- */

export type ForkId = 'major' | 'plugin' | 'lts';

export interface ForkDef {
  id: ForkId;
  name: string;
  /** Multiplies that package's output. */
  outputMul: number;
  /** Also adds this fraction to every package of the same kind. */
  kindBonus?: number;
  /** Multiplies that package's price. */
  costMul?: number;
}

export const FORKS: Record<ForkId, ForkDef> = {
  major: { id: 'major', name: 'major rewrite', outputMul: 2 },
  plugin: { id: 'plugin', name: 'plugin ecosystem', outputMul: 1.4, kindBonus: 0.08 },
  lts: { id: 'lts', name: 'LTS build', outputMul: 1.5, costMul: 0.5 },
};

/** The two forks offered at a package's nth fork. */
export const forkChoices = (n: number): ForkId[] => (n % 2 === 0 ? ['major', 'plugin'] : ['major', 'lts']);

/* ---------- tech debt ---------- */

export const DEBT = {
  /** Debt only starts building once this many lines have been written in all. */
  startsAtLifetime: 25_000,
  max: 100,
  perMinute: 3,
  /** Extra debt per minute for each timed effect running. */
  perMinutePerEffect: 3,
  bugEscaped: 4,
  bugSquashed: -1,
  sprintMerged: -2,
  bossFailed: 10,
  bossBeaten: -20,
  /** Debt up to this costs nothing. */
  grace: 10,
  /** Output lost at full debt. */
  maxPenalty: 0.5,
  /** A refactor costs this many seconds of automation per point of debt, at least minRefactorCost. */
  refactorSecondsPerPoint: 1,
  minRefactorCost: 100,
  warnAt: 60,
};

/* ---------- projects: what the next release is ---------- */

export type ProjectId = 'webapp' | 'cli' | 'enterprise' | 'game' | 'startup' | 'os';

export interface ProjectDef {
  id: ProjectId;
  name: string;
  /** The folder the editor shows: ~/<dir>/src. */
  dir: string;
  blurb: string;
  rules: string[];
  /** Offered from this release on. */
  minRelease: number;
  tapMul?: number;
  autoMul?: number;
  starMul?: number;
  costMul?: number;
  sprintRewardMul?: number;
  sprintTimeMul?: number;
  debtMul?: number;
  incidentGapMul?: number;
  bugGapMul?: number;
  bugRewardMul?: number;
}

export const PROJECTS: readonly ProjectDef[] = [
  { id: 'webapp', name: 'Web app', dir: 'web-app', blurb: 'The usual.', rules: ['no special rules'], minRelease: 1 },
  { id: 'cli', name: 'CLI tool', dir: 'cli-tool', blurb: 'One developer, one terminal.', rules: ['no automation', 'x4 per tap', '+50% stars'], minRelease: 2, autoMul: 0, tapMul: 4, starMul: 1.5 },
  { id: 'enterprise', name: 'Enterprise suite', dir: 'enterprise-suite', blurb: 'Meetings about meetings.', rules: ['x3 automation', 'half the lines per tap', 'packages cost 20% more'], minRelease: 2, autoMul: 3, tapMul: 0.5, costMul: 1.2 },
  { id: 'game', name: 'Game engine', dir: 'game-engine', blurb: 'Crunch is a lifestyle.', rules: ['x3 sprint rewards', 'sprints are 25% shorter', '+25% stars'], minRelease: 3, sprintRewardMul: 3, sprintTimeMul: 0.75, starMul: 1.25 },
  { id: 'startup', name: 'Startup MVP', dir: 'startup-mvp', blurb: 'Move fast, break things.', rules: ['x2 everything', 'tech debt builds three times as fast', 'incidents twice as often'], minRelease: 3, tapMul: 2, autoMul: 2, debtMul: 3, incidentGapMul: 0.5 },
  { id: 'os', name: 'Operating system', dir: 'kernel', blurb: 'Everything is a file. Every file has bugs.', rules: ['bugs three times as often', 'x5 bug rewards', 'tech debt builds twice as fast', '+25% stars'], minRelease: 4, bugGapMul: 1 / 3, bugRewardMul: 5, debtMul: 2, starMul: 1.25 },
];

/* ---------- the team ---------- */

export type RoleId = 'features' | 'sprints' | 'oncall' | 'bugs' | 'refactor';

export const ROLES: Record<RoleId, { label: string; summary: string }> = {
  features: { label: 'features', summary: '+10% automation' },
  sprints: { label: 'sprints', summary: '+20% sprint rewards' },
  oncall: { label: 'on-call', summary: 'outages and boss fights need 15% fewer taps' },
  bugs: { label: 'bug duty', summary: 'squashes 20% of bugs for you, +15% bug rewards' },
  refactor: { label: 'refactoring', summary: '-1.5 tech debt per minute' },
};
export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export type TraitId = 'senior' | 'tenx' | 'tester' | 'sre' | 'scrum' | 'tidy' | 'generalist';

export interface TraitDef {
  label: string;
  blurb: string;
  /** Multiplies the developer's effect in any role. */
  all: number;
  /** Replaces `all` in these roles. */
  roles?: Partial<Record<RoleId, number>>;
  debtPerMinute?: number;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  senior: { label: 'senior', blurb: 'x1.5 in any role', all: 1.5 },
  tenx: { label: '10x', blurb: 'x2 in any role, +1 tech debt per minute', all: 2, debtPerMinute: 1 },
  tester: { label: 'tester', blurb: 'x2.5 on bug duty', all: 1, roles: { bugs: 2.5 } },
  sre: { label: 'sre', blurb: 'x2.5 on-call', all: 1, roles: { oncall: 2.5 } },
  scrum: { label: 'scrum lead', blurb: 'x2.5 on sprints', all: 1, roles: { sprints: 2.5 } },
  tidy: { label: 'tidy', blurb: 'x2.5 when refactoring', all: 1, roles: { refactor: 2.5 } },
  generalist: { label: 'generalist', blurb: 'x1.25 in any role', all: 1.25 },
};
export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

export const DEV_NAMES: readonly string[] = 'ada.bjorn.chidi.dara.emre.farah.goran.hana.ines.jun.kavya.lena.mika.noor.olu.priya.quinn.rosa.sven.tomas.uma.vik.wei.xan.yara.zed'.split('.');

export const TEAM = {
  unlockAtLifetime: 100_000,
  baseSlots: 3,
  /** After a hire or a pass, the next applicant comes this many seconds later. */
  applicantGapS: 240,
  /** Hiring costs this many seconds of typical output (at least minHire), times 1 + hireStep per developer already hired. */
  hireSeconds: 90,
  hireStep: 0.5,
  minHire: 5_000,
  /** Effect of one developer (times their trait) in each role. */
  featuresAuto: 0.1,
  sprintReward: 0.2,
  oncallTaps: 0.15,
  oncallCap: 0.6,
  bugAuto: 0.2,
  bugReward: 0.15,
  refactorPerMinute: 1.5,
};

/* ---------- boss fights ---------- */

export type BossKind = 'deploy' | 'ddos' | 'audit' | 'migration';

export type BossStage = { type: 'mash'; label: string; taps: number; seconds: number } | { type: 'pick'; label: string; options: number; seconds: number };

export interface BossDef {
  kind: BossKind;
  name: string;
  intro: string;
  stages: BossStage[];
}

export const BOSSES: Record<BossKind, BossDef> = {
  deploy: {
    kind: 'deploy', name: 'FRIDAY DEPLOY', intro: 'someone merged to main at 16:59',
    stages: [
      { type: 'mash', label: 'roll back the deploy', taps: 30, seconds: 12 },
      { type: 'pick', label: 'find the line that broke prod', options: 3, seconds: 14 },
      { type: 'mash', label: 'ship the hotfix', taps: 40, seconds: 14 },
    ],
  },
  ddos: {
    kind: 'ddos', name: 'DDOS ATTACK', intro: 'traffic is up 40,000% and none of it is customers',
    stages: [
      { type: 'mash', label: 'scale up the load balancers', taps: 25, seconds: 10 },
      { type: 'mash', label: 'block the botnet', taps: 35, seconds: 12 },
      { type: 'mash', label: 'bring the cache back', taps: 45, seconds: 14 },
    ],
  },
  audit: {
    kind: 'audit', name: 'SECURITY AUDIT', intro: 'the auditors are in the lobby',
    stages: [
      { type: 'pick', label: 'find the leaked secret', options: 3, seconds: 14 },
      { type: 'mash', label: 'rotate every key', taps: 35, seconds: 12 },
      { type: 'pick', label: 'find the injection', options: 3, seconds: 14 },
    ],
  },
  migration: {
    kind: 'migration', name: 'DATABASE MIGRATION', intro: 'the migration is half applied',
    stages: [
      { type: 'pick', label: 'find the bad migration', options: 3, seconds: 14 },
      { type: 'mash', label: 'restore from backup', taps: 35, seconds: 13 },
      { type: 'pick', label: 'find the query that locks the table', options: 3, seconds: 14 },
      { type: 'mash', label: 'replay the write-ahead log', taps: 30, seconds: 12 },
    ],
  },
};
export const BOSS_KINDS = Object.keys(BOSSES) as BossKind[];

export const BOSS = {
  firstAtLifetime: 1_000_000,
  firstDelayMs: 240_000,
  minGapMs: 420_000,
  extraGapMs: 300_000,
  /** Warning before a boss arrives. */
  incomingMs: 20_000,
  /** Each stage cleared pays this many seconds of typical output; beating the boss pays rewardSeconds and scripts. */
  stageRewardSeconds: 30,
  rewardSeconds: 240,
  scripts: 2,
};

/* ---------- funding rounds and the company ---------- */

export const ROUNDS: readonly string[] = ['Bootstrapped', 'Seed', 'Series A', 'Series B', 'Series C', 'IPO'];

export const LANGUAGES: readonly { id: string; name: string }[] = [
  { id: 'ts', name: 'TypeScript' },
  { id: 'rs', name: 'Rust' },
  { id: 'go', name: 'Go' },
  { id: 'py', name: 'Python' },
];

export const FUNDING = {
  /** Stars needed to raise each round. */
  starsPerRound: [150, 2_000, 60_000, 1_500_000, 20_000_000],
  /** Each round raised multiplies all output by this. */
  outputPerRound: 3,
  maxRounds: ROUNDS.length - 1,
};

export interface CompanyPerkDef {
  id: string;
  name: string;
  summary: string;
  maxLevel: number;
  /** Equity for level n+1 = baseCost + costStep * n. */
  baseCost: number;
  costStep: number;
}

export const COMPANY_PERKS: readonly CompanyPerkDef[] = [
  { id: 'headcount', name: 'headcount', summary: '+1 team slot per level', maxLevel: 3, baseCost: 2, costStep: 1 },
  { id: 'brand', name: 'brand', summary: '+25% stars from shipping per level', maxLevel: 4, baseCost: 1, costStep: 1 },
  { id: 'runway', name: 'runway', summary: '+10% offline rate and +2h offline cap per level', maxLevel: 3, baseCost: 1, costStep: 1 },
  { id: 'platform', name: 'platform team', summary: 'tech debt builds 20% slower per level', maxLevel: 3, baseCost: 1, costStep: 1 },
  { id: 'devrel', name: 'devrel', summary: '+50% bug, incident and boss rewards per level', maxLevel: 3, baseCost: 1, costStep: 1 },
];

export const COMPANY_VALUES = { brandStars: 0.25, runwayRate: 0.1, runwayHours: 2, platformDebt: 0.2, devrelReward: 0.5 };

/* ---------- mail ---------- */

export const MAIL = {
  unlockAtLifetime: 5_000,
  firstDelayMs: 120_000,
  minGapMs: 300_000,
  extraGapMs: 240_000,
  /** Gap between the parts of a story. */
  storyGapMs: 45_000,
  maxPending: 3,
  /** Mail kept in the inbox. */
  kept: 30,
};

/** When the other tabs appear, so new players aren't shown everything at once. */
export const UNLOCKS = {
  sprintsAtLifetime: 750,
  todoAtLifetime: 2_000,
  shipAtRelease: 200_000,
  mailAtLifetime: MAIL.unlockAtLifetime,
  teamAtLifetime: TEAM.unlockAtLifetime,
};
