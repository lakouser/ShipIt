import { describe, expect, it } from 'vitest';
import { BUGS, CRIT, EFFECTS, FLOW, INCIDENTS, OFFLINE, SPRINT_TIERS, UNLOCKS } from '../src/core/content';
import type { GameEvent } from '../src/core/game';
import { D } from '../src/core/num';
import { chartMultiplier } from '../src/core/market';
import { linesForStars, shippedForStars, shipReady, starsAvailable, starsPerMinute } from '../src/core/ship';
import { fixedRng, testGame } from './helpers';

const types = (events: GameEvent[]) => events.map((e) => e.type);

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
    expect(types(events)).toContain('offline');
    expect(t.state.flags.touchGrass).toBe(true);
  });

  it('crontab raises the offline rate and cap', () => {
    const t = testGame((s) => {
      s.owned.duck = 10;
      s.perks.cron = 2;
    });
    t.game.creditTimeAway(10 * 3600);
    expect(t.state.lines.toNumber()).toBeCloseTo(10 * (OFFLINE.maxSeconds + 2 * 3600) * (OFFLINE.rate + 0.2));
  });

  it('gives nothing when the clock moves backwards', () => {
    const t = testGame((s) => (s.owned.duck = 10));
    t.advance(-5000);
    t.game.tick();
    expect(t.state.lines.toNumber()).toBe(0);
  });
});

describe('taps, flow and crits', () => {
  it('builds flow with taps and drains it after a pause', () => {
    const t = testGame(undefined, fixedRng(0.99));
    const events: GameEvent[] = [];
    t.game.on((e) => events.push(e));
    const first = t.game.tap().toNumber();
    expect(first).toBeCloseTo(1 + FLOW.gainPerTap * FLOW.maxBonus);
    for (let i = 0; i < 20; i++) t.game.tap();
    expect(t.game.flow).toBe(1);
    expect(t.state.stats.flowMaxed).toBe(1);
    expect(types(events)).toContain('flowMax');
    t.advance(3000);
    t.game.tick();
    expect(t.game.flow).toBeLessThan(1);
  });

  it('crits multiply a tap', () => {
    const t = testGame((s) => (s.perks.keybindings = 5), fixedRng(0.01));
    const lines = t.game.tap().toNumber();
    expect(lines).toBeCloseTo((1 + FLOW.gainPerTap) * CRIT.multiplier);
    expect(t.state.stats.crits).toBe(1);
  });
});

