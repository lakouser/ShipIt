import { COMPANY_PERKS, FUNDING, LANGUAGES, PERKS, SHIP, type PerkBranch, type ProjectId } from '../../core/content';
import { companyLevel, language, projectOf } from '../../core/economy';
import { canRaise, companyPerkCost, companyPerkStatus, equityAvailable, equityFor, roundName, starsForNextRound } from '../../core/funding';
import type { Game } from '../../core/game';
import { fmt, fmtRate } from '../../core/num';
import { perkCost, perkLevel, perkStatus, spendableStars } from '../../core/perks';
import { linesForStars, nextProjects, starsAvailable } from '../../core/ship';
import { setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { BOAT } from '../icons';
import { barHtml } from '../messages';

/** What the panel remembers between renders: the project picked for the next release, and armed buttons. */
export interface ShipView {
  project: ProjectId;
  shipArmed: boolean;
  raiseArmed: boolean;
}

const SESSION_START = Date.now();
const bonus = (stars: number): string => (stars * SHIP.bonusPerStar).toFixed(2);

const BRANCHES: { id: PerkBranch; dir: string }[] = [
  { id: 'editor', dir: 'editor/' },
  { id: 'team', dir: 'team/' },
  { id: 'system', dir: 'system/' },
];

function uptime(): string {
  const m = Math.floor((Date.now() - SESSION_START) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Funding shows once it has started, or once a quarter of the stars for the first round are in. */
const showFunding = (game: Game): boolean => {
  const s = game.state;
  return s.round > 0 || s.equity > 0 || (s.round < FUNDING.maxRounds && s.stars >= starsForNextRound(s) * 0.25);
};

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

/** Radio buttons for what the next release builds (only once there is a choice). */
function projectPicker(game: Game, view: ShipView): string {
  const options = nextProjects(game.state);
  if (options.length < 2) return '';
  return `<div class="proj" role="radiogroup" aria-label="Project for the next release">
    <div class="cm"># what does v${game.state.release + 1}.0 build?</div>
    ${options
      .map((p) => {
        const on = p.id === view.project;
        return `<button class="pj" role="radio" data-project="${p.id}" aria-checked="${on}"><span class="box">${on ? '(•)' : '( )'}</span> <span class="nm">${p.dir}/</span> <span class="cm">${p.blurb.toLowerCase()}</span><small>${hl(p.rules.join(' · '))}</small></button>`;
      })
      .join('')}
  </div>`;
}

/** The next funding round and the company perks bought with equity. */
function capTable(game: Game): string {
  const s = game.state;
  if (!showFunding(game)) return '';
  const public_ = s.round >= FUNDING.maxRounds;
  const nextLanguage = LANGUAGES[(s.round + 1) % LANGUAGES.length].name;
  let html = `<div class="cmd gap"><span><span class="ps">$</span> cat ~/cap-table.md</span><span class="aside">${roundName(s.round).toLowerCase()} · written in ${language(s).name}</span></div>`;
  html += public_
    ? `<p class="caveat">${hl('# the company is public. there are no more rounds to raise: only quarters to beat.')}</p>`
    : `<div class="pr fund">
      <div class="prh">
        <h3>${roundName(s.round + 1)} round</h3>
        <div class="chk"><span>stars since the last round</span><b data-fund-text></b></div>
        <div class="tbar" data-fund-bar></div>
      </div>
      <p class="caveat">${hl(`# a round resets stars, dotfiles, releases and packages. you keep the team, achievements, TODO bonuses and scripts, and get x${FUNDING.outputPerRound} output for good, equity to spend below, new packages, and a rewrite in ${nextLanguage}.`)}</p>
      <button class="shipbtn" data-raise></button>
    </div>`;
  html += `<div class="grp"># company <span class="aside2"><b class="h h-star" data-equity>${equityAvailable(s)}</b> equity to spend</span></div>`;
  for (const p of COMPANY_PERKS)
    html += `<div class="perk co" data-co="${p.id}">
      <div><span class="nm">${p.name}</span> <span class="lv"></span><small class="ps2">${hl(p.summary)}</small></div>
      <button class="buy star perkbuy" data-buyco="${p.id}"><span class="bq"></span><span class="bc"></span></button>
    </div>`;
  return html;
}

export function renderShip(game: Game, view: ShipView): string {
  const s = game.state;
  const next = s.release + 1;
  const project = projectOf(s);
  const row = (k: string, v: string, attr = '') => `<span class="k">${k}</span><span${attr}>${v}</span>`;
  return `<div class="cmd"><span><span class="ps">$</span> gh pr view release/v${next}</span><span class="aside">building ${tint('name', `${project.dir}/`)}</span></div>
    <div class="pr">
      <div class="prh">
        <h3>Release v${next}.0</h3>
        <div class="chips"><span>main</span> ← <span>release/v${next}</span></div>
        ${project.id === 'webapp' ? '' : `<div class="rules">${hl(`this release: ${project.rules.join(' · ')}`)}</div>`}
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
      <p class="caveat"># shipping resets lines, packages and tech debt. stars, dotfiles, the team, achievements and TODO bonuses carry over. each star adds ${Math.round(SHIP.bonusPerStar * 100)}% to all output, even after you spend it.</p>
      ${projectPicker(game, view)}
      <button class="shipbtn" data-ship></button>
    </div>
    ${dotfilesTree(game)}
    ${capTable(game)}
    <div class="fetch">
      <pre aria-hidden="true">${BOAT}</pre>
      <div class="info">
        <span class="who">dev@ship-it</span><span class="rule">───────────</span>
        ${row('release', `v${s.release}.0 (${project.name.toLowerCase()})`)}
        ${row('stars', `${tint('star', s.stars)} (${tint('loc', `+${Math.round(s.stars * SHIP.bonusPerStar * 100)}%`)})`)}
        ${s.round > 0 ? row('funding', `${roundName(s.round)} (${tint('loc', `x${fmt(FUNDING.outputPerRound ** s.round)}`)})`) : ''}
        ${row('lines', fmt(s.lifetime), ' class="h h-loc" data-f-lines')}
        ${row('loc/s', fmtRate(game.perSecond()), ' class="h h-auto" data-f-rate')}
        ${row('taps', fmt(s.stats.taps), ' class="h h-tap" data-f-taps')}
        ${row('sprints', `${tint('num', s.stats.sprints)} merged`)}
        ${row('bugs', `${tint('bug', s.stats.bugs)} squashed`)}
        ${s.stats.bossesBeaten + s.stats.bossesFailed > 0 ? row('bosses', `${tint('num', s.stats.bossesBeaten)} beaten, ${tint('num', s.stats.bossesFailed)} lost`) : ''}
        ${s.team.length ? row('team', `${tint('num', s.team.length)} developer${s.team.length === 1 ? '' : 's'}`) : ''}
        ${row('uptime', uptime(), ' class="h h-time" data-f-up')}
      </div>
    </div>`;
}

export function refreshShip(game: Game, root: HTMLElement, view: ShipView): void {
  const s = game.state;
  const stars = starsAvailable(s);
  const target = linesForStars(s, stars + 1);
  setHtml(root.querySelector('[data-run-text]'), stars >= 1 ? `${tint('loc', fmt(s.thisRelease))} · next ${tint('star', '★')} at ${tint('loc', fmt(target))}` : `${tint('loc', fmt(s.thisRelease))} / ${tint('loc', fmt(target))}`);
  const prev = linesForStars(s, stars);
  setHtml(root.querySelector('[data-run-bar]'), barHtml(s.thisRelease.sub(prev).div(target.sub(prev)).toNumber(), 22));

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

  const needed = starsForNextRound(s);
  setHtml(root.querySelector('[data-fund-text]'), `${tint('star', fmt(s.stars))} / ${tint('star', fmt(needed))}`);
  setHtml(root.querySelector('[data-fund-bar]'), barHtml(s.stars / needed, 22));
  const raise = root.querySelector<HTMLButtonElement>('[data-raise]');
  if (raise) {
    const ready = canRaise(s);
    raise.disabled = !ready;
    raise.classList.toggle('arm', view.raiseArmed && ready);
    setText(
      raise,
      ready
        ? view.raiseArmed
          ? 'confirm: reset stars, dotfiles and releases?'
          : `raise the ${roundName(s.round + 1)} round → +${equityFor(s.stars)} equity`
        : `needs ${fmt(needed - s.stars)} more stars`,
    );
  }
  setText(root.querySelector('[data-equity]'), String(equityAvailable(s)));
  for (const p of COMPANY_PERKS) {
    const row = root.querySelector<HTMLElement>(`[data-co="${p.id}"]`);
    if (!row) continue;
    const level = companyLevel(s, p.id);
    const status = companyPerkStatus(s, p);
    setText(row.querySelector('.lv'), `${level}/${p.maxLevel}`);
    const btn = row.querySelector<HTMLButtonElement>('button')!;
    btn.disabled = status !== 'affordable';
    btn.classList.toggle('ok', status === 'affordable');
    setText(btn.firstElementChild, status === 'maxed' ? 'done' : `lvl ${level + 1}`);
    setText(btn.lastElementChild, status === 'maxed' ? '—' : `${companyPerkCost(p, level)}◆`);
  }

  const btn = root.querySelector<HTMLButtonElement>('[data-ship]');
  if (!btn) return;
  btn.disabled = stars < 1;
  btn.classList.toggle('arm', view.shipArmed && stars >= 1);
  setText(
    btn,
    stars < 1
      ? `needs ${fmt(linesForStars(s, 1).sub(s.thisRelease))} more lines`
      : view.shipArmed
        ? 'confirm: merge and reset lines?'
        : `merge & ship v${s.release + 1}.0 → +${stars} star${stars > 1 ? 's' : ''}`,
  );
}

/** Changes when the panel's layout (not just its numbers) needs rebuilding. */
export const shipKey = (game: Game): string => `${nextProjects(game.state).length}|${showFunding(game)}|${game.state.round}|${game.state.release}`;
