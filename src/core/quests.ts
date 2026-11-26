import { MILESTONE, QUESTS, SHIP, UPGRADES, packageName } from './content';
import { critChance, isUpgradeVisible, owned, totalOwned, typicalOutput } from './economy';
import { grantScript, randomScript } from './effects';
import { D, Decimal, fmt } from './num';
import type { Rng } from './rng';
import type { GameState, Milestone, MilestoneTaskKind, Quest, QuestReward } from './state';

interface Made {
  target: Decimal;
  baseline: Decimal;
  subject?: string;
}

interface QuestTemplate {
  id: string;
  available(s: GameState, now: number): boolean;
  make(s: GameState, now: number, rng: Rng): Made;
  /** Progress toward the target (already relative to the baseline where that applies). */
  progress(s: GameState, q: Quest): Decimal;
  text(q: Quest): string;
}

const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];
const plural = (n: string, one: string, many: string) => (n === '1' ? one : many);
const since = (value: number, q: Quest) => D(value).sub(q.baseline);

/** Rounds up to 1, 2 or 5 × a power of ten, so targets read cleanly. */
function niceCeil(x: Decimal): Decimal {
  if (x.lte(1)) return D(1);
  const exp = Math.floor(x.log10());
  const base = D(10).pow(exp);
  for (const step of [1, 2, 5, 10]) {
    const candidate = base.mul(step);
    if (candidate.gte(x)) return candidate;
  }
  return base.mul(10);
}

const scaleByRelease = (s: GameState, n: number) => Math.round(n * (1 + 0.25 * (s.release - 1)));

const TEMPLATES: readonly QuestTemplate[] = [
  {
    id: 'taps',
    available: () => true,
    make: (s, _n, rng) => ({ target: D(scaleByRelease(s, pick([100, 150, 200, 300], rng))), baseline: D(s.stats.taps) }),
    progress: (s, q) => since(s.stats.taps, q),
    text: (q) => `tap ${fmt(q.target)} times`,
  },
  {
    id: 'buy',
    available: () => true,
    make: (s, _n, rng) => ({ target: D(pick([5, 10, 15, 20], rng)), baseline: D(s.stats.purchases) }),
    progress: (s, q) => since(s.stats.purchases, q),
    text: (q) => `install ${q.target} packages`,
  },
  {
    id: 'own',
    available: (s) => UPGRADES.some((_, i) => isUpgradeVisible(s, i)),
    make: (s, _n, rng) => {
      const candidates = UPGRADES.filter((_, i) => isUpgradeVisible(s, i));
      const u = pick(candidates, rng);
      return { target: D(owned(s, u.id) + pick([3, 5, 8], rng)), baseline: D(0), subject: u.id };
    },
    progress: (s, q) => D(owned(s, q.subject ?? '')),
    text: (q) => `have ${q.target} × ${packageName(UPGRADES.find((u) => u.id === q.subject)?.name ?? q.subject ?? '')}`,
  },
  {
    id: 'lines',
    available: () => true,
    make: (s, now) => ({ target: niceCeil(typicalOutput(s, now, 300, 3).max(300)), baseline: s.lifetime }),
    progress: (s, q) => s.lifetime.sub(q.baseline),
    text: (q) => `write ${fmt(q.target)} lines`,
  },
  {
    id: 'sprints',
    available: (s) => s.unlocked.sprints,
    make: (s, _n, rng) => ({ target: D(pick([1, 2], rng)), baseline: D(s.stats.sprints) }),
    progress: (s, q) => since(s.stats.sprints, q),
    text: (q) => `merge ${q.target} ${plural(q.target, 'sprint', 'sprints')}`,
  },
  {
    id: 'bugs',
    available: (s) => s.lifetime.gte(100),
    make: (s, _n, rng) => ({ target: D(pick([1, 2, 3], rng)), baseline: D(s.stats.bugs) }),
    progress: (s, q) => since(s.stats.bugs, q),
    text: (q) => `squash ${q.target} ${plural(q.target, 'bug', 'bugs')}`,
  },
  {
    id: 'scripts',
    available: (s) => Object.values(s.scripts).some((n) => (n ?? 0) > 0),
    make: (s) => ({ target: D(1), baseline: D(s.stats.scriptsRun) }),
    progress: (s, q) => since(s.stats.scriptsRun, q),
    text: () => 'run a script from ~/bin',
  },
  {
    id: 'incidents',
    available: (s) => s.lifetime.gte(1000),
    make: (s) => ({ target: D(1), baseline: D(s.stats.coffees + s.stats.outagesFixed + s.stats.conflictsResolved) }),
    progress: (s, q) => since(s.stats.coffees + s.stats.outagesFixed + s.stats.conflictsResolved, q),
    text: () => 'grab a coffee, fix an outage or resolve a conflict',
  },
  {
    id: 'crits',
    available: (s, now) => critChance(s, now) > 0,
    make: (s, _n, rng) => ({ target: D(pick([3, 5, 10], rng)), baseline: D(s.stats.crits) }),
    progress: (s, q) => since(s.stats.crits, q),
    text: (q) => `land ${q.target} critical taps`,
  },
  {
    id: 'flow',
    available: (s) => s.stats.taps >= 50,
    make: (s) => ({ target: D(1), baseline: D(s.stats.flowMaxed) }),
    progress: (s, q) => since(s.stats.flowMaxed, q),
    text: () => 'reach full flow state',
  },
];

