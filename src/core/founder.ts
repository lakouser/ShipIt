import { FOUNDER, FOUNDER_TRAITS, type FounderTraitDef, type FounderTraitId, type Mods } from './content';
import { newGame, type GameState } from './state';

/*
 * The true ending and what comes after. Buying the last rival (past an antitrust hearing) leaves the chart a list of
 * one: a monopoly. From there the founder can sell up and start a new company, keeping what they are (trophies, the
 * RFCs they adopted, their record) and picking a trait; everything the company was starts over.
 */

export const findTrait = (id: FounderTraitId): FounderTraitDef | undefined => FOUNDER_TRAITS.find((t) => t.id === id);

/** A new company can be founded once this one owns the chart. */
export const canFound = (s: GameState): boolean => s.corp.monopolyAt > 0;

/** What the founder brings: each trait picked so far, and FOUNDER.exitMul to all output for every company sold. */
export function founderParts(s: GameState): Partial<Mods>[] {
  const parts: Partial<Mods>[] = [];
  for (const id of s.founder.traits) {
    const t = findTrait(id);
    if (t) parts.push(t.mods);
  }
  if (s.founder.exits > 0) parts.push({ allMul: FOUNDER.exitMul ** s.founder.exits });
  return parts;
}

/**
 * Sells the company and starts again from an empty editor. Kept: trophies, the stats behind them (so workflows earned
 * by shipping stay earned), adopted RFCs and the one under discussion, the story already read, the streak, settings
 * and the founder's traits. Everything else is a new game.
 */
export function foundStartup(s: GameState, trait: FounderTraitId, now: number): FounderTraitDef | null {
  const def = findTrait(trait);
  if (!def || !canFound(s)) return null;
  const kept: Partial<GameState> = {
    achievements: s.achievements,
    flags: s.flags,
    stats: s.stats,
    rfc: s.rfc,
    mailSeen: s.mailSeen,
    manRead: s.manRead,
    streak: s.streak,
    settings: { ...s.settings, tab: 'upgrades' },
    founder: { exits: s.founder.exits + 1, traits: [...s.founder.traits, trait] },
  };
  const fresh = newGame(now);
  for (const key of Object.keys(s) as (keyof GameState)[]) delete s[key];
  Object.assign(s, fresh, kept);
  // The stats carry over, so the first release's review has to count from where they stand now.
  const st = s.stats;
  s.market.base = { sprints: st.sprints, bugs: st.bugs, escaped: st.bugsEscaped, incidents: st.coffees + st.outagesFixed + st.conflictsResolved };
  return def;
}
