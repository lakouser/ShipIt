import { AUTOMATION, CHALLENGES, COMPANY_PERKS, CORP, FUNDING, MAJOR, PERKS, ROUNDS, SHIP, STACKS, WORKFLOWS, type LanguageId, type PerkBranch, type ProjectId } from '../../core/content';
import { corpMultiplier, quarterLeft, quarterProjection, quarterRunRate } from '../../core/corp';
import { coverage } from '../../core/coverage';
import { companyLevel, projectOf, starBonus } from '../../core/economy';
import { canRaise, companyPerkCost, companyPerkStatus, equityAvailable, equityFor, roundName, starsForNextRound } from '../../core/funding';
import type { Game } from '../../core/game';
import { findChallenge, majorsUnlocked, starsForNextXp, xpAvailable } from '../../core/major';
import { clock, fmt, fmtMoney, fmtMul } from '../../core/num';
import { perkCost, perkLevel, perkStatus, spendableStars } from '../../core/perks';
import { milestoneBonus } from '../../core/quests';
import { linesForStars, nextProjects, nextVersion, shipGain, starsAvailable, starsPerMinute } from '../../core/ship';
import type { GameState } from '../../core/state';
import { releasesShipped, workflowOn, workflowUnlocked } from '../../core/workflows';
import { esc, setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { fundingVisible, nextStarProgress } from '../nav';
import { pickedStack, stackPicker } from './stack';

/** What the release panel remembers between renders: the project picked for the next release, and the armed merge button. */
export interface ShipView {
  project: ProjectId;
  shipArmed: boolean;
  /** Every project chip shown, not just the first three. */
  allProjects: boolean;
}

/** Project chips shown before "+N". */
const PROJECT_CHIPS = 3;

/** Stars per minute: two decimals below 1 ("0.42"), one below 10, then like fmt. */
export const starRate = (perMinute: number): string => (perMinute < 1 ? perMinute.toFixed(2) : perMinute < 10 ? perMinute.toFixed(1) : fmt(perMinute));
const pct = (fraction: number): string => `${fmt(Math.round(fraction * 100))}%`;
/** A bar drawn in CSS; refresh sets the width of its <i>. */
export const cssBar = (attr: string, hue = ''): string => `<div class="cbar${hue ? ` ${hue}` : ''}"><i ${attr}></i></div>`;
export const setBar = (el: HTMLElement | null, fraction: number): void => {
  if (!el) return;
  const w = `${(Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0)) * 100).toFixed(1)}%`;
  if (el.style.width !== w) el.style.width = w;
};

const BRANCHES: { id: PerkBranch; dir: string }[] = [
  { id: 'editor', dir: 'editor/' },
  { id: 'team', dir: 'team/' },
  { id: 'system', dir: 'system/' },
];

/** The "checks" line: whether this release is worth merging yet, by the +50% rule of thumb. */
function readyText(s: GameState, stars: number): string {
  if (stars < 1) return `<span class="cm">○</span> waiting for the first star`;
  const gain = shipGain(s);
  const bonus = milestoneBonus(s, stars);
  const extra = bonus > 0 ? ` · milestone ${tint('star', `+${fmt(bonus)}`)}` : '';
  if (gain === Infinity) return `<span class="ok">✓</span> ready · first stars${extra}`;
  if (gain >= SHIP.readyAt) return `<span class="ok">✓</span> ${tint('star', `+${pct(gain)} ★`)} · ready${extra}`;
  return `${tint('star', `+${pct(gain)} ★`)} now · ready at ${tint('loc', `+${pct(SHIP.readyAt)}`)}${extra}`;
}

/** Chips for what the next release builds (only once there is a choice); the picked one's rules below. */
function projectPicker(game: Game, view: ShipView): string {
  const options = nextProjects(game.state);
  if (options.length < 2) return '';
  const picked = options.find((p) => p.id === view.project) ?? options[0];
  // The picked project always shows, even when it's past the first few chips.
  const shown = view.allProjects ? options : options.filter((p, i) => i < PROJECT_CHIPS || p.id === picked.id);
  const more = options.length - shown.length;
  return `<div class="proj" role="radiogroup" aria-label="Project for the next release">
    <div class="cm">next project</div>
    <div class="pjs">${shown
      .map((p) => `<button class="pj" role="radio" data-project="${p.id}" aria-checked="${p.id === picked.id}">${esc(p.name.toLowerCase())}</button>`)
      .join('')}${more > 0 ? `<button class="pj more" data-moreprojects>+${more}</button>` : ''}</div>
    <small>${hl(`${picked.blurb.toLowerCase()} · ${picked.rules.join(' · ')}`)}</small>
  </div>`;
}

export function renderShip(game: Game, view: ShipView): string {
  const s = game.state;
  const next = nextVersion(s);
  const project = projectOf(s);
  return `<div class="cmd"><span><span class="ps">$</span> gh pr view release/v${next}</span><button class="lnk" data-help>man ship</button></div><!--help-->
    <div class="pr">
      <div class="prh">
        <div class="prt"><h3>Release v${next}</h3><span class="h h-name">${esc(project.dir)}</span></div>
        <div class="chips">main ← <span>release/v${next}</span></div>
        ${project.id === 'webapp' ? '' : `<div class="rules">${hl(project.rules.join(' · '))}</div>`}
        <div class="chk1" data-run-text></div>
        ${cssBar('data-run-bar', 'star')}
        <div class="chk"><span>★ per minute</span><b data-rate></b></div>
        <div class="chk"><span>checks</span><b data-ready></b></div>
        ${s.unlocked.tests ? `<div class="chk"><span>tests</span><b data-cov></b></div>` : ''}
        ${s.challenge ? `<div class="chk"><span>challenge/${findChallenge(s.challenge.id).branch}</span><b data-chal></b></div>` : ''}
      </div>
      <div class="diff">
        <div class="dl m" data-diff-stars-was></div>
        <div class="dl a" data-diff-stars></div>
        <div class="dl a" data-diff-mul></div>
      </div>
    </div>
    ${projectPicker(game, view)}
    <button class="shipbtn" data-ship><span data-ship-text></span><b data-ship-gain></b></button>
    <button class="sumrow" data-goto="round"><span class="k">round</span><span class="sv" data-sum-round></span></button>
    <button class="sumrow" data-goto="major"><span class="k">major</span><span class="sv" data-sum-major></span></button>`;
}

/** What `man ship` explains. */
export const shipHelp = (): string =>
  hl(
    `stars count every line shipped this run (since the last funding round or major version), so one big release beats several small ones: wait until checks say ready (+${Math.round(SHIP.readyAt * 100)}% stars). shipping resets lines, packages and tech debt; stars, dotfiles, the team, achievements and TODO bonuses carry over. each star adds ${Math.round(SHIP.bonusPerStar * 100)}% output, even once spent. from the second release you pick the next project, each with its own rules.`,
  );

export function refreshShip(game: Game, root: HTMLElement, view: ShipView): void {
  const s = game.state;
  const now = game.now();
  const stars = starsAvailable(s);
  const target = linesForStars(s, stars + 1);
  setHtml(root.querySelector('[data-run-text]'), `${tint('loc', fmt(s.thisRelease))} lines · next ${tint('star', '★')} at ${tint('loc', fmt(target))}`);
  setBar(root.querySelector('[data-run-bar]'), nextStarProgress(s));

  const rate = starsPerMinute(s, now);
  const timed = s.releaseStartedAt >= 0;
  setHtml(root.querySelector('[data-rate]'), stars >= 1 && timed ? `${tint('star', starRate(rate))} now · best ${tint('star', starRate(Math.max(rate, s.releasePeak)))}` : `<span class="cm">${timed ? '—' : '— from your next release'}</span>`);
  setHtml(root.querySelector('[data-ready]'), readyText(s, stars));
  if (s.unlocked.tests) {
    const cov = coverage(s);
    setHtml(root.querySelector('[data-cov]'), cov > 0 ? `${tint('loc', `${Math.round(cov * 100)}% coverage`)} · ${tint('star', `+${cov.toFixed(2)}★`)} review` : `<span class="cm">no tests · set a budget in work/tests</span>`);
  }
  if (s.challenge) {
    const met = s.thisRelease.gte(s.challenge.goal);
    setHtml(root.querySelector('[data-chal]'), met ? `<span class="ok">✓</span> goal met: ship for ${hl(findChallenge(s.challenge.id).reward)}` : `goal ${tint('loc', fmt(s.challenge.goal))} lines (${Math.floor(s.thisRelease.div(s.challenge.goal).toNumber() * 100)}%)`);
  }

  const payout = stars + milestoneBonus(s, stars);
  const preview = s.stars + Math.max(1, payout);
  setText(root.querySelector('[data-diff-stars-was]'), `- stars = ${fmt(s.stars)}`);
  setText(root.querySelector('[data-diff-stars]'), `+ stars = ${fmt(preview)}`);
  setText(root.querySelector('[data-diff-mul]'), `+ output = x${fmtMul(starBonus(preview))} (was x${fmtMul(starBonus(s.stars))})`);

  const round = root.querySelector('[data-sum-round]');
  if (round) {
    const needed = starsForNextRound(s);
    setHtml(
      round,
      s.round >= FUNDING.maxRounds
        ? `<span>Q${s.corp.quarter} · ${tint('time', clock(quarterLeft(s)))} left · ${quarterProjection(s) >= s.corp.guidance ? '<span class="ok">on pace</span>' : '<span class="cm">behind</span>'}</span>`
        : `${cssBar('', 'star')}<span>${canRaise(s) ? `<span class="ok">✓</span> ${roundName(s.round + 1).toLowerCase()} ready` : `${roundName(s.round + 1).toLowerCase()} at ${fmt(needed)}★ · ${fmt(s.stars)}`}</span>`,
    );
    if (s.round < FUNDING.maxRounds) setBar(round.querySelector('.cbar i'), s.stars / needed);
  }
  const major = root.querySelector('[data-sum-major]');
  if (major) {
    const xp = majorsUnlocked(s) ? xpAvailable(s) : 0;
    setHtml(
      major,
      !majorsUnlocked(s) ? `<span class="cm">locked · opens at ${ROUNDS[MAJOR.unlockRound]}</span>` : xp >= 1 ? `<span class="ok">✓</span> ${tint('star', `+${fmt(xp)} xp`)} ready` : `next xp at ${tint('star', fmt(starsForNextXp(s)))} stars banked`,
    );
  }

  const btn = root.querySelector<HTMLButtonElement>('[data-ship]');
  if (!btn) return;
  btn.disabled = stars < 1;
  btn.classList.toggle('arm', view.shipArmed && stars >= 1);
  btn.classList.toggle('ready', !view.shipArmed && shipGain(s) >= SHIP.readyAt);
  setText(
    btn.querySelector('[data-ship-text]'),
    stars < 1 ? `needs ${fmt(linesForStars(s, 1).sub(s.thisRelease))} more lines` : view.shipArmed ? 'confirm: merge and reset lines?' : `merge release/v${nextVersion(s)}`,
  );
  setText(btn.querySelector('[data-ship-gain]'), stars < 1 ? '' : `+${fmt(payout)} ★`);
}

/** Changes when the release panel's layout (not just its numbers) needs rebuilding. */
export const shipKey = (game: Game): string =>
  `${nextProjects(game.state).length}|${game.state.round}|${game.state.release}|${game.state.major}|${!!game.state.challenge}|${game.state.project}|${game.state.unlocked.tests}`;

/* ---------- dotfiles ---------- */

export function renderDotfiles(game: Game): string {
  const s = game.state;
  let html = `<div class="cmd"><span><span class="ps">$</span> tree ~/dotfiles</span><span class="aside"><b class="st" data-spend>${fmt(spendableStars(s))}</b> stars to spend</span></div><div class="tree"><div class="root">~/dotfiles</div>`;
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

export const dotfilesKey = (game: Game): string => `${game.state.round}|${game.state.major}`;

export const dotfilesHelp = (): string =>
  hl(`stars from shipping buy dotfiles perks, kept through every release. each star still adds ${Math.round(SHIP.bonusPerStar * 100)}% output after you spend it. a funding round or a major version resets dotfiles. .zshrc has no cap: x1.1 all output per level, each level twice the price.`);

/** A star-priced button: filled as stars come in, like the line-priced ones. */
function starButton(btn: HTMLButtonElement, status: string, have: number, cost: number, label: string, price: string): void {
  btn.disabled = status !== 'affordable';
  btn.classList.toggle('ok', status === 'affordable');
  btn.style.setProperty('--p', `${status === 'affordable' || status === 'maxed' ? 0 : Math.min(100, (have / Math.max(1, cost)) * 100).toFixed(1)}%`);
  setText(btn.firstElementChild, status === 'maxed' ? 'done' : label);
  setText(btn.lastElementChild, status === 'maxed' ? '—' : price);
}

export function refreshDotfiles(game: Game, root: HTMLElement): void {
  const s = game.state;
  setText(root.querySelector('[data-spend]'), fmt(spendableStars(s)));
  for (const p of PERKS) {
    const row = root.querySelector<HTMLElement>(`[data-perk="${p.id}"]`);
    if (!row) continue;
    const level = perkLevel(s, p.id);
    const status = perkStatus(s, p);
    row.classList.toggle('locked', status === 'locked');
    setText(row.querySelector('.nm'), p.file);
    setText(row.querySelector('.lv'), Number.isFinite(p.maxLevel) ? `${level}/${p.maxLevel}` : `lvl ${level}`);
    setHtml(row.querySelector('.ps2'), hl(status === 'locked' && p.requires ? `needs ${PERKS.find((x) => x.id === p.requires!.id)?.file} level ${p.requires.level}` : p.summary));
    starButton(row.querySelector<HTMLButtonElement>('button')!, status, spendableStars(s), perkCost(p, level), `lvl ${level + 1}`, `${fmt(perkCost(p, level))}★`);
  }
}

/* ---------- auto: .github/workflows ---------- */

export function renderAuto(game: Game): string {
  const s = game.state;
  const shipped = releasesShipped(s);
  const on = WORKFLOWS.filter((w) => workflowOn(s, w.id)).length;
  const rows = WORKFLOWS.map((w) => {
    const open = workflowUnlocked(s, w.id);
    const active = workflowOn(s, w.id);
    let trigger = '';
    if (w.id === 'release' && open)
      trigger = `<div class="row2 wfopt"><span class="lbl">ship at stars</span>${AUTOMATION.shipAtOptions
        .map((f) => `<button class="chip2" data-autoship="${f}" aria-pressed="${s.autoShipAt === f}">${s.autoShipAt === f ? '(•)' : '( )'} +${Math.round(f * 100)}%</button>`)
        .join('')}</div>`;
    if (w.id === 'forks' && open)
      trigger = `<div class="row2 wfopt"><span class="lbl">pick</span>${(
        [
          ['alt', 'plugin or lts'],
          ['major', 'major rewrite'],
        ] as const
      )
        .map(([p, label]) => `<button class="chip2" data-forkpolicy="${p}" aria-pressed="${s.forkPolicy === p}">${s.forkPolicy === p ? '(•)' : '( )'} ${label}</button>`)
        .join('')}</div>`;
    const challenge = w.challenge ? CHALLENGES.find((c) => c.id === w.challenge) : undefined;
    const locked = challenge ? `unlocks when you clear challenge/${challenge.branch}` : `unlocks after ${w.releases} releases (${shipped} so far)`;
    return `<button class="opt" data-workflow="${w.id}" aria-pressed="${active}"${open ? '' : ' disabled'}><span class="box">[${active ? 'x' : ' '}]</span> <span class="h h-name">${w.file}</span> <small>${open ? hl(w.summary) : locked}</small></button>${trigger}`;
  });
  return `<div class="cmd"><span><span class="ps">$</span> ls .github/workflows</span><span class="aside">${on} of ${WORKFLOWS.length} on</span></div><div class="opts wfs">${rows.join('')}</div>`;
}

export const autoKey = (game: Game): string =>
  `${releasesShipped(game.state)}|${WORKFLOWS.map((w) => `${+workflowUnlocked(game.state, w.id)}${+workflowOn(game.state, w.id)}`).join('')}|${game.state.autoShipAt}|${game.state.forkPolicy}`;

export const autoHelp = (): string =>
  hl('workflows are automation earned by shipping releases, and by clearing each challenge release once (they open with your first major version). each one can be switched off here. bugs and coffee are left to you and the team.');

/* ---------- round: funding and the cap table ---------- */

const stackName = (id: LanguageId): string => STACKS.find((x) => x.id === id)?.name ?? id;

/** After the IPO: the quarter in progress, the stock and the last few reports. */
function earnings(game: Game): string {
  const s = game.state;
  const c = s.corp;
  const reports = c.reports.length
    ? c.reports
        .slice(0, 4)
        .map((r) => {
          const pctOff = r.guidance > 0 ? Math.round((r.revenue / r.guidance - 1) * 100) : 0;
          return `<div class="chk"><span>Q${r.quarter} ${r.beat ? '<span class="ok">beat</span>' : '<span class="bad">miss</span>'} ${pctOff >= 0 ? '+' : ''}${pctOff}%</span><b>${fmtMoney(r.revenue)} · stock ${fmt(r.stock)}</b></div>`;
        })
        .join('')
    : '<div class="chk"><span class="cm">no quarters reported yet</span></div>';
  return `<div class="cmd"><span><span class="ps">$</span> cat ~/earnings/q${c.quarter}.md</span><span class="aside" data-q-stock></span></div><!--help-->
    <div class="pr fund">
      <div class="prh">
        <div class="prt"><h3>Q${c.quarter}</h3><span class="h h-time" data-q-left></span></div>
        <div class="chk"><span>revenue / guidance</span><b data-q-rev></b></div>
        ${cssBar('data-q-bar', 'star')}
        <div class="chk"><span>on pace for</span><b data-q-pace></b></div>
        <div class="chk"><span>run rate</span><b data-q-rate></b></div>
        <div class="rules">${hl(`beat: the stock rises and +${Math.round(CORP.beatBonus * 100)}% output for good · miss: the stock falls · every beat in a row raises the bar`)}</div>
      </div>
    </div>
    <div class="mkt"><span class="k">cash</span><span data-q-cash></span><span class="k">beats</span><span data-q-beats></span></div>
    <div class="grp"># last quarters</div>${reports}`;
}

export function renderRound(game: Game, stack: LanguageId | null = null): string {
  const s = game.state;
  const public_ = s.round >= FUNDING.maxRounds;
  let html = '';
  html += public_
    ? earnings(game)
    : `<div class="cmd"><span><span class="ps">$</span> cat ~/cap-table.md</span><span class="aside">${roundName(s.round).toLowerCase()}</span></div>
    <div class="pr fund">
      <div class="prh">
        <h3>${roundName(s.round + 1)} round</h3>
        <div class="chk"><span>stars since the last round</span><b data-fund-text></b></div>
        ${cssBar('data-fund-bar', 'star')}
        <div class="rules">${hl(`x${FUNDING.outputPerRound} output for good · equity · new packages · a rewrite in the stack you pick`)}</div>
      </div>
      ${stackPicker(s, stack, 'the rewrite is in')}
      <button class="shipbtn" data-raise></button>
    </div>`;
  if (s.round > 0 || s.equity > 0 || fundingVisible(s)) {
    html += `<div class="grp"># company <span class="aside2"><b class="h h-star" data-equity>${equityAvailable(s)}</b> equity to spend</span></div>`;
    for (const p of COMPANY_PERKS)
      html += `<div class="perk co" data-co="${p.id}">
        <div><span class="nm">${p.name}</span> <span class="lv"></span><small class="ps2">${hl(p.summary)}</small></div>
        <button class="buy star perkbuy" data-buyco="${p.id}"><span class="bq"></span><span class="bc"></span></button>
      </div>`;
  }
  return html;
}

export const roundKey = (game: Game): string => `${game.state.round}|${fundingVisible(game.state)}|${game.state.corp.quarter}|${game.state.corp.reports.length}`;

export const roundHelp = (game: Game): string =>
  game.state.round >= FUNDING.maxRounds
    ? hl(
        `every ${CORP.quarterMinutes} minutes of play is a quarter (time away doesn't run the clock, but its revenue still comes in). each user brings in $${CORP.revenuePerUser} a quarter. the board's guidance is the last quarter's revenue (or the run rate, if higher) plus ${Math.round((CORP.growth - 1) * 100)}%, and ${Math.round(CORP.streakStep * 100)}% more for every beat in a row. a beat raises the stock and adds ${Math.round(CORP.beatBonus * 100)}% to all output for good; a miss only costs the stock. cash buys rivals in co/market, cheaper when the stock is high.`,
      )
    : hl(
        `a round resets stars, dotfiles, releases and packages. you keep the team, achievements, TODO bonuses and scripts, and get x${FUNDING.outputPerRound} output for good, equity for company perks, new packages, and a rewrite in the stack you pick: each has its own rules, for the whole run. rounds go seed, series a, b, c, then the ipo.`,
      );

export function refreshRound(game: Game, root: HTMLElement, armed: boolean, stack: LanguageId | null = null): void {
  const s = game.state;
  if (s.round >= FUNDING.maxRounds) return refreshEarnings(game, root);
  const needed = starsForNextRound(s);
  setHtml(root.querySelector('[data-fund-text]'), `${tint('star', fmt(s.stars))} / ${tint('star', fmt(needed))}`);
  setBar(root.querySelector('[data-fund-bar]'), s.stars / needed);
  const raise = root.querySelector<HTMLButtonElement>('[data-raise]');
  if (raise) {
    const ready = canRaise(s);
    raise.disabled = !ready;
    raise.classList.toggle('arm', armed && ready);
    raise.classList.toggle('ready', !armed && ready);
    setText(
      raise,
      ready
        ? armed
          ? `confirm: reset stars, dotfiles and releases for ${stackName(pickedStack(s, stack))}?`
          : `raise the ${roundName(s.round + 1)} round → +${equityFor(s.stars)} equity`
        : `needs ${fmt(needed - s.stars)} more stars`,
    );
  }
  refreshCompany(game, root);
}

function refreshEarnings(game: Game, root: HTMLElement): void {
  const s = game.state;
  const c = s.corp;
  const pace = quarterProjection(s);
  const off = c.guidance > 0 ? Math.round((pace / c.guidance - 1) * 100) : 0;
  setHtml(root.querySelector('[data-q-stock]'), `stock ${tint('star', fmt(c.stock))}`);
  setText(root.querySelector('[data-q-left]'), `${clock(quarterLeft(s))} left`);
  setHtml(root.querySelector('[data-q-rev]'), `${tint('star', fmtMoney(c.revenue))} / ${fmtMoney(c.guidance)}`);
  setBar(root.querySelector('[data-q-bar]'), c.guidance > 0 ? c.revenue / c.guidance : 0);
  setHtml(root.querySelector('[data-q-pace]'), `${fmtMoney(pace)} ${off >= 0 ? `<span class="ok">beat by ${off}%</span>` : `<span class="bad">miss by ${-off}%</span>`}`);
  setHtml(root.querySelector('[data-q-rate]'), `${fmtMoney(quarterRunRate(s))} a quarter <span class="cm">· ${fmt(s.market.users)} users × $${CORP.revenuePerUser}</span>`);
  setHtml(root.querySelector('[data-q-cash]'), `${tint('star', fmtMoney(c.cash))} <span class="cm">· buys rivals in co/market</span>`);
  setHtml(root.querySelector('[data-q-beats]'), `${fmt(c.beats)} · ${c.streak} in a row · output x${fmtMul(corpMultiplier(s))} <span class="cm">with acquisitions</span>`);
  refreshCompany(game, root);
}

function refreshCompany(game: Game, root: HTMLElement): void {
  const s = game.state;
  setText(root.querySelector('[data-equity]'), String(equityAvailable(s)));
  for (const p of COMPANY_PERKS) {
    const row = root.querySelector<HTMLElement>(`[data-co="${p.id}"]`);
    if (!row) continue;
    const level = companyLevel(s, p.id);
    const status = companyPerkStatus(s, p);
    setText(row.querySelector('.lv'), `${level}/${p.maxLevel}`);
    starButton(row.querySelector<HTMLButtonElement>('button')!, status, equityAvailable(s), companyPerkCost(p, level), `lvl ${level + 1}`, `${companyPerkCost(p, level)}◆`);
  }
}
