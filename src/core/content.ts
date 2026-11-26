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
  { id: 'duck', kind: 'auto', name: 'Rubber duck', blurb: 'Listens. Somehow helps.', baseCost: 25, output: 1 },
  { id: 'intern', kind: 'auto', name: 'Summer intern', blurb: 'Eager. Mostly writes tests.', baseCost: 400, output: 6 },
  { id: 'lint', kind: 'auto', name: 'Linter bot', blurb: 'Fixes semicolons at 3 a.m.', baseCost: 7_500, output: 35 },
  { id: 'ci', kind: 'auto', name: 'CI pipeline', blurb: 'Builds while you sleep.', baseCost: 150_000, output: 200 },
  { id: 'pair', kind: 'auto', name: 'Pair programmer', blurb: 'Two keyboards, one brain.', baseCost: 3_500_000, output: 1_200 },
  { id: 'gen', kind: 'auto', name: 'Code generator', blurb: 'Writes code that writes code.', baseCost: 85_000_000, output: 7_000 },
  { id: 'k8s', kind: 'auto', name: 'Container cluster', blurb: 'Nobody knows how it works. It works.', baseCost: 2_200_000_000, output: 40_000 },
  { id: 'agents', kind: 'auto', name: 'Agent swarm', blurb: 'A thousand tiny coworkers.', baseCost: 60_000_000_000, output: 230_000 },
  { id: 'quantum', kind: 'auto', name: 'Quantum compiler', blurb: 'Compiles every branch at once.', baseCost: 1_800_000_000_000, output: 1_300_000 },
];

/** Lines per tap with no upgrades. */
export const BASE_TAP = 1;
/** Each copy of an upgrade costs this much more than the previous one. */
export const COST_GROWTH = 1.15;
/** Every this-many copies of one upgrade doubles that upgrade's output. */
export const DOUBLING_STEP = 25;
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
  /** Infinity for a perk with no cap. */
  maxLevel: number;
  /** Stars for level n+1 = baseCost + costStep * n, or baseCost * costGrowth^n when costGrowth is set. */
  baseCost: number;
  costStep: number;
  costGrowth?: number;
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
  { id: 'zshrc', branch: 'system', file: '.zshrc', summary: 'x1.1 all output per level, no cap (each level costs twice the last)', maxLevel: Infinity, baseCost: 10, costStep: 0, costGrowth: 2, requires: { id: 'cache', level: 5 } },
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
  zshrcMul: 1.1,
};

/* ---------- workflows: automation earned by shipping ---------- */

export type WorkflowId = 'deps' | 'devdeps' | 'scripts' | 'triage' | 'release';

export interface WorkflowDef {
  id: WorkflowId;
  /** Shown as .github/workflows/<file>. */
  file: string;
  summary: string;
  /** Releases shipped before it unlocks. Unlocked workflows start switched on. */
  releases: number;
}

export const WORKFLOWS: readonly WorkflowDef[] = [
  { id: 'deps', file: 'deps.yml', summary: 'installs automation packages for you, best value first', releases: 2 },
  { id: 'devdeps', file: 'dev-deps.yml', summary: 'installs typing packages for you, best value first', releases: 4 },
  { id: 'scripts', file: 'scripts.yml', summary: 'runs each ~/bin script as soon as the last one ends', releases: 6 },
  { id: 'triage', file: 'triage.yml', summary: 'squashes bugs and grabs coffee for you', releases: 10 },
  { id: 'release', file: 'release.yml', summary: 'ships for you once a release would grow stars by the amount you pick', releases: 15 },
];

export const AUTOMATION = {
  /** At most this many packages auto-installed per tick. */
  installsPerTick: 25,
  /** Choices for release.yml: ship once a release would grow stars by this fraction. */
  shipAtOptions: [0.5, 0.75, 1, 2] as readonly number[],
  shipAtDefault: 0.75,
};

/* ---------- major versions: the second reset ---------- */

export const MAJOR = {
  /** XP earned in total = floor(cbrt(stars banked across major versions / starsPerXp)): 1 at 1,000, 2 at 8,000, 3 at 27,000. */
  starsPerXp: 1_000,
  /** Each XP earned multiplies stars from shipping by 1 + this (spent or not). */
  starGainPerXp: 0.5,
  /** The major tab appears at this many stars, showing what the first major version needs. */
  teaseAtStars: 100,
};

/** What a modifier can change. Multipliers default to 1; costGrowth replaces COST_GROWTH. */
export interface Mods {
  tapMul: number;
  autoMul: number;
  allMul: number;
  /** Price growth per copy (1.15 normally). */
  costGrowth: number;
  costMul: number;
  /** Extra price multiplier for automation packages only. */
  autoCostMul: number;
  critAdd: number;
  sprintTime: number;
  sprintReward: number;
  bugReward: number;
  /** Multiplies stars from shipping. */
  starGain: number;
  /** Only this many packages of each kind can be installed. */
  maxTier: number;
  /** False while dotfiles have no effect. */
  dotfiles: boolean;
}

