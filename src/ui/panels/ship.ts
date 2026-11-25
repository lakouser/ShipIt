import { PERKS, SHIP, type PerkBranch } from '../../core/content';
import type { Game } from '../../core/game';
import { fmt, fmtRate } from '../../core/num';
import { perkCost, perkLevel, perkStatus, spendableStars } from '../../core/perks';
import { linesForStars, starsAvailable } from '../../core/ship';
import { setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { barHtml } from '../messages';

const SESSION_START = Date.now();
const bonus = (stars: number): string => (stars * SHIP.bonusPerStar).toFixed(2);

const LOGO = String.raw`      |\
      | \
      |  \
      |___\
   ___|_______
   \  o  o  o/
 ~~~\_______/~~`;

const BRANCHES: { id: PerkBranch; dir: string }[] = [
  { id: 'editor', dir: 'editor/' },
  { id: 'team', dir: 'team/' },
  { id: 'system', dir: 'system/' },
];

function uptime(): string {
  const m = Math.floor((Date.now() - SESSION_START) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function dotfilesTree(game: Game): string {
  const s = game.state;
  let html = `<div class="cmd gap"><span><span class="ps">$</span> tree ~/dotfiles</span><span class="aside"><b class="st" data-spend>${spendableStars(s)}</b> stars to spend</span></div><div class="tree"><div class="root">~/dotfiles</div>`;
  BRANCHES.forEach((b, bi) => {
    const lastBranch = bi === BRANCHES.length - 1;
    html += `<div class="dir"><span class="tr">${lastBranch ? '└──' : '├──'}</span> ${b.dir}</div>`;
    const perks = PERKS.filter((p) => p.branch === b.id);
    perks.forEach((p, pi) => {
      const last = pi === perks.length - 1;
      const pre = `${lastBranch ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '│&nbsp;&nbsp;&nbsp;'}${last ? '└──' : '├──'}`;
      html += `<div class="perk" data-perk="${p.id}">
        <div><span class="tr">${pre}</span> <span class="nm"></span> <span class="lv"></span><small class="ps2"></small></div>
        <button class="buy star perkbuy" data-buyperk="${p.id}"><span class="bq"></span><span class="bc"></span></button>
      </div>`;
    });
  });
  return html + '</div>';
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
      <p class="caveat"># shipping resets lines and packages. stars, dotfiles, achievements and TODO bonuses carry over. each star adds ${Math.round(SHIP.bonusPerStar * 100)}% to all output, even after you spend it.</p>
      <button class="shipbtn" data-ship></button>
    </div>
    ${dotfilesTree(game)}
    <div class="fetch">
      <pre aria-hidden="true">${LOGO}</pre>
      <div class="info">
        <span class="who">dev@ship-it</span><span class="rule">───────────</span>
        ${row('release', `v${s.release}.0`)}
        ${row('stars', `${tint('star', s.stars)} (${tint('loc', `+${Math.round(s.stars * SHIP.bonusPerStar * 100)}%`)})`)}
        ${row('lines', fmt(s.lifetime), ' class="h h-loc" data-f-lines')}
        ${row('loc/s', fmtRate(game.perSecond()), ' class="h h-auto" data-f-rate')}
        ${row('taps', fmt(s.stats.taps), ' class="h h-tap" data-f-taps')}
        ${row('sprints', `${tint('num', s.stats.sprints)} merged`)}
        ${row('bugs', `${tint('bug', s.stats.bugs)} squashed`)}
        ${row('uptime', uptime(), ' class="h h-time" data-f-up')}
      </div>
    </div>`;
}

export function refreshShip(game: Game, root: HTMLElement, armed: boolean): void {
  const s = game.state;
  const stars = starsAvailable(s);
  const target = linesForStars(stars + 1);
  setHtml(root.querySelector('[data-run-text]'), stars >= 1 ? `${tint('loc', fmt(s.thisRelease))} · next ${tint('star', '★')} at ${tint('loc', fmt(target))}` : `${tint('loc', fmt(s.thisRelease))} / ${tint('loc', fmt(target))}`);
  const bar = root.querySelector<HTMLElement>('[data-run-bar]');
  const prev = linesForStars(stars);
  const html = barHtml(s.thisRelease.sub(prev).div(target.sub(prev)).toNumber(), 22);
  if (bar && bar.innerHTML !== html) bar.innerHTML = html;

  const preview = s.stars + Math.max(1, stars);
  setText(root.querySelector('[data-diff-stars]'), `+ export const stars = ${preview};`);
  setText(root.querySelector('[data-diff-bonus]'), `+ export const outputBonus = ${bonus(preview)};`);
  setText(root.querySelector('[data-f-lines]'), fmt(s.lifetime));
  setText(root.querySelector('[data-f-rate]'), fmtRate(game.perSecond()));
  setText(root.querySelector('[data-f-taps]'), fmt(s.stats.taps));
  setText(root.querySelector('[data-f-up]'), uptime());
  setText(root.querySelector('[data-spend]'), String(spendableStars(s)));

  for (const p of PERKS) {
    const row = root.querySelector<HTMLElement>(`[data-perk="${p.id}"]`);
    if (!row) continue;
    const level = perkLevel(s, p.id);
    const status = perkStatus(s, p);
    row.classList.toggle('locked', status === 'locked');
    setText(row.querySelector('.nm'), p.file);
    setText(row.querySelector('.lv'), `${level}/${p.maxLevel}`);
    setHtml(row.querySelector('.ps2'), hl(status === 'locked' && p.requires ? `needs ${PERKS.find((x) => x.id === p.requires!.id)?.file} level ${p.requires.level}` : p.summary));
    const btn = row.querySelector<HTMLButtonElement>('button')!;
    btn.disabled = status !== 'affordable';
    btn.classList.toggle('ok', status === 'affordable');
    setText(btn.firstElementChild, status === 'maxed' ? 'done' : `lvl ${level + 1}`);
    setText(btn.lastElementChild, status === 'maxed' ? '—' : `${perkCost(p, level)}★`);
  }

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
