import type { Game } from '../../core/game';
import { clock, fmt } from '../../core/num';
import { difficultyOf, requiredTapRate } from '../../core/sprints';
import { SPRINT_TIERS } from '../../core/content';
import { esc, setText } from '../dom';
import { sprintResultText } from '../messages';

export function renderSprints(game: Game): string {
  const s = game.state;
  let html = '<div class="bar"><h2>Backlog</h2><span class="pace" data-pace></span></div>';
  if (s.lastSprint) html += `<div class="note ${s.lastSprint.ok ? 'ok' : 'bad'}">${esc(sprintResultText(s.lastSprint))}</div>`;
  if (s.sprint) {
    html += `<article class="tk live">
      <div class="tkh"><span>${esc(s.sprint.id)} in progress</span><span class="df tight" data-sp-time></span></div>
      <h3>${esc(s.sprint.title)}</h3>
      <div class="prog"><i data-sp-bar></i></div>
      <p class="need" data-sp-text></p>
    </article>`;
  }
  s.backlog.forEach((t, i) => {
    if (s.sprint?.slot === i) return;
    const boost = SPRINT_TIERS[t.tier]?.boost;
    html += `<article class="tk">
      <div class="tkh"><span>${esc(t.id)}</span><span class="df" data-tier="${i}"></span></div>
      <h3>${esc(t.title)}</h3>
      <dl><div><dt>Target</dt><dd>${fmt(t.target)}</dd></div><div><dt>Time</dt><dd>${clock(t.durationS)}</dd></div><div><dt>Reward</dt><dd>+${fmt(t.reward)}</dd></div></dl>
      <p class="need" data-need="${i}"></p>
      ${boost ? `<p class="need">Bonus: ×${boost.multiplier} output for ${boost.seconds} seconds.</p>` : ''}
      <button class="go" data-start="${i}"${s.sprint ? ' disabled' : ''}>Start sprint</button>
    </article>`;
  });
  return html;
}

export function refreshSprints(game: Game, root: HTMLElement): void {
  const s = game.state;
  const now = game.now();
  const pace = game.tapRate(5000);
  setText(root.querySelector('[data-pace]'), pace > 0 ? `Your pace: ${pace.toFixed(1)} taps/s` : 'Tap to measure your pace');

  root.querySelectorAll<HTMLElement>('[data-need]').forEach((el) => {
    const slot = Number(el.dataset.need);
    const t = s.backlog[slot];
    if (!t) return;
    const rate = requiredTapRate(s, t, now);
    setText(el, rate <= 0 ? 'Your automation covers this one on its own.' : `Needs about ${rate.toFixed(1)} taps per second at your current output.`);
    const tag = root.querySelector(`[data-tier="${slot}"]`);
    if (tag) {
      const level = difficultyOf(rate);
      tag.className = `df ${level}`;
      setText(tag, level);
    }
  });

  if (s.sprint) {
    setText(root.querySelector('[data-sp-time]'), `${clock((s.sprint.endsAt - now) / 1000)} left`);
    const bar = root.querySelector<HTMLElement>('[data-sp-bar]');
    if (bar) bar.style.width = `${Math.min(100, s.sprint.progress.div(s.sprint.target).toNumber() * 100)}%`;
    setText(root.querySelector('[data-sp-text]'), `${fmt(s.sprint.progress)} of ${fmt(s.sprint.target)} lines`);
  }
}
