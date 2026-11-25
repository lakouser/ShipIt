import { EFFECTS, SCRIPT_IDS, type EffectDef, type EffectId } from './content';
import type { Rng } from './rng';
import type { GameState } from './state';

export const effectActive = (s: GameState, id: EffectId, now: number): boolean => (s.effects[id] ?? 0) > now;

export const effectSecondsLeft = (s: GameState, id: EffectId, now: number): number => Math.max(0, ((s.effects[id] ?? 0) - now) / 1000);

export const activeEffects = (s: GameState, now: number): EffectId[] =>
  (Object.keys(s.effects) as EffectId[]).filter((id) => effectActive(s, id, now));

/** Product of one multiplier field across all active effects. */
export function effectProduct(s: GameState, field: 'tapMul' | 'autoMul' | 'allMul', now: number): number {
  let product = 1;
  for (const id of activeEffects(s, now)) product *= EFFECTS[id][field] ?? 1;
  return product;
}

export function effectSum(s: GameState, field: 'critChance' | 'autoTapsPerSecond', now: number): number {
  let sum = 0;
  for (const id of activeEffects(s, now)) sum += EFFECTS[id][field] ?? 0;
  return sum;
}

/** Starts an effect, or extends it if it is already running. */
export function applyEffect(s: GameState, id: EffectId, now: number): void {
  s.effects[id] = Math.max(now, s.effects[id] ?? 0) + EFFECTS[id].durationS * 1000;
}

export function grantScript(s: GameState, id: EffectId, count = 1): void {
  s.scripts[id] = (s.scripts[id] ?? 0) + count;
}

export const randomScript = (rng: Rng): EffectId => SCRIPT_IDS[Math.floor(rng() * SCRIPT_IDS.length)];

export function runScript(s: GameState, id: EffectId, now: number): EffectDef | null {
  if ((s.scripts[id] ?? 0) < 1 || !EFFECTS[id].file) return null;
  s.scripts[id]! -= 1;
  applyEffect(s, id, now);
  s.stats.scriptsRun++;
  return EFFECTS[id];
}

/** Removes finished effects and returns their ids. */
export function pruneEffects(s: GameState, now: number): EffectId[] {
  const ended: EffectId[] = [];
  for (const id of Object.keys(s.effects) as EffectId[]) {
    if ((s.effects[id] ?? 0) <= now) {
      delete s.effects[id];
      ended.push(id);
    }
  }
  return ended;
}
