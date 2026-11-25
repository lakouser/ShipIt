/**
 * Game content and tuning. Balance changes should only need edits here.
 */

export type UpgradeKind = 'tap' | 'auto';
export type IconId = 'kb' | 'vim' | 'mon' | 'snip' | 'duck' | 'intern' | 'lint' | 'ci' | 'pair' | 'gen';

export interface UpgradeDef {
  id: string;
  kind: UpgradeKind;
  name: string;
  blurb: string;
  /** Price of the first copy, in lines. */
  baseCost: number;
  /** Lines per tap ('tap') or per second ('auto') for one copy, before multipliers. */
  output: number;
  icon: IconId;
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'kb', kind: 'tap', name: 'Mechanical keyboard', blurb: 'Satisfying thock, measurable output.', baseCost: 15, output: 1, icon: 'kb' },
  { id: 'vim', kind: 'tap', name: 'Vim motions', blurb: 'You can finally exit.', baseCost: 140, output: 6, icon: 'vim' },
  { id: 'mon', kind: 'tap', name: 'Second monitor', blurb: 'More screen, more scroll.', baseCost: 1_500, output: 40, icon: 'mon' },
  { id: 'snip', kind: 'tap', name: 'Snippet library', blurb: 'Copy, paste, ship.', baseCost: 20_000, output: 300, icon: 'snip' },
  { id: 'duck', kind: 'auto', name: 'Rubber duck', blurb: 'Listens. Somehow helps.', baseCost: 25, output: 1, icon: 'duck' },
  { id: 'intern', kind: 'auto', name: 'Summer intern', blurb: 'Eager. Mostly writes tests.', baseCost: 300, output: 7, icon: 'intern' },
  { id: 'lint', kind: 'auto', name: 'Linter bot', blurb: 'Fixes semicolons at 3 a.m.', baseCost: 3_200, output: 45, icon: 'lint' },
  { id: 'ci', kind: 'auto', name: 'CI pipeline', blurb: 'Builds while you sleep.', baseCost: 36_000, output: 300, icon: 'ci' },
  { id: 'pair', kind: 'auto', name: 'Pair programmer', blurb: 'Two keyboards, one brain.', baseCost: 400_000, output: 2_200, icon: 'pair' },
  { id: 'gen', kind: 'auto', name: 'Code generator', blurb: 'Writes code that writes code.', baseCost: 5_000_000, output: 16_000, icon: 'gen' },
];

/** Lines per tap with no upgrades. */
export const BASE_TAP = 1;
/** Each copy of an upgrade costs this much more than the previous one. */
export const COST_GROWTH = 1.15;
/** Every this-many copies of one upgrade doubles that upgrade's output. */
export const DOUBLING_STEP = 25;

export interface SprintTier {
  durationS: number;
  /** Target as a multiple of what the player would write at ASSUMED_TAPS_PER_SECOND. */
  difficulty: number;
  /** Reward as a multiple of the target. */
  rewardMultiplier: number;
  boost?: { multiplier: number; seconds: number };
}

/** The backlog always holds one ticket per tier: quick, standard, and a long one with a temporary boost. */
export const SPRINT_TIERS: readonly SprintTier[] = [
  { durationS: 20, difficulty: 0.7, rewardMultiplier: 1.6 },
  { durationS: 40, difficulty: 1.1, rewardMultiplier: 2.2 },
  { durationS: 75, difficulty: 1.5, rewardMultiplier: 3, boost: { multiplier: 2, seconds: 30 } },
];
export const ASSUMED_TAPS_PER_SECOND = 4;
/** Required taps per second at or below which a ticket counts as relaxed, and above which it counts as crunch. */
export const DIFFICULTY_BANDS = { relaxed: 3.5, tight: 6 };

export const TICKET_TITLES: readonly string[] = [
  'Fix the login race condition', 'Add a dark mode toggle', 'Migrate to the v3 API', 'Write the missing unit tests',
  'Refactor legacy billing', 'Hunt down a flaky test', 'Hotfix the checkout outage', 'Make the logo bigger',
  'Upgrade every dependency', 'Add retry logic to uploads', 'Speed up the image loader', 'Rename all the things',
];

export const BUGS = {
  firstDelayMs: 15_000,
  minGapMs: 28_000,
  extraGapMs: 22_000,
  lifetimeMs: 9_400,
  /** Reward = this many seconds of automation + REWARD_TAPS taps, at least MIN_REWARD. */
  rewardAutoSeconds: 15,
  rewardTaps: 10,
  minReward: 25,
};

export const SHIP = {
  /** Stars available = floor(sqrt(lines this release / linesPerStar)). */
  linesPerStar: 25_000,
  /** Each star adds this fraction to all output. */
  bonusPerStar: 0.1,
};

export const OFFLINE = {
  /** Gaps longer than this (app closed, tab asleep) count as time away. */
  thresholdS: 60,
  maxSeconds: 2 * 60 * 60,
  /** Share of automation output earned while away. */
  rate: 0.5,
};
