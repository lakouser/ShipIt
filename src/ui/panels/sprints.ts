import { SPRINT_TIERS } from '../../core/content';
import type { Game } from '../../core/game';
import { clock, fmt } from '../../core/num';
import { difficultyOf, requiredTapRate } from '../../core/sprints';
import { esc, setText } from '../dom';
import { sprintResultText, textBar } from '../messages';

export function renderSprints(game: Game): string {
  const s = game.state;
  let html = '<div class="cmd"><span><span class="ps">$</span> backlog ls</span><span class="aside" data-pace></span></div>';
  if (s.lastSprint) {
    html += `<div class="note ${s.lastSprint.ok ? 'ok' : 'bad'}"><span class="tag">${s.lastSprint.ok ? '[ ok ]' : '[fail]'}</span> ${esc(sprintResultText(s.lastSprint))}</div>`;
  }
  if (s.sprint) {
    html += `<article class="tk live">
      <div class="tkh"><span class="id">${esc(s.sprint.id)} · running</span><span class="df tight" data-sp-time></span></div>
      <h3>${esc(s.sprint.title)}</h3>
      <div class="tbar" data-sp-bar></div>
      <p class="need" data-sp-text></p>
    </article>`;
  }
  s.backlog.forEach((t, i) => {
    if (s.sprint?.slot === i) return;
    const boost = SPRINT_TIERS[t.tier]?.boost;
    html += `<article class="tk">
      <div class="tkh"><span class="id">${esc(t.id)}</span><span class="df" data-tier="${i}"></span></div>
      <h3>${esc(t.title)}</h3>
      <div class="kv"><span>target <b>${fmt(t.target)}</b></span><span>time <b>${clock(t.durationS)}</b></span><span>reward <b class="rw">+${fmt(t.reward)}</b></span></div>
      <p class="need" data-need="${i}"></p>
      ${boost ? `<p class="need">bonus: x${boost.multiplier} output for ${boost.seconds}s</p>` : ''}
      <button class="go" data-start="${i}"${s.sprint ? ' disabled' : ''}>start sprint</button>
    </article>`;
  });
  return html;
}

export function refreshSprints(game: Game, root: HTMLElement): void {
  const s = game.state;
  const now = game.now();
  const pace = game.tapRate(5000);
  setText(root.querySelector('[data-pace]'), pace > 0 ? `pace ${pace.toFixed(1)} taps/s` : 'tap to measure pace');

  root.querySelectorAll<HTMLElement>('[data-need]').forEach((el) => {
    const slot = Number(el.dataset.need);
    const t = s.backlog[slot];
    if (!t) return;
    const rate = requiredTapRate(s, t, now);
    setText(el, rate <= 0 ? 'automation covers this one on its own' : `needs ~${rate.toFixed(1)} taps/s at current output`);
    const tag = root.querySelector(`[data-tier="${slot}"]`);
    if (tag) {
      const level = difficultyOf(rate);
      tag.className = `df ${level}`;
      setText(tag, `[${level}]`);
    }
  });

  if (s.sprint) {
    setText(root.querySelector('[data-sp-time]'), `${clock((s.sprint.endsAt - now) / 1000)} left`);
    const bar = root.querySelector<HTMLElement>('[data-sp-bar]');
    if (bar) {
      const b = textBar(s.sprint.progress.div(s.sprint.target).toNumber(), 22);
      const html = `${b.done}<span class="rest">${b.rest}</span> ${b.pct}`;
      if (bar.innerHTML !== html) bar.innerHTML = html;
    }
    setText(root.querySelector('[data-sp-text]'), `${fmt(s.sprint.progress)} of ${fmt(s.sprint.target)} lines`);
  }
}
