import { AUTOMATION, COMPANY_PERKS, PERKS, SKILLS, UPGRADES, type EffectId } from '../src/core/content';
import { canRaise, companyPerkStatus } from '../src/core/funding';
import { skillStatus, xpAvailable } from '../src/core/major';
import { standing, usersNow } from '../src/core/market';
import { costOf, isUpgradeVisible, owned, perSecond, perTap } from '../src/core/economy';
import { Game } from '../src/core/game';
import { D, fmt } from '../src/core/num';
import { perkStatus } from '../src/core/perks';
import { seededRng } from '../src/core/rng';
import { starsAvailable } from '../src/core/ship';
import { difficultyOf, requiredTapRate } from '../src/core/sprints';
import { newGame } from '../src/core/state';

/** When the bot ships. */
export type ShipPolicy =
  /** Once a release would grow stars by this fraction (how a patient player plays; the default, at 0.75). */
  | { kind: 'gain'; fraction: number }
  /** On a timer, whatever the release pays (as soon as it can, if it can't yet when the timer is up). */
  | { kind: 'every'; minutes: number }
  /** The moment any star is available. */
  | { kind: 'asap' };

export interface SimOptions {
  minutes: number;
  tapsPerSecond: number;
  seed?: number;
  ship?: ShipPolicy;
  /** Raise funding rounds as soon as they're open, and cut major versions when they'd grow XP by half (default true). */
  resets?: boolean;
}

export interface SimReport {
  ships: { minute: number; release: number; stars: number }[];
  raises: { minute: number; round: number }[];
  majors: { minute: number; version: string; xp: number }[];
  finalStars: number;
  unlocks: Record<string, number>;
  finalPerSecond: string;
  finalPerTap: string;
  lifetime: string;
  achievements: number;
  quests: number;
  milestones: number;
  topUpgrade: string;
  perks: Record<string, number>;
  /** top: the latest package tier owned at that point. */
  timeline: { minute: number; lines: string; perSecond: string; perTap: string; release: number; stars: number; top: string; users: number; rank: number }[];
}

/**
 * A bot that plays like a reasonably attentive player: taps steadily, buys the best-value
 * package, runs relaxed sprints, squashes most bugs, grabs incidents, runs scripts at once,
 * ships when the payoff is worth it and spends stars on the cheapest perk.
 */