describe('scripts and perks', () => {
  it('runs a script from the inventory and expires it', () => {
    const t = testGame();
    expect(t.state.scripts.turbo).toBe(1);
    const before = t.game.perTap().toNumber();
    expect(t.game.runScript('turbo')).toBe(true);
    expect(t.game.perTap().toNumber()).toBe(before * 2);
    expect(t.game.runScript('turbo')).toBe(false);
    const events: GameEvent[] = [];
    t.game.on((e) => events.push(e));
    t.advance(121_000);
    t.game.tick();
    expect(types(events)).toContain('effectEnded');
    // Running the script also unlocked "chmod +x" (+1%).
    expect(t.game.perTap().toNumber()).toBeCloseTo(before * (1 + 0.01 * t.state.achievements.length));
  });

  it('autotype.sh taps on its own', () => {
    const t = testGame((s) => (s.scripts.autotype = 1));
    t.game.runScript('autotype');
    for (let i = 0; i < 10; i++) {
      t.advance(200);
      t.game.tick();
    }
    expect(t.state.stats.taps).toBe(2 * EFFECTS.autotype.autoTapsPerSecond!);
  });

  it('spends stars on dotfiles without lowering the star bonus', () => {
    const t = testGame((s) => {
      s.stars = 3;
      s.owned.kb = 3;
    });
    const tapBefore = t.game.perTap().toNumber();
    expect(t.game.buyPerk('keybindings')).toBe(false); // needs .vimrc first
    expect(t.game.buyPerk('vimrc')).toBe(true);
    expect(t.state.starsSpent).toBe(1);
    expect(t.game.perTap().toNumber()).toBeCloseTo(tapBefore * 1.25);
    expect(t.game.buyPerk('vimrc')).toBe(true); // level 2 costs 2
    expect(t.game.buyPerk('vimrc')).toBe(false); // out of stars
    expect(t.state.stars).toBe(3);
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
    expect(t.state.stats.sprints).toBe(1);
    expect(t.state.lines.gte(ticket.target.add(ticket.reward))).toBe(true);
  });

  it('keeps every line written when the deadline is missed', () => {
    const t = testGame();
    t.game.startSprint(0);
    let written = D(0);
    for (let i = 0; i < 5; i++) written = written.add(t.game.tap());
    t.advance(SPRINT_TIERS[0].durationS * 1000 + 1);
    t.game.tick();
    expect(t.state.lastSprint?.ok).toBe(false);
    expect(t.state.lines.toNumber()).toBeCloseTo(written.toNumber());
    expect(t.state.sprint).toBeNull();
    expect(t.state.backlog).toHaveLength(3);
  });

  it('a used ticket waits for the next standup before a fresh one appears', () => {
    const t = testGame();
    t.game.startSprint(0);
    t.state.sprint!.progress = t.state.sprint!.target;
    t.game.tick();
    expect(t.state.backlog[0].readyAt).toBeGreaterThan(t.now);
    expect(t.game.startSprint(0)).toBeNull();
    t.advance(SPRINT_TIERS[0].cooldownS * 1000);
    t.game.tick();
    expect(t.state.backlog[0].readyAt).toBe(0);
    expect(t.game.startSprint(0)).not.toBeNull();
  });

  it('the long ticket always drops a script', () => {
    const t = testGame();
    t.game.startSprint(2);
    t.state.sprint!.progress = t.state.sprint!.target;
    t.game.tick();
    expect(t.state.lastSprint?.script).not.toBeNull();
  });

  it('timeouts.conf adds time to new tickets', () => {
    const t = testGame((s) => {
      s.stars = 10;
      s.perks.cache = 1;
    });
    t.game.buyPerk('timeouts');
    expect(t.state.backlog[0].durationS).toBe(Math.round(SPRINT_TIERS[0].durationS * 1.1));
  });
});

describe('bugs and incidents', () => {
  it('spawns a bug after the first delay, which escapes if ignored', () => {
    const t = testGame();
    const events: GameEvent[] = [];
    t.game.on((e) => events.push(e));
    t.advance(BUGS.firstDelayMs);
    t.game.tick();
    expect(t.state.bug).not.toBeNull();
    t.advance(BUGS.lifetimeMs);
    t.game.tick();
    expect(t.state.bug).toBeNull();
    expect(types(events)).toEqual(expect.arrayContaining(['bugSpawned', 'bugEscaped']));
    expect(t.state.stats.bugsEscaped).toBe(1);
  });

  it('does not spawn while hidden', () => {
    const t = testGame();
    t.advance(BUGS.firstDelayMs + 1);
    t.game.tick({ canSpawn: false });
    expect(t.state.bug).toBeNull();
  });

  it('rewards squashing', () => {
    const t = testGame();
    t.advance(BUGS.firstDelayMs);
    t.game.tick();
    const reward = t.game.squashBug();
    expect(reward?.toNumber()).toBe(BUGS.minReward);
    expect(t.state.stats.bugs).toBe(1);
    expect(t.game.squashBug()).toBeNull();
  });

  it('oncall.yml can squash a bug by itself', () => {
    const t = testGame((s) => (s.perks.oncall = 5), fixedRng(0.1));
    t.advance(BUGS.firstDelayMs);
    t.game.tick();
    expect(t.state.bug).toBeNull();
    expect(t.state.stats.bugs).toBe(1);
  });

  it('coffee boosts everything; outages are fixed by tapping; conflicts reward the right pick', () => {
    const t = testGame((s) => (s.lifetime = D(1000)));
    t.game.dev('incident', 'coffee');
    expect(t.game.catchCoffee()).toBe(true);
    expect(t.state.effects.coffee).toBeGreaterThan(t.now);

    t.game.dev('incident', 'outage');
    for (let i = 0; i < INCIDENTS.outage.taps; i++) t.game.tap();
    expect(t.state.incident).toBeNull();
    expect(t.state.stats.outagesFixed).toBe(1);

    t.game.dev('incident', 'conflict');
    const inc = t.state.incident;
    expect(inc?.kind).toBe('conflict');
    const correct = inc?.kind === 'conflict' ? inc.correct : 0;
    expect(t.game.chooseConflict(correct)).toBe(true);
    expect(t.state.stats.conflictsResolved).toBe(1);
  });

  it('missing an incident costs nothing', () => {
    const t = testGame();
    t.game.dev('incident', 'outage');
    const lines = t.state.lines;
    t.advance(INCIDENTS.outage.lifetimeMs + 1);
    t.game.tick({ canSpawn: false });
    expect(t.state.incident).toBeNull();
    expect(t.state.lines.gte(lines)).toBe(true);
  });
});

