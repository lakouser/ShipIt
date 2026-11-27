import { AUTOMATION, BOSS_KINDS, CHALLENGE, CHALLENGES, COMPANY_PERKS, CORP, EFFECTS, FORKS, FUNDING, ISSUES, LANGUAGES, MARKET, PERKS, PROJECTS, RIVALS, ROLE_IDS, SHIP, SKILLS, STACKS, STREAK, TESTS, TRAIT_IDS, UNLOCKS, WORKFLOWS, type ChallengeId, type EffectId, type ForkId, type IssueKind, type LanguageId, type WorkflowId } from './content';
import { mailDef } from './mail';
import { MAN_PAGES } from './man';
import { D, isFiniteDecimal, type Decimal } from './num';
import { shippedForStars } from './ship';
import {
  defaultSettings,
  TABS,
  newCorp,
  newGame,
  newIssues,
  newMarket,
  newStats,
  type ActiveSprint,
  type CorpState,
  type Developer,
  type GameState,
  type Headline,
  type Incident,
  type IssueState,
  type MailItem,
  type MarketState,
  type Milestone,
  type QuarterReport,
  type Quest,
  type QuestReward,
  type ReleaseEntry,
  type Settings,
  type SprintResult,
  type Stats,
  type Ticket,
} from './state';

export const SAVE_VERSION = 5;
export const SAVE_KEY = 'shipit.save';
/** Prefix for exported save strings, so pasted text is recognisable. */
export const EXPORT_PREFIX = 'SHIPIT:';

type Raw = Record<string, unknown>;

/**
 * Upgrades older saves one version at a time. When the save format changes,
 * bump SAVE_VERSION and add an entry here: MIGRATIONS[n] turns a vN save into vN+1.
 */
const MIGRATIONS: Record<number, (save: Raw) => Raw> = {
  // v1 → v2: counters moved into `stats`, the sprint boost became scripts/effects.
  1: (save) => {
    const { bugsSquashed, sprintsMerged, boost: _boost, ...rest } = save;
    return { ...rest, v: 2, stats: { bugs: bugsSquashed ?? 0, sprints: sprintsMerged ?? 0 } };
  },
  // v2 → v3: every 25 copies used to double a package; those doublings become major-rewrite forks.
  2: (save) => {
    const forks: Record<string, ForkId[]> = {};
    if (isObj(save.owned))
      for (const [id, count] of Object.entries(save.owned)) {
        const n = Math.floor(int(count) / 25);
        if (n > 0) forks[id] = Array<ForkId>(Math.min(n, 400)).fill('major');
      }
    return { ...save, v: 3, forks };
  },
  // v3 → v4: stars now come from every line shipped this run, and versions read v{major}.{minor}.
  // Start the star curve where the player's stars already are, so nobody loses a star and the next ones come at the
  // same pace as for anyone else holding that many. The release in progress began before releases were timed.
  3: (save) => {
    const stars = Math.max(0, int(save.stars));
    const shipped = Math.max(0, int(save.release, 1) - 1);
    const stats = { ...(isObj(save.stats) ? save.stats : {}), starsEarned: stars, ships: shipped };
    return { ...save, v: 4, shipped: shippedForStars(stars).toString(), releaseStartedAt: -1, major: 0, minor: shipped, stats };
  },
  // v4 → v5: the language became a stack with rules. Keep the language the player was looking at (the old rotation by
  // round); challenges cleared count as cleared once; the game began on the earliest day played.
  4: (save) => {
    const stack = LANGUAGES[Math.max(0, int(save.round)) % LANGUAGES.length];
    const done = Array.isArray(save.challengesDone) ? save.challengesDone.filter((id): id is string => typeof id === 'string') : [];
    const days = isObj(save.streak) && isObj(save.streak.activity) ? Object.keys(save.streak.activity).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).sort() : [];
    const first = days.length ? new Date(`${days[0]}T00:00:00`).getTime() : NaN;
    return { ...save, v: 5, stack, stacksUsed: [stack], challengeLevels: Object.fromEntries(done.map((id) => [id, 1])), createdAt: Number.isFinite(first) ? first : num(save.savedAt) };
  },
};

