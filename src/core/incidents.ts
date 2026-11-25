import { ASSUMED_TAPS_PER_SECOND, INCIDENTS, type IncidentKind } from './content';
import { addLines, typicalOutput } from './economy';
import { applyEffect } from './effects';
import { Decimal } from './num';
import type { Rng } from './rng';
import type { GameState, Incident } from './state';

export type IncidentChange = { type: 'spawned'; incident: Incident } | { type: 'expired'; incident: Incident } | null;

function pickKind(rng: Rng): IncidentKind {
  const entries = Object.entries(INCIDENTS.weights) as [IncidentKind, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [kind, w] of entries) {
    roll -= w;
    if (roll < 0) return kind;
  }
  return entries[0][0];
}

function spawn(kind: IncidentKind, now: number, rng: Rng): Incident {
  if (kind === 'coffee') return { kind, expiresAt: now + INCIDENTS.coffee.lifetimeMs };
  if (kind === 'outage') return { kind, expiresAt: now + INCIDENTS.outage.lifetimeMs, taps: 0, needed: INCIDENTS.outage.taps };
  return { kind, expiresAt: now + INCIDENTS.conflict.lifetimeMs, correct: rng() < 0.5 ? 0 : 1 };
}

/** Expires the current incident, or starts a new one when due. Expiring never costs anything. */
export function updateIncident(s: GameState, now: number, rng: Rng, canSpawn: boolean, force?: IncidentKind): IncidentChange {
  if (s.incident) {
    if (now < s.incident.expiresAt) return null;
    const incident = s.incident;
    s.incident = null;
    return { type: 'expired', incident };
  }
  if (!force && (!canSpawn || now < s.nextIncidentAt)) return null;
  s.nextIncidentAt = now + INCIDENTS.minGapMs + rng() * INCIDENTS.extraGapMs;
  s.incident = spawn(force ?? pickKind(rng), now, rng);
  return { type: 'spawned', incident: s.incident };
}

/** Reward for fixing an outage or resolving a conflict: seconds of typical output. */
export function incidentReward(s: GameState, now: number, seconds: number): Decimal {
  return Decimal.max(50, typicalOutput(s, now, seconds, ASSUMED_TAPS_PER_SECOND)).floor();
}

export function catchCoffee(s: GameState, now: number): boolean {
  if (s.incident?.kind !== 'coffee') return false;
  s.incident = null;
  applyEffect(s, 'coffee', now);
  s.stats.coffees++;
  return true;
}

/** Counts a tap toward fixing an outage. Returns the reward when the fix lands. */
export function outageTap(s: GameState, now: number): Decimal | null {
  const inc = s.incident;
  if (inc?.kind !== 'outage') return null;
  inc.taps++;
  if (inc.taps < inc.needed) return null;
  s.incident = null;
  s.stats.outagesFixed++;
  const reward = incidentReward(s, now, INCIDENTS.outage.rewardSeconds);
  addLines(s, reward);
  return reward;
}

/** Picks a side of the merge conflict. Wrong picks just end the incident. */
export function chooseConflict(s: GameState, side: 0 | 1, now: number): { ok: boolean; reward: Decimal | null } | null {
  const inc = s.incident;
  if (inc?.kind !== 'conflict') return null;
  s.incident = null;
  if (side !== inc.correct) return { ok: false, reward: null };
  s.stats.conflictsResolved++;
  const reward = incidentReward(s, now, INCIDENTS.conflict.rewardSeconds);
  addLines(s, reward);
  return { ok: true, reward };
}