export interface SkillDef {
  id: string;
  /** Shown as a line of ~/resume.md. */
  name: string;
  summary: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  costGrowth?: number;
}

/** Skills are bought with XP and kept forever. */
export const SKILLS: readonly SkillDef[] = [
  { id: 'tenx', name: '10x engineering', summary: 'x2 all output per level, no cap (each level costs twice the last)', maxLevel: Infinity, baseCost: 1, costStep: 0, costGrowth: 2 },
  { id: 'pairing', name: 'pair programming', summary: '+25% stars from shipping per level', maxLevel: 4, baseCost: 1, costStep: 1 },
  { id: 'headstart', name: 'head start', summary: 'start each major version with 25 stars per level', maxLevel: 4, baseCost: 1, costStep: 1 },
  { id: 'muscle', name: 'muscle memory', summary: 'keep your dotfiles when you cut a major version', maxLevel: 1, baseCost: 3, costStep: 0 },
];

export const SKILL_VALUES = { tenxMul: 2, pairingGain: 0.25, headstartStars: 25 };

export type StackId = 'plain' | 'rust' | 'python' | 'go' | 'js';

export interface StackDef {
  id: StackId;
  summary: string;
  mods: Partial<Mods>;
}

/** Each major version is written in one stack, picked before it starts. v0.x is plain. */
export const STACKS: readonly StackDef[] = [
  { id: 'plain', summary: 'no changes', mods: {} },
  { id: 'rust', summary: 'x3 per tap and +5% critical tap chance, but automation x0.5', mods: { tapMul: 3, critAdd: 0.05, autoMul: 0.5 } },
  { id: 'python', summary: 'automation x1.5 and automation packages cost half, but per tap x0.5', mods: { autoMul: 1.5, autoCostMul: 0.5, tapMul: 0.5 } },
  { id: 'go', summary: 'sprints get 50% more time and pay x2, but automation x0.7', mods: { sprintTime: 1.5, sprintReward: 2, autoMul: 0.7 } },
  { id: 'js', summary: 'package prices grow 13% per copy instead of 15%, but all output x0.8', mods: { costGrowth: 1.13, allMul: 0.8 } },
];

export type ChallengeId = 'legacy' | 'cidown' | 'keyboard' | 'solo' | 'clean';

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  /** Shown as the branch: challenge/<branch>. */
  branch: string;
  restriction: string;
  reward: string;
  mods: Partial<Mods>;
  rewardMods: Partial<Mods>;
}

/**
 * Challenge releases: restart the current release under a restriction. Ship it with at least the goal
 * (a release that grows this major's star curve by CHALLENGE.goalGain) for a permanent reward. Unlocked by the first major version.
 */
export const CHALLENGES: readonly ChallengeDef[] = [
  { id: 'legacy', name: 'Legacy codebase', branch: 'legacy', restriction: 'package prices grow 30% per copy', reward: 'packages cost 10% less, forever', mods: { costGrowth: 1.3 }, rewardMods: { costMul: 0.9 } },
  { id: 'cidown', name: 'CI is down', branch: 'ci-down', restriction: 'automation x0.1', reward: 'automation x1.5, forever', mods: { autoMul: 0.1 }, rewardMods: { autoMul: 1.5 } },
  { id: 'keyboard', name: 'Broken keyboard', branch: 'broken-keyboard', restriction: 'per tap x0.1', reward: 'per tap x1.5, forever', mods: { tapMul: 0.1 }, rewardMods: { tapMul: 1.5 } },
  { id: 'solo', name: 'Solo dev', branch: 'solo-dev', restriction: 'only the first 4 packages of each kind', reward: 'sprints and bugs pay x2, forever', mods: { maxTier: 4 }, rewardMods: { sprintReward: 2, bugReward: 2 } },
  { id: 'clean', name: 'Clean install', branch: 'clean-install', restriction: 'dotfiles do nothing', reward: '+25% stars from shipping, forever', mods: { dotfiles: false }, rewardMods: { starGain: 1.25 } },
];

export const CHALLENGE = {
  /** The goal: a release that grows this major's star curve by this fraction, about twice the lines shipped so far this major. */
  goalGain: 0.25,
  /** Challenges can start once this major's star curve (before XP) reaches this, so they can't be done on an empty codebase. */
  minCurve: 20,
};

/* ---------- the market: reviews, users and rival companies ---------- */

export const MARKET = {
  /** The app's name until the player renames it. */
  defaultName: 'my-app',
  /** New users from a release = usersPerCubeRootLine × cbrt(release lines) × (review / 3)². */
  usersPerCubeRootLine: 10,
  /** Users start drifting to rivals this long after the last update (ship or major version)... */
  graceMinutes: 45,
  /** ...losing this share of them each minute after that... */
  churnPerMinute: 0.01,
  /** ...but one quiet spell never costs more than this share of the users at the last update. */
  maxChurn: 0.5,
  /** A release reviewed at least winBackAt wins back this share of the users lost since the last update. */
  winBackAt: 4,
  winBack: 0.5,
  /** Each rival you are ahead of in the chart adds this to all output. */
  rankBonus: 0.05,
  /** Rival launches: announced with a warning; ship first to multiply that release's new users. */
  launch: { firstDelayMs: 10 * 60_000, minGapMs: 12 * 60_000, extraGapMs: 13 * 60_000, warningMs: 5 * 60_000, stealMul: 1.5, rivalGain: 0.05 },
  /** Scripts a first overtake drops. */
  overtakeScripts: 2,
  reviewsKept: 5,
  pressKept: 12,
};