export function serialize(s: GameState, now: number): string {
  // Decimals serialise themselves as strings via toJSON.
  return JSON.stringify({ v: SAVE_VERSION, ...s, savedAt: now });
}

/** A save as a single copyable line (base64 of the JSON). */
export function exportSave(s: GameState, now: number): string {
  const json = serialize(s, now);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return EXPORT_PREFIX + btoa(binary);
}

/** Reads an exported save string (or raw JSON). Returns null if it can't be read. */
export function importSave(text: string, now: number): GameState | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return deserialize(trimmed, now);
  if (!trimmed.startsWith(EXPORT_PREFIX)) return null;
  try {
    const binary = atob(trimmed.slice(EXPORT_PREFIX.length));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return deserialize(new TextDecoder().decode(bytes), now);
  } catch {
    return null;
  }
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
const decStr = (x: unknown, fallback = '0'): string => dec(x, D(fallback)).toString();
const oneOf = <T extends string | number>(x: unknown, options: readonly T[], fallback: T): T => (options.includes(x as T) ? (x as T) : fallback);
const isEffect = (x: unknown): x is EffectId => typeof x === 'string' && x in EFFECTS;

function counts(x: unknown, valid?: (k: string) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(x)) for (const [k, v] of Object.entries(x)) if ((!valid || valid(k)) && int(v) > 0) out[k] = int(v);
  return out;
}

function ticket(x: unknown): Ticket | null {
  if (!isObj(x)) return null;
  return { tier: int(x.tier), id: str(x.id, 'TKT-000'), title: str(x.title, 'Untitled ticket'), durationS: int(x.durationS, 20), target: dec(x.target, D(50)), reward: dec(x.reward, D(0)), readyAt: num(x.readyAt) };
}

function activeSprint(x: unknown): ActiveSprint | null {
  const t = ticket(x);
  if (!t || !isObj(x)) return null;
  return { ...t, slot: int(x.slot), endsAt: num(x.endsAt), progress: dec(x.progress, D(0)) };
}

function sprintResult(x: unknown): SprintResult | null {
  if (!isObj(x)) return null;
  return { ok: x.ok === true, ticketId: str(x.ticketId), title: str(x.title), progress: dec(x.progress, D(0)), target: dec(x.target, D(0)), reward: dec(x.reward, D(0)), secondsLeft: num(x.secondsLeft), script: isEffect(x.script) ? x.script : null };
}

function questReward(x: unknown): QuestReward {
  if (isObj(x) && x.kind === 'script' && isEffect(x.script)) return { kind: 'script', script: x.script };
  if (isObj(x) && (x.kind === 'tap' || x.kind === 'auto' || x.kind === 'bug' || x.kind === 'sprint')) return { kind: x.kind, amount: num(x.amount) };
  return { kind: 'tap', amount: 0.02 };
}

function quest(x: unknown): Quest | null {
  if (!isObj(x) || typeof x.template !== 'string') return null;
  return { template: x.template, target: decStr(x.target, '1'), baseline: decStr(x.baseline), subject: typeof x.subject === 'string' ? x.subject : undefined, reward: questReward(x.reward) };
}

function milestone(x: unknown): Milestone | null {
  if (!isObj(x) || !Array.isArray(x.tasks)) return null;
  const tasks = x.tasks
    .filter(isObj)
    .map((t) => ({ kind: oneOf(t.kind, ['lines', 'owned', 'sprints'] as const, 'lines'), target: decStr(t.target, '1'), baseline: decStr(t.baseline) }));
  return { release: Math.max(1, int(x.release, 1)), stars: Math.max(0, int(x.stars)), done: x.done === true, tasks };
}

