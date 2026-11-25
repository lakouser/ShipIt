import { BUGS } from './content';
import { D, type Decimal } from './num';

export type BuyAmount = 1 | 10 | 'max';
export type Tab = 'upgrades' | 'sprints' | 'ship';

export interface Ticket {
  tier: number;
  id: string;
  title: string;
  durationS: number;
  target: Decimal;
  reward: Decimal;
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
  boosted: boolean;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  buyAmount: BuyAmount;
  tab: Tab;
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
  stars: number;
  /** Current major version; starts at 1. */
  release: number;
  bugsSquashed: number;
  sprintsMerged: number;
  achievements: string[];
  flags: { crunch?: boolean };
  /** Line number shown in the editor gutter. */
  editorLine: number;
  boost: { multiplier: number; endsAt: number } | null;
  sprint: ActiveSprint | null;
  backlog: Ticket[];
  lastSprint: SprintResult | null;
  bug: { expiresAt: number } | null;
  nextBugAt: number;
  settings: Settings;
  savedAt: number;
}

export function newGame(now: number): GameState {
  return {
    lines: D(0),
    lifetime: D(0),
    thisRelease: D(0),
    owned: {},
    stars: 0,
    release: 1,
    bugsSquashed: 0,
    sprintsMerged: 0,
    achievements: [],
    flags: {},
    editorLine: 1,
    boost: null,
    sprint: null,
    backlog: [],
    lastSprint: null,
    bug: null,
    nextBugAt: now + BUGS.firstDelayMs,
    settings: { sound: false, haptics: true, buyAmount: 1, tab: 'upgrades' },
    savedAt: now,
  };
}