describe('unlocks, quests and milestone', () => {
  it('reveals tabs as the player progresses and then hands out tasks', () => {
    const t = testGame();
    const unlocked: string[] = [];
    t.game.on((e) => e.type === 'unlocked' && unlocked.push(e.tab));
    t.state.lifetime = D(UNLOCKS.todoAtLifetime);
    t.game.tick();
    expect(unlocked).toEqual(['sprints', 'todo']);
    expect(t.state.quests).toHaveLength(3);
  });

  it('completes tasks and applies their rewards', () => {
    const t = testGame((s) => (s.unlocked.todo = true));
    t.game.tick();
    const done: string[] = [];
    t.game.on((e) => e.type === 'questDone' && done.push(e.quest.template));
    t.game.dev('quests');
    expect(done).toHaveLength(3);
    expect(t.state.stats.quests).toBe(3);
    const bonus = Object.values(t.state.questBonus).reduce((a, b) => a + b, 0);
    const scripts = Object.values(t.state.scripts).reduce((a, b) => a + (b ?? 0), 0);
    expect(bonus > 0 || scripts > 1).toBe(true);
    // Slots refill one at a time after a delay.
    expect(t.state.quests).toHaveLength(0);
    t.advance(46_000);
    t.game.tick();
    expect(t.state.quests).toHaveLength(1);
  });

  it('pays a finished milestone as extra stars when the release ships', () => {
    const t = testGame();
    const m = t.state.milestone!;
    expect(m.release).toBe(1);
    expect(m.tasks[0].target).toBe('20000000'); // first release: at least 16M, rounded to read cleanly
    t.state.thisRelease = D(m.tasks[0].target);
    t.state.owned = { kb: 40 };
    t.state.stats.sprints = 5;
    t.game.tick();
    expect(t.state.milestone?.done).toBe(true);
    expect(t.state.stars).toBe(0);
    const result = t.game.ship()!;
    expect(result.bonus).toBe(1); // max(flat 1, 25% of 4)
    expect(result.stars).toBe(5);
    expect(t.state.stats.starsEarned).toBe(5);
  });
});

