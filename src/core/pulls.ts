import { PULLS, PULLS_DEFS, type EffectId, type PullDef, type PullId } from './content';
import { addDebt, debtVisible } from './debt';
import { addLines, perSecond, perTap } from './economy';
import { grantScript, randomScript } from './effects';
import { Decimal } from './num';
import { rfcDone } from './rfcs';
import type { Rng } from './rng';
import type { GameState, PullsState } from './state';

/*
 * Pull requests: after time away, contributors have opened a few, and the player merges one. Longer absences bring
 * better ones. They wait (in co/mail and on the welcome-back screen) until one is merged.
 */

export const findPull = (id: PullId): PullDef => PULLS_DEFS.find((p) => p.id === id) ?? PULLS_DEFS[0];

/** 1–3 by how long the player was away. */
export const pullTier = (awaySeconds: number): number => 1 + PULLS.tierSeconds.filter((t) => awaySeconds >= t).length;

/** Opens pull requests after enough time away. Ones already waiting are kept unless the new batch is better. */
export function openPulls(s: GameState, awaySeconds: number, now: number, rng: Rng): PullsState | null {
  if (awaySeconds < PULLS.minAwayS || !s.market.startedAt) return null;
  const tier = pullTier(awaySeconds);
  if (s.pulls && s.pulls.tier >= tier) return null;
  const pool: PullId[] = ['perf', 'deps', 'docs'];
  if (debtVisible(s) && s.debt >= 10) pool.push('refactor');
  if (s.stars > 0) pool.push('feat');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const count = PULLS.options + (rfcDone(s, 'oss') ? 1 : 0);
  const options = pool.slice(0, count);
  // The rare one: a stranger's rewrite takes the last place.
  if (tier >= 2 && s.contribBonus < PULLS.coreCap && rng() < PULLS.coreChance) options[options.length - 1] = 'core';
  void now;
  s.pulls = { options, tier };
  return s.pulls;
}

export interface PullReward {
  lines?: Decimal;
  scripts?: number;
  debt?: number;
  users?: number;
  stars?: number;
  bonus?: number;
}

/** What merging a pull request would do right now. */
export function pullReward(s: GameState, id: PullId, tier: number, now: number): PullReward {
  switch (id) {
    case 'perf':
      return { lines: Decimal.max(500 * tier, Decimal.max(perSecond(s, now).mul(PULLS.perfMinutes * 60 * tier), perTap(s, now).mul(200 * tier))).floor() };
    case 'deps':
      return { scripts: 1 + tier };
    case 'refactor':
      return { debt: -Math.min(s.debt, PULLS.refactorDebt * tier) };
    case 'docs':
      return { users: Math.max(10 * tier, Math.floor(s.market.users * PULLS.docsUsers * tier)) };
    case 'feat':
      return { stars: Math.max(1, Math.ceil(s.stars * PULLS.featStars * tier)) };
    case 'core':
      return { bonus: Math.min(PULLS.coreBonus, PULLS.coreCap - s.contribBonus) };
  }
}

export interface PullResult {
  pull: PullDef;
  reward: PullReward;
  scripts: EffectId[];
}

/** Merges one of the waiting pull requests; the others are closed. */
export function mergePull(s: GameState, index: number, now: number, rng: Rng): PullResult | null {
  const id = s.pulls?.options[index];
  if (!s.pulls || !id) return null;
  const reward = pullReward(s, id, s.pulls.tier, now);
  const scripts: EffectId[] = [];
  if (reward.lines) addLines(s, reward.lines);
  for (let i = 0; i < (reward.scripts ?? 0); i++) {
    const script = randomScript(rng);
    grantScript(s, script);
    scripts.push(script);
  }
  if (reward.debt) addDebt(s, reward.debt);
  if (reward.users) {
    s.market.users += reward.users;
    s.market.peak = Math.max(s.market.peak, s.market.users);
  }
  if (reward.stars) {
    s.stars += reward.stars;
    s.stats.starsEarned += reward.stars;
  }
  if (reward.bonus) s.contribBonus = Math.min(PULLS.coreCap, s.contribBonus + reward.bonus);
  s.pulls = null;
  s.stats.pullsMerged++;
  return { pull: findPull(id), reward, scripts };
}
