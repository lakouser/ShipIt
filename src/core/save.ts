import { D, isFiniteDecimal, type Decimal } from './num';
import { newGame, type ActiveSprint, type BuyAmount, type GameState, type SprintResult, type Tab, type Ticket } from './state';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'shipit.save';

type Raw = Record<string, unknown>;

/**
 * Upgrades older saves one version at a time. When the save format changes,
 * bump SAVE_VERSION and add an entry here: MIGRATIONS[1] turns a v1 save into v2.
 */
const MIGRATIONS: Record<number, (save: Raw) => Raw> = {};

export function serialize(s: GameState, now: number): string {
  // Decimals serialise themselves as strings via toJSON.
  return JSON.stringify({ v: SAVE_VERSION, ...s, savedAt: now });
}

const isObj = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x);

function dec(x: unknown, fallback: Decimal): Decimal {
  if (typeof x !== 'string' && typeof x !== 'number') return fallback;
  try {
    const d = D(x);
    return isFiniteDecimal(d) ? d : fallback;
  } catch {
    return fallback; // the library throws on unparseable strings
  }
}

const int = (x: unknown, fallback = 0): number => (typeof x === 'number' && Number.isFinite(x) ? Math.floor(x) : fallback);
const num = (x: unknown, fallback = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
const str = (x: unknown, fallback = ''): string => (typeof x === 'string' ? x : fallback);

function ticket(x: unknown): Ticket | null {
  if (!isObj(x)) return null;
  return { tier: int(x.tier), id: str(x.id, 'TKT-000'), title: str(x.title, 'Untitled ticket'), durationS: int(x.durationS, 20), target: dec(x.target, D(50)), reward: dec(x.reward, D(0)) };
}

function activeSprint(x: unknown): ActiveSprint | null {
  const t = ticket(x);
  if (!t || !isObj(x)) return null;
  return { ...t, slot: int(x.slot), endsAt: num(x.endsAt), progress: dec(x.progress, D(0)) };
}

function sprintResult(x: unknown): SprintResult | null {
  if (!isObj(x)) return null;
  return { ok: x.ok === true, ticketId: str(x.ticketId), title: str(x.title), progress: dec(x.progress, D(0)), target: dec(x.target, D(0)), reward: dec(x.reward, D(0)), secondsLeft: num(x.secondsLeft), boosted: x.boosted === true };
}

/** Parses a save, migrating old versions. Returns null for anything unreadable or from a newer version. */
export function deserialize(text: string, now: number): GameState | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(data) || typeof data.v !== 'number') return null;
  let raw: Raw = data;
  for (let v = data.v; v < SAVE_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return null;
    raw = migrate(raw);
  }
  if (data.v > SAVE_VERSION) return null;

  const base = newGame(now);
  const owned: Record<string, number> = {};
  if (isObj(raw.owned)) for (const [k, v] of Object.entries(raw.owned)) if (int(v) > 0) owned[k] = int(v);
  const settings: Raw = isObj(raw.settings) ? raw.settings : {};
  const buyAmount: BuyAmount = settings.buyAmount === 10 || settings.buyAmount === 'max' ? settings.buyAmount : 1;
  const tab: Tab = settings.tab === 'sprints' || settings.tab === 'ship' ? settings.tab : 'upgrades';
  const boost = isObj(raw.boost) ? { multiplier: num(raw.boost.multiplier, 1), endsAt: num(raw.boost.endsAt) } : null;

  return {
    ...base,
    lines: dec(raw.lines, base.lines),
    lifetime: dec(raw.lifetime, base.lifetime),
    thisRelease: dec(raw.thisRelease, base.thisRelease),
    owned,
    stars: Math.max(0, int(raw.stars)),
    release: Math.max(1, int(raw.release, 1)),
    bugsSquashed: Math.max(0, int(raw.bugsSquashed)),
    sprintsMerged: Math.max(0, int(raw.sprintsMerged)),
    achievements: Array.isArray(raw.achievements) ? raw.achievements.filter((a): a is string => typeof a === 'string') : [],
    flags: { crunch: isObj(raw.flags) && raw.flags.crunch === true },
    editorLine: Math.max(1, int(raw.editorLine, 1)),
    boost,
    sprint: activeSprint(raw.sprint),
    backlog: Array.isArray(raw.backlog) ? raw.backlog.map(ticket).filter((t): t is Ticket => t !== null) : [],
    lastSprint: sprintResult(raw.lastSprint),
    settings: { sound: settings.sound === true, haptics: settings.haptics !== false, buyAmount, tab },
    savedAt: num(raw.savedAt, now),
  };
}
