import type { Game } from '../core/game';
import { boostActive } from '../core/economy';
import { clock, fmt, fmtRate } from '../core/num';
import { $, esc, setText } from './dom';

/** Readout, editor tabline and status line. Cheap enough to update every frame. */
export class Header {
  private readonly el = {
    lines: $('#loc'),
    sub: $('#sub'),
    perTap: $('#rTap'),
    perSecond: $('#rAuto'),
    boost: $('#rBoost'),
    mode: $('#mode'),
    lineNo: $('#stLn'),
    problems: $('#stProb'),
    sprintTab: $('#sTab'),
    sprintBar: $('#sBar'),
  };
  private subHtml = '';
  private sprintTabHtml = '';

  constructor(private readonly game: Game) {}

  /** Bounces the star count in the readout (after a ship). */
  bounceStars(): void {
    const st = this.el.sub.querySelector('.st');
    if (!st) return;
    st.classList.remove('pop');
    void (st as HTMLElement).offsetWidth; // restart the animation
    st.classList.add('pop');
  }

  update(bugOnScreen: boolean, typing: boolean): void {
    const s = this.game.state;
    const now = this.game.now();
    const el = this.el;
    setText(el.lines, fmt(s.lines));
    setText(el.perTap, `+${fmtRate(this.game.perTap())}`);
    setText(el.perSecond, fmtRate(this.game.perSecond()));

    const sub = `release v${s.release}.0 · <span class="st">${s.stars}</span> star${s.stars === 1 ? '' : 's'}`;
    if (sub !== this.subHtml) el.sub.innerHTML = this.subHtml = sub;

    const boosted = boostActive(s, now);
    el.boost.hidden = !boosted;
    if (boosted) setText(el.boost, `x${s.boost!.multiplier} ${clock((s.boost!.endsAt - now) / 1000)}`);

    setText(el.mode, typing ? 'INSERT' : 'NORMAL');
    el.mode.classList.toggle('ins', typing);
    setText(el.lineNo, `ln ${s.editorLine.toLocaleString('en-US')}`);
    setText(el.problems, bugOnScreen ? '1 problem' : '0 problems');
    el.problems.classList.toggle('err', bugOnScreen);

    if (s.sprint) {
      const html = `${esc(s.sprint.id.toLowerCase())}.ts <b>${clock((s.sprint.endsAt - now) / 1000)}</b>`;
      if (html !== this.sprintTabHtml) el.sprintTab.innerHTML = this.sprintTabHtml = html;
      el.sprintTab.hidden = false;
      el.sprintBar.style.width = `${Math.min(100, s.sprint.progress.div(s.sprint.target).toNumber() * 100)}%`;
    } else {
      el.sprintTab.hidden = true;
      el.sprintBar.style.width = '0';
    }
  }
}
