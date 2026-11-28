import { ASSUMED_TAPS_PER_SECOND, BOSS, BOSS_KINDS, BOSSES, DEBT, RFC, TEAM, type BossKind, type BossStage, type EffectId } from './content';
import { addDebt } from './debt';
import { addLines, devrelMultiplier, roleStrength, typicalOutput } from './economy';
import { grantScript, randomScript } from './effects';
import { Decimal } from './num';
import { rfcDone } from './rfcs';
import type { Rng } from './rng';
import type { Boss, GameState } from './state';

export type BossChange =
  | { type: 'incoming'; boss: Boss }
  | { type: 'ignored'; kind: BossKind }
  | { type: 'failed'; kind: BossKind; stage: number }
  | { type: 'stage'; kind: BossKind; stage: number; reward: Decimal }
  | { type: 'won'; kind: BossKind; reward: Decimal; scripts: EffectId[] }
  | null;

export const currentStage = (b: Boss): BossStage | undefined => BOSSES[b.kind].stages[b.stage];

/** Seconds a stage gives (half as much again with incident runbooks). */
export const stageSeconds = (s: GameState, stage: BossStage): number => stage.seconds * (rfcDone(s, 'runbooks') ? RFC.timeBonus : 1);

/** Sets up a stage: taps needed for a mash (fewer with people on call), or the right option for a pick. */
function startStage(s: GameState, b: Boss, stage: number, now: number, rng: Rng): void {
  const def = BOSSES[b.kind].stages[stage];
  b.stage = stage;
  b.taps = 0;
  b.endsAt = now + stageSeconds(s, def) * 1000;
  if (def.type === 'mash') {
    const cut = Math.min(TEAM.oncallCap, TEAM.oncallTaps * roleStrength(s, 'oncall'));
    b.needed = Math.max(1, Math.round(def.taps * (1 - cut)));
  } else {
    b.needed = 0;
    b.correct = Math.floor(rng() * def.options);
    b.variant = Math.floor(rng() * 1000);
  }
}

/** Seconds of typical output, at least 100 lines, raised by devrel. */
function bossReward(s: GameState, now: number, seconds: number): Decimal {
  return Decimal.max(100, typicalOutput(s, now, seconds, ASSUMED_TAPS_PER_SECOND)).mul(devrelMultiplier(s)).floor();
}

function fail(s: GameState, b: Boss): BossChange {
  s.boss = null;
  s.stats.bossesFailed++;
  // Blameless postmortems: a lost fight costs nothing.
  if (!rfcDone(s, 'postmortems')) addDebt(s, DEBT.bossFailed);
  return { type: 'failed', kind: b.kind, stage: b.stage };
}

/**
 * Times out the warning (ignored, no cost) or a stage (failed, adds debt), or announces the next boss when
 * it is due. Bosses wait for a quiet moment: none while an incident is on.
 */
export function updateBoss(s: GameState, now: number, rng: Rng, canSpawn: boolean, force?: BossKind): BossChange {
  const b = s.boss;
  if (b && !force) {
    if (now < b.endsAt) return null;
    if (b.phase === 'incoming') {
      s.boss = null;
      return { type: 'ignored', kind: b.kind };
    }
    return fail(s, b);
  }
  if (!force) {
    if (!canSpawn || s.incident || !s.lifetime.gte(BOSS.firstAtLifetime)) return null;
    if (s.nextBossAt <= 0) s.nextBossAt = now + BOSS.firstDelayMs;
    if (now < s.nextBossAt) return null;
  }
  s.nextBossAt = now + BOSS.minGapMs + rng() * BOSS.extraGapMs;
  s.boss = { kind: force ?? BOSS_KINDS[Math.floor(rng() * BOSS_KINDS.length)], phase: 'incoming', stage: 0, endsAt: now + BOSS.incomingMs, taps: 0, needed: 0, correct: 0, variant: 0 };
  return { type: 'incoming', boss: s.boss };
}

/** Starts a fight at once, with no warning to answer (the antitrust hearing). Whatever else was going on is cleared. */
export function summonBoss(s: GameState, kind: BossKind, now: number, rng: Rng): Boss {
  s.incident = null;
  s.boss = { kind, phase: 'fight', stage: 0, endsAt: now, taps: 0, needed: 0, correct: 0, variant: 0 };
  startStage(s, s.boss, 0, now, rng);
  return s.boss;
}

/** Takes on an announced boss: the first stage starts. */
export function engageBoss(s: GameState, now: number, rng: Rng): Boss | null {
  const b = s.boss;
  if (!b || b.phase !== 'incoming') return null;
  b.phase = 'fight';
  startStage(s, b, 0, now, rng);
  return b;
}

function clearStage(s: GameState, b: Boss, now: number, rng: Rng): BossChange {
  const def = BOSSES[b.kind];
  if (b.stage + 1 < def.stages.length) {
    const reward = bossReward(s, now, BOSS.stageRewardSeconds);
    addLines(s, reward);
    const stage = b.stage;
    startStage(s, b, b.stage + 1, now, rng);
    return { type: 'stage', kind: b.kind, stage, reward };
  }
  s.boss = null;
  const reward = bossReward(s, now, BOSS.rewardSeconds).mul(rfcDone(s, 'postmortems') ? RFC.bossWinMul : 1);
  addLines(s, reward);
  const scripts: EffectId[] = [];
  for (let i = 0; i < BOSS.scripts; i++) {
    const id = randomScript(rng);
    grantScript(s, id);
    scripts.push(id);
  }
  addDebt(s, DEBT.bossBeaten);
  s.stats.bossesBeaten++;
  if (b.kind !== 'antitrust' && !s.bossKinds.includes(b.kind)) s.bossKinds.push(b.kind);
  return { type: 'won', kind: b.kind, reward, scripts };
}

/** A tap during a mash stage. */
export function bossTap(s: GameState, now: number, rng: Rng): BossChange {
  const b = s.boss;
  if (!b || b.phase !== 'fight' || currentStage(b)?.type !== 'mash') return null;
  b.taps++;
  return b.taps >= b.needed ? clearStage(s, b, now, rng) : null;
}

/** An answer during a pick stage: the wrong one fails the fight. */
export function bossPick(s: GameState, choice: number, now: number, rng: Rng): BossChange {
  const b = s.boss;
  if (!b || b.phase !== 'fight' || currentStage(b)?.type !== 'pick') return null;
  return choice === b.correct ? clearStage(s, b, now, rng) : fail(s, b);
}
