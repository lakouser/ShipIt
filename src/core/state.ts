import { BUGS, INCIDENTS, type EffectId } from './content';
import { D, type Decimal } from './num';

export type BuyAmount = 1 | 10 | 'max';
export type Tab = 'upgrades' | 'sprints' | 'todo' | 'ship' | 'settings';
export type KeySound = 'thock' | 'click' | 'beep';
export type Notation = 'suffix' | 'sci';
export type Skin = 'pine' | 'phosphor' | 'amber' | 'paper';

export interface Ticket {
  tier: number;
  id: string;
  title: string;
  durationS: number;
  target: Decimal;
  reward: Decimal;
  /** While in the future, the slot is waiting for the next standup and can't be started. */
  readyAt: number;
}

export interface ActiveSprint extends Ticket {
  slot: number;
  endsAt: number;
  progress: Decimal;
}

export interface SprintResult {
  ok: boolean;
  ticketId: string;
  title: string;
  progress: Decimal;
  target: Decimal;
  reward: Decimal;
  secondsLeft: number;
  /** A script dropped by the merged sprint, if any. */
  script: EffectId | null;
}

export type QuestReward = { kind: 'tap' | 'auto' | 'bug' | 'sprint'; amount: number } | { kind: 'script'; script: EffectId };

/** A TODO.md task. Numbers are Decimal strings so lines-based tasks can be huge. */
export interface Quest {
  template: string;
  target: string;
  baseline: string;
  /** Upgrade id for "own N of X" tasks. */
  subject?: string;
  reward: QuestReward;
}

/** A shipped release, for the release log. */
export interface ReleaseEntry {
  /** The version that was shipped (v{release}.0). */
  release: number;
  lines: Decimal;
  stars: number;
  /** How long the release took, wall-clock seconds (time away included); null if it began before releases were timed. */
  seconds: number | null;
  /** When it shipped (ms). */
  at: number;
}

export type MilestoneTaskKind = 'lines' | 'owned' | 'sprints';
export interface Milestone {
  release: number;
  stars: number;
  tasks: { kind: MilestoneTaskKind; target: string; baseline: string }[];
  done: boolean;
}

export type Incident =
  | { kind: 'coffee'; expiresAt: number }
  | { kind: 'outage'; expiresAt: number; taps: number; needed: number }
  | { kind: 'conflict'; expiresAt: number; correct: 0 | 1 };

export interface Stats {
  taps: number;
  crits: number;
  purchases: number;
  sprints: number;
  bugs: number;
  bugsEscaped: number;
  coffees: number;
  outagesFixed: number;
  conflictsResolved: number;
  scriptsRun: number;
  quests: number;
  milestones: number;
  perksBought: number;
  flowMaxed: number;
  maxOfOne: number;
}

export interface Settings {
  sound: boolean;
  keySound: KeySound;
  haptics: boolean;
  reduceMotion: boolean;
  notation: Notation;
  skin: Skin;
  /** Show the welcome-back screen after time away (otherwise just a log line). */
  welcome: boolean;
  buyAmount: BuyAmount;
  tab: Tab;
  dev: boolean;
}

/** Everything that is saved. Plain data only, so it serialises cleanly. */
export interface GameState {
  /** Spendable lines. */
  lines: Decimal;
  /** Every line ever written, across releases. */
  lifetime: Decimal;
  /** Lines written since the last ship. */
  thisRelease: Decimal;
  /** Lines of every release shipped so far. Stars come from this plus thisRelease; never reset. */
  shipped: Decimal;
  /** When the current release started (ms), for stars per minute; -1 if it began before releases were timed. */
  releaseStartedAt: number;
  /** Best stars per minute seen during the current release. */
  releasePeak: number;
  /** The last few shipped releases, newest first. */
  releaseLog: ReleaseEntry[];
  owned: Record<string, number>;
  /** Stars ever earned. The output bonus counts all of them, spent or not. */
  stars: number;
  starsSpent: number;
  perks: Record<string, number>;
  /** Current major version; starts at 1. */
  release: number;
  achievements: string[];
  flags: { crunch?: boolean; sudo?: boolean; rmrf?: boolean; nightOwl?: boolean; exported?: boolean; touchGrass?: boolean };
  /** Line number shown in the editor gutter. */
  editorLine: number;
  /** Script inventory (~/bin). */
  scripts: Partial<Record<EffectId, number>>;
  /** Active timed effects: id → ends at (ms). */
  effects: Partial<Record<EffectId, number>>;
  /** Permanent bonuses from finished TODO tasks (fractions). */
  questBonus: { tap: number; auto: number; bug: number; sprint: number };
  quests: Quest[];
  /** When the next TODO slot refills. */
  nextQuestAt: number;
  milestone: Milestone | null;
  stats: Stats;
  sprint: ActiveSprint | null;
  backlog: Ticket[];
  lastSprint: SprintResult | null;
  bug: { expiresAt: number } | null;
  nextBugAt: number;
  incident: Incident | null;
  nextIncidentAt: number;
  streak: { lastDay: string; count: number; days: string[] };
  unlocked: { sprints: boolean; todo: boolean; ship: boolean };
  settings: Settings;
  savedAt: number;
}

export const newStats = (): Stats => ({
  taps: 0, crits: 0, purchases: 0, sprints: 0, bugs: 0, bugsEscaped: 0, coffees: 0, outagesFixed: 0,
  conflictsResolved: 0, scriptsRun: 0, quests: 0, milestones: 0, perksBought: 0, flowMaxed: 0, maxOfOne: 0,
});

export const defaultSettings = (): Settings => ({
  sound: false, keySound: 'thock', haptics: true, reduceMotion: false, notation: 'suffix', skin: 'pine',
  welcome: true, buyAmount: 1, tab: 'upgrades', dev: false,
});

export function newGame(now: number): GameState {
  return {
    lines: D(0),
    lifetime: D(0),
    thisRelease: D(0),
    shipped: D(0),
    releaseStartedAt: now,
    releasePeak: 0,
    releaseLog: [],
    owned: {},
    stars: 0,
    starsSpent: 0,
    perks: {},
    release: 1,
    achievements: [],
    flags: {},
    editorLine: 1,
    scripts: { turbo: 1 },
    effects: {},
    questBonus: { tap: 0, auto: 0, bug: 0, sprint: 0 },
    quests: [],
    nextQuestAt: 0,
    milestone: null,
    stats: newStats(),
    sprint: null,
    backlog: [],
    lastSprint: null,
    bug: null,
    nextBugAt: now + BUGS.firstDelayMs,
    incident: null,
    nextIncidentAt: now + INCIDENTS.firstDelayMs,
    streak: { lastDay: '', count: 0, days: [] },
    unlocked: { sprints: false, todo: false, ship: false },
    settings: defaultSettings(),
    savedAt: now,
  };
}
