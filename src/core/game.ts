import { checkAchievements, type AchievementDef } from './achievements';
import { careerLevel } from './career';
import { bossPick, bossTap, engageBoss, summonBoss, updateBoss, type BossChange } from './bosses';
import { squashBug, updateBugs } from './bugs';
import {
  AUTOMATION,
  BOSS_KINDS,
  BUGS,
  CAREER,
  COMPANY_VALUES,
  CRIT,
  FLOW,
  FOUNDER,
  OFFLINE,
  PERK_VALUES,
  RFC,
  RIVALS,
  RULES,
  TESTS,
  UNLOCKS,
  type BossKind,
  type ChallengeDef,
  type ChallengeId,
  type CompanyPerkDef,
  type EffectDef,
  type EffectId,
  type ForkDef,
  type ForkId,
  type ForkPolicy,
  type FounderTraitDef,
  type FounderTraitId,
  type IncidentKind,
  type IssueKind,
  type LanguageId,
  type PerkDef,
  type ProjectId,
  type RfcDef,
  type RfcId,
  type RivalDef,
  type RoleId,
  type RuleAction,
  type SegmentId,
  type ServiceId,
  type SkillDef,
  type UpgradeDef,
  type WorkflowDef,
  type WorkflowId,
} from './content';
import { acquire, canAcquire, creditCorpAway, goPublic, hearingNeeded, tickCorp, type Acquisition } from './corp';
import { setTestBudget, writeLines } from './coverage';
import { refactor, tickDebt } from './debt';
import { applyDev, type DevAction } from './dev';
import { buy, chooseFork, companyLevel, critChance, perSecond, perTap, type Purchase } from './economy';
import { effectSum, pruneEffects, runScript } from './effects';
import { foundStartup } from './founder';
import { buyCompanyPerk, raiseRound, type RaiseResult } from './funding';
import { catchCoffee, chooseConflict, outageTap, updateIncident } from './incidents';
import { deploy, discardDraft, infraReady, placeService, type Deploy } from './infra';
import { issuesReady, triage, updateIssues, type Triage } from './issues';
import { answerMail, markRead, updateMail, type MailAnswer } from './mail';
import { abandonChallenge, buySkill, cutMajor, majorTabUnlocked, startChallenge, type MajorResult } from './major';
import { addQuietTime, headline, marketOnMajor, marketOnRaise, marketOnShip, renameApp, reviewScore, startReleaseCounters, updateMarket, type MarketNews, type ShipNews } from './market';
import { readMan } from './man';
import type { Decimal } from './num';
import { buyPerk, perkEffect } from './perks';
import { mergePull, openPulls, type PullResult } from './pulls';
import { makeMilestone, updateMilestone, updateQuests } from './quests';
import { rfcDone, rfcHours, rfcsReady, startRfc, updateRfc, withdrawRfc } from './rfcs';
import type { Rng } from './rng';
import { roadmapReady, setFocus } from './roadmap';
import { addRule, removeRule, setRule, triggerStates } from './rules';
import { nextProjects, ship, shipGain, starsAvailable, starsPerMinute, type ShipResult } from './ship';
import { makeBacklog, refreshBacklog, requiredTapRate, resolveSprint, startSprint } from './sprints';
import type { ActiveSprint, Boss, Developer, GameState, Headline, Incident, MailItem, Milestone, PullsState, Quest, QuarterReport, Rule, SprintResult } from './state';
import { checkIn, dayKey, type CheckIn } from './streak';
import { assignRole, hire, letGo, passApplicant, updateApplicant } from './team';
import { autoDotfiles, autoForks, autoInstall, autoRunScripts, releasesShipped, setForkPolicy, workflowForChallenge, workflowOn, workflowsUnlockedBetween } from './workflows';

