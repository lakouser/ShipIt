import { ASSUMED_TAPS_PER_SECOND, DIFFICULTY_BANDS, SPRINT_TIERS, TICKET_TITLES } from './content';
import { addLines, perSecond, perTap } from './economy';
import { D, Decimal } from './num';
import type { ActiveSprint, GameState, SprintResult, Ticket } from './state';

export type Rng = () => number;
export type Difficulty = 'relaxed' | 'tight' | 'crunch';

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One fresh ticket per tier, sized to the player's current output. */
export function makeBacklog(s: GameState, now: number, rng: Rng): Ticket[] {
  const titles = shuffled(TICKET_TITLES, rng);
  const estimate = perSecond(s, now).add(perTap(s, now).mul(ASSUMED_TAPS_PER_SECOND));
  return SPRINT_TIERS.map((tier, i) => {
    const target = Decimal.max(50, estimate.mul(tier.durationS * tier.difficulty).div(10).ceil().mul(10));
    return {
      tier: i,
      id: `TKT-${100 + Math.floor(rng() * 900)}`,
      title: titles[i % titles.length],
      durationS: tier.durationS,
      target,
      reward: target.mul(tier.rewardMultiplier).round(),
    };
  });
}

/** Taps per second the player would need, on top of automation, to finish a ticket in time. 0 means automation alone is enough. */
export function requiredTapRate(s: GameState, t: Ticket, now: number): number {
  const remaining = t.target.sub(perSecond(s, now).mul(t.durationS));
  if (remaining.lte(0)) return 0;
  return remaining.div(perTap(s, now).mul(t.durationS)).toNumber();
}

export function difficultyOf(rate: number): Difficulty {
  if (rate <= DIFFICULTY_BANDS.relaxed) return 'relaxed';
  return rate <= DIFFICULTY_BANDS.tight ? 'tight' : 'crunch';
}

export function startSprint(s: GameState, slot: number, now: number): ActiveSprint | null {
  const t = s.backlog[slot];
  if (s.sprint || !t) return null;
  s.sprint = { ...t, slot, endsAt: now + t.durationS * 1000, progress: D(0) };
  s.lastSprint = null;
  return s.sprint;
}

/**
 * Ends the running sprint once it hits its target or runs out of time.
 * Missing a deadline only loses the bonus: lines written during the sprint were credited as they were written.
 */
export function resolveSprint(s: GameState, now: number, rng: Rng): SprintResult | null {
  const sp = s.sprint;
  if (!sp) return null;
  const ok = sp.progress.gte(sp.target);
  if (!ok && now < sp.endsAt) return null;

  s.sprint = null;
  const secondsLeft = Math.max(0, (sp.endsAt - now) / 1000);
  let boosted = false;
  if (ok) {
    addLines(s, sp.reward);
    s.sprintsMerged++;
    if (secondsLeft < 3) s.flags.crunch = true;
    const boost = SPRINT_TIERS[sp.tier]?.boost;
    if (boost) {
      s.boost = { multiplier: boost.multiplier, endsAt: now + boost.seconds * 1000 };
      boosted = true;
    }
  }
  const result: SprintResult = { ok, ticketId: sp.id, title: sp.title, progress: sp.progress, target: sp.target, reward: sp.reward, secondsLeft, boosted };
  s.lastSprint = result;
  s.backlog = makeBacklog(s, now, rng);
  return result;
}
