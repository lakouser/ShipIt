import { AUTOMATION, COMPANY_PERKS, FUNDING, ISSUES, PERKS, SKILLS, UPGRADES, type EffectId, type LanguageId, type ProjectId, type RoleId } from '../src/core/content';
import { acquirePrice, rivalsLeft } from '../src/core/corp';
import { refactorCost } from '../src/core/debt';
import { canRaise, companyPerkStatus } from '../src/core/funding';
import { challengeOpen, challengeReady, challengesUnlocked, skillStatus, xpAvailable } from '../src/core/major';
import { mailDef, type MailOption } from '../src/core/mail';
import { standing, usersNow } from '../src/core/market';
import { costOf, forkOptions, isUpgradeVisible, owned, perSecond, perTap, upgradesWithForks } from '../src/core/economy';
import { Game, type GameEvent } from '../src/core/game';
import { D, fmt } from '../src/core/num';
import { perkStatus } from '../src/core/perks';
import { seededRng } from '../src/core/rng';
import { nextProjects, starsAvailable } from '../src/core/ship';
import { difficultyOf, requiredTapRate } from '../src/core/sprints';
import { findStack, stackUnlocked } from '../src/core/stacks';
import { newGame, type Developer, type GameState } from '../src/core/state';
import { hireCost, teamFull } from '../src/core/team';

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
  /**
   * Play every system, the way an engaged player does: pick package upgrades, hire and staff the team,
   * fight boss incidents, answer mail, refactor, choose projects and run challenges (default false:
   * the official bot ignores all of that).
   */
  engaged?: boolean;
  /** Projects an engaged bot prefers, best first (it falls back to the web app). */
  projects?: ProjectId[];
  /** Stacks an engaged bot picks at each round and major, best first (the official bot stays on TypeScript). */
  stacks?: LanguageId[];
  /** The engaged bot's test budget once the suite opens. */
  testBudget?: number;
  /** Stop early once this holds (checked once a simulated minute). */
  until?: (s: GameState) => boolean;
}