export type UnlockTab = 'sprints' | 'todo' | 'ship' | 'team' | 'mail' | 'major' | 'market' | 'tests' | 'issues' | 'infra' | 'roadmap' | 'rfcs';
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
  | { type: 'bugCaught' }
  | { type: 'bugSquashed'; reward: Decimal; total: number; auto: boolean }
  | { type: 'incidentSpawned'; incident: Incident }
  | { type: 'incidentEnded'; kind: IncidentKind; outcome: IncidentOutcome; reward: Decimal | null }
  | { type: 'questDone'; quest: Quest }
  | { type: 'milestoneDone'; milestone: Milestone }
  | { type: 'unlocked'; tab: UnlockTab }
  | { type: 'checkIn'; checkIn: CheckIn }
  | { type: 'shipped'; result: ShipResult; totalStars: number; auto: boolean }
  | { type: 'promoted'; title: string }
  | { type: 'workflowUnlocked'; workflow: WorkflowDef }
  | { type: 'autoInstalled'; count: number; forks: Purchase[] }
  | { type: 'majorCut'; result: MajorResult }
  | { type: 'skill'; skill: SkillDef; level: number }
  | { type: 'challengeStarted'; challenge: ChallengeDef }
  | { type: 'challengeAbandoned'; id: ChallengeId }
  | { type: 'reviewed'; news: ShipNews }
  | { type: 'market'; news: MarketNews }
  | { type: 'news'; headline: Headline }
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
  | { type: 'mailAnswered'; answer: MailAnswer }
  | { type: 'issuesFiled'; kinds: IssueKind[] }
  | { type: 'triaged'; triage: Triage; auto: boolean }
  | { type: 'quarter'; report: QuarterReport; headline: Headline }
  | { type: 'acquired'; acquisition: Acquisition; headline: Headline }
  | { type: 'autoForked'; count: number }
  | { type: 'deployed'; deploy: Deploy }
  | { type: 'rfcStarted'; rfc: RfcDef; hours: number }
  | { type: 'rfcAdopted'; rfc: RfcDef }
  | { type: 'pulls'; pulls: PullsState }
  | { type: 'pullMerged'; result: PullResult }
  | { type: 'ruleFired'; rule: Rule }
  | { type: 'hearing'; rival: RivalDef }
  | { type: 'hearingLost'; rival: RivalDef }
  | { type: 'monopoly' }
  | { type: 'founded'; trait: FounderTraitDef; exits: number };

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
  /** Which rule conditions held on the last tick (rules fire when one becomes true); null until the first tick. */
  private ruleWas: Record<string, boolean> | null = null;

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
    state.corp.hearing = null;
    state.nextBugAt = now + BUGS.firstDelayMs;
    this.today = dayKey(now);
    if (state.backlog.length === 0) state.backlog = makeBacklog(state, now, this.rng);
    if (!state.milestone || state.milestone.release !== state.release) state.milestone = makeMilestone(state);
    // A save that went public before quarters existed starts its first quarter now.
    goPublic(state, now);
    if (!state.stacksUsed.includes(state.stack)) state.stacksUsed.push(state.stack);
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
    return 1 + this.flow * (FLOW.maxBonus + PERK_VALUES.flowPerLevel * perkEffect(this.state, 'flow'));
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
      lines = lines.mul(rfcDone(s, 'types') ? RFC.critMultiplier : CRIT.multiplier);
      s.stats.crits++;
    }
    writeLines(s, lines);
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
    else if (change.type === 'won') {
      this.emit({ type: 'bossWon', kind: change.kind, reward: change.reward, scripts: change.scripts });
      if (change.kind === 'antitrust') this.closeHearing(true);
    } else if (change.type === 'failed') {
      this.emit({ type: 'bossFailed', kind: change.kind, stage: change.stage });
      if (change.kind === 'antitrust') this.closeHearing(false);
    }
  }

  /** The hearing is over: won, the last rival is bought and the chart is a list of one; lost, the deal waits. */
  private closeHearing(won: boolean): void {
    const s = this.state;
    const now = this.clock();
    const id = s.corp.hearing;
    const rival = RIVALS.find((r) => r.id === id);
    s.corp.hearing = null;
    if (!rival) return;
    if (!won) {
      s.corp.hearingRetryAt = now + FOUNDER.hearingRetryMs;
      this.emit({ type: 'hearingLost', rival });
      return;
    }
    const result = acquire(s, rival.id, now, true);
    if (!result) return;
    const h = headline(s, now, this.rng, `Regulators wave through ${s.market.appName}'s purchase of ${rival.name}. There is nobody left to object`);
    this.emit({ type: 'acquired', acquisition: result, headline: h });
    this.emit({ type: 'monopoly' });
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

  /** Raises the next round; the next run is written in `stack` (the current one if not given). */
  raise(stack?: LanguageId): RaiseResult | null {
    const result = raiseRound(this.state, this.clock(), this.rng, stack);
    if (!result) return null;
    startReleaseCounters(this.state);
    this.emit({ type: 'raised', result });
    const headline = marketOnRaise(this.state, this.clock(), this.rng, result.name);
    if (headline) this.emit({ type: 'news', headline });
    return result;
  }

  /** The endless reset after the IPO: bank stars for XP and start the next major version. */
  cutMajor(stack?: LanguageId): MajorResult | null {
    const s = this.state;
    const result = cutMajor(s, this.clock(), this.rng, stack);
    if (!result) return null;
    startReleaseCounters(s);
    const headline = marketOnMajor(s, this.clock(), this.rng, result.version);
    this.emit({ type: 'majorCut', result });
    if (headline) this.emit({ type: 'news', headline });
    return result;
  }

  buySkill(id: string): boolean {
    const result = buySkill(this.state, id);
    if (result) this.emit({ type: 'skill', skill: result.skill, level: result.level });
    return !!result;
  }

  startChallenge(id: ChallengeId): boolean {
    const challenge = startChallenge(this.state, id, this.clock(), this.rng);
    if (!challenge) return false;
    startReleaseCounters(this.state);
    this.emit({ type: 'challengeStarted', challenge });
    return true;
  }

  abandonChallenge(): boolean {
    const id = abandonChallenge(this.state);
    if (id) this.emit({ type: 'challengeAbandoned', id });
    return !!id;
  }

  /** Names the app in the market (and the press). */
  renameApp(name: string): string {
    return renameApp(this.state, name);
  }

  /** Switches an unlocked workflow on or off. */
  setWorkflow(id: WorkflowId, on: boolean): void {
    this.state.workflows[id] = on;
  }

  /** release.yml's trigger: ship once a release would grow stars by this fraction. */
  setAutoShipAt(fraction: number): void {
    if (AUTOMATION.shipAtOptions.includes(fraction)) this.state.autoShipAt = fraction;
  }

  /** forks.yml's policy. */
  setForkPolicy(policy: ForkPolicy): void {
    setForkPolicy(this.state, policy);
  }

  /** The share of written code that goes to tests (one of TESTS.budgets). */
  setTestBudget(budget: number): boolean {
    return setTestBudget(this.state, budget);
  }

  /** Closes every open user issue. */
  triage(auto = false): Triage | null {
    const result = triage(this.state, this.clock());
    if (result) this.emit({ type: 'triaged', triage: result, auto });
    return result;
  }

  /** Buys a rival company with cash (after the IPO). */
  acquire(id: string): Acquisition | null {
    const s = this.state;
    const now = this.clock();
    // The last rival: the purchase goes to an antitrust hearing first, a boss fight that starts at once.
    if (hearingNeeded(s, id)) {
      const rival = RIVALS.find((r) => r.id === id);
      if (!rival || !canAcquire(s, rival, now)) return null;
      s.corp.hearing = id;
      const boss = summonBoss(s, 'antitrust', now, this.rng);
      this.emit({ type: 'hearing', rival });
      this.emit({ type: 'bossEngaged', boss });
      return null;
    }
    const result = acquire(s, id, now);
    if (!result) return null;
    const h = headline(s, now, this.rng, `${s.market.appName} acquires ${result.rival.name}; ${result.rival.app} users wake up to a new logo`);
    this.emit({ type: 'acquired', acquisition: result, headline: h });
    return result;
  }

  /** The ending at the IPO has been shown. */
  markEndingSeen(): void {
    this.state.corp.endingSeen = true;
  }

  /** The true ending (the monopoly) has been shown. */
  markMonopolySeen(): void {
    this.state.corp.monopolySeen = true;
  }

  /** Sells the company and founds a new one with a trait (after the true ending). The UI reloads into it. */
  foundStartup(trait: FounderTraitId): boolean {
    const def = foundStartup(this.state, trait, this.clock());
    if (!def) return false;
    this.ruleWas = null;
    this.flow = 0;
    this.state.backlog = makeBacklog(this.state, this.clock(), this.rng);
    this.state.milestone = makeMilestone(this.state);
    this.emit({ type: 'founded', trait: def, exits: this.state.founder.exits });
    return true;
  }

  /** Puts a service in a slot of the architecture board's draft (null clears the slot). */
  placeService(slot: number, id: ServiceId | null): boolean {
    return placeService(this.state, slot, id);
  }

  /** Deploys the draft board (once per release). */
  deployInfra(): Deploy | null {
    const result = deploy(this.state);
    if (result) this.emit({ type: 'deployed', deploy: result });
    return result;
  }

  discardInfraDraft(): void {
    discardDraft(this.state);
  }

  /** Points the roadmap at a segment: its next feature headlines every release. */
  setFocus(id: SegmentId | null): boolean {
    return setFocus(this.state, id);
  }

  /** Opens an RFC for discussion (one at a time; hours of real time). */
  startRfc(id: RfcId): boolean {
    const hours = rfcHours(this.state);
    const rfc = startRfc(this.state, id, this.clock());
    if (rfc) this.emit({ type: 'rfcStarted', rfc, hours });
    return !!rfc;
  }

  withdrawRfc(): boolean {
    return withdrawRfc(this.state) !== null;
  }

  /** Merges one of the pull requests that came in while away. */
  mergePull(index: number): PullResult | null {
    const result = mergePull(this.state, index, this.clock(), this.rng);
    if (result) this.emit({ type: 'pullMerged', result });
    return result;
  }

  addRule(): boolean {
    return !!addRule(this.state);
  }

  setRule(index: number, patch: Partial<Rule>): boolean {
    return setRule(this.state, index, patch);
  }

  removeRule(index: number): boolean {
    return removeRule(this.state, index);
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

  /** Ships the release and starts the next project. release.yml ships with auto = true. */
  ship(next: ProjectId = 'webapp', auto = false): ShipResult | null {
    const s = this.state;
    const now = this.clock();
    const titleBefore = careerLevel(s.stats.starsEarned);
    const shippedBefore = releasesShipped(s);
    const gain = shipGain(s);
    const review = reviewScore(s, gain);
    const result = ship(s, now, this.rng, next);
    if (!result) return null;
    if (auto) s.stats.autoShips++;
    else s.preferredProject = next;
    const news = marketOnShip(s, now, this.rng, review, result.releaseLines, result.version, gain < 0.1);
    // Feature requests closed during the release went into its review.
    s.issues.reviewBoost = 0;
    startReleaseCounters(s);
    this.emit({ type: 'shipped', result, totalStars: s.stars, auto });
    this.emit({ type: 'reviewed', news });
    const title = careerLevel(s.stats.starsEarned);
    if (title > titleBefore) this.emit({ type: 'promoted', title: CAREER[title].title });
    for (const workflow of workflowsUnlockedBetween(shippedBefore, releasesShipped(s))) this.emit({ type: 'workflowUnlocked', workflow });
    const earned = result.challenge?.first ? workflowForChallenge(result.challenge.id) : undefined;
    if (earned) this.emit({ type: 'workflowUnlocked', workflow: earned });
    return result;
  }

  /** release.yml: ship as the project last picked by hand when it's on offer, else the same project, else a web app. */
  private autoShip(): void {
    const s = this.state;
    const offered = (id: ProjectId | null): id is ProjectId => !!id && nextProjects(s).some((p) => p.id === id);
    this.ship(offered(s.preferredProject) ? s.preferredProject : offered(s.project) ? s.project : 'webapp', true);
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
    const level = perkEffect(s, 'cron');
    const runway = companyLevel(s, 'runway');
    const remote = rfcDone(s, 'remote') ? 1 : 0;
    const rate = OFFLINE.rate + PERK_VALUES.cronRate * level + COMPANY_VALUES.runwayRate * runway + RFC.offlineRate * remote;
    const cap = OFFLINE.maxSeconds + (PERK_VALUES.cronHours * level + COMPANY_VALUES.runwayHours * runway + RFC.offlineHours * remote) * 3600;
    const seconds = Math.min(cap, Math.max(0, awaySeconds));
    if (awaySeconds >= 2 * 3600) s.flags.touchGrass = true;
    addQuietTime(s, Math.max(0, awaySeconds), true);
    creditCorpAway(s, seconds, rate);
    // Contributors were busy too.
    const pulls = openPulls(s, awaySeconds, this.clock(), this.rng);
    if (pulls) this.emit({ type: 'pulls', pulls });
    const lines = perSecond(s, this.clock()).mul(seconds * rate).floor();
    if (lines.lt(1)) return;
    writeLines(s, lines, false);
    this.emit({ type: 'offline', lines, seconds, awaySeconds, rate });
  }

  /** Developer shortcuts (dev mode only). */
  dev(action: DevAction, incident?: IncidentKind): void {
    const now = this.clock();
    const s = this.state;
    const spawned = applyDev(s, action, now, this.rng, incident);
    if (spawned) {
      this.emit({ type: 'incidentSpawned', incident: spawned });
      if (workflowOn(s, 'pager')) this.page();
    }
    if (action === 'warp') this.creditTimeAway(3600);
    if (action === 'pulls') {
      s.pulls = null;
      const pulls = openPulls({ ...s, market: { ...s.market, startedAt: s.market.startedAt || now } }, 3 * 3600, now, this.rng);
      if (pulls) {
        s.pulls = pulls;
        this.emit({ type: 'pulls', pulls });
      }
    }
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
      writeLines(s, perSecond(s, now).mul(dt));
      addQuietTime(s, dt, false);
      // The quarter clock runs on play time.
      const report = tickCorp(s, now, dt);
      if (report) this.emit({ type: 'quarter', report, headline: this.quarterHeadline(report) });
      const autoTaps = effectSum(s, 'autoTapsPerSecond', now);
      if (autoTaps > 0) {
        this.autoTapBudget += autoTaps * dt;
        while (this.autoTapBudget >= 1) {
          this.autoTapBudget--;
          this.tap(true);
        }
      }
    }
    // The four-day week: flow drains half as fast.
    if (now - this.lastTapAt > FLOW.idleS * 1000) this.flow = Math.max(0, this.flow - FLOW.decayPerS * (rfcDone(s, 'fourday') ? RFC.flowDecay : 1) * dt);
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
    else if (bug?.type === 'caught') this.emit({ type: 'bugCaught' });
    else if (bug?.type === 'autoSquashed') this.emit({ type: 'bugSquashed', reward: bug.reward, total: s.stats.bugs, auto: true });

    const incident = updateIncident(s, now, this.rng, canSpawn && s.lifetime.gte(500));
    if (incident?.type === 'spawned') {
      this.emit({ type: 'incidentSpawned', incident: incident.incident });
      if (workflowOn(s, 'pager')) this.page();
    } else if (incident?.type === 'expired') this.emit({ type: 'incidentEnded', kind: incident.incident.kind, outcome: 'missed', reward: null });

    const boss = updateBoss(s, now, this.rng, canSpawn);
    if (boss?.type === 'incoming') this.emit({ type: 'bossIncoming', boss: boss.boss });
    else if (boss?.type === 'ignored') this.emit({ type: 'bossIgnored', kind: boss.kind });
    else if (boss?.type === 'failed') this.bossProgress(boss);

    const adopted = updateRfc(s, now);
    if (adopted) this.emit({ type: 'rfcAdopted', rfc: adopted });

    const installed = autoInstall(s);
    if (installed.count > 0) this.emit({ type: 'autoInstalled', ...installed });
    const forked = autoForks(s);
    if (forked > 0) this.emit({ type: 'autoForked', count: forked });
    for (const effect of autoRunScripts(s, now)) this.emit({ type: 'script', effect });
    for (const bought of autoDotfiles(s)) this.emit({ type: 'perk', perk: bought.perk, level: bought.level });
    if (workflowOn(s, 'standup') && !s.sprint && s.unlocked.sprints) this.standup(now);

    this.checkUnlocks();
    const filed = updateIssues(s, now, this.rng);
    if (filed.length) {
      this.emit({ type: 'issuesFiled', kinds: filed });
      if (workflowOn(s, 'triage')) this.triage(true);
    }
    const applicant = updateApplicant(s, now, this.rng);
    if (applicant) this.emit({ type: 'applicant', dev: applicant });
    for (const item of updateMail(s, now, this.rng)) this.emit({ type: 'mail', item });
    if (s.unlocked.todo) for (const quest of updateQuests(s, now, this.rng)) this.emit({ type: 'questDone', quest });
    const milestone = updateMilestone(s);
    if (milestone) this.emit({ type: 'milestoneDone', milestone });
    for (const news of updateMarket(s, now, this.rng, canSpawn)) this.emit({ type: 'market', news });
    s.releasePeak = Math.max(s.releasePeak, starsPerMinute(s, now));
    if (workflowOn(s, 'release') && shipGain(s) >= s.autoShipAt) this.autoShip();
    this.runRules(now);

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
    if (!u.market && s.market.startedAt > 0) unlock('market');
    if (!u.major && majorTabUnlocked(s)) unlock('major');
    if (!u.tests && s.stats.ships >= TESTS.unlockShips) unlock('tests');
    if (!u.issues && issuesReady(s)) unlock('issues');
    if (!u.roadmap && roadmapReady(s)) unlock('roadmap');
    if (!u.rfcs && rfcsReady(s)) unlock('rfcs');
    if (!u.infra && infraReady(s)) unlock('infra');
  }

  /** ~/bin/rules: each rule fires at the moment its condition becomes true, if its action can run. */
  private runRules(now: number): void {
    const s = this.state;
    if (s.round < RULES.unlockRound || s.rules.length === 0) return void (this.ruleWas = null);
    const states = triggerStates(s, now, this.flow);
    const was = this.ruleWas;
    this.ruleWas = states;
    if (!was) return;
    for (const rule of [...s.rules]) {
      if (!rule.on || !states[rule.when] || was[rule.when]) continue;
      if (this.runRuleAction(rule.then, now)) {
        s.stats.rulesFired++;
        this.emit({ type: 'ruleFired', rule });
      }
    }
  }

  private runRuleAction(action: RuleAction, now: number): boolean {
    const s = this.state;
    switch (action) {
      case 'turbo':
      case 'nightly':
      case 'autotype':
      case 'sudo':
        return this.runScript(action);
      case 'refactor':
        return !!this.refactor();
      case 'triage':
        return !!this.triage(true);
      case 'ship':
        if (starsAvailable(s) < 1) return false;
        this.autoShip();
        return true;
      case 'standup': {
        if (s.sprint || !s.unlocked.sprints) return false;
        this.standup(now);
        return !!s.sprint;
      }
    }
  }

  /** standup.yml: starts the biggest ready ticket the player can finish at their recent pace (automation alone when idle). */
  private standup(now: number): void {
    const s = this.state;
    const pace = this.tapRate(10_000) * 0.8;
    for (let slot = s.backlog.length - 1; slot >= 0; slot--) {
      const t = s.backlog[slot];
      if (t.readyAt <= now && requiredTapRate(s, t, now) <= pace) {
        this.startSprint(slot);
        return;
      }
    }
  }

  /** pager.yml: fixes the outage or resolves the conflict that just started. */
  private page(): void {
    const s = this.state;
    const now = this.clock();
    const inc = s.incident;
    if (inc?.kind === 'outage') {
      inc.taps = inc.needed - 1;
      const reward = outageTap(s, now);
      if (reward) this.emit({ type: 'incidentEnded', kind: 'outage', outcome: 'fixed', reward });
    } else if (inc?.kind === 'conflict') this.chooseConflict(inc.correct);
  }

  /** The press on a quarter's results. */
  private quarterHeadline(r: QuarterReport): Headline {
    const s = this.state;
    const app = s.market.appName;
    const surprise = r.guidance > 0 ? Math.round(Math.abs(r.revenue / r.guidance - 1) * 100) : 0;
    const pick = <T>(items: readonly T[]): T => items[Math.floor(this.rng() * items.length)];
    const text = r.beat
      ? pick([`${app} beats estimates by ${surprise}%; the stock jumps`, `Q${r.quarter}: ${app} tops guidance, analysts upgrade`, `${app} posts a record quarter, raises guidance`])
      : pick([`${app} misses estimates by ${surprise}%; shares slide`, `Q${r.quarter}: ${app} falls short, the board wants growth`, `Analysts cut ${app} after a soft quarter`]);
    return headline(s, this.clock(), this.rng, text);
  }
}