function releaseEntry(x: unknown): ReleaseEntry | null {
  if (!isObj(x)) return null;
  const entry: ReleaseEntry = { version: str(x.version, '0.0'), lines: dec(x.lines, D(0)), stars: Math.max(0, int(x.stars)), seconds: typeof x.seconds === 'number' && Number.isFinite(x.seconds) ? Math.max(0, x.seconds) : null, at: num(x.at) };
  if (typeof x.xp === 'number' && x.xp > 0) entry.xp = int(x.xp);
  return entry;
}

const CHALLENGE_IDS = CHALLENGES.map((c) => c.id);

function challenge(x: unknown): { id: ChallengeId; goal: Decimal } | null {
  if (!isObj(x) || !CHALLENGE_IDS.includes(x.id as ChallengeId)) return null;
  return { id: x.id as ChallengeId, goal: dec(x.goal, D(SHIP.minRelease)) };
}

function workflowFlags(x: unknown): Partial<Record<WorkflowId, boolean>> {
  const out: Partial<Record<WorkflowId, boolean>> = {};
  if (isObj(x)) for (const w of WORKFLOWS) if (typeof x[w.id] === 'boolean') out[w.id] = x[w.id] as boolean;
  return out;
}

function market(x: unknown, savedAt: number): MarketState {
  const d = newMarket();
  if (!isObj(x)) return d;
  const base = isObj(x.base) ? x.base : {};
  const lastUpdateAt = num(x.lastUpdateAt);
  // Saves from before quiet minutes were tracked: count the time from the last update to the save as played.
  const quiet = typeof x.quietMinutes === 'number' && Number.isFinite(x.quietMinutes) ? x.quietMinutes : lastUpdateAt && savedAt > lastUpdateAt ? (savedAt - lastUpdateAt) / 60_000 : 0;
  const absorbed: Record<string, number> = {};
  if (isObj(x.absorbed)) for (const r of RIVALS) if (num(x.absorbed[r.id]) > 0) absorbed[r.id] = num(x.absorbed[r.id]);
  const l = isObj(x.launch) ? x.launch : null;
  const launch = l && RIVALS.some((r) => r.id === l.rival) ? { rival: str(l.rival), endsAt: num(l.endsAt) } : null;
  return {
    appName: str(x.appName, d.appName).slice(0, 24) || d.appName,
    users: Math.max(0, num(x.users)),
    quietMinutes: Math.max(0, quiet),
    peak: Math.max(0, num(x.peak)),
    lastUpdateAt,
    startedAt: num(x.startedAt),
    reviews: Array.isArray(x.reviews) ? x.reviews.filter((r): r is number => typeof r === 'number' && r >= 1 && r <= 5).slice(0, MARKET.reviewsKept) : [],
    absorbed,
    passed: Array.isArray(x.passed) ? RIVALS.map((r) => r.id).filter((id) => (x.passed as unknown[]).includes(id)) : [],
    rank: Math.max(0, int(x.rank)),
    staleNoticed: x.staleNoticed === true,
    launch,
    nextLaunchAt: num(x.nextLaunchAt),
    press: Array.isArray(x.press) ? x.press.filter(isObj).map((h): Headline => ({ at: num(h.at), outlet: str(h.outlet), text: str(h.text) })).slice(0, MARKET.pressKept) : [],
    base: { sprints: Math.max(0, int(base.sprints)), bugs: Math.max(0, int(base.bugs)), escaped: Math.max(0, int(base.escaped)), incidents: Math.max(0, int(base.incidents)) },
    acquired: Array.isArray(x.acquired) ? RIVALS.map((r) => r.id).filter((id) => (x.acquired as unknown[]).includes(id)) : [],
  };
}

function quarterReport(x: unknown): QuarterReport | null {
  if (!isObj(x)) return null;
  return { quarter: Math.max(1, int(x.quarter, 1)), revenue: Math.max(0, num(x.revenue)), guidance: Math.max(0, num(x.guidance)), beat: x.beat === true, stock: Math.max(1, num(x.stock, 100)), at: num(x.at) };
}

