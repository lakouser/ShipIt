import { BUGS, INCIDENTS, type BossKind, type EffectId, type ForkId, type ProjectId, type RoleId, type TraitId } from './content';
import { D, type Decimal } from './num';

export type BuyAmount = 1 | 10 | 'max';
export type Tab = 'upgrades' | 'sprints' | 'todo' | 'ship' | 'team' | 'mail' | 'settings';
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

export interface Developer {
  id: number;
  name: string;
  trait: TraitId;
  role: RoleId;
  /** Which of the portrait variants to draw. */
  face: number;
}

export interface Boss {
  kind: BossKind;
  /** 'incoming' while the warning shows; 'fight' once engaged. */
  phase: 'incoming' | 'fight';
  stage: number;
  /** The warning or the current stage times out at this time. */
  endsAt: number;
  /** Mash stages: taps so far and taps needed. */
  taps: number;
  needed: number;
  /** Pick stages: the right option, and which wording to show. */
  correct: number;
  variant: number;
}

export interface MailItem {
  /** Unique per delivery (the same mail can come again later). */
  key: string;
  id: string;
  at: number;
  read: boolean;
  /** The option answered, for choice mail. */
  choice: number | null;
}

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
  refactors: number;
  forksChosen: number;
  hires: number;
  bossesBeaten: number;
  bossesFailed: number;
  mailAnswered: number;
  duckPokes: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  notation: Notation;
  skin: Skin;
  /** Show the welcome-back screen after time away (otherwise just a log line). */
  welcome: boolean;
  /** Show the screensaver in the editor when idle. */
  screensaver: boolean;
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
  /** Lines written since the last ship; drives stars. */
  thisRelease: Decimal;
  owned: Record<string, number>;
  /** Stars ever earned. The output bonus counts all of them, spent or not. */
  stars: number;
  starsSpent: number;
  perks: Record<string, number>;
  /** Current major version; starts at 1. */
  release: number;
  achievements: string[];
  flags: { crunch?: boolean; sudo?: boolean; rmrf?: boolean; nightOwl?: boolean; exported?: boolean; touchGrass?: boolean; bankrupt?: boolean };
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
  /** activity: taps per day (YYYY-MM-DD), for the days kept. */
  streak: { lastDay: string; count: number; days: string[]; activity: Record<string, number> };
  unlocked: { sprints: boolean; todo: boolean; ship: boolean; team: boolean; mail: boolean };
  /** Tech debt, 0 to DEBT.max. */
  debt: number;
  /** What this release is building. */
  project: ProjectId;
  projectsShipped: ProjectId[];
  /** Forks chosen per package, in order. */
  forks: Record<string, ForkId[]>;
  team: Developer[];
  applicant: Developer | null;
  nextApplicantAt: number;
  nextDevId: number;
  boss: Boss | null;
  nextBossAt: number;
  /** Kinds of boss beaten at least once. */
  bossKinds: BossKind[];
  /** Funding rounds raised. */
  round: number;
  equity: number;
  equitySpent: number;
  /** Company perk levels, bought with equity. */
  company: Record<string, number>;
  /** Newest first. */
  mail: MailItem[];
  nextMailAt: number;
  /** Story mail already sent. */
  mailSeen: string[];
  manRead: string[];
  settings: Settings;
  savedAt: number;
}

export const newStats = (): Stats => ({
  taps: 0, crits: 0, purchases: 0, sprints: 0, bugs: 0, bugsEscaped: 0, coffees: 0, outagesFixed: 0,
  conflictsResolved: 0, scriptsRun: 0, quests: 0, milestones: 0, perksBought: 0, flowMaxed: 0, maxOfOne: 0,
  refactors: 0, forksChosen: 0, hires: 0, bossesBeaten: 0, bossesFailed: 0, mailAnswered: 0, duckPokes: 0,
});

export const defaultSettings = (): Settings => ({
  sound: false, haptics: true, reduceMotion: false, notation: 'suffix', skin: 'pine',
  welcome: true, screensaver: true, buyAmount: 1, tab: 'upgrades', dev: false,
});

export function newGame(now: number): GameState {
  return {
    lines: D(0),
    lifetime: D(0),
    thisRelease: D(0),
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
    streak: { lastDay: '', count: 0, days: [], activity: {} },
    unlocked: { sprints: false, todo: false, ship: false, team: false, mail: false },
    debt: 0,
    project: 'webapp',
    projectsShipped: [],
    forks: {},
    team: [],
    applicant: null,
    nextApplicantAt: 0,
    nextDevId: 1,
    boss: null,
    nextBossAt: 0,
    bossKinds: [],
    round: 0,
    equity: 0,
    equitySpent: 0,
    company: {},
    mail: [],
    nextMailAt: 0,
    mailSeen: [],
    manRead: [],
    settings: defaultSettings(),
    savedAt: now,
  };
}
