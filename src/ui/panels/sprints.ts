import { EFFECTS, SCRIPT_IDS } from '../../core/content';
import type { Game } from '../../core/game';
import { clock, fmt } from '../../core/num';
import { difficultyOf, requiredTapRate } from '../../core/sprints';
import { esc, setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { barHtml, sprintResultText } from '../messages';

/** Changes when the backlog needs re-rendering: a sprint starting or ending, a slot coming back. */
export const sprintsKey = (game: Game): string => {
  const s = game.state;
  const now = game.now();
  return `${s.sprint?.slot ?? '-'}|${s.backlog.map((t) => `${t.id}${+(t.readyAt > now)}`).join(',')}|${s.lastSprint ? `${s.lastSprint.ok}${s.lastSprint.ticketId}` : ''}`;
};

export function renderSprints(game: Game): string {
  const s = game.state;
  const now = game.now();
  let html = '<div class="cmd"><span><span class="ps">$</span> backlog ls</span><span class="aside" data-pace></span></div>';
  if (s.lastSprint) {
    html += `<div class="note ${s.lastSprint.ok ? 'ok' : 'bad'}"><span class="tag">${s.lastSprint.ok ? '[ ok ]' : '[fail]'}</span> ${hl(sprintResultText(s.lastSprint))}</div>`;
  }
  if (s.sprint) {
    html += `<article class="tk live">
      <div class="tkr"><h3>${esc(s.sprint.title)}</h3><span class="df tight" data-sp-time></span></div>
      <div class="tbar" data-sp-bar></div>
      <small class="need" data-sp-text></small>
    </article>`;
  }
  s.backlog.forEach((t, i) => {
    if (s.sprint?.slot === i) return;
    const waiting = t.readyAt > now;
    html += waiting
      ? `<article class="tk wait">
        <div class="tki"><h3 class="dimh">${esc(t.title)}</h3><small>${tint('time', clock(t.durationS))}${t.tier === 2 ? ' · always drops a script' : ''}</small></div>
        <div class="tkw">standup<br>in <span data-ready="${i}"></span></div>
      </article>`
      : `<article class="tk">
        <div class="tki"><h3>${esc(t.title)}</h3><small>${tint('time', clock(t.durationS))} · <span data-need="${i}"></span>${t.tier === 2 ? ' · drops a script' : ''}</small></div>
        <button class="go" data-start="${i}"${s.sprint ? ' disabled' : ''}><span>start</span><b>+${fmt(t.reward)}</b></button>
      </article>`;
  });
  return html;
}

/** What the `?` in backlog explains. */
export const sprintsHelp = (): string =>
  hl(
    `a sprint asks for a number of lines before its timer runs out; each ticket shows the taps per second it needs at your current output. missing a deadline only loses the reward. a used slot waits for the next standup. the long ticket always drops a script for ~/bin: ${SCRIPT_IDS.map((id) => `${EFFECTS[id].file} (${EFFECTS[id].description})`).join(', ')}. run them from the row under the key.`,
  );

export function refreshSprints(game: Game, root: HTMLElement): void {
  const s = game.state;
  const now = game.now();
  const waits = s.backlog.filter((t) => t.readyAt > now).map((t) => t.readyAt - now);
  const pace = game.tapRate(5000);
  setHtml(
    root.querySelector('[data-pace]'),
    waits.length ? `next standup ${tint('time', clock(Math.min(...waits) / 1000))}` : pace > 0 ? hl(`pace ${pace.toFixed(1)} taps/s`) : 'tap to measure your pace',
  );

  root.querySelectorAll<HTMLElement>('[data-need]').forEach((el) => {
    const t = s.backlog[Number(el.dataset.need)];
    if (!t) return;
    const rate = requiredTapRate(s, t, now);
    const level = difficultyOf(rate);
    setHtml(el, rate <= 0 ? '<span class="df relaxed">automation covers it</span>' : `${tint('num', rate.toFixed(1))} taps/s · <span class="df ${level}">${level}</span>`);
  });
  root.querySelectorAll<HTMLElement>('[data-ready]').forEach((el) => {
    const t = s.backlog[Number(el.dataset.ready)];
    if (t) setText(el, clock((t.readyAt - now) / 1000));
  });

  if (s.sprint) {
    setText(root.querySelector('[data-sp-time]'), `${clock((s.sprint.endsAt - now) / 1000)} left`);
    setHtml(root.querySelector('[data-sp-bar]'), barHtml(s.sprint.progress.div(s.sprint.target).toNumber(), 22));
    setHtml(root.querySelector('[data-sp-text]'), `${tint('loc', fmt(s.sprint.progress))} of ${tint('loc', `${fmt(s.sprint.target)} lines`)} · reward ${tint('loc', `+${fmt(s.sprint.reward)}`)}`);
  }
}
