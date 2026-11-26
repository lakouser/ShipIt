import { AUTOMATION, BUGS, INCIDENTS, MARKET, type ChallengeId, type EffectId, type StackId, type WorkflowId } from './content';
import { D, type Decimal } from './num';

export type BuyAmount = 1 | 10 | 'max';
export type Tab = 'upgrades' | 'sprints' | 'todo' | 'ship' | 'major' | 'market' | 'settings';
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
  /** Releases shipped by then, counting this one plus one (like GameState.release). */
  release: number;
  /** The version tag, "1.4" (shown as v1.4). */
  version: string;
  /** Set when this was a major version: the XP it earned. */
  xp?: number;
  lines: Decimal;
  stars: number;
  /** How long the release took, wall-clock seconds (time away included); null if it began before releases were timed. */
  seconds: number | null;
  /** When it shipped (ms). */
  at: number;
}

/** A press-feed headline. */
export interface Headline {
  at: number;
  outlet: string;
  text: string;
}

/** Counters at the start of the release, so its review can see what happened during it. */
export interface ReleaseCounters {
  sprints: number;
  bugs: number;
  escaped: number;
  incidents: number;
}

/** The app in the market: users, reviews, rivals and the press. */
export interface MarketState {
  appName: string;
  /** Users at the last update. Churn since then is worked out from lastUpdateAt, so time away counts. */
  users: number;
  peak: number;
  /** The last ship or major version (ms); 0 before the first ship. */
  lastUpdateAt: number;
  /** The first ship: rivals grow from here. */
  startedAt: number;
  /** Review scores, newest first. */
  reviews: number[];
  /** Users rivals have taken from the player, by rival id. */
  absorbed: Record<string, number>;
  /** Rivals the player has overtaken at least once. */
  passed: string[];
  /** Chart position last announced (0 before the first ship). */
  rank: number;
  /** Set once the press has noticed this quiet spell. */
  staleNoticed: boolean;
  launch: { rival: string; endsAt: number } | null;
  nextLaunchAt: number;
  press: Headline[];
  base: ReleaseCounters;
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
  /** Stars earned over the whole game (shipping and milestones), for career titles. */
  starsEarned: number;
  autoShips: number;
  majors: number;
  challenges: number;
  steals: number;
  fiveStars: number;
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
  /** Releases shipped plus one, across the whole game; never resets. */
  release: number;
  /** The version shown as v{major}.{minor}: majors cut so far, and releases shipped since the last one. */
  major: number;
  minor: number;
  /** XP earned in total (the star bonus counts all of it, spent or not) and XP spent on skills. */
  xp: number;
  xpSpent: number;
  /** Stars banked by cutting major versions; drives XP the way shipped lines drive stars. */
  banked: number;
  skills: Record<string, number>;
  /** The stack this major version is written in, and the one picked for the next. */
  stack: StackId;
  nextStack: StackId;
  /** A challenge release in progress: its id and the lines it needs to count. */
  challenge: { id: ChallengeId; goal: Decimal } | null;
  challengesDone: ChallengeId[];
  market: MarketState;
  achievements: string[];
  flags: { crunch?: boolean; sudo?: boolean; rmrf?: boolean; nightOwl?: boolean; exported?: boolean; touchGrass?: boolean };
  /** Line number shown in the editor gutter. */
  editorLine: number;
  /** Script inventory (~/bin). */
  scripts: Partial<Record<EffectId, number>>;
  /** Active timed effects: id → ends at (ms). */
  effects: Partial<Record<EffectId, number>>;
  /** Workflows the player switched off (unlocked ones are on unless listed here as false). */
  workflows: Partial<Record<WorkflowId, boolean>>;
  /** release.yml ships once a release would grow stars by this fraction. */
  autoShipAt: number;
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
  unlocked: { sprints: boolean; todo: boolean; ship: boolean; major: boolean; market: boolean };
  settings: Settings;
  savedAt: number;
}

export const newStats = (): Stats => ({
  taps: 0, crits: 0, purchases: 0, sprints: 0, bugs: 0, bugsEscaped: 0, coffees: 0, outagesFixed: 0,
  conflictsResolved: 0, scriptsRun: 0, quests: 0, milestones: 0, perksBought: 0, flowMaxed: 0, maxOfOne: 0, starsEarned: 0, autoShips: 0, majors: 0, challenges: 0, steals: 0, fiveStars: 0,
});

export const newMarket = (): MarketState => ({
  appName: MARKET.defaultName, users: 0, peak: 0, lastUpdateAt: 0, startedAt: 0, reviews: [], absorbed: {}, passed: [], rank: 0,
  staleNoticed: false, launch: null, nextLaunchAt: 0, press: [], base: { sprints: 0, bugs: 0, escaped: 0, incidents: 0 },
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
    major: 0,
    minor: 0,
    xp: 0,
    xpSpent: 0,
    banked: 0,
    skills: {},
    stack: 'plain',
    nextStack: 'rust',
    challenge: null,
    challengesDone: [],
    market: newMarket(),
    achievements: [],
    flags: {},
    editorLine: 1,
    scripts: { turbo: 1 },
    effects: {},
    workflows: {},
    autoShipAt: AUTOMATION.shipAtDefault,
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
    unlocked: { sprints: false, todo: false, ship: false, major: false, market: false },
    settings: defaultSettings(),
    savedAt: now,
  };
}
