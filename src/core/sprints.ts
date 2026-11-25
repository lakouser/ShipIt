import { ASSUMED_TAPS_PER_SECOND, DIFFICULTY_BANDS, PERK_VALUES, SPRINT_TIERS, TICKET_TITLES } from './content';
import { addLines, perSecond, perTap, typicalOutput } from './economy';
import { grantScript, randomScript } from './effects';
import { D, Decimal } from './num';
import { perkLevel } from './perks';
import type { Rng } from './rng';
import type { ActiveSprint, GameState, SprintResult, Ticket } from './state';

export type { Rng } from './rng';
export type Difficulty = 'relaxed' | 'tight' | 'crunch';

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A fresh ticket for one tier, sized to the player's current output. Perks add time and reward. */
function makeTicket(s: GameState, tierIndex: number, now: number, rng: Rng, title: string): Ticket {
  const tier = SPRINT_TIERS[tierIndex];
  const timeBonus = 1 + PERK_VALUES.timeoutsBonus * perkLevel(s, 'timeouts');
  const rewardBonus = (1 + PERK_VALUES.retroReward * perkLevel(s, 'retro')) * (1 + s.questBonus.sprint);
  const target = Decimal.max(50, typicalOutput(s, now, tier.durationS * tier.difficulty, ASSUMED_TAPS_PER_SECOND).div(10).ceil().mul(10));
  return {
    tier: tierIndex,
    id: `TKT-${100 + Math.floor(rng() * 900)}`,
    title,
    durationS: Math.round(tier.durationS * timeBonus),
    target,
    reward: target.mul(tier.rewardMultiplier * rewardBonus).round(),
    readyAt: 0,
  };
}

/** One fresh ticket per tier. Pass the old backlog to keep each slot's standup cooldown. */
export function makeBacklog(s: GameState, now: number, rng: Rng, keepCooldowns?: Ticket[]): Ticket[] {
  const titles = shuffled(TICKET_TITLES, rng);
  return SPRINT_TIERS.map((_, i) => ({ ...makeTicket(s, i, now, rng, titles[i % titles.length]), readyAt: keepCooldowns?.[i]?.readyAt ?? 0 }));
}

/** Replaces tickets whose standup cooldown has passed with fresh ones sized to current output. */
export function refreshBacklog(s: GameState, now: number, rng: Rng): number[] {
  const refreshed: number[] = [];
  s.backlog.forEach((t, i) => {
    if (t.readyAt > 0 && now >= t.readyAt) {
      const used = new Set(s.backlog.map((x) => x.title));
      const title = shuffled(TICKET_TITLES.filter((x) => !used.has(x)), rng)[0] ?? t.title;
      s.backlog[i] = makeTicket(s, t.tier, now, rng, title);
      refreshed.push(i);
    }
  });
  return refreshed;
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
  if (s.sprint || !t || t.readyAt > now) return null;
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
  let script: SprintResult['script'] = null;
  if (ok) {
    addLines(s, sp.reward);
    s.stats.sprints++;
    if (secondsLeft < 3) s.flags.crunch = true;
    if (rng() < (SPRINT_TIERS[sp.tier]?.scriptChance ?? 0)) {
      script = randomScript(rng);
      grantScript(s, script);
    }
  }
  const result: SprintResult = { ok, ticketId: sp.id, title: sp.title, progress: sp.progress, target: sp.target, reward: sp.reward, secondsLeft, script };
  s.lastSprint = result;
  // The slot waits for the next standup; refreshBacklog fills it in later.
  const tier = SPRINT_TIERS[sp.tier] ?? SPRINT_TIERS[0];
  s.backlog[sp.slot] = { ...sp, readyAt: now + tier.cooldownS * 1000 };
  return result;
}
