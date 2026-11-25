import { EFFECTS } from '../core/content';
import { debtVisible } from '../core/debt';
import { debtMultiplier, language, projectOf } from '../core/economy';
import { activeEffects, effectSecondsLeft } from '../core/effects';
import type { Game } from '../core/game';
import { clock, fmt, fmtRate } from '../core/num';
import { languageExt, type LanguageId } from './codegen';
import { $, esc, setText } from './dom';

const FLOW_CELLS = 8;

/** Readout, effects, editor tabline and status line (mode + flow meter). Cheap enough to update every frame. */
export class Header {
  private readonly el = {
    lines: $('#loc'),
    sub: $('#sub'),
    perTap: $('#rTap'),
    perSecond: $('#rAuto'),
    fx: $('#fx'),
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
    setText(el.perTap, `+${fmtRate(g.perTap())}`);
    setText(el.perSecond, fmtRate(g.perSecond()));
    this.html('sub', el.sub, `release v${s.release}.0 · <span class="st">${s.stars}</span> star${s.stars === 1 ? '' : 's'}`);

    const fx = activeEffects(s, now);
    el.fx.hidden = fx.length === 0;
    if (fx.length) this.html('fx', el.fx, fx.map((id) => `<span class="e e-${id}">${EFFECTS[id].file?.replace('.sh', '') ?? id} ${clock(effectSecondsLeft(s, id, now))}</span>`).join(''));

    // The mode shows an alarm while something needs mashing or picking.
    const alarm = s.boss?.phase === 'fight' ? 'BOSS' : s.incident?.kind === 'outage' ? 'OUTAGE' : s.incident?.kind === 'conflict' ? 'MERGE' : null;
    setText(el.mode, alarm ?? (typing ? 'INSERT' : 'NORMAL'));
    el.mode.classList.toggle('ins', typing && !alarm);
    el.mode.classList.toggle('alarm', !!alarm);

    // The file, language and folder follow the funding round and the project.
    const ext = languageExt(language(s).id as LanguageId);
    setText(el.mainTab, `main.${ext}`);
    setText(el.lang, `utf-8 · ${ext}`);
    setText(el.path, `~/${projectOf(s).dir}/src`);
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
}
