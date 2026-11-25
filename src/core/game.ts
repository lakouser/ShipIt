import { checkAchievements, type AchievementDef } from './achievements';
import { squashBug, updateBugs } from './bugs';
import { BUGS, OFFLINE } from './content';
import { addLines, buy, perSecond, perTap, type Purchase } from './economy';
import type { Decimal } from './num';
import { ship, type ShipResult } from './ship';
import { makeBacklog, resolveSprint, startSprint, type Rng } from './sprints';
import type { ActiveSprint, GameState, SprintResult } from './state';

export type GameEvent =
  | { type: 'tap'; lines: Decimal }
  | { type: 'purchase'; purchase: Purchase }
  | { type: 'achievement'; achievement: AchievementDef }
  | { type: 'sprintStarted'; sprint: ActiveSprint }
  | { type: 'sprintEnded'; result: SprintResult }
  | { type: 'bugSpawned'; expiresAt: number }
  | { type: 'bugEscaped' }
  | { type: 'bugSquashed'; reward: Decimal; total: number }
  | { type: 'shipped'; result: ShipResult; totalStars: number }
  | { type: 'offline'; lines: Decimal; seconds: number };

export interface GameOptions {
  clock?: () => number;
  rng?: Rng;
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

  constructor(state: GameState, options: GameOptions = {}) {
    this.clock = options.clock ?? Date.now;
    this.rng = options.rng ?? Math.random;
    this.state = state;
    const now = this.clock();
    this.lastTick = now;
    // A bug saved mid-crawl would have no sprite to tap; start the timer again instead.
    state.bug = null;
    state.nextBugAt = now + BUGS.firstDelayMs;
    if (state.backlog.length === 0) state.backlog = makeBacklog(state, now, this.rng);
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

  /** Taps per second over the last windowMs. */
  tapRate(windowMs: number): number {
    const now = this.clock();
    return this.taps.filter((t) => now - t < windowMs).length / (windowMs / 1000);
  }

  tap(): Decimal {
    const now = this.clock();
    const lines = perTap(this.state, now);
    addLines(this.state, lines);
    this.taps.push(now);
    if (this.taps.length > 64) this.taps.shift();
    this.emit({ type: 'tap', lines });
    return lines;
  }

  buy(id: string): Purchase | null {
    const purchase = buy(this.state, id);
    if (purchase) this.emit({ type: 'purchase', purchase });
    return purchase;
  }

  startSprint(slot: number): ActiveSprint | null {
    const sprint = startSprint(this.state, slot, this.clock());
    if (sprint) this.emit({ type: 'sprintStarted', sprint });
    return sprint;
  }

  squashBug(): Decimal | null {
    const reward = squashBug(this.state, this.clock());
    if (reward) this.emit({ type: 'bugSquashed', reward, total: this.state.bugsSquashed });
    return reward;
  }

  ship(): ShipResult | null {
    const result = ship(this.state, this.clock(), this.rng);
    if (result) this.emit({ type: 'shipped', result, totalStars: this.state.stars });
    return result;
  }

  /** Credits time away (closed app, sleeping tab) at the reduced offline rate, capped. */
  creditTimeAway(seconds: number): void {
    const capped = Math.min(OFFLINE.maxSeconds, Math.max(0, seconds));
    const lines = perSecond(this.state, this.clock()).mul(capped * OFFLINE.rate).floor();
    if (lines.lt(1)) return;
    addLines(this.state, lines, false);
    this.emit({ type: 'offline', lines, seconds: capped });
  }

  /** Advances the game to now. Call it often (every 100–250 ms). */
  tick(options: { canSpawnBug?: boolean } = {}): void {
    const now = this.clock();
    const dt = Math.max(0, (now - this.lastTick) / 1000); // a clock moved backwards gives nothing
    this.lastTick = now;

    if (dt > OFFLINE.thresholdS) this.creditTimeAway(dt);
    else if (dt > 0) addLines(this.state, perSecond(this.state, now).mul(dt));

    const result = resolveSprint(this.state, now, this.rng);
    if (result) this.emit({ type: 'sprintEnded', result });

    const bug = updateBugs(this.state, now, this.rng, options.canSpawnBug ?? true);
    if (bug === 'spawned') this.emit({ type: 'bugSpawned', expiresAt: this.state.bug!.expiresAt });
    else if (bug === 'escaped') this.emit({ type: 'bugEscaped' });

    for (const achievement of checkAchievements(this.state, { tapRate: this.tapRate(2000) })) {
      this.emit({ type: 'achievement', achievement });
    }
  }
}