export interface SimReport {
  ships: { minute: number; release: number; stars: number }[];
  raises: { minute: number; round: number }[];
  majors: { minute: number; version: string; xp: number }[];
  quarters: { minute: number; quarter: number; beat: boolean; surprise: number }[];
  acquisitions: { minute: number; rival: string }[];
  finalStars: number;
  unlocks: Record<string, number>;
  /** Every first: a panel, a workflow, a round, a mechanic. */
  news: { minute: number; what: string }[];
  /** The longest stretch without anything new before the IPO, and where it ends. */
  longestWait: { minutes: number; until: string; from: number };
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

/** The engaged bot's projects: sprints, then everything twice, then the operating system's bugs. */
export const ENGAGED_PROJECTS: ProjectId[] = ['game', 'startup', 'os', 'cli', 'enterprise', 'webapp'];
/** The engaged bot's stacks: it taps a lot, so typing first. */
export const ENGAGED_STACKS: LanguageId[] = ['py', 'rs', 'ts', 'go'];

/** The role a trait is best at, so a hire goes where they count most. */
const ROLE_FOR: Record<Developer['trait'], RoleId> = { senior: 'features', tenx: 'features', tester: 'bugs', sre: 'oncall', scrum: 'sprints', tidy: 'refactor', generalist: 'sprints' };

/** What a mail answer is worth to the bot: permanent bonuses and scripts first, lines next, debt and cost against. */
function optionScore(o: MailOption): number {
  let score = 0;
  for (const e of o.effects) {
    if (e.kind === 'bonus') score += 3;
    else if (e.kind === 'script') score += 2;
    else if (e.kind === 'lines' || e.kind === 'effect') score += 1;
    else if (e.kind === 'pay') score -= 1;
    else if (e.kind === 'debt') score -= e.amount / 5;
  }
  return score;
}

/**
 * A bot that plays like a reasonably attentive player: taps steadily, buys the best-value
 * package, runs relaxed sprints, squashes most bugs, grabs incidents, runs scripts at once,
 * ships when the payoff is worth it and spends stars on the cheapest perk. With `engaged`, it
 * also plays every other system.
 */
export function simulate({ minutes, tapsPerSecond, seed = 7, ship = { kind: 'gain', fraction: 0.75 }, resets = true, engaged = false, projects = ENGAGED_PROJECTS, stacks = ENGAGED_STACKS, testBudget = 0.1, until }: SimOptions): SimReport {
  let now = 0;
  const rng = seededRng(seed);
  const botRng = seededRng(seed + 1000);
  const game = new Game(newGame(now), { clock: () => now, rng });
  const s = game.state;
  const topOwned = () => [...UPGRADES].reverse().find((u) => owned(s, u.id) > 0)?.id ?? 'none';
  const minute = () => Math.round(now / 600) / 100;
  let lastShipAt = 0;
  const report: SimReport = {
    ships: [], raises: [], majors: [], quarters: [], acquisitions: [], finalStars: 0, unlocks: {}, news: [], longestWait: { minutes: 0, until: '', from: 0 },
    finalPerSecond: '', finalPerTap: '', lifetime: '', achievements: 0, quests: 0, milestones: 0, topUpgrade: '', perks: {}, timeline: [],
  };
  const firsts = new Set<string>();
  const first = (what: string) => {
    if (firsts.has(what)) return;
    firsts.add(what);
    report.news.push({ minute: minute(), what });
  };
  // release.yml follows the bot's own policy, so it can't ship on a schedule the policy wouldn't.
  if (ship.kind === 'gain' && AUTOMATION.shipAtOptions.includes(ship.fraction)) s.autoShipAt = ship.fraction;
  else s.workflows.release = false;
  game.on((e: GameEvent) => {
    if (e.type === 'raised') report.raises.push({ minute: minute(), round: e.result.round });
    if (e.type === 'majorCut') report.majors.push({ minute: minute(), version: e.result.version, xp: s.xp });
    if (e.type === 'unlocked') report.unlocks[e.tab] = minute();
    if (e.type === 'shipped') report.ships.push({ minute: minute(), release: e.result.release, stars: e.totalStars });
    // Firsts: what a player would call new.
    if (e.type === 'unlocked') first(`panel ${e.tab}`);
    if (e.type === 'workflowUnlocked') first(`workflow ${e.workflow.file}`);
    if (e.type === 'raised') first(`round ${e.result.name}`);
    if (e.type === 'majorCut') first('major versions');
    if (e.type === 'bossIncoming') first('boss incidents');
    if (e.type === 'applicant') first('applicants');
    if (e.type === 'challengeStarted') first('challenges');
    if (e.type === 'shipped') for (const p of nextProjects(s)) first(`project ${p.id}`);
    if (e.type === 'market' && e.news.kind === 'launch') first('rival launches');
    if (e.type === 'quarter') {
      report.quarters.push({ minute: minute(), quarter: e.report.quarter, beat: e.report.beat, surprise: Math.round((e.report.revenue / e.report.guidance - 1) * 100) });
      first('quarters');
    }
    if (e.type === 'acquired') {
      report.acquisitions.push({ minute: minute(), rival: e.acquisition.rival.id });
      first('acquisitions');
    }
    if (e.type === 'raised' || e.type === 'majorCut') for (const st of ['hs', 'cob'] as const) if (stackUnlocked(s, findStack(st)!)) first(`stack ${st}`);
  });
  // The stack the engaged bot would pick for the next run.
  const nextStack = (): LanguageId | undefined => (engaged ? stacks.find((id) => stackUnlocked(s, findStack(id)!)) : undefined);
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
      // Only tickets past their standup can start.
      const slot = s.backlog.findIndex((t) => t.readyAt <= now && difficultyOf(Math.max(0, requiredTapRate(s, t, now) - tapsPerSecond + 3.5)) === 'relaxed');
      if (slot >= 0) game.startSprint(slot);
    }