describe('ship', () => {
  it('needs 2M lines to ship, pays 2·cbrt(lines / 2M) stars and resets the release', () => {
    const t = testGame((s) => {
      s.owned.kb = 10;
      s.thisRelease = D(1_999_999);
    });
    expect(starsAvailable(t.state)).toBe(0); // the curve alone would pay 1 here
    expect(t.game.ship()).toBeNull();
    t.state.thisRelease = D(16_000_000);
    t.state.lines = D(5_000);
    const result = t.game.ship()!;
    expect(result.stars).toBe(4);
    expect(result.starsBefore).toBe(0);
    expect(result.linesBefore.toNumber()).toBe(5_000);
    expect(result.releaseLines.toNumber()).toBe(16_000_000);
    expect(result.release).toBe(2);
    expect(t.state.lines.toNumber()).toBe(0);
    expect(t.state.shipped.toNumber()).toBe(16_000_000);
    expect(t.state.owned).toEqual({});
    expect(t.game.perTap().toNumber()).toBeCloseTo(1.4 * chartMultiplier(t.state, t.now)); // 4 stars, and the chart
    expect(t.state.milestone?.release).toBe(2);
  });

  it('pays for what a release adds to everything shipped this run, so the same release again pays less', () => {
    const t = testGame((s) => (s.thisRelease = D(16_000_000)));
    expect(t.game.ship()?.stars).toBe(4); // 16M shipped: 2·cbrt(8) = 4
    t.state.thisRelease = D(16_000_000);
    expect(t.game.ship()?.stars).toBe(1); // 32M: 2·cbrt(16) = 5.04
    t.state.thisRelease = D(96_000_000);
    expect(t.game.ship()?.stars).toBe(3); // 128M: 2·cbrt(64) = 8
    expect(t.state.stars).toBe(8);
  });

  it('multiplies the curve by the project, and knows how many lines the next stars need', () => {
    const cli = testGame((s) => {
      s.project = 'cli';
      s.thisRelease = D(16_000_000);
    });
    expect(starsAvailable(cli.state)).toBe(6); // 4 on the curve, +50% for a CLI tool
    const t = testGame((s) => (s.shipped = D(16_000_000)));
    expect(linesForStars(t.state, 0).toNumber()).toBe(0);
    for (let n = 1; n <= 6; n++) {
      const needed = linesForStars(t.state, n);
      t.state.thisRelease = needed;
      expect(starsAvailable(t.state)).toBe(n);
      t.state.thisRelease = needed.sub(1);
      expect(starsAvailable(t.state)).toBe(n - 1);
    }
    expect(linesForStars(testGame().state, 1).toNumber()).toBe(2_000_000);
  });

  it('logs each release, tracks stars per minute and calls a release ready at +50%', () => {
    const t = testGame();
    t.advance(10 * 60_000);
    t.state.thisRelease = D(16e6);
    t.game.tick();
    expect(starsPerMinute(t.state, t.now)).toBeCloseTo(0.4);
    t.game.ship();
    expect(t.state.releaseLog[0]).toMatchObject({ version: '0.1', stars: 4, seconds: 600 });
    expect(t.state.releasePeak).toBe(0);
    const r = testGame((s) => {
      s.stars = 8;
      s.shipped = shippedForStars(8);
    });
    r.state.thisRelease = linesForStars(r.state, 3);
    expect(shipReady(r.state)).toBe(false);
    r.state.thisRelease = linesForStars(r.state, 4);
    expect(shipReady(r.state)).toBe(true);
  });

  it('bootstrap.sh starts the next release with packages', () => {
    const t = testGame((s) => {
      s.perks.bootstrap = 2;
      s.thisRelease = D(2_000_000);
    });
    t.game.ship();
    expect(t.state.owned).toEqual({ kb: 10, duck: 10 });
  });
});

describe('achievements', () => {
  it('unlocks once, reports it and adds 1% output', () => {
    const t = testGame((s) => (s.owned.duck = 100));
    const names: string[] = [];
    t.game.on((e) => e.type === 'achievement' && names.push(e.achievement.id));
    const before = t.game.perSecond().toNumber();
    t.state.lifetime = D(150);
    t.game.tick();
    t.game.tick();
    expect(names.filter((n) => n === 'hello')).toHaveLength(1);
    expect(t.game.perSecond().toNumber()).toBeGreaterThan(before);
  });

  it('notices secret keyboard input', () => {
    const t = testGame();
    for (const k of 'sudo') t.game.typed(k);
    t.game.tick();
    expect(t.state.achievements).toContain('sudo');
  });
});
