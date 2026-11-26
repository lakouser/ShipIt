import { ACHIEVEMENTS, ACHIEVEMENT_PROGRESS, type AchievementDef } from '../../core/achievements';
import type { Game } from '../../core/game';
import { fmt } from '../../core/num';
import { esc, setText } from '../dom';
import { tint } from '../hl';

/** [done, needed] for a countable trophy, or null. */
const progressOf = (game: Game, a: AchievementDef): [number, number] | null => ACHIEVEMENT_PROGRESS[a.id]?.(game.state) ?? null;

export const trophiesKey = (game: Game): string => String(game.state.achievements.length);

function row(game: Game, a: AchievementDef, done: boolean): string {
  const p = done ? null : progressOf(game, a);
  const f = p ? Math.max(0, Math.min(1, p[0] / p[1])) : done ? 1 : 0;
  const count = done ? '<span class="okc">earned</span>' : p ? `${fmt(Math.min(p[0], p[1]))}/${fmt(p[1])}` : '';
  return `<div class="tro${done ? ' done' : ''}"${p ? ` data-tro="${a.id}"` : ''}>
    <div class="trh"><span class="nm">${esc(a.name)}</span><span class="trc">${count}</span></div>
    <small>${esc(a.description.toLowerCase())}</small>
    ${p || done ? `<div class="cbar"><i style="width:${(f * 100).toFixed(1)}%"></i></div>` : ''}
  </div>`;
}

/** Progress counts and bars, updated in place (the order only changes on the next visit). */
export function refreshTrophies(game: Game, root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-tro]').forEach((el) => {
    const a = ACHIEVEMENTS.find((x) => x.id === el.dataset.tro);
    const p = a ? progressOf(game, a) : null;
    if (!p) return;
    setText(el.querySelector('.trc'), `${fmt(Math.min(p[0], p[1]))}/${fmt(p[1])}`);
    const bar = el.querySelector<HTMLElement>('.cbar i');
    const w = `${(Math.max(0, Math.min(1, p[0] / p[1])) * 100).toFixed(1)}%`;
    if (bar && bar.style.width !== w) bar.style.width = w;
  });
}

export function renderTrophies(game: Game, hideEarned: boolean): string {
  const s = game.state;
  const earned = new Set(s.achievements);
  const left = ACHIEVEMENTS.filter((a) => !earned.has(a.id));
  const secret = left.filter((a) => a.secret).length;
  let html = `<div class="cmd"><span>${tint('num', earned.size)} of ${ACHIEVEMENTS.length} · ${tint('loc', `+${earned.size}% output`)}</span><button class="chip2" data-hideearned aria-pressed="${hideEarned}">hide earned: ${hideEarned ? 'on' : 'off'}</button></div>`;
  if (hideEarned) {
    // Unearned ones, closest to done first; secrets stay hidden.
    const shown = left
      .filter((a) => !a.secret)
      .map((a) => ({ a, p: progressOf(game, a) }))
      .sort((x, y) => (y.p ? y.p[0] / y.p[1] : -1) - (x.p ? x.p[0] / x.p[1] : -1));
    html += shown.map(({ a }) => row(game, a, false)).join('');
  } else {
    html += ACHIEVEMENTS.map((a) => (a.secret && !earned.has(a.id) ? '' : row(game, a, earned.has(a.id)))).join('');
  }
  html += `<p class="foot">${left.length ? `${left.length} more to earn${secret ? ` · ${secret} of them secret` : ''}` : 'every trophy earned'} · each adds 1% output</p>`;
  return html;
}
