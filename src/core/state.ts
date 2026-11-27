import { AUTOMATION, BUGS, INCIDENTS, MARKET, type BossKind, type ChallengeId, type EffectId, type ForkId, type ForkPolicy, type IssueKind, type LanguageId, type ProjectId, type RoleId, type TraitId, type WorkflowId } from './content';
import { D, type Decimal } from './num';

export type BuyAmount = 1 | 10 | 'max';
/**
 * The panel being shown. The tmux bar groups them into five windows (see src/ui/nav.ts): pkgs; work
 * (sprints, todo); ship (ship, dotfiles, auto, major, round); co (team, mail, market); more (man,
 * trophies, stats, settings).
 */
export type Tab =
  | 'upgrades' | 'sprints' | 'todo' | 'tests' | 'ship' | 'dotfiles' | 'auto' | 'major' | 'round'
  | 'team' | 'mail' | 'issues' | 'market' | 'man' | 'trophies' | 'stats' | 'settings';
export const TABS: readonly Tab[] = ['upgrades', 'sprints', 'todo', 'tests', 'ship', 'dotfiles', 'auto', 'major', 'round', 'team', 'mail', 'issues', 'market', 'man', 'trophies', 'stats', 'settings'];
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

/** A shipped release (or major version), for the release log. */
export interface ReleaseEntry {
  /** The version tag, "1.4" (shown as v1.4). */
  version: string;
  lines: Decimal;
  stars: number;
  /** How long the release took, wall-clock seconds (time away included); null if it began before releases were timed. */
  seconds: number | null;
  /** When it shipped (ms). */
  at: number;
  /** Set when this was a major version: the XP it earned. */
  xp?: number;
  /** Test coverage when it shipped (0–1), once the test suite is open. */
  coverage?: number;
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

/** The app in the market: users, reviews, rivals and the press. Never reset. */
export interface MarketState {
  appName: string;
  /** Users at the last update; churn since then comes from quietMinutes. */
  users: number;
  /** Quiet minutes since the last update: time playing counts in full, time away at MARKET.awayChurnRate. */
  quietMinutes: number;
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
  /** Rivals bought after the IPO: gone from the chart, still counted as behind you. */
  acquired: string[];
}

/** A quarter's results. */
export interface QuarterReport {
  /** Quarters since the IPO, from 1. */
  quarter: number;
  revenue: number;
  guidance: number;
  beat: boolean;
  /** The stock price after the report. */
  stock: number;
  at: number;
}

/** The public company: quarters, cash and the stock. Starts at the IPO; never reset. */
export interface CorpState {
  /** When the IPO happened (ms); 0 before it. */
  ipoAt: number;
  /** Set once the ending has been shown. */
  endingSeen: boolean;
  /** The quarter in progress (1 = the first after the IPO). */
  quarter: number;
  /** Seconds of play into the quarter, and its revenue so far. */
  elapsed: number;
  revenue: number;
  /** What the board expects this quarter. */
  guidance: number;
  /** Cash to spend on acquisitions. */
  cash: number;
  stock: number;
  /** Quarters beaten in all, and in a row right now. */
  beats: number;
  streak: number;
  /** Newest first. */
  reports: QuarterReport[];
}

/** Issues users filed and nobody has closed yet, and what closing them has done. */
export interface IssueState {
  open: IssueKind[];
  /** When the next one is filed (ms); 0 until the queue opens. */
  nextAt: number;
  /** Review added to the next release by feature requests closed during this one. */
  reviewBoost: number;
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
  /** Releases shipped over the whole game (GameState.release resets with funding rounds and majors). */
  ships: number;
  /** Stars earned over the whole game (shipping and milestones), for career titles. */
  starsEarned: number;
  autoShips: number;
  majors: number;
  challenges: number;
  steals: number;
  fiveStars: number;
  /** Bugs the test suite caught before they escaped. */
  testsCaught: number;
  issuesClosed: number;
  acquisitions: number;
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
  /** Lines written since the last ship. */
  thisRelease: Decimal;
  /** Lines of every release shipped this run (since the last funding round or major). Stars come from this plus thisRelease. */
  shipped: Decimal;
  /** Lines of the last release shipped this run, for the milestone (0 at the start of a run). */
  lastReleaseLines: Decimal;
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
  /** Releases shipped this run plus one: resets with a funding round or a major version. */
  release: number;
  /** The version shown as v{major}.{minor}: majors cut so far, and releases shipped since the last one (funding rounds don't reset it). */
  major: number;
  minor: number;
  /** XP earned in total (the star bonus counts all of it, spent or not) and XP spent on skills. */
  xp: number;
  xpSpent: number;
  /** Stars banked by cutting major versions; drives XP the way shipped lines drive stars. */
  banked: number;
  skills: Record<string, number>;
  /** A challenge release in progress: its id and the lines it needs to count. */
  challenge: { id: ChallengeId; goal: Decimal } | null;
  challengesDone: ChallengeId[];
  /** Times each challenge has been cleared (1 to CHALLENGE.maxLevel), and its fastest clear in seconds. */
  challengeLevels: Partial<Record<ChallengeId, number>>;
  challengeBest: Partial<Record<ChallengeId, number>>;
  /** Workflows the player switched off (unlocked ones are on unless listed here as false). */
  workflows: Partial<Record<WorkflowId, boolean>>;
  /** release.yml ships once a release would grow stars by this fraction. */
  autoShipAt: number;
  /** forks.yml picks this upgrade. */
  forkPolicy: ForkPolicy;
  /** The project last picked by hand (null before any): release.yml ships as it when it's on offer. */
  preferredProject: ProjectId | null;
  /** The language this run is written in, and the ones it has been written in. */
  stack: LanguageId;
  stacksUsed: LanguageId[];
  /** Share of written code that goes to tests (TESTS.budgets), and this release's test and code lines. */
  testBudget: number;
  tests: Decimal;
  written: Decimal;
  issues: IssueState;
  corp: CorpState;
  /** When this game began (ms), for the ending's summary. */
  createdAt: number;
  market: MarketState;
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
  unlocked: { sprints: boolean; todo: boolean; ship: boolean; team: boolean; mail: boolean; major: boolean; market: boolean; tests: boolean; issues: boolean };
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
  ships: 0, starsEarned: 0, autoShips: 0, majors: 0, challenges: 0, steals: 0, fiveStars: 0,
  testsCaught: 0, issuesClosed: 0, acquisitions: 0,
});

