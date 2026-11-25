import type { Game } from '../core/game';
import { boostActive } from '../core/economy';
import { clock, fmt, fmtRate } from '../core/num';
import { $, esc, setText } from './dom';

/** Counter, rate pills, editor tab and status bar. Cheap enough to update every frame. */
export class Header {
  private readonly el = {
    lines: $('#loc'),
    perTap: $('#rTap'),
    perSecond: $('#rAuto'),
    boost: $('#rBoost'),
    lineNo: $('#stLn'),
    problems: $('#stProb'),
    version: $('#ver'),
    sprintTab: $('#sTab'),
    sprintBar: $('#sBar'),
  };
  private sprintTabHtml = '';

  constructor(private readonly game: Game) {}

  update(bugOnScreen: boolean): void {
    const s = this.game.state;
    const now = this.game.now();
    const el = this.el;
    setText(el.lines, fmt(s.lines));
    setText(el.perTap, `+${fmtRate(this.game.perTap())} / tap`);
    setText(el.perSecond, `${fmtRate(this.game.perSecond())} / s`);

    const boosted = boostActive(s, now);
    el.boost.hidden = !boosted;
    if (boosted) setText(el.boost, `×${s.boost!.multiplier} for ${clock((s.boost!.endsAt - now) / 1000)}`);

    setText(el.lineNo, `Ln ${s.editorLine.toLocaleString('en-US')}`);
    setText(el.problems, bugOnScreen ? '1 problem' : '0 problems');
    el.problems.classList.toggle('err', bugOnScreen);
    setText(el.version, `v${s.release}.0`);

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
