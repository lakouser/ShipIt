import { ASSUMED_TAPS_PER_SECOND, DEV_NAMES, ROLE_IDS, TEAM, TRAIT_IDS, type RoleId } from './content';
import { teamSlots, typicalOutput } from './economy';
import { Decimal } from './num';
import type { Rng } from './rng';
import type { Developer, GameState } from './state';

const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/** A new applicant with a name not on the team yet, a random trait and face. Everyone starts on features. */
function makeApplicant(s: GameState, rng: Rng): Developer {
  const taken = new Set(s.team.map((d) => d.name));
  const free = DEV_NAMES.filter((n) => !taken.has(n));
  return { id: s.nextDevId++, name: pick(free.length ? free : DEV_NAMES, rng), trait: pick(TRAIT_IDS, rng), role: 'features', face: Math.floor(rng() * 8) };
}

/** Brings in the next applicant when one is due. */
export function updateApplicant(s: GameState, now: number, rng: Rng): Developer | null {
  if (!s.unlocked.team || s.applicant || now < s.nextApplicantAt) return null;
  s.applicant = makeApplicant(s, rng);
  return s.applicant;
}

/** Seconds of typical output (at least TEAM.minHire), more for each developer already hired. */
export function hireCost(s: GameState, now: number): Decimal {
  return Decimal.max(TEAM.minHire, typicalOutput(s, now, TEAM.hireSeconds, ASSUMED_TAPS_PER_SECOND))
    .mul(1 + TEAM.hireStep * s.team.length)
    .ceil();
}

export const teamFull = (s: GameState): boolean => s.team.length >= teamSlots(s);

export function hire(s: GameState, now: number): { dev: Developer; cost: Decimal } | null {
  const dev = s.applicant;
  if (!dev || teamFull(s)) return null;
  const cost = hireCost(s, now);
  if (s.lines.lt(cost)) return null;
  s.lines = s.lines.sub(cost);
  s.team.push(dev);
  s.applicant = null;
  s.nextApplicantAt = now + TEAM.applicantGapS * 1000;
  s.stats.hires++;
  return { dev, cost };
}

/** Turns the applicant down; the next one comes later. */
export function passApplicant(s: GameState, now: number): boolean {
  if (!s.applicant) return false;
  s.applicant = null;
  s.nextApplicantAt = now + TEAM.applicantGapS * 1000;
  return true;
}

export function assignRole(s: GameState, id: number, role: RoleId): Developer | null {
  const dev = s.team.find((d) => d.id === id);
  if (!dev || !ROLE_IDS.includes(role) || dev.role === role) return null;
  dev.role = role;
  return dev;
}

export function letGo(s: GameState, id: number): Developer | null {
  const i = s.team.findIndex((d) => d.id === id);
  return i < 0 ? null : s.team.splice(i, 1)[0];
}
