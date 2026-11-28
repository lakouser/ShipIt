import { RULE_ACTIONS, RULE_TRIGGERS, RULES, type RuleAction, type RuleTrigger } from './content';
import { quarterLeft } from './corp';
import { activeEffects, effectActive } from './effects';
import { skillLevel } from './mods';
import { shipReady } from './ship';
import type { GameState, Rule } from './state';

/*
 * ~/bin/rules: "when X, do Y". Each rule fires once, at the moment its condition becomes true (not for as long as it
 * stays true), and does nothing if its action can't run just then. The Game runs the actions, so they make the same
 * events as doing them by hand.
 */

/** Rules open at the Series C round. */
export const rulesUnlocked = (s: GameState): boolean => s.round >= RULES.unlockRound;

/** Rules the player can write: a couple to start, more with the shell scripting skill. */
export const ruleSlots = (s: GameState): number => (rulesUnlocked(s) ? RULES.baseSlots + skillLevel(s, 'shell') : 0);

export const isTrigger = (x: unknown): x is RuleTrigger => RULE_TRIGGERS.some((t) => t.id === x);
export const isAction = (x: unknown): x is RuleAction => RULE_ACTIONS.some((a) => a.id === x);

export const triggerLabel = (id: RuleTrigger): string => RULE_TRIGGERS.find((t) => t.id === id)?.label ?? id;
export const actionLabel = (id: RuleAction): string => RULE_ACTIONS.find((a) => a.id === id)?.label ?? id;

/** Adds a rule (flow is full → sudo.sh, to start from) if there is a free slot. */
export function addRule(s: GameState): Rule | null {
  if (s.rules.length >= ruleSlots(s)) return null;
  const rule: Rule = { when: 'flow', then: 'sudo', on: true };
  s.rules.push(rule);
  return rule;
}

export function setRule(s: GameState, index: number, patch: Partial<Rule>): boolean {
  const rule = s.rules[index];
  if (!rule) return false;
  if (patch.when !== undefined && isTrigger(patch.when)) rule.when = patch.when;
  if (patch.then !== undefined && isAction(patch.then)) rule.then = patch.then;
  if (patch.on !== undefined) rule.on = !!patch.on;
  return true;
}

export function removeRule(s: GameState, index: number): boolean {
  if (!s.rules[index]) return false;
  s.rules.splice(index, 1);
  return true;
}

/** Whether each condition holds right now. `flow` is the flow meter, 0–1 (it isn't part of the saved state). */
export function triggerStates(s: GameState, now: number, flow: number): Record<RuleTrigger, boolean> {
  return {
    flow: flow >= 1,
    sprint: !!s.sprint,
    coffee: effectActive(s, 'coffee', now),
    boss: s.boss?.phase === 'fight',
    outage: s.incident?.kind === 'outage',
    launch: !!s.market.launch,
    ready: shipReady(s),
    debt: s.debt >= RULES.debtAt,
    issues: s.issues.open.length >= RULES.issuesAt,
    quarter: s.corp.ipoAt > 0 && quarterLeft(s) <= RULES.quarterLeftS,
    idle: activeEffects(s, now).every((id) => id === 'coffee'),
  };
}