export interface RivalDef {
  id: string;
  name: string;
  app: string;
  /** Users when the player first ships... */
  users: number;
  /** ...growing by this share of that each day. */
  growthPerDay: number;
}

/** Fictional competitors, smallest first. */
export const RIVALS: readonly RivalDef[] = [
  { id: 'hello', name: 'Hello World Inc', app: 'hello-app', users: 5_000, growthPerDay: 0.5 },
  { id: 'foo', name: 'Foo Corp', app: 'foo.io', users: 30_000, growthPerDay: 0.5 },
  { id: 'bar', name: 'BarSoft', app: 'bar', users: 200_000, growthPerDay: 0.5 },
  { id: 'legacy', name: 'Legacy Systems Inc', app: 'LegacyERP', users: 1_200_000, growthPerDay: 0.25 },
  { id: 'movefast', name: 'MoveFast Labs', app: 'movefast', users: 8_000_000, growthPerDay: 1 },
  { id: 'waterfall', name: 'Waterfall Ltd', app: 'GanttPro', users: 50_000_000, growthPerDay: 0.25 },
  { id: 'yak', name: 'Yak Shaving Co', app: 'yakr', users: 300_000_000, growthPerDay: 0.5 },
  { id: 'monolith', name: 'Monolith Global', app: 'Monolith', users: 2e9, growthPerDay: 0.5 },
  { id: 'synergy', name: 'Synergy Dynamics', app: 'Synergize', users: 12e9, growthPerDay: 0.5 },
  { id: 'cloudnine', name: 'Cloud Nine Systems', app: 'nimbus', users: 80e9, growthPerDay: 0.5 },
  { id: 'hype', name: 'Hype Cycle Inc', app: 'hypr', users: 500e9, growthPerDay: 1 },
  { id: 'unicorn', name: 'Unicorn Ventures', app: 'unicornify', users: 3e12, growthPerDay: 0.5 },
  { id: 'galaxy', name: 'Galaxy Brain AI', app: 'galaxybrain', users: 20e12, growthPerDay: 0.5 },
  { id: 'recursion', name: 'Recursion Corp', app: 'recurse', users: 150e12, growthPerDay: 0.5 },
  { id: 'bigtech', name: 'Big Tech Holdings', app: 'everything', users: 1e15, growthPerDay: 0.5 },
];

/** Made-up outlets for the press feed. */
export const OUTLETS: readonly string[] = ['The Daily Diff', 'Hacker Feed', 'Stack Trace Times', '/dev/news', 'Byte Beat', 'Ship Report', 'The Merge Request'];

/* ---------- career: titles by stars earned over the whole game ---------- */

export const CAREER: readonly { title: string; stars: number }[] = [
  { title: 'intern', stars: 0 },
  { title: 'junior dev', stars: 2 },
  { title: 'developer', stars: 25 },
  { title: 'senior dev', stars: 250 },
  { title: 'staff engineer', stars: 2_500 },
  { title: 'principal engineer', stars: 25_000 },
  { title: 'distinguished engineer', stars: 250_000 },
  { title: 'fellow', stars: 2_500_000 },
  { title: 'cto', stars: 25_000_000 },
];

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
  /**
   * Stars come from every line ever shipped, not just this release:
   * stars from shipping = floor(starScale · cbrt(all shipped lines / linesPerStar)), so 2 at 2M, 4 at 16M, 20 at 2B in total.
   * A release pays the difference it makes to that total, which means shipping the same size of release again pays less,
   * and many tiny releases pay far less than one big one.
   */
  linesPerStar: 2_000_000,
  starScale: 2,
  /** A release needs at least this many lines before it can ship. */
  minRelease: 2_000_000,
  /** Each star earned (spent or not) adds this fraction to all output. */
  bonusPerStar: 0.1,
  /** The ship panel calls a release ready once it would grow stars by this fraction (or it's the first release). */
  readyAt: 0.5,
  /** Releases kept in the release log. */
  logSize: 10,
};

export const OFFLINE = {
  /** Gaps longer than this (app closed, tab asleep) count as time away. */
  thresholdS: 60,
  maxSeconds: 2 * 60 * 60,
  /** Share of automation output earned while away (raised by the crontab perk). */
  rate: 0.25,
};

export const MILESTONE = {
  /** A finished milestone makes the next ship pay this much more (at least the milestone's flat stars). */
  shipBonus: 0.25,
  /** The lines task asks for this multiple of the last release's lines. */
  beatLast: 1.5,
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

/** When the other tabs appear, so new players aren't shown everything at once. */
export const UNLOCKS = {
  sprintsAtLifetime: 750,
  todoAtLifetime: 2_000,
  shipAtRelease: 200_000,
};