function corp(x: unknown): CorpState {
  const d = newCorp();
  if (!isObj(x)) return d;
  return {
    ipoAt: Math.max(0, num(x.ipoAt)),
    endingSeen: x.endingSeen === true,
    quarter: Math.max(0, int(x.quarter)),
    elapsed: Math.max(0, Math.min(CORP.quarterMinutes * 60, num(x.elapsed))),
    revenue: Math.max(0, num(x.revenue)),
    guidance: Math.max(0, num(x.guidance)),
    cash: Math.max(0, num(x.cash)),
    stock: Math.max(1, num(x.stock, 100)),
    beats: Math.max(0, int(x.beats)),
    streak: Math.max(0, int(x.streak)),
    reports: Array.isArray(x.reports) ? x.reports.map(quarterReport).filter((r): r is QuarterReport => r !== null).slice(0, CORP.reportsKept) : [],
  };
}

const ISSUE_KINDS: readonly IssueKind[] = ['bug', 'feature', 'support'];

function issues(x: unknown): IssueState {
  const d = newIssues();
  if (!isObj(x)) return d;
  return {
    open: Array.isArray(x.open) ? x.open.filter((k): k is IssueKind => ISSUE_KINDS.includes(k as IssueKind)).slice(0, ISSUES.max) : [],
    nextAt: num(x.nextAt),
    reviewBoost: Math.max(0, Math.min(ISSUES.featureCap, num(x.reviewBoost))),
  };
}

const STACK_IDS: readonly LanguageId[] = STACKS.map((x) => x.id);

/** Per-challenge numbers within [lo, hi]. */
function perChallenge(x: unknown, lo: number, hi: number): Partial<Record<ChallengeId, number>> {
  const out: Partial<Record<ChallengeId, number>> = {};
  if (isObj(x)) for (const id of CHALLENGE_IDS) if (typeof x[id] === 'number' && Number.isFinite(x[id])) out[id] = Math.max(lo, Math.min(hi, Math.floor(x[id] as number)));
  return out;
}

function stats(x: unknown): Stats {
  const base = newStats();
  if (!isObj(x)) return base;
  for (const key of Object.keys(base) as (keyof Stats)[]) base[key] = Math.max(0, int(x[key]));
  return base;
}

function settings(x: unknown): Settings {
  const d = defaultSettings();
  if (!isObj(x)) return d;
  return {
    sound: x.sound === true,
    haptics: x.haptics !== false,
    reduceMotion: x.reduceMotion === true,
    notation: oneOf(x.notation, ['suffix', 'sci'] as const, d.notation),
    skin: oneOf(x.skin, ['pine', 'phosphor', 'amber', 'paper'] as const, d.skin),
    welcome: x.welcome !== false,
    screensaver: x.screensaver !== false,
    buyAmount: oneOf(x.buyAmount, [1, 10, 'max'] as const, 1),
    tab: oneOf(x.tab, TABS, 'upgrades'),
    dev: x.dev === true,
  };
}

/** True for a save written by a newer version of the game than this one: it must never be overwritten. */
export function isNewerSave(text: string): boolean {
  try {
    const data: unknown = JSON.parse(text);
    return isObj(data) && typeof data.v === 'number' && data.v > SAVE_VERSION;
  } catch {
    return false;
  }
}

function forks(x: unknown): Record<string, ForkId[]> {
  const out: Record<string, ForkId[]> = {};
  if (!isObj(x)) return out;
  for (const [id, list] of Object.entries(x)) if (Array.isArray(list)) out[id] = list.filter((f): f is ForkId => typeof f === 'string' && f in FORKS).slice(0, 400);
  return out;
}

function developer(x: unknown): Developer | null {
  if (!isObj(x) || typeof x.name !== 'string') return null;
  return { id: int(x.id), name: x.name.slice(0, 16), trait: oneOf(x.trait, TRAIT_IDS, 'generalist'), role: oneOf(x.role, ROLE_IDS, 'features'), face: Math.max(0, int(x.face)) };
}

function mailItem(x: unknown): MailItem | null {
  if (!isObj(x) || typeof x.id !== 'string' || !mailDef(x.id)) return null;
  const choice = x.choice === 0 || x.choice === 1 ? x.choice : null;
  return { key: str(x.key, `${x.id}@${num(x.at)}`), id: x.id, at: num(x.at), read: x.read === true, choice };
}

