import { checkAchievements, type AchievementDef } from './achievements';
import { bossPick, bossTap, engageBoss, updateBoss, type BossChange } from './bosses';
import { squashBug, updateBugs } from './bugs';
import {
  BOSS_KINDS,
  BUGS,
  COMPANY_VALUES,
  CRIT,
  FLOW,
  OFFLINE,
  PERK_VALUES,
  UNLOCKS,
  type BossKind,
  type CompanyPerkDef,
  type EffectDef,
  type EffectId,
  type ForkDef,
  type ForkId,
  type IncidentKind,
  type PerkDef,
  type ProjectId,
  type RoleId,
  type UpgradeDef,
} from './content';
import { refactor, tickDebt } from './debt';
import { applyDev, type DevAction } from './dev';
import { addLines, buy, chooseFork, companyLevel, critChance, perSecond, perTap, type Purchase } from './economy';
import { effectSum, pruneEffects, runScript } from './effects';
import { buyCompanyPerk, raiseRound, type RaiseResult } from './funding';
import { catchCoffee, chooseConflict, outageTap, updateIncident } from './incidents';
import { answerMail, markRead, updateMail, type MailAnswer } from './mail';
import { readMan } from './man';
import type { Decimal } from './num';
import { buyPerk, perkLevel } from './perks';
import { makeMilestone, updateMilestone, updateQuests } from './quests';
import type { Rng } from './rng';
import { ship, type ShipResult } from './ship';
import { makeBacklog, refreshBacklog, resolveSprint, startSprint } from './sprints';
import type { ActiveSprint, Boss, Developer, GameState, Incident, MailItem, Milestone, Quest, SprintResult } from './state';
import { checkIn, dayKey, type CheckIn } from './streak';
import { assignRole, hire, letGo, passApplicant, updateApplicant } from './team';

export type UnlockTab = 'sprints' | 'todo' | 'ship' | 'team' | 'mail';
export type IncidentOutcome = 'caught' | 'fixed' | 'resolved' | 'wrong' | 'missed';

export type GameEvent =
  | { type: 'tap'; lines: Decimal; crit: boolean; auto: boolean }
  | { type: 'flowMax' }
  | { type: 'purchase'; purchase: Purchase }
  | { type: 'perk'; perk: PerkDef; level: number }
  | { type: 'script'; effect: EffectDef }
  | { type: 'effectEnded'; id: EffectId }
  | { type: 'achievement'; achievement: AchievementDef }
  | { type: 'sprintStarted'; sprint: ActiveSprint }
  | { type: 'sprintEnded'; result: SprintResult }
  | { type: 'backlogRefreshed' }
  | { type: 'bugSpawned'; expiresAt: number }
  | { type: 'bugEscaped' }
  | { type: 'bugSquashed'; reward: Decimal; total: number; auto: boolean }
  | { type: 'incidentSpawned'; incident: Incident }
  | { type: 'incidentEnded'; kind: IncidentKind; outcome: IncidentOutcome; reward: Decimal | null }
  | { type: 'questDone'; quest: Quest }
  | { type: 'milestoneDone'; milestone: Milestone }
  | { type: 'unlocked'; tab: UnlockTab }
  | { type: 'checkIn'; checkIn: CheckIn }
  | { type: 'shipped'; result: ShipResult; totalStars: number }
  | { type: 'offline'; lines: Decimal; seconds: number; awaySeconds: number; rate: number }
  | { type: 'forkChosen'; upgrade: UpgradeDef; fork: ForkDef }
  | { type: 'refactored'; refactor: { cost: Decimal; cleared: number } }
  | { type: 'debtHigh'; debt: number }
  | { type: 'applicant'; dev: Developer }
  | { type: 'hired'; dev: Developer; cost: Decimal }
  | { type: 'assigned'; dev: Developer }
  | { type: 'letGo'; dev: Developer }
  | { type: 'bossIncoming'; boss: Boss }
  | { type: 'bossIgnored'; kind: BossKind }
  | { type: 'bossEngaged'; boss: Boss }
  | { type: 'bossStage'; kind: BossKind; stage: number; reward: Decimal }
  | { type: 'bossWon'; kind: BossKind; reward: Decimal; scripts: EffectId[] }
  | { type: 'bossFailed'; kind: BossKind; stage: number }
  | { type: 'raised'; result: RaiseResult }
  | { type: 'companyPerk'; perk: CompanyPerkDef; level: number }
  | { type: 'mail'; item: MailItem }
  | { type: 'mailAnswered'; answer: MailAnswer };

