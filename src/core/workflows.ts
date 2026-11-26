import { AUTOMATION, ASSUMED_TAPS_PER_SECOND, UPGRADES, WORKFLOWS, type EffectDef, type EffectId, type UpgradeKind, type WorkflowDef, type WorkflowId } from './content';
import { buy, costOf, isUpgradeVisible, type Purchase } from './economy';
import { effectActive, runScript } from './effects';
import type { GameState } from './state';

/** Releases shipped over the whole game. */
export const releasesShipped = (s: GameState): number => s.stats.ships;

export const findWorkflow = (id: WorkflowId): WorkflowDef => WORKFLOWS.find((w) => w.id === id)!;

export const workflowUnlocked = (s: GameState, id: WorkflowId): boolean => releasesShipped(s) >= findWorkflow(id).releases;

/** Unlocked and not switched off. */
export const workflowOn = (s: GameState, id: WorkflowId): boolean => workflowUnlocked(s, id) && s.workflows[id] !== false;

/** Workflows that unlocked between two release counts (for announcing them after a ship). */
export const workflowsUnlockedBetween = (before: number, after: number): WorkflowDef[] =>
  WORKFLOWS.filter((w) => w.releases > before && w.releases <= after);

/**
 * deps.yml and dev-deps.yml: install the best-value affordable package, one copy at a time,
 * up to AUTOMATION.installsPerTick. Typing output is valued at the sprint planner's assumed tap rate.
 * Returns the purchases that made a fork due; the rest happen quietly.
 */
export function autoInstall(s: GameState): { count: number; forks: Purchase[] } {
  const kinds = new Set<UpgradeKind>();
  if (workflowOn(s, 'deps')) kinds.add('auto');
  if (workflowOn(s, 'devdeps')) kinds.add('tap');
  const forks: Purchase[] = [];
  let count = 0;
  if (kinds.size === 0) return { count, forks };
  for (; count < AUTOMATION.installsPerTick; count++) {
    let best: { id: string; value: number } | null = null;
    UPGRADES.forEach((u, i) => {
      if (!kinds.has(u.kind) || !isUpgradeVisible(s, i)) return;
      const cost = costOf(s, u, 1);
      if (s.lines.lt(cost)) return;
      const value = (u.output * (u.kind === 'tap' ? ASSUMED_TAPS_PER_SECOND : 1)) / cost.toNumber();
      if (!best || value > best.value) best = { id: u.id, value };
    });
    if (!best) break;
    const purchase = buy(s, (best as { id: string }).id, 1);
    if (!purchase) break;
    if (purchase.upgradeAt) forks.push(purchase);
  }
  return { count, forks };
}

/** scripts.yml: runs each held script whose effect isn't already running. */
export function autoRunScripts(s: GameState, now: number): EffectDef[] {
  if (!workflowOn(s, 'scripts')) return [];
  const ran: EffectDef[] = [];
  for (const [id, n] of Object.entries(s.scripts) as [EffectId, number][]) {
    if (n > 0 && !effectActive(s, id, now)) {
      const effect = runScript(s, id, now);
      if (effect) ran.push(effect);
    }
  }
  return ran;
}
