import { ACHIEVEMENTS } from '../../core/achievements';
import { SHIP } from '../../core/content';
import { perSecond } from '../../core/economy';
import type { Game } from '../../core/game';
import { fmt, fmtRate } from '../../core/num';
import { linesForStars, starsAvailable } from '../../core/ship';
import { setText } from '../dom';
import { textBar } from '../messages';

const SESSION_START = Date.now();
const bonus = (stars: number): string => (stars * SHIP.bonusPerStar).toFixed(2);

const LOGO = String.raw`      |\
      | \
      |  \
      |___\
   ___|_______
   \  o  o  o/
 ~~~\_______/~~`;

function uptime(): string {
  const m = Math.floor((Date.now() - SESSION_START) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function renderShip(game: Game): string {
  const s = game.state;
  const next = s.release + 1;
  const row = (k: string, v: string, attr = '') => `<span class="k">${k}</span><span${attr}>${v}</span>`;
  return `<div class="cmd"><span><span class="ps">$</span> gh pr view release/v${next}</span></div>
    <div class="pr">
      <div class="prh">
        <h3>Release v${next}.0</h3>
        <div class="chips"><span>main</span> ← <span>release/v${next}</span></div>
        <div class="chk"><span>lines this release</span><b data-run-text></b></div>
        <div class="tbar" data-run-bar></div>
      </div>
      <div class="diff">
        <div class="fn">config/release.ts</div>
        <div class="dl m">- export const stars = ${s.stars};</div>
        <div class="dl a" data-diff-stars></div>
        <div class="dl m">- export const outputBonus = ${bonus(s.stars)};</div>
        <div class="dl a" data-diff-bonus></div>
      </div>
      <p class="caveat"># shipping resets lines and upgrades. stars, achievements and bugs carry over. each star adds ${Math.round(SHIP.bonusPerStar * 100)}% to all output.</p>
      <button class="shipbtn" data-ship></button>
    </div>
    <div class="fetch">
      <pre aria-hidden="true">${LOGO}</pre>
      <div class="info">
        <span class="who">dev@ship-it</span><span class="rule">───────────</span>
        ${row('release', `v${s.release}.0`)}
        ${row('stars', `${s.stars} (+${Math.round(s.stars * SHIP.bonusPerStar * 100)}%)`)}
        ${row('lines', fmt(s.lifetime), ' data-f-lines')}
        ${row('loc/s', fmtRate(perSecond(s, game.now())), ' data-f-rate')}
        ${row('sprints', `${s.sprintsMerged} merged`)}
        ${row('bugs', `${s.bugsSquashed} squashed`)}
        ${row('uptime', uptime(), ' data-f-up')}
      </div>
    </div>
    <div class="grp"># achievements ${s.achievements.length}/${ACHIEVEMENTS.length}</div>
    <ul class="ach">${ACHIEVEMENTS.map((a) => {
      const done = s.achievements.includes(a.id);
      return `<li class="${done ? '' : 'no'}"><span class="box">[${done ? 'x' : ' '}]</span> ${a.name} <small>· ${a.description.toLowerCase()}</small></li>`;
    }).join('')}</ul>`;
}

export function refreshShip(game: Game, root: HTMLElement, armed: boolean): void {
  const s = game.state;
  const stars = starsAvailable(s);
  const target = linesForStars(stars >= 1 ? stars + 1 : 1);
  setText(root.querySelector('[data-run-text]'), stars >= 1 ? `${fmt(s.thisRelease)} · next star at ${fmt(target)}` : `${fmt(s.thisRelease)} / ${fmt(target)}`);
  const bar = root.querySelector<HTMLElement>('[data-run-bar]');
  if (bar) {
    const b = textBar(stars >= 1 ? 1 : s.thisRelease.div(target).toNumber(), 22);
    const html = `${b.done}<span class="rest">${b.rest}</span> ${b.pct}`;
    if (bar.innerHTML !== html) bar.innerHTML = html;
  }

  const preview = s.stars + Math.max(1, stars);
  setText(root.querySelector('[data-diff-stars]'), `+ export const stars = ${preview};`);
  setText(root.querySelector('[data-diff-bonus]'), `+ export const outputBonus = ${bonus(preview)};`);
  setText(root.querySelector('[data-f-lines]'), fmt(s.lifetime));
  setText(root.querySelector('[data-f-rate]'), fmtRate(game.perSecond()));
  setText(root.querySelector('[data-f-up]'), uptime());

  const btn = root.querySelector<HTMLButtonElement>('[data-ship]');
  if (!btn) return;
  btn.disabled = stars < 1;
  btn.classList.toggle('arm', armed && stars >= 1);
  setText(
    btn,
    stars < 1
      ? `needs ${fmt(linesForStars(1).sub(s.thisRelease))} more lines`
      : armed
        ? 'confirm: merge and reset lines?'
        : `merge & ship v${s.release + 1}.0 → +${stars} star${stars > 1 ? 's' : ''}`,
  );
}
