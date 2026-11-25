import { ACHIEVEMENTS } from '../../core/achievements';
import { SHIP } from '../../core/content';
import type { Game } from '../../core/game';
import { fmt } from '../../core/num';
import { linesForStars, starsAvailable } from '../../core/ship';
import { setText } from '../dom';

const bonus = (stars: number): string => (stars * SHIP.bonusPerStar).toFixed(2);

export function renderShip(game: Game): string {
  const s = game.state;
  const next = s.release + 1;
  return `<div class="bar"><h2>Ship a release</h2></div>
    <div class="pr">
      <div class="prh">
        <h3>Release v${next}.0</h3>
        <div class="chips"><span class="chip">main</span><span>←</span><span class="chip">release/v${next}</span></div>
        <div class="chk"><span>Lines written this release</span><b data-run-text></b></div>
        <div class="prog"><i data-run-bar></i></div>
      </div>
      <div class="diff">
        <div class="fn">config/release.ts</div>
        <div class="dl m">- export const stars = ${s.stars};</div>
        <div class="dl a" data-diff-stars></div>
        <div class="dl m">- export const outputBonus = ${bonus(s.stars)};</div>
        <div class="dl a" data-diff-bonus></div>
      </div>
      <p class="warn">Shipping resets your lines and upgrades. Stars, achievements and squashed bugs carry over, and each star adds ${Math.round(SHIP.bonusPerStar * 100)}% to everything you write.</p>
      <button class="shipbtn" data-ship></button>
    </div>
    <div class="stats">
      <div><b>${fmt(s.lifetime)}</b><span>lines, all time</span></div>
      <div><b>${s.stars}</b><span>stars</span></div>
      <div><b>${s.sprintsMerged}</b><span>sprints merged</span></div>
      <div><b>${s.bugsSquashed}</b><span>bugs squashed</span></div>
    </div>
    <div class="bar"><h2>Achievements</h2><span class="pace">${s.achievements.length} of ${ACHIEVEMENTS.length}</span></div>
    <ul class="ach">${ACHIEVEMENTS.map((a) => {
      const done = s.achievements.includes(a.id);
      return `<li class="${done ? '' : 'no'}"><span>${done ? '✓' : '·'}</span><div>${a.name}<small>${a.description}</small></div></li>`;
    }).join('')}</ul>`;
}

export function refreshShip(game: Game, root: HTMLElement, armed: boolean): void {
  const s = game.state;
  const stars = starsAvailable(s);
  const target = linesForStars(Math.max(1, stars + (stars >= 1 ? 1 : 0)));
  setText(root.querySelector('[data-run-text]'), stars >= 1 ? `${fmt(s.thisRelease)}, next star at ${fmt(target)}` : `${fmt(s.thisRelease)} / ${fmt(target)}`);
  const bar = root.querySelector<HTMLElement>('[data-run-bar]');
  if (bar) bar.style.width = `${stars >= 1 ? 100 : Math.min(100, s.thisRelease.div(target).toNumber() * 100)}%`;

  const preview = s.stars + Math.max(1, stars);
  setText(root.querySelector('[data-diff-stars]'), `+ export const stars = ${preview};`);
  setText(root.querySelector('[data-diff-bonus]'), `+ export const outputBonus = ${bonus(preview)};`);

  const btn = root.querySelector<HTMLButtonElement>('[data-ship]');
  if (!btn) return;
  btn.disabled = stars < 1;
  btn.classList.toggle('arm', armed && stars >= 1);
  setText(
    btn,
    stars < 1
      ? `Needs ${fmt(linesForStars(1).sub(s.thisRelease))} more lines`
      : armed
        ? 'Tap again to ship. This resets your lines.'
        : `Ship v${s.release + 1}.0 for ${stars} star${stars > 1 ? 's' : ''}`,
  );
}