/** Taps per day, for the most recent days only. */
function activity(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(x)) return out;
  for (const [day, n] of Object.entries(x).slice(-STREAK.daysKept * 2)) if (/^\d{4}-\d\d-\d\d$/.test(day) && int(n) > 0) out[day] = int(n);
  return out;
}

/** Distinct strings that pass `valid`. */
const uniqueStrings = <T extends string>(x: unknown, valid: (s: string) => boolean): T[] =>
  Array.isArray(x) ? [...new Set(x.filter((s): s is T => typeof s === 'string' && valid(s)))] : [];

/** Parses a save, migrating old versions. Returns null for anything unreadable or from a newer version. */
export function deserialize(text: string, now: number): GameState | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(data) || typeof data.v !== 'number' || data.v > SAVE_VERSION) return null;
  let raw: Raw = data;
  for (let v = data.v; v < SAVE_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return null;
    raw = migrate(raw);
  }

  const base = newGame(now);
  const lifetime = dec(raw.lifetime, base.lifetime);
  const flags = isObj(raw.flags) ? raw.flags : {};
  const qb = isObj(raw.questBonus) ? raw.questBonus : {};
  const streak = isObj(raw.streak) ? raw.streak : {};
  const unlocked = isObj(raw.unlocked) ? raw.unlocked : {};
  const effects: Partial<Record<EffectId, number>> = {};
  if (isObj(raw.effects)) for (const [k, v] of Object.entries(raw.effects)) if (isEffect(k) && num(v) > 0) effects[k] = num(v);

  return {
    ...base,
    lines: dec(raw.lines, base.lines),
    lifetime,
    thisRelease: dec(raw.thisRelease, base.thisRelease),
    shipped: dec(raw.shipped, base.shipped),
    lastReleaseLines: dec(raw.lastReleaseLines, base.lastReleaseLines),
    releaseStartedAt: Math.max(-1, num(raw.releaseStartedAt, now)),
    releasePeak: Math.max(0, num(raw.releasePeak)),
    releaseLog: Array.isArray(raw.releaseLog) ? raw.releaseLog.map(releaseEntry).filter((r): r is ReleaseEntry => r !== null).slice(0, SHIP.logSize) : [],
    owned: counts(raw.owned),
    stars: Math.max(0, int(raw.stars)),
    starsSpent: Math.max(0, int(raw.starsSpent)),
    perks: counts(raw.perks, (k) => PERKS.some((p) => p.id === k)),
    release: Math.max(1, int(raw.release, 1)),
    major: Math.max(0, int(raw.major)),
    minor: Math.max(0, int(raw.minor)),
    xp: Math.max(0, int(raw.xp)),
    xpSpent: Math.max(0, int(raw.xpSpent)),
    banked: Math.max(0, num(raw.banked)),
    skills: counts(raw.skills, (k) => SKILLS.some((x) => x.id === k)),
    challenge: challenge(raw.challenge),
    challengesDone: Array.isArray(raw.challengesDone) ? CHALLENGE_IDS.filter((id) => (raw.challengesDone as unknown[]).includes(id)) : [],
    challengeLevels: perChallenge(raw.challengeLevels, 1, CHALLENGE.maxLevel),
    challengeBest: perChallenge(raw.challengeBest, 0, Number.MAX_SAFE_INTEGER),
    workflows: workflowFlags(raw.workflows),
    autoShipAt: oneOf(raw.autoShipAt, AUTOMATION.shipAtOptions, AUTOMATION.shipAtDefault),
    forkPolicy: oneOf(raw.forkPolicy, ['major', 'alt'] as const, 'alt'),
    preferredProject: PROJECTS.some((p) => p.id === raw.preferredProject) ? (raw.preferredProject as GameState['project']) : null,
    stack: oneOf(raw.stack, STACK_IDS, 'ts'),
    stacksUsed: uniqueStrings(raw.stacksUsed, (id) => (STACK_IDS as string[]).includes(id)),
    testBudget: oneOf(raw.testBudget, TESTS.budgets, 0),
    tests: dec(raw.tests, base.tests),
    written: dec(raw.written, base.written),
    issues: issues(raw.issues),
    corp: corp(raw.corp),
    createdAt: num(raw.createdAt, num(raw.savedAt, now)),
    market: market(raw.market, num(raw.savedAt, now)),
    achievements: Array.isArray(raw.achievements) ? raw.achievements.filter((a): a is string => typeof a === 'string') : [],
    flags: { crunch: flags.crunch === true, sudo: flags.sudo === true, rmrf: flags.rmrf === true, nightOwl: flags.nightOwl === true, exported: flags.exported === true, touchGrass: flags.touchGrass === true, bankrupt: flags.bankrupt === true },
    editorLine: Math.max(1, int(raw.editorLine, 1)),
    scripts: isObj(raw.scripts) ? counts(raw.scripts, isEffect) : base.scripts,
    effects,
    questBonus: { tap: num(qb.tap), auto: num(qb.auto), bug: num(qb.bug), sprint: num(qb.sprint) },
    quests: Array.isArray(raw.quests) ? raw.quests.map(quest).filter((q): q is Quest => q !== null) : [],
    nextQuestAt: num(raw.nextQuestAt),
    milestone: milestone(raw.milestone),
    stats: stats(raw.stats),
    sprint: activeSprint(raw.sprint),
    backlog: Array.isArray(raw.backlog) ? raw.backlog.map(ticket).filter((t): t is Ticket => t !== null) : [],
    lastSprint: sprintResult(raw.lastSprint),
    incident: null as Incident | null,
    streak: { lastDay: str(streak.lastDay), count: Math.max(0, int(streak.count)), days: Array.isArray(streak.days) ? streak.days.filter((d): d is string => typeof d === 'string') : [], activity: activity(streak.activity) },
    unlocked: {
      sprints: unlocked.sprints === true,
      todo: unlocked.todo === true,
      ship: unlocked.ship === true,
      team: unlocked.team === true || lifetime.gte(UNLOCKS.teamAtLifetime),
      mail: unlocked.mail === true || lifetime.gte(UNLOCKS.mailAtLifetime),
      major: unlocked.major === true,
      market: unlocked.market === true,
      tests: unlocked.tests === true,
      issues: unlocked.issues === true,
    },
    debt: Math.max(0, Math.min(100, num(raw.debt))),
    project: oneOf(raw.project, PROJECTS.map((p) => p.id), 'webapp'),
    projectsShipped: uniqueStrings(raw.projectsShipped, (id) => PROJECTS.some((p) => p.id === id)),
    forks: forks(raw.forks),
    team: Array.isArray(raw.team) ? raw.team.map(developer).filter((d): d is Developer => d !== null).slice(0, 12) : [],
    applicant: developer(raw.applicant),
    nextApplicantAt: num(raw.nextApplicantAt),
    nextDevId: Math.max(1, int(raw.nextDevId, 1)),
    boss: null,
    nextBossAt: num(raw.nextBossAt),
    bossKinds: uniqueStrings(raw.bossKinds, (k) => (BOSS_KINDS as string[]).includes(k)),
    round: Math.max(0, Math.min(FUNDING.maxRounds, int(raw.round))),
    equity: Math.max(0, int(raw.equity)),
    equitySpent: Math.max(0, int(raw.equitySpent)),
    company: counts(raw.company, (id) => COMPANY_PERKS.some((p) => p.id === id)),
    mail: Array.isArray(raw.mail) ? raw.mail.map(mailItem).filter((m): m is MailItem => m !== null) : [],
    nextMailAt: num(raw.nextMailAt),
    mailSeen: uniqueStrings(raw.mailSeen, (id) => !!mailDef(id)),
    manRead: uniqueStrings(raw.manRead, (id) => MAN_PAGES.some((p) => p.id === id)),
    settings: settings(raw.settings),
    savedAt: num(raw.savedAt, now),
  };
}