    if (engaged) playEngaged(game, now, botRng, testBudget);
    // Issues: the engaged bot closes them every few minutes, the official bot once the queue is full.
    if (s.issues.open.length >= (engaged ? 3 : ISSUES.max)) game.triage();

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
    // A challenge ships as soon as its goal is met; otherwise the policy decides.
    const due =
      s.challenge ? available >= 1 && s.thisRelease.gte(s.challenge.goal)
      : ship.kind === 'gain' ? available >= Math.max(1, Math.ceil(s.stars * ship.fraction))
      : ship.kind === 'every' ? available >= 1 && now - lastShipAt >= ship.minutes * 60_000
      : available >= 1;
    if (due) {
      const next = engaged ? (projects.find((id) => nextProjects(s).some((p) => p.id === id)) ?? 'webapp') : 'webapp';
      if (game.ship(next)) lastShipAt = now;
    }
    for (const p of [...PERKS].sort((a, b) => a.baseCost - b.baseCost)) if (perkStatus(s, p) === 'affordable') game.buyPerk(p.id);
    if (resets) {
      for (const p of COMPANY_PERKS) if (companyPerkStatus(s, p) === 'affordable') game.buyCompanyPerk(p.id);
      for (const k of [...SKILLS].sort((a, b) => a.baseCost - b.baseCost)) if (skillStatus(s, k) === 'affordable') game.buySkill(k.id);
      if (canRaise(s)) game.raise(nextStack());
      if (xpAvailable(s) >= Math.max(1, Math.ceil(s.xp * 0.5)) && !s.challenge) game.cutMajor(nextStack());
      // After the IPO: buy the cheapest rival the cash covers.
      const cheapest = rivalsLeft(s).sort((a, b) => acquirePrice(s, a, now) - acquirePrice(s, b, now))[0];
      if (cheapest && acquirePrice(s, cheapest, now) <= s.corp.cash) game.acquire(cheapest.id);
    }

    if (until && step % (4 * 60) === 0 && until(s)) {
      minutes = now / 60_000;
      break;
    }
    if (step % (4 * 60 * 10) === 0) {
      report.timeline.push({ minute: Math.round(now / 60000), lines: fmt(s.lifetime), perSecond: fmt(perSecond(s, now)), perTap: fmt(perTap(s, now)), release: s.release, stars: s.stars, top: topOwned(), users: Math.round(usersNow(s)), rank: s.market.startedAt ? standing(s, now).rank : 0 });
    }
  }

  // The longest wait between firsts, from the start to the IPO (or the end of the run, if it never gets there). After the
  // IPO the game is endless: quarters and acquisitions come round again and again.
  const ipo = report.raises.find((r) => r.round === FUNDING.maxRounds)?.minute ?? minutes;
  const marks = [{ minute: 0, what: 'start' }, ...report.news.filter((n) => n.minute <= ipo), { minute: ipo, what: ipo < minutes ? 'the IPO' : 'end of run' }];
  for (let i = 1; i < marks.length; i++) {
    const gap = marks[i].minute - marks[i - 1].minute;
    if (gap > report.longestWait.minutes) report.longestWait = { minutes: Math.round(gap * 10) / 10, until: marks[i].what, from: marks[i - 1].minute };
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

/** Everything the official bot leaves alone. Called once a second. */
function playEngaged(game: Game, now: number, botRng: () => number, testBudget: number): void {
  const s = game.state;
  if (s.unlocked.tests && s.testBudget !== testBudget) game.setTestBudget(testBudget);
  // Package upgrades: the plugin ecosystem or the LTS build, which beat the rewrite over a run.
  for (const u of upgradesWithForks(s)) {
    const options = forkOptions(s, u.id);
    if (options) game.chooseFork(u.id, (options.find((f) => f.id !== 'major') ?? options[0]).id);
  }
  // The team: hire whoever applies while there's room, and put them where their trait counts.
  if (s.applicant && !teamFull(s) && s.lines.gte(hireCost(s, now))) game.hire();
  for (const d of s.team) if (d.role !== ROLE_FOR[d.trait]) game.assign(d.id, ROLE_FOR[d.trait]);
  // Boss incidents: take them on. Mash stages are won by the bot's own taps; picks are right 70% of the time.
  if (s.boss?.phase === 'incoming') game.engageBoss();
  else if (s.boss?.phase === 'fight' && s.boss.needed === 0) game.bossPick(botRng() < 0.7 ? s.boss.correct : (s.boss.correct + 1) % 3);
  // Mail: the best-looking answer.
  for (const m of s.mail) {
    const options = m.choice === null ? mailDef(m.id)?.options : undefined;
    if (options) game.answerMail(m.key, options.reduce((best, o, i) => (optionScore(o) > optionScore(options[best]) ? i : best), 0));
  }
  // Refactor once debt costs real output and the refactor is cheap next to what's in hand.
  if (s.debt >= 40 && refactorCost(s, now).lte(s.lines.mul(0.2))) game.refactor();
  // Challenges: start one right after a ship, while the release is still small.
  if (challengesUnlocked(s) && challengeReady(s) && !s.challenge && s.thisRelease.lt(s.lastReleaseLines.mul(0.05))) {
    const open = (['solo', 'legacy', 'clean', 'cidown', 'keyboard'] as const).find((id) => challengeOpen(s, id));
    if (open) game.startChallenge(open);
  }
}
