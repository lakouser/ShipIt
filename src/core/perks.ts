import { CHALLENGES, PERKS, type PerkDef } from './content';
import type { GameState } from './state';

/** Levels bought (for prices, caps and the dotfiles tree). */
export const perkLevel = (s: GameState, id: string): number => s.perks[id] ?? 0;

/** False during a challenge that switches dotfiles off (Clean install). */
export const dotfilesActive = (s: GameState): boolean =>
  !s.challenge || CHALLENGES.find((c) => c.id === s.challenge!.id)?.mods.dotfiles !== false;

/** The level that counts for a perk's effect: 0 while dotfiles are switched off. */
export const perkEffect = (s: GameState, id: string): number => (dotfilesActive(s) ? perkLevel(s, id) : 0);

export const findPerk = (id: string): PerkDef | undefined => PERKS.find((p) => p.id === id);

/** Stars not yet spent on dotfiles. */
export const spendableStars = (s: GameState): number => s.stars - s.starsSpent;

export const perkCost = (p: Pick<PerkDef, 'baseCost' | 'costStep' | 'costGrowth'>, level: number): number =>
  p.costGrowth ? Math.round(p.baseCost * p.costGrowth ** level) : p.baseCost + p.costStep * level;

export type PerkStatus = 'maxed' | 'locked' | 'affordable' | 'expensive';

export function perkStatus(s: GameState, p: PerkDef): PerkStatus {
  const level = perkLevel(s, p.id);
  if (level >= p.maxLevel) return 'maxed';
  if (p.requires && perkLevel(s, p.requires.id) < p.requires.level) return 'locked';
  return spendableStars(s) >= perkCost(p, level) ? 'affordable' : 'expensive';
}

export function buyPerk(s: GameState, id: string): { perk: PerkDef; level: number } | null {
  const p = findPerk(id);
  if (!p || perkStatus(s, p) !== 'affordable') return null;
  const level = perkLevel(s, id);
  s.starsSpent += perkCost(p, level);
  s.perks[id] = level + 1;
  s.stats.perksBought++;
  return { perk: p, level: level + 1 };
}
