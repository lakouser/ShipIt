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

/** When the other tabs appear, so new players aren't shown everything at once. */
export const UNLOCKS = {
  sprintsAtLifetime: 750,
  todoAtLifetime: 2_000,
  shipAtRelease: 200_000,
};