const template = (id: string) => TEMPLATES.find((t) => t.id === id);

export const questText = (q: Quest): string => template(q.template)?.text(q) ?? q.template;
export const questProgress = (s: GameState, q: Quest): Decimal => template(q.template)?.progress(s, q) ?? D(0);

function makeReward(s: GameState, rng: Rng): QuestReward {
  if (rng() < QUESTS.scriptRewardChance) return { kind: 'script', script: randomScript(rng) };
  const kinds: ('tap' | 'auto' | 'bug' | 'sprint')[] = ['tap', 'auto'];
  if (s.lifetime.gte(100)) kinds.push('bug');
  if (s.unlocked.sprints) kinds.push('sprint');
  const kind = pick(kinds, rng);
  return { kind, amount: QUESTS.rewards[kind] };
}

function makeQuest(s: GameState, now: number, rng: Rng): Quest | null {
  const taken = new Set(s.quests.map((q) => q.template));
  const options = TEMPLATES.filter((t) => !taken.has(t.id) && t.available(s, now));
  if (options.length === 0) return null;
  const t = pick(options, rng);
  const made = t.make(s, now, rng);
  return { template: t.id, target: made.target.toString(), baseline: made.baseline.toString(), subject: made.subject, reward: makeReward(s, rng) };
}

function applyReward(s: GameState, reward: QuestReward): void {
  if (reward.kind === 'script') grantScript(s, reward.script);
  else s.questBonus[reward.kind] += reward.amount;
}

/**
 * Completes finished tasks (applying their rewards) and refills the list one task at a time,
 * QUESTS.refillDelayS apart, up to QUESTS.active. Returns what was completed.
 */
export function updateQuests(s: GameState, now: number, rng: Rng): Quest[] {
  const done = s.quests.filter((q) => questProgress(s, q).gte(q.target));
  if (done.length) {
    for (const q of done) {
      applyReward(s, q.reward);
      s.stats.quests++;
    }
    s.quests = s.quests.filter((q) => !done.includes(q));
    s.nextQuestAt = Math.max(s.nextQuestAt, now + QUESTS.refillDelayS * 1000);
  }
  // A fresh list fills all at once; afterwards one task per delay.
  const fillAll = s.stats.quests === 0 && s.quests.length === 0;
  while (s.quests.length < QUESTS.active && (fillAll || now >= s.nextQuestAt)) {
    const q = makeQuest(s, now, rng);
    if (!q) break;
    s.quests.push(q);
    if (!fillAll) {
      s.nextQuestAt = now + QUESTS.refillDelayS * 1000;
      break;
    }
  }
  return done;
}

/* ---------- release milestone ---------- */

/**
 * The release milestone: beat this run's last release by half again, with enough packages and sprints.
 * Finishing it makes this release's ship pay MILESTONE.shipBonus more stars (at least `stars`).
 */
export function makeMilestone(s: GameState): Milestone {
  const r = s.release;
  return {
    release: r,
    stars: 1 + Math.floor(r / 3),
    done: false,
    tasks: [
      { kind: 'lines', target: niceCeil(Decimal.max(D(SHIP.linesPerStar).mul(8), s.lastReleaseLines.mul(MILESTONE.beatLast))).toString(), baseline: '0' },
      { kind: 'owned', target: String(30 + 10 * Math.min(r - 1, 30)), baseline: '0' },
      { kind: 'sprints', target: String(Math.min(2 + Math.floor(r / 2), 6)), baseline: String(s.stats.sprints) },
    ],
  };
}

/** Extra stars a finished milestone adds to a ship that pays `stars`. */
export const milestoneBonus = (s: GameState, stars: number): number =>
  s.milestone?.done ? Math.max(s.milestone.stars, Math.ceil(stars * MILESTONE.shipBonus)) : 0;

export function milestoneTaskProgress(s: GameState, task: Milestone['tasks'][number]): Decimal {
  const by: Record<MilestoneTaskKind, () => Decimal> = {
    lines: () => s.thisRelease,
    owned: () => D(totalOwned(s)),
    sprints: () => D(s.stats.sprints).sub(task.baseline),
  };
  return by[task.kind]();
}

export function milestoneTaskText(task: Milestone['tasks'][number]): string {
  if (task.kind === 'lines') return `write ${fmt(task.target)} lines this release`;
  if (task.kind === 'owned') return `have ${task.target} packages installed`;
  return `merge ${task.target} sprints`;
}

/** Marks the milestone done once every task is; its bonus is paid when the release ships. */
export function updateMilestone(s: GameState): Milestone | null {
  const m = s.milestone;
  if (!m || m.done) return null;
  if (!m.tasks.every((t) => milestoneTaskProgress(s, t).gte(t.target))) return null;
  m.done = true;
  s.stats.milestones++;
  return m;
}
