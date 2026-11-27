import { careerTitle } from '../core/career';
import { FUNDING, SHIP } from '../core/content';
import { debtVisible } from '../core/debt';
import { critChance, debtMultiplier, language, outputShares, projectOf } from '../core/economy';
import { quarterLeft } from '../core/corp';
import { canRaise, roundName, starsForNextRound } from '../core/funding';
import type { Game } from '../core/game';
import { majorsUnlocked, starsForNextXp, xpAvailable } from '../core/major';
import { churnShare, standing, usersNow } from '../core/market';
import { clock, fmt, fmtRate } from '../core/num';
import { currentVersion, linesForStars, shipGain, starsAvailable } from '../core/ship';
import { languageExt, type LanguageId } from './codegen';
import { $, esc, setText } from './dom';
import { tint } from './hl';
import { etaText, nextStarProgress, secondsFor, short } from './nav';
import { shortName } from './workspace';

const FLOW_CELLS = 8;
const pct = (fraction: number): string => `${fmt(Math.round(fraction * 100))}%`;

/**
 * Readout, goal line, editor tabline and status line (mode + flow meter). update() is cheap enough for
 * every frame; updateGoal() does the star maths and runs on the game tick.
 */
export class Header {
  private readonly el = {
    lines: $('#loc'),
    sub: $('#sub'),
    tline: $('#tline'),
    perTap: $('#rTap'),
    perSecond: $('#rAuto'),
    keyTap: $('#kTap'),
    keySub: $('#kSub'),
    mode: $('#mode'),
    flow: $('#flow'),
    lineNo: $('#stLn'),
    problems: $('#stProb'),
    sprintTab: $('#sTab'),
    sprintBar: $('#sBar'),
    debt: $('#stDebt'),
    lang: $('#stLang'),
    mainTab: $('#mainTab'),
    path: $('#path'),
    goalKey: $('#goalKey'),
    goalBar: $('#goalBar'),
    goalPct: $('#goalPct'),
    goalEta: $('#goalEta'),
    goalReady: $('#goalReady'),
    goalNext: $('#goalNext'),
  };
  private cache: Record<string, string> = {};

  constructor(private readonly game: Game) {}

  /** Bounces the star count in the readout (after a ship). */
  bounceStars(): void {
    const st = this.el.sub.querySelector('.st');
    if (!st) return;
    st.classList.remove('pop');
    void (st as HTMLElement).offsetWidth; // restart the animation
    st.classList.add('pop');
  }

  private html(key: string, el: HTMLElement, html: string): void {
    if (this.cache[key] !== html) el.innerHTML = this.cache[key] = html;
  }

  update(problems: number, typing: boolean): void {
    const g = this.game;
    const s = g.state;
    const now = g.now();
    const el = this.el;
    setText(el.lines, fmt(s.lines));
    const tap = `+${fmtRate(g.perTap())}`;
    setText(el.perTap, tap);
    setText(el.keyTap, tap);
    setText(el.perSecond, fmtRate(g.perSecond()));

    // The mode shows an alarm while something needs mashing or picking.
    const alarm = s.boss?.phase === 'fight' ? 'BOSS' : s.incident?.kind === 'outage' ? 'OUTAGE' : s.incident?.kind === 'conflict' ? 'MERGE' : null;
    setText(el.mode, alarm ?? (typing ? 'INSERT' : 'NORMAL'));
    el.mode.classList.toggle('ins', typing && !alarm);
    el.mode.classList.toggle('alarm', !!alarm);

    // The file, language and folder follow the funding round and the project.
    const ext = languageExt(language(s).id as LanguageId);
    setText(el.mainTab, `main.${ext}`);
    setText(el.lang, `utf-8 · ${ext}`);
    setText(el.path, `~/${projectOf(s).dir}`);
    el.debt.hidden = !debtVisible(s);
    if (!el.debt.hidden) {
      setText(el.debt, `debt ${Math.round(s.debt)}%`);
      el.debt.classList.toggle('err', debtMultiplier(s) < 1);
    }
    const filled = Math.round(g.flow * FLOW_CELLS);
    const flowHtml = `<span class="fc">${'▮'.repeat(filled)}</span><span class="fe">${'▯'.repeat(FLOW_CELLS - filled)}</span> x${g.flowMultiplier().toFixed(1)}`;
    this.html('flow', el.flow, flowHtml);
    el.flow.classList.toggle('max', g.flow >= 1);

    setText(el.lineNo, `ln ${s.editorLine.toLocaleString('en-US')}`);
    setText(el.problems, `${problems} problem${problems === 1 ? '' : 's'}`);
    el.problems.classList.toggle('err', problems > 0);

    if (s.sprint) {
      this.html('tab', el.sprintTab, `${esc(s.sprint.id.toLowerCase())}.${ext} <b>${clock((s.sprint.endsAt - now) / 1000)}</b>`);
      el.sprintTab.hidden = false;
      el.sprintBar.style.width = `${Math.min(100, s.sprint.progress.div(s.sprint.target).toNumber() * 100)}%`;
    } else {
      el.sprintTab.hidden = true;
      el.sprintBar.style.width = '0';
    }
  }

