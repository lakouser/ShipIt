import { describe, expect, it } from 'vitest';
import { BUGS, OFFLINE, SPRINT_TIERS } from '../src/core/content';
import type { GameEvent } from '../src/core/game';
import { D } from '../src/core/num';
import { testGame } from './helpers';

describe('time', () => {
  it('produces automation output each tick', () => {
    const t = testGame((s) => (s.owned.duck = 10));
    t.advance(1000);
    t.game.tick();
    expect(t.state.lines.toNumber()).toBeCloseTo(10);
  });

  it('credits long gaps at the offline rate, capped', () => {
    const t = testGame((s) => (s.owned.duck = 10));
    const events: GameEvent[] = [];
    t.game.on((e) => events.push(e));
    t.advance(10 * 60 * 60 * 1000); // 10 hours
    t.game.tick();
    expect(t.state.lines.toNumber()).toBe(10 * OFFLINE.maxSeconds * OFFLINE.rate);
    expect(events.some((e) => e.type === 'offline')).toBe(true);
  });

  it('gives nothing when the clock moves backwards', () => {
    const t = testGame((s) => (s.owned.duck = 10));
    t.advance(-5000);
    t.game.tick();
    expect(t.state.lines.toNumber()).toBe(0);
  });
});

describe('sprints', () => {
  it('pays the reward when the target is hit in time', () => {
    const t = testGame();
    const ticket = t.state.backlog[0];
    t.game.startSprint(0);
    while (t.state.sprint) {
      t.game.tap();
      t.advance(100);
      t.game.tick();
    }
    expect(t.state.lastSprint?.ok).toBe(true);
    expect(t.state.sprintsMerged).toBe(1);
    expect(t.state.lines.gte(ticket.target.add(ticket.reward))).toBe(true);
  });

  it('keeps every line written when the deadline is missed', () => {
    const t = testGame();
    t.game.startSprint(0);
    for (let i = 0; i < 5; i++) t.game.tap();
    t.advance(SPRINT_TIERS[0].durationS * 1000 + 1);
    t.game.tick();
    expect(t.state.lastSprint?.ok).toBe(false);
    expect(t.state.lines.toNumber()).toBe(5);
    expect(t.state.sprint).toBeNull();
    expect(t.state.backlog).toHaveLength(3);
  });

  it('grants a boost for the long ticket', () => {
    const t = testGame();
    t.game.startSprint(2);
    t.state.sprint!.progress = t.state.sprint!.target;
    t.game.tick();
    expect(t.state.boost?.multiplier).toBe(2);
  });
});

describe('bugs', () => {
  it('spawns after the first delay, escapes if ignored', () => {
    const t = testGame();
    const events: string[] = [];
    t.game.on((e) => events.push(e.type));
    t.advance(BUGS.firstDelayMs);
    t.game.tick();
    expect(t.state.bug).not.toBeNull();
    t.advance(BUGS.lifetimeMs);
    t.game.tick();
    expect(t.state.bug).toBeNull();
    expect(events).toEqual(expect.arrayContaining(['bugSpawned', 'bugEscaped']));
  });

  it('does not spawn while hidden', () => {
    const t = testGame();
    t.advance(BUGS.firstDelayMs + 1);
    t.game.tick({ canSpawnBug: false });
    expect(t.state.bug).toBeNull();
  });

  it('rewards squashing', () => {
    const t = testGame();
    t.advance(BUGS.firstDelayMs);
    t.game.tick();
    const reward = t.game.squashBug();
    expect(reward?.toNumber()).toBe(BUGS.minReward);
    expect(t.state.bugsSquashed).toBe(1);
    expect(t.game.squashBug()).toBeNull();
  });
});

describe('ship', () => {
  it('needs 25,000 lines for the first star and resets the release', () => {
    const t = testGame((s) => {
      s.owned.kb = 10;
      s.thisRelease = D(24_999);
    });
    expect(t.game.ship()).toBeNull();
    t.state.thisRelease = D(100_000);
    t.state.lines = D(5_000);
    const result = t.game.ship()!;
    expect(result.stars).toBe(2);
    expect(result.starsBefore).toBe(0);
    expect(result.linesBefore.toNumber()).toBe(5_000);
    expect(result.releaseLines.toNumber()).toBe(100_000);
    expect(result.release).toBe(2);
    expect(t.state.release).toBe(2);
    expect(t.state.lines.toNumber()).toBe(0);
    expect(t.state.owned).toEqual({});
    expect(t.game.perTap().toNumber()).toBeCloseTo(1.2);
  });
});

describe('achievements', () => {
  it('unlocks once and reports it', () => {
    const t = testGame();
    const names: string[] = [];
    t.game.on((e) => e.type === 'achievement' && names.push(e.achievement.id));
    for (let i = 0; i < 100; i++) t.game.tap();
    t.game.tick();
    t.game.tick();
    expect(names.filter((n) => n === 'hello')).toHaveLength(1);
  });
});
