import { STACKS, type LanguageId, type StackDef } from './content';
import type { GameState } from './state';

/*
 * The stack: the language a run is written in, each with its own trade-off (see STACKS). The first run is TypeScript.
 * A funding round or a major version starts a new run, and the player picks its stack then, with the rules in view;
 * within a run it doesn't change.
 */

/** Haskell opens with the first major version, COBOL with the purchase of Legacy Systems Inc; the rest are always open. */
export function stackUnlocked(s: GameState, st: StackDef): boolean {
  if (st.id === 'hs') return s.stats.majors >= 1 || s.major >= 1;
  if (st.id === 'cob') return s.market.acquired.includes('legacy');
  return true;
}

export const findStack = (id: LanguageId): StackDef | undefined => STACKS.find((x) => x.id === id);

/** The stack a new run will use: the one asked for if it's open, otherwise the current one. */
export function pickStack(s: GameState, id?: LanguageId): LanguageId {
  const st = id ? findStack(id) : undefined;
  return st && stackUnlocked(s, st) ? st.id : s.stack;
}

/** Starts a run in a stack (call after the reset). */
export function useStack(s: GameState, id: LanguageId): void {
  s.stack = id;
  if (!s.stacksUsed.includes(id)) s.stacksUsed.push(id);
}