  /** The sub-line, the company line once the app is in the store, and the goal line. */
  updateGoal(): void {
    const g = this.game;
    const s = g.state;
    const now = g.now();
    const el = this.el;
    // The company line comes with the first funding round (the app is in the store by then).
    const inStore = s.market.startedAt > 0 && s.round > 0;
    // Once the company line is up, it names the app; the folder would repeat it.
    this.html(
      'sub',
      el.sub,
      `${inStore ? '' : `${esc(projectOf(s).dir)} `}v${currentVersion(s)} · <span class="st">${short(s.stars)}</span> ★ · ${esc(careerTitle(s))}`,
    );
    el.tline.hidden = !inStore;
    if (inStore) {
      const drift = churnShare(s) > 0 ? ` <span class="bad">▼</span>` : '';
      this.html(
        'tline',
        el.tline,
        `<span class="tapp">${esc(s.market.appName)}</span><span>${fmt(usersNow(s))} users</span><span class="trk">#${standing(s, now).rank}</span>${drift}<span class="fill"></span>${
          s.corp.ipoAt ? `<span class="trd">Q${s.corp.quarter} ${clock(quarterLeft(s))}</span>` : s.round > 0 ? `<span class="trd">${esc(roundName(s.round))}</span>` : ''
        }`,
      );
    }

    // The key names what powers a tap, once there is more than one thing.
    const taps = outputShares(s, 'tap').slice(0, 2).map((x) => shortName(x.upgrade.id));
    if (critChance(s, now) > 0) taps.push('crit');
    setText(el.keySub, taps.length > 1 ? taps.join(' · ') : '');

    // next ★: progress to the next star of this release, and how long it should take.
    const stars = starsAvailable(s);
    const progress = nextStarProgress(s);
    setText(el.goalKey, stars < 1 && s.release <= 1 && s.round === 0 ? 'first ★' : 'next ★');
    el.goalBar.style.width = `${(progress * 100).toFixed(1)}%`;
    setText(el.goalPct, `${Math.floor(progress * 100)}%`);
    const eta = etaText(secondsFor(g, linesForStars(s, stars + 1).sub(s.thisRelease)));
    setText(el.goalEta, eta ?? '');

    // Left: whether the release is worth merging. Right: the next round, then major versions.
    const gain = shipGain(s);
    const ready =
      !s.unlocked.ship || stars < 1 ? `<span class="cm">a release needs</span> ${tint('loc', fmt(linesForStars(s, 1)))} <span class="cm">lines</span>`
      : gain >= SHIP.readyAt ? `<span class="okc">✓ ready to merge</span>${gain === Infinity ? '' : ` ${tint('star', `+${pct(gain)}`)}`}`
      : `${tint('star', `+${pct(gain)} ★`)} <span class="cm">· ready at</span> ${tint('loc', `+${pct(SHIP.readyAt)}`)}`;
    this.html('ready', el.goalReady, ready);
    let next = '';
    if (s.unlocked.ship && s.round < FUNDING.maxRounds && (s.stars > 0 || s.round > 0)) {
      const round = roundName(s.round + 1).toLowerCase();
      next = canRaise(s) ? `${round} <span class="okc">✓ ready</span>` : `${round} ${tint('star', `${short(s.stars)}/${short(starsForNextRound(s))} ★`)}`;
    } else if (majorsUnlocked(s)) {
      const xp = xpAvailable(s);
      next = xp >= 1 ? `major ${tint('star', `+${fmt(xp)} xp`)}` : `next xp at ${tint('star', `${fmt(starsForNextXp(s))} ★`)}`;
    }
    this.html('next', el.goalNext, next);
  }
}