export function simulate({ minutes, tapsPerSecond, seed = 7, ship = { kind: 'gain', fraction: 0.75 }, resets = true }: SimOptions): SimReport {
  let now = 0;
  const rng = seededRng(seed);
  const botRng = seededRng(seed + 1000);
  const game = new Game(newGame(now), { clock: () => now, rng });
  const s = game.state;
  const topOwned = () => [...UPGRADES].reverse().find((u) => owned(s, u.id) > 0)?.id ?? 'none';
  let lastShipAt = 0;
  const report: SimReport = { ships: [], raises: [], majors: [], finalStars: 0, unlocks: {}, finalPerSecond: '', finalPerTap: '', lifetime: '', achievements: 0, quests: 0, milestones: 0, topUpgrade: '', perks: {}, timeline: [] };
  // release.yml follows the bot's own policy, so it can't ship on a schedule the policy wouldn't.
  if (ship.kind === 'gain' && AUTOMATION.shipAtOptions.includes(ship.fraction)) s.autoShipAt = ship.fraction;
  else s.workflows.release = false;
  game.on((e) => {
    if (e.type === 'raised') report.raises.push({ minute: Math.round(now / 600) / 100, round: e.result.round });
    if (e.type === 'majorCut') report.majors.push({ minute: Math.round(now / 600) / 100, version: e.result.version, xp: s.xp });
    if (e.type === 'unlocked') report.unlocks[e.tab] = Math.round(now / 600) / 100;
    if (e.type === 'shipped') report.ships.push({ minute: Math.round(now / 600) / 100, release: e.result.release, stars: e.totalStars });
  });
  game.checkIn();

  const stepMs = 250;
  const tapEvery = Math.max(1, Math.round(1000 / stepMs / tapsPerSecond));
  const tapsPerStep = Math.max(1, Math.round((tapsPerSecond * stepMs) / 1000));
  const totalSteps = (minutes * 60 * 1000) / stepMs;

  for (let step = 0; step < totalSteps; step++) {
    now += stepMs;
    if (step % tapEvery === 0) for (let i = 0; i < tapsPerStep; i++) game.tap();
    game.tick();

    if (step % 4 !== 0) continue; // decisions once a second
    if (s.bug && botRng() < 0.8) game.squashBug();
    if (s.incident?.kind === 'coffee') game.catchCoffee();
    if (s.incident?.kind === 'conflict') game.chooseConflict(botRng() < 0.7 ? s.incident.correct : ((1 - s.incident.correct) as 0 | 1));
    for (const [id, count] of Object.entries(s.scripts)) if ((count ?? 0) > 0) game.runScript(id as EffectId);

    if (!s.sprint && s.unlocked.sprints) {
      const slot = s.backlog.findIndex((t) => difficultyOf(Math.max(0, requiredTapRate(s, t, now) - tapsPerSecond + 3.5)) === 'relaxed');
      if (slot >= 0) game.startSprint(slot);
    }

    // Greedy: best output per line spent, valuing tap output at the bot's tap speed.
    for (let guard = 0; guard < 50; guard++) {
      let best: { id: string; score: number } | null = null;
      UPGRADES.forEach((u, i) => {
        if (!isUpgradeVisible(s, i)) return;
        const cost = costOf(s, u, 1);
        if (s.lines.lt(cost)) return;
        const gain = D(u.output).mul(u.kind === 'tap' ? tapsPerSecond : 1);
        const score = gain.div(cost).toNumber();
        if (!best || score > best.score) best = { id: u.id, score };
      });
      if (!best) break;
      game.buy((best as { id: string }).id);
    }

    const available = starsAvailable(s);
    const due =
      ship.kind === 'gain' ? available >= Math.max(1, Math.ceil(s.stars * ship.fraction))
      : ship.kind === 'every' ? available >= 1 && now - lastShipAt >= ship.minutes * 60_000
      : available >= 1;
    if (due && game.ship()) lastShipAt = now;
    for (const p of [...PERKS].sort((a, b) => a.baseCost - b.baseCost)) if (perkStatus(s, p) === 'affordable') game.buyPerk(p.id);
    if (resets) {
      for (const p of COMPANY_PERKS) if (companyPerkStatus(s, p) === 'affordable') game.buyCompanyPerk(p.id);
      for (const k of [...SKILLS].sort((a, b) => a.baseCost - b.baseCost)) if (skillStatus(s, k) === 'affordable') game.buySkill(k.id);
      if (canRaise(s)) game.raise();
      if (xpAvailable(s) >= Math.max(1, Math.ceil(s.xp * 0.5))) game.cutMajor();
    }

    if (step % (4 * 60 * 10) === 0) {
      report.timeline.push({ minute: Math.round(now / 60000), lines: fmt(s.lifetime), perSecond: fmt(perSecond(s, now)), perTap: fmt(perTap(s, now)), release: s.release, stars: s.stars, top: topOwned(), users: Math.round(usersNow(s)), rank: s.market.startedAt ? standing(s, now).rank : 0 });
    }
  }

  report.finalPerSecond = fmt(perSecond(s, now));
  report.finalPerTap = fmt(perTap(s, now));
  report.finalStars = s.stars;
  report.lifetime = fmt(s.lifetime);
  report.achievements = s.achievements.length;
  report.quests = s.stats.quests;
  report.milestones = s.stats.milestones;
  report.topUpgrade = topOwned();
  report.perks = { ...s.perks };
  return report;
}