export interface GameOptions {
  clock?: () => number;
  rng?: Rng;
}

export interface TickOptions {
  /** False while the game is hidden or a dialog is open: bugs and incidents wait. */
  canSpawn?: boolean;
}

/**
 * The game's single entry point for the UI. Holds the state, applies player
 * actions and the passage of time, and reports what happened as events.
 * No DOM access here, so it runs the same in tests, the browser and native shells.
 */
export class Game {
  readonly state: GameState;
  private readonly clock: () => number;
  private readonly rng: Rng;
  private readonly listeners = new Set<(e: GameEvent) => void>();
  private readonly taps: number[] = [];
  private lastTick: number;
  private lastTapAt = 0;
  private autoTapBudget = 0;
  private typedBuffer = '';
  /** Today's date (YYYY-MM-DD), for the activity grid. */
  private today: string;
  /** Flow state, 0–1. Not saved: it is about the current burst of typing. */
  flow = 0;

  constructor(state: GameState, options: GameOptions = {}) {
    this.clock = options.clock ?? Date.now;
    this.rng = options.rng ?? Math.random;
    this.state = state;
    const now = this.clock();
    this.lastTick = now;
    // Bugs, incidents and bosses saved mid-flight would have no sprite to tap; restart their timers instead.
    state.bug = null;
    state.incident = null;
    state.boss = null;
    state.nextBugAt = now + BUGS.firstDelayMs;
    this.today = dayKey(now);
    if (state.backlog.length === 0) state.backlog = makeBacklog(state, now, this.rng);
    if (!state.milestone || state.milestone.release !== state.release) state.milestone = makeMilestone(state);
  }

  now(): number {
    return this.clock();
  }