export const newMarket = (): MarketState => ({
  appName: MARKET.defaultName, users: 0, quietMinutes: 0, peak: 0, lastUpdateAt: 0, startedAt: 0, reviews: [], absorbed: {}, passed: [], rank: 0,
  staleNoticed: false, launch: null, nextLaunchAt: 0, press: [], base: { sprints: 0, bugs: 0, escaped: 0, incidents: 0 }, acquired: [],
});

export const newCorp = (): CorpState => ({
  ipoAt: 0, endingSeen: false, quarter: 0, elapsed: 0, revenue: 0, guidance: 0, cash: 0, stock: 100, beats: 0, streak: 0, reports: [],
});

export const newIssues = (): IssueState => ({ open: [], nextAt: 0, reviewBoost: 0 });

export const defaultSettings = (): Settings => ({
  sound: false, haptics: true, reduceMotion: false, notation: 'suffix', skin: 'pine',
  welcome: true, screensaver: true, buyAmount: 1, tab: 'upgrades', dev: false,
});

export function newGame(now: number): GameState {
  return {
    lines: D(0),
    lifetime: D(0),
    thisRelease: D(0),
    shipped: D(0),
    lastReleaseLines: D(0),
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
    challenge: null,
    challengesDone: [],
    challengeLevels: {},
    challengeBest: {},
    workflows: {},
    autoShipAt: AUTOMATION.shipAtDefault,
    forkPolicy: 'alt',
    preferredProject: null,
    stack: 'ts',
    stacksUsed: ['ts'],
    testBudget: 0,
    tests: D(0),
    written: D(0),
    issues: newIssues(),
    corp: newCorp(),
    createdAt: now,
    market: newMarket(),
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
    unlocked: { sprints: false, todo: false, ship: false, team: false, mail: false, major: false, market: false, tests: false, issues: false },
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
