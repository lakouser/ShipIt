import { AUTOMATION, ASSUMED_TAPS_PER_SECOND, PERKS, UPGRADES, WORKFLOWS, type EffectDef, type EffectId, type ForkPolicy, type PerkDef, type UpgradeKind, type WorkflowDef, type WorkflowId } from './content';
import { buy, chooseFork, costOf, forkOptions, isUpgradeVisible, upgradesWithForks, type Purchase } from './economy';
import { effectActive, runScript } from './effects';
import { challengeLevel } from './mods';
import { buyPerk, perkCost, perkLevel, perkStatus } from './perks';
import type { GameState } from './state';

/** Releases shipped over the whole game. */
export const releasesShipped = (s: GameState): number => s.stats.ships;

export const findWorkflow = (id: WorkflowId): WorkflowDef => WORKFLOWS.find((w) => w.id === id)!;

/** Earned by shipping enough releases, or by clearing its challenge once. */
export function workflowUnlocked(s: GameState, id: WorkflowId): boolean {
  const w = findWorkflow(id);
  return w.challenge ? challengeLevel(s, w.challenge) >= 1 : releasesShipped(s) >= (w.releases ?? Infinity);
}

/** Unlocked and not switched off. */
export const workflowOn = (s: GameState, id: WorkflowId): boolean => workflowUnlocked(s, id) && s.workflows[id] !== false;

/** Workflows earned by shipping that unlocked between two release counts (for announcing them after a ship). */
export const workflowsUnlockedBetween = (before: number, after: number): WorkflowDef[] =>
  WORKFLOWS.filter((w) => w.releases !== undefined && w.releases > before && w.releases <= after);

/** The workflow a challenge's first clear unlocks. */
export const workflowForChallenge = (id: string): WorkflowDef | undefined => WORKFLOWS.find((w) => w.challenge === id);

/** Releases shipped in all when the last workflow earned by shipping unlocks. */
export const lastShippingWorkflow = (): number => Math.max(...WORKFLOWS.map((w) => w.releases ?? 0));

/** forks.yml: picks every pending package upgrade by the player's policy. Returns how many it picked. */
export function autoForks(s: GameState): number {
  if (!workflowOn(s, 'forks')) return 0;
  let picked = 0;
  for (const u of upgradesWithForks(s)) {
    for (let guard = 0; guard < 400; guard++) {
      const options = forkOptions(s, u.id);
      if (!options) break;
      const choice = s.forkPolicy === 'major' ? options.find((f) => f.id === 'major') : options.find((f) => f.id !== 'major');
      if (!chooseFork(s, u.id, (choice ?? options[0]).id)) break;
      picked++;
    }
  }
  return picked;
}

export function setForkPolicy(s: GameState, policy: ForkPolicy): void {
  if (policy === 'major' || policy === 'alt') s.forkPolicy = policy;
}

/** dotfiles.yml: buys the cheapest dotfile the player can afford, again and again. Returns what it bought. */
export function autoDotfiles(s: GameState): { perk: PerkDef; level: number }[] {
  if (!workflowOn(s, 'dotfiles')) return [];
  const bought: { perk: PerkDef; level: number }[] = [];
  for (let guard = 0; guard < 50; guard++) {
    const cheapest = PERKS.filter((p) => perkStatus(s, p) === 'affordable').sort((a, b) => perkCost(a, perkLevel(s, a.id)) - perkCost(b, perkLevel(s, b.id)))[0];
    const result = cheapest && buyPerk(s, cheapest.id);
    if (!result) break;
    bought.push(result);
  }
  return bought;
}

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