  on(listener: (e: GameEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: GameEvent): void {
    for (const listener of this.listeners) listener(e);
  }

  perTap(): Decimal {
    return perTap(this.state, this.clock());
  }

  perSecond(): Decimal {
    return perSecond(this.state, this.clock());
  }

  /** Multiplier the flow meter currently gives taps. */
  flowMultiplier(): number {
    return 1 + this.flow * (FLOW.maxBonus + PERK_VALUES.flowPerLevel * perkLevel(this.state, 'flow'));
  }

  /** Taps per second over the last windowMs (player taps only). */
  tapRate(windowMs: number): number {
    const now = this.clock();
    return this.taps.filter((t) => now - t < windowMs).length / (windowMs / 1000);
  }

  /** A press of the write-code key. Scripted taps (autotype.sh) skip flow and tap-rate tracking. */
  tap(auto = false): Decimal {
    const s = this.state;
    const now = this.clock();
    let lines = perTap(s, now);
    if (!auto) {
      const before = this.flow;
      this.flow = Math.min(1, this.flow + FLOW.gainPerTap);
      this.lastTapAt = now;
      if (before < 1 && this.flow >= 1) {
        s.stats.flowMaxed++;
        this.emit({ type: 'flowMax' });
      }
      lines = lines.mul(this.flowMultiplier());
      this.taps.push(now);
      if (this.taps.length > 64) this.taps.shift();
      s.streak.activity[this.today] = (s.streak.activity[this.today] ?? 0) + 1;
    }
    const crit = this.rng() < critChance(s, now);
    if (crit) {
      lines = lines.mul(CRIT.multiplier);
      s.stats.crits++;
    }
    addLines(s, lines);
    s.stats.taps++;
    this.emit({ type: 'tap', lines, crit, auto });

    const fixed = outageTap(s, now);
    if (fixed) this.emit({ type: 'incidentEnded', kind: 'outage', outcome: 'fixed', reward: fixed });
    this.bossProgress(bossTap(s, now, this.rng));
    return lines;
  }

  private bossProgress(change: BossChange): void {
    if (!change) return;
    if (change.type === 'stage') this.emit({ type: 'bossStage', kind: change.kind, stage: change.stage, reward: change.reward });
    else if (change.type === 'won') this.emit({ type: 'bossWon', kind: change.kind, reward: change.reward, scripts: change.scripts });
    else if (change.type === 'failed') this.emit({ type: 'bossFailed', kind: change.kind, stage: change.stage });
  }

  /** Perks, the team and the project change sprint times and rewards: refresh the tickets, keeping each slot's standup cooldown. */
  private remakeBacklog(): void {
    if (!this.state.sprint) this.state.backlog = makeBacklog(this.state, this.clock(), this.rng, this.state.backlog);
  }

  /** Characters typed on a physical keyboard, for the secret achievements. */
  typed(key: string): void {
    if (key.length !== 1) return;
    this.typedBuffer = (this.typedBuffer + key.toLowerCase()).slice(-12);
    if (this.typedBuffer.endsWith('sudo')) this.state.flags.sudo = true;
    if (this.typedBuffer.endsWith('rm -rf')) this.state.flags.rmrf = true;
  }

  buy(id: string): Purchase | null {
    const purchase = buy(this.state, id);
    if (purchase) this.emit({ type: 'purchase', purchase });
    return purchase;
  }

  buyPerk(id: string): boolean {
    const result = buyPerk(this.state, id);
    if (!result) return false;
    this.emit({ type: 'perk', perk: result.perk, level: result.level });
    this.remakeBacklog();
    return true;
  }

  chooseFork(id: string, fork: ForkId): boolean {
    const result = chooseFork(this.state, id, fork);
    if (result) this.emit({ type: 'forkChosen', upgrade: result.upgrade, fork: result.fork });
    return !!result;
  }

  refactor(): { cost: Decimal; cleared: number } | null {
    const result = refactor(this.state, this.clock());
    if (result) this.emit({ type: 'refactored', refactor: result });
    return result;
  }

  hire(): boolean {
    const result = hire(this.state, this.clock());
    if (!result) return false;
    this.emit({ type: 'hired', dev: result.dev, cost: result.cost });
    this.remakeBacklog();
    return true;
  }

  passApplicant(): boolean {
    return passApplicant(this.state, this.clock());
  }

  assign(id: number, role: RoleId): boolean {
    const dev = assignRole(this.state, id, role);
    if (!dev) return false;
    this.emit({ type: 'assigned', dev });
    this.remakeBacklog();
    return true;
  }

  letGo(id: number): boolean {
    const dev = letGo(this.state, id);
    if (!dev) return false;
    this.emit({ type: 'letGo', dev });
    this.remakeBacklog();
    return true;
  }

  engageBoss(): boolean {
    const boss = engageBoss(this.state, this.clock(), this.rng);
    if (boss) this.emit({ type: 'bossEngaged', boss });
    return !!boss;
  }

  bossPick(choice: number): void {
    this.bossProgress(bossPick(this.state, choice, this.clock(), this.rng));
  }

  raise(): RaiseResult | null {
    const result = raiseRound(this.state, this.clock(), this.rng);
    if (result) this.emit({ type: 'raised', result });
    return result;
  }

  buyCompanyPerk(id: string): boolean {
    const result = buyCompanyPerk(this.state, id);
    if (result) this.emit({ type: 'companyPerk', perk: result.perk, level: result.level });
    return !!result;
  }

  readMail(key: string): void {
    markRead(this.state, key);
  }

  answerMail(key: string, option: number): boolean {
    const answer = answerMail(this.state, key, option, this.clock());
    if (answer) this.emit({ type: 'mailAnswered', answer });
    return !!answer;
  }

  readMan(id: string): boolean {
    return readMan(this.state, id);
  }

  /** Returns how many times the duck has been poked. */
  pokeDuck(): number {
    return ++this.state.stats.duckPokes;
  }

  runScript(id: EffectId): boolean {
    const effect = runScript(this.state, id, this.clock());
    if (effect) this.emit({ type: 'script', effect });
    return !!effect;
  }

  startSprint(slot: number): ActiveSprint | null {
    const sprint = startSprint(this.state, slot, this.clock());
    if (sprint) this.emit({ type: 'sprintStarted', sprint });
    return sprint;
  }

  squashBug(): Decimal | null {
    const reward = squashBug(this.state, this.clock());
    if (reward) this.emit({ type: 'bugSquashed', reward, total: this.state.stats.bugs, auto: false });
    return reward;
  }

  catchCoffee(): boolean {
    const ok = catchCoffee(this.state, this.clock());
    if (ok) this.emit({ type: 'incidentEnded', kind: 'coffee', outcome: 'caught', reward: null });
    return ok;
  }

  chooseConflict(side: 0 | 1): boolean | null {
    const result = chooseConflict(this.state, side, this.clock());
    if (!result) return null;
    this.emit({ type: 'incidentEnded', kind: 'conflict', outcome: result.ok ? 'resolved' : 'wrong', reward: result.reward });
    return result.ok;
  }

  ship(next: ProjectId = 'webapp'): ShipResult | null {
    const result = ship(this.state, this.clock(), this.rng, next);
    if (result) this.emit({ type: 'shipped', result, totalStars: this.state.stars });
    return result;
  }

  markExported(): void {
    this.state.flags.exported = true;
  }

  /** First session of the day: streak and daily bonus. Call once after subscribing. */
  checkIn(): CheckIn | null {
    const result = checkIn(this.state, this.clock());
    if (result) this.emit({ type: 'checkIn', checkIn: result });
    return result;
  }

  /** Credits time away (closed app, sleeping tab) at the offline rate, capped. The crontab perk and runway raise both. */
  creditTimeAway(awaySeconds: number): void {
    const s = this.state;
    const level = perkLevel(s, 'cron');
    const runway = companyLevel(s, 'runway');
    const rate = OFFLINE.rate + PERK_VALUES.cronRate * level + COMPANY_VALUES.runwayRate * runway;
    const cap = OFFLINE.maxSeconds + (PERK_VALUES.cronHours * level + COMPANY_VALUES.runwayHours * runway) * 3600;
    const seconds = Math.min(cap, Math.max(0, awaySeconds));
    if (awaySeconds >= 2 * 3600) s.flags.touchGrass = true;
    const lines = perSecond(s, this.clock()).mul(seconds * rate).floor();
    if (lines.lt(1)) return;
    addLines(s, lines, false);
    this.emit({ type: 'offline', lines, seconds, awaySeconds, rate });
  }

  /** Developer shortcuts (dev mode only). */
  dev(action: DevAction, incident?: IncidentKind): void {
    const now = this.clock();
    const s = this.state;
    const spawned = applyDev(s, action, now, this.rng, incident);
    if (spawned) this.emit({ type: 'incidentSpawned', incident: spawned });
    if (action === 'warp') this.creditTimeAway(3600);
    if (action === 'boss') {
      s.boss = null;
      s.incident = null;
      const change = updateBoss(s, now, this.rng, true, BOSS_KINDS[Math.floor(this.rng() * BOSS_KINDS.length)]);
      if (change?.type === 'incoming') this.emit({ type: 'bossIncoming', boss: change.boss });
    }
    if (action === 'mail') {
      s.unlocked.mail = true;
      for (const item of updateMail(s, now, this.rng, true)) this.emit({ type: 'mail', item });
    }
    this.tick();
  }

  /** Advances the game to now. Call it often (every 100–250 ms). */
  tick(options: TickOptions = {}): void {
    const s = this.state;
    const now = this.clock();
    const canSpawn = options.canSpawn ?? true;
    const dt = Math.max(0, (now - this.lastTick) / 1000); // a clock moved backwards gives nothing
    this.lastTick = now;

    if (dt > OFFLINE.thresholdS) {
      this.creditTimeAway(dt);
    } else if (dt > 0) {
      addLines(s, perSecond(s, now).mul(dt));
      const autoTaps = effectSum(s, 'autoTapsPerSecond', now);
      if (autoTaps > 0) {
        this.autoTapBudget += autoTaps * dt;
        while (this.autoTapBudget >= 1) {
          this.autoTapBudget--;
          this.tap(true);
        }
      }
    }
    if (now - this.lastTapAt > FLOW.idleS * 1000) this.flow = Math.max(0, this.flow - FLOW.decayPerS * dt);
    this.today = dayKey(now);
    // Debt builds while playing, not over time away.
    if (dt <= OFFLINE.thresholdS && tickDebt(s, now, dt)) this.emit({ type: 'debtHigh', debt: s.debt });

    for (const id of pruneEffects(s, now)) this.emit({ type: 'effectEnded', id });

    const result = resolveSprint(s, now, this.rng);
    if (result) this.emit({ type: 'sprintEnded', result });
    if (refreshBacklog(s, now, this.rng).length) this.emit({ type: 'backlogRefreshed' });

    const bug = updateBugs(s, now, this.rng, canSpawn);
    if (bug?.type === 'spawned') this.emit({ type: 'bugSpawned', expiresAt: bug.expiresAt });
    else if (bug?.type === 'escaped') this.emit({ type: 'bugEscaped' });
    else if (bug?.type === 'autoSquashed') this.emit({ type: 'bugSquashed', reward: bug.reward, total: s.stats.bugs, auto: true });

    const incident = updateIncident(s, now, this.rng, canSpawn && s.lifetime.gte(500));
    if (incident?.type === 'spawned') this.emit({ type: 'incidentSpawned', incident: incident.incident });
    else if (incident?.type === 'expired') this.emit({ type: 'incidentEnded', kind: incident.incident.kind, outcome: 'missed', reward: null });

    const boss = updateBoss(s, now, this.rng, canSpawn);
    if (boss?.type === 'incoming') this.emit({ type: 'bossIncoming', boss: boss.boss });
    else if (boss?.type === 'ignored') this.emit({ type: 'bossIgnored', kind: boss.kind });
    else if (boss?.type === 'failed') this.emit({ type: 'bossFailed', kind: boss.kind, stage: boss.stage });

    this.checkUnlocks();
    const applicant = updateApplicant(s, now, this.rng);
    if (applicant) this.emit({ type: 'applicant', dev: applicant });
    for (const item of updateMail(s, now, this.rng)) this.emit({ type: 'mail', item });
    if (s.unlocked.todo) for (const quest of updateQuests(s, now, this.rng)) this.emit({ type: 'questDone', quest });
    const milestone = updateMilestone(s);
    if (milestone) this.emit({ type: 'milestoneDone', milestone });

    const hour = new Date(now).getHours();
    if (hour >= 2 && hour < 5 && s.stats.taps > 0) s.flags.nightOwl = true;
    for (const achievement of checkAchievements(s, { tapRate: this.tapRate(2000), hour, now })) {
      this.emit({ type: 'achievement', achievement });
    }
  }

  private checkUnlocks(): void {
    const s = this.state;
    const u = s.unlocked;
    const unlock = (tab: UnlockTab) => {
      u[tab] = true;
      this.emit({ type: 'unlocked', tab });
    };
    if (!u.sprints && s.lifetime.gte(UNLOCKS.sprintsAtLifetime)) unlock('sprints');
    if (!u.todo && s.lifetime.gte(UNLOCKS.todoAtLifetime)) unlock('todo');
    if (!u.ship && (s.thisRelease.gte(UNLOCKS.shipAtRelease) || s.stars > 0 || s.round > 0)) unlock('ship');
    if (!u.mail && s.lifetime.gte(UNLOCKS.mailAtLifetime)) unlock('mail');
    if (!u.team && s.lifetime.gte(UNLOCKS.teamAtLifetime)) unlock('team');
  }
}
