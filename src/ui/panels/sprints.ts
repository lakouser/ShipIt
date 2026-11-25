import { EFFECTS, SCRIPT_IDS } from '../../core/content';
import { effectActive, effectSecondsLeft } from '../../core/effects';
import type { Game } from '../../core/game';
import { clock, fmt } from '../../core/num';
import { difficultyOf, requiredTapRate } from '../../core/sprints';
import { esc, setText } from '../dom';
import { barHtml, sprintResultText } from '../messages';

export function renderSprints(game: Game): string {
  const s = game.state;
  const now = game.now();
  let html = '<div class="cmd"><span><span class="ps">$</span> ls ~/bin</span><span class="aside">scripts you can run any time</span></div><div class="bin">';
  for (const id of SCRIPT_IDS) {
    const e = EFFECTS[id];
    const count = s.scripts[id] ?? 0;
    html += `<div class="script${count ? '' : ' none'}">
      <div><span class="nm">${e.file}</span> <span class="qty">[${count}]</span><small>${e.description} · ${e.durationS}s</small></div>
      <button class="run" data-run="${id}"${count ? '' : ' disabled'}><span data-fx="${id}">./run</span></button>
    </div>`;
  }
  html += '</div>';

  html += '<div class="cmd gap"><span><span class="ps">$</span> backlog ls</span><span class="aside" data-pace></span></div>';
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
    const waiting = t.readyAt > now;
    html += `<article class="tk${waiting ? ' wait' : ''}">
      <div class="tkh"><span class="id">${waiting ? 'next standup' : esc(t.id)}</span><span class="df" data-tier="${i}"></span></div>
      ${
        waiting
          ? `<h3 class="dimh">new ticket in <span data-ready="${i}"></span></h3>`
          : `<h3>${esc(t.title)}</h3>
      <div class="kv"><span>target <b>${fmt(t.target)}</b></span><span>time <b>${clock(t.durationS)}</b></span><span>reward <b class="rw">+${fmt(t.reward)}</b></span></div>
      <p class="need" data-need="${i}"></p>
      ${t.tier === 2 ? '<p class="need">always drops a script</p>' : ''}
      <button class="go" data-start="${i}"${s.sprint ? ' disabled' : ''}>start sprint</button>`
      }
    </article>`;
  });
  return html;
}

export function refreshSprints(game: Game, root: HTMLElement): void {
  const s = game.state;
  const now = game.now();
  const pace = game.tapRate(5000);
  setText(root.querySelector('[data-pace]'), pace > 0 ? `pace ${pace.toFixed(1)} taps/s` : 'tap to measure pace');

  for (const id of SCRIPT_IDS) {
    const label = root.querySelector(`[data-fx="${id}"]`);
    setText(label, effectActive(s, id, now) ? `${clock(effectSecondsLeft(s, id, now))} +` : './run');
  }

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
  root.querySelectorAll<HTMLElement>('[data-ready]').forEach((el) => {
    const t = s.backlog[Number(el.dataset.ready)];
    if (t) setText(el, clock((t.readyAt - now) / 1000));
  });

  if (s.sprint) {
    setText(root.querySelector('[data-sp-time]'), `${clock((s.sprint.endsAt - now) / 1000)} left`);
    const bar = root.querySelector<HTMLElement>('[data-sp-bar]');
    const html = barHtml(s.sprint.progress.div(s.sprint.target).toNumber(), 22);
    if (bar && bar.innerHTML !== html) bar.innerHTML = html;
    setText(root.querySelector('[data-sp-text]'), `${fmt(s.sprint.progress)} of ${fmt(s.sprint.target)} lines`);
  }
}
