import { careerTitle, nextTitle } from '../../core/career';
import { AUTOMATION, PERKS, SHIP, WORKFLOWS, type PerkBranch } from '../../core/content';
import { starMultiplier } from '../../core/economy';
import type { Game } from '../../core/game';
import { fmt, fmtDuration, fmtMul, fmtRate } from '../../core/num';
import { perkCost, perkLevel, perkStatus, spendableStars } from '../../core/perks';
import { milestoneBonus } from '../../core/quests';
import { findChallenge } from '../../core/major';
import { currentVersion, linesForStars, nextVersion, shipGain, starsAvailable, starsPerMinute } from '../../core/ship';
import { releasesShipped, workflowOn } from '../../core/workflows';
import type { GameState, ReleaseEntry } from '../../core/state';
import { setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { barHtml } from '../messages';

const SESSION_START = Date.now();

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

/** Stars per minute: two decimals below 1 ("0.42"), one below 10, then like fmt. */
const starRate = (perMinute: number): string => (perMinute < 1 ? perMinute.toFixed(2) : perMinute < 10 ? perMinute.toFixed(1) : fmt(perMinute));
const pct = (fraction: number): string => `${fmt(Math.round(fraction * 100))}%`;
const entryRate = (r: ReleaseEntry): number | null => (r.seconds ? r.stars / (r.seconds / 60) : null);
/** A stable fake commit hash for a tagged release. */
const sha = (r: ReleaseEntry): string => ((Math.imul(r.release, 2654435761) ^ Math.floor(r.at / 1000)) >>> 0).toString(16).padStart(8, '0').slice(0, 7);

function uptime(): string {
  const m = Math.floor((Date.now() - SESSION_START) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** `git log` of the last few releases, so players can compare a run with the ones before it. */
function releaseLog(s: GameState): string {
  if (!s.releaseLog.length) return '';
  const rates = s.releaseLog.filter((r) => !r.xp).map(entryRate).filter((r): r is number => r !== null);
  const best = rates.length > 1 ? Math.max(...rates) : null;
  const rows = s.releaseLog
    .map((r) => {
      if (r.xp) return `<div class="rl"><span class="sha">${sha(r)}</span> <span class="tg">(tag: v${r.version})</span> major version · ${tint('star', `+${fmt(r.xp)} xp`)}</div>`;
      const rate = entryRate(r);
      const timing = rate !== null && r.seconds !== null ? ` in ${tint('time', fmtDuration(r.seconds))} · ${tint('star', starRate(rate))}/min` : '';
      return `<div class="rl"><span class="sha">${sha(r)}</span> <span class="tg">(tag: v${r.version})</span> ${tint('star', `+${fmt(r.stars)}★`)}${timing} · ${tint('loc', fmt(r.lines))} lines${rate !== null && rate === best ? ' <span class="cm">← best</span>' : ''}</div>`;
    })
    .join('');
  return `<div class="cmd gap"><span><span class="ps">$</span> git log --oneline --tags</span><span class="aside">last ${s.releaseLog.length} release${s.releaseLog.length === 1 ? '' : 's'}</span></div><div class="rlog">${rows}</div>`;
}

/** .github/workflows: automation earned by shipping, each switchable. */
function workflowList(s: GameState): string {
  const shipped = releasesShipped(s);
  const on = WORKFLOWS.filter((w) => workflowOn(s, w.id)).length;
  const rows = WORKFLOWS.map((w) => {
    const open = shipped >= w.releases;
    const active = workflowOn(s, w.id);
    const trigger =
      w.id === 'release' && open
        ? `<div class="row2 wfopt"><span class="lbl">ship at stars</span>${AUTOMATION.shipAtOptions
            .map((f) => `<button class="chip2" data-autoship="${f}" aria-pressed="${s.autoShipAt === f}">${s.autoShipAt === f ? '(•)' : '( )'} +${Math.round(f * 100)}%</button>`)
            .join('')}</div>`
        : '';
    return `<button class="opt" data-workflow="${w.id}" aria-pressed="${active}"${open ? '' : ' disabled'}><span class="box">[${active ? 'x' : ' '}]</span> <span class="h h-name">${w.file}</span> <small>${open ? hl(w.summary) : `unlocks after ${w.releases} releases`}</small></button>${trigger}`;
  });
  return `<div class="cmd gap"><span><span class="ps">$</span> ls .github/workflows</span><span class="aside">${on} of ${WORKFLOWS.length} on</span></div><div class="opts wfs">${rows.join('')}</div>`;
}

function dotfilesTree(game: Game): string {
  const s = game.state;
  let html = `<div class="cmd gap"><span><span class="ps">$</span> tree ~/dotfiles</span><span class="aside"><b class="st" data-spend>${fmt(spendableStars(s))}</b> stars to spend</span></div><div class="tree"><div class="root">~/dotfiles</div>`;
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
  const next = nextVersion(s);
  const row = (k: string, v: string, attr = '') => `<span class="k">${k}</span><span${attr}>${v}</span>`;
  return `<div class="cmd"><span><span class="ps">$</span> gh pr view release/v${next}</span></div>
    <div class="pr">
      <div class="prh">
        <h3>Release v${next}</h3>
        <div class="chips"><span>main</span> ← <span>release/v${next}</span></div>
        <div class="chk"><span>lines this release</span><b data-run-text></b></div>
        <div class="tbar" data-run-bar></div>
        <div class="chk"><span>stars per minute</span><b data-rate></b></div>
        <div class="chk"><span>checks</span><b data-ready></b></div>
        ${s.challenge ? `<div class="chk"><span>challenge/${findChallenge(s.challenge.id).branch}</span><b data-chal></b></div>` : ''}
      </div>
      <div class="diff">
        <div class="fn">config/release.ts</div>
        <div class="dl m" data-diff-stars-was></div>
        <div class="dl a" data-diff-stars></div>
        <div class="dl m" data-diff-mul-was></div>
        <div class="dl a" data-diff-mul></div>
      </div>
      <p class="caveat"># stars count every line you've ever shipped: one big release beats several small ones. lines and packages reset; stars, dotfiles, achievements and TODO bonuses stay. each star adds ${Math.round(SHIP.bonusPerStar * 100)}% output, even once spent.</p>
      <button class="shipbtn" data-ship></button>
    </div>
    ${releaseLog(s)}
    ${workflowList(s)}
    ${dotfilesTree(game)}
    <div class="fetch">
      <pre aria-hidden="true">${LOGO}</pre>
      <div class="info">
        <span class="who">dev@ship-it</span><span class="rule">───────────</span>
        ${row('release', `v${currentVersion(s)}${s.major > 0 ? ` <span class="cm">· ${s.stack}</span>` : ''}`)}
        ${row('title', `${careerTitle(s)}${nextTitle(s) ? ` <span class="cm">· next at ${fmt(nextTitle(s)!.stars)}★ earned</span>` : ''}`)}
        ${row('stars', `${tint('star', fmt(s.stars))} (${tint('loc', `x${fmtMul(starMultiplier(s.stars))} output`)})`, ' data-f-stars')}
        ${row('lines', fmt(s.lifetime), ' class="h h-loc" data-f-lines')}
        ${row('loc/s', fmtRate(game.perSecond()), ' class="h h-auto" data-f-rate')}
        ${row('taps', fmt(s.stats.taps), ' class="h h-tap" data-f-taps')}
        ${row('sprints', `${tint('num', s.stats.sprints)} merged`)}
        ${row('bugs', `${tint('bug', s.stats.bugs)} squashed`)}
        ${row('uptime', uptime(), ' class="h h-time" data-f-up')}
      </div>
    </div>`;
}

/** The "checks" line: whether this release is worth merging yet, by the +50% rule of thumb. */
function readyText(s: GameState, stars: number): string {
  if (stars < 1) return `<span class="cm">○</span> waiting for the first star`;
  const gain = shipGain(s);
  const bonus = milestoneBonus(s, stars);
  const extra = bonus > 0 ? ` · milestone ${tint('star', `+${fmt(bonus)}`)}` : '';
  if (gain === Infinity) return `<span class="ok">✓</span> ready to merge · first stars${extra}`;
  if (gain >= SHIP.readyAt) return `<span class="ok">✓</span> ready to merge · ${tint('star', `+${pct(gain)}`)} stars${extra}`;
  return `<span class="cm">○</span> ${tint('star', `+${pct(gain)}`)} stars · ready at ${tint('star', `+${pct(SHIP.readyAt)}`)}${extra}`;
}

export function refreshShip(game: Game, root: HTMLElement, armed: boolean): void {
  const s = game.state;
  const now = game.now();
  const stars = starsAvailable(s);
  const target = linesForStars(s, stars + 1);
  setHtml(root.querySelector('[data-run-text]'), stars >= 1 ? `${tint('loc', fmt(s.thisRelease))} · next ${tint('star', '★')} at ${tint('loc', fmt(target))}` : `${tint('loc', fmt(s.thisRelease))} / ${tint('loc', fmt(target))}`);
  const bar = root.querySelector<HTMLElement>('[data-run-bar]');
  const prev = linesForStars(s, stars);
  const html = barHtml(s.thisRelease.sub(prev).div(target.sub(prev)).toNumber(), 22);
  if (bar && bar.innerHTML !== html) bar.innerHTML = html;

  const rate = starsPerMinute(s, now);
  const timed = s.releaseStartedAt >= 0;
  setHtml(root.querySelector('[data-rate]'), stars >= 1 && timed ? `${tint('star', starRate(rate))} now · best ${tint('star', starRate(Math.max(rate, s.releasePeak)))}` : `<span class="cm">${timed ? '—' : '— (from your next release)'}</span>`);
  setHtml(root.querySelector('[data-ready]'), readyText(s, stars));
  if (s.challenge) {
    const met = s.thisRelease.gte(s.challenge.goal);
    setHtml(root.querySelector('[data-chal]'), met ? `<span class="ok">✓</span> goal met: ship for ${hl(findChallenge(s.challenge.id).reward)}` : `goal ${tint('loc', fmt(s.challenge.goal))} lines (${Math.floor(s.thisRelease.div(s.challenge.goal).toNumber() * 100)}%)`);
  }

  const payout = stars + milestoneBonus(s, stars);
  const preview = s.stars + Math.max(1, payout);
  const mulBefore = starMultiplier(s.stars);
  const mulAfter = starMultiplier(preview);
  setText(root.querySelector('[data-diff-stars-was]'), `- export const stars = ${fmt(s.stars)};`);
  setText(root.querySelector('[data-diff-stars]'), `+ export const stars = ${fmt(preview)};`);
  setText(root.querySelector('[data-diff-mul-was]'), `- export const outputMul = ${fmtMul(mulBefore)};`);
  setText(root.querySelector('[data-diff-mul]'), `+ export const outputMul = ${fmtMul(mulAfter)}; // x${(mulAfter / mulBefore).toFixed(2)}`);

  setHtml(root.querySelector('[data-f-stars]'), `${tint('star', fmt(s.stars))} (${tint('loc', `x${fmtMul(mulBefore)} output`)})`);
  setText(root.querySelector('[data-f-lines]'), fmt(s.lifetime));
  setText(root.querySelector('[data-f-rate]'), fmtRate(game.perSecond()));
  setText(root.querySelector('[data-f-taps]'), fmt(s.stats.taps));
  setText(root.querySelector('[data-f-up]'), uptime());
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
  btn.classList.toggle('ready', !armed && shipGain(s) >= SHIP.readyAt);
  setText(
    btn,
    stars < 1
      ? `needs ${fmt(linesForStars(s, 1).sub(s.thisRelease))} more lines`
      : armed
        ? 'confirm: merge and reset lines?'
        : `merge & ship v${nextVersion(s)} → +${fmt(payout)} star${payout > 1 ? 's' : ''}`,
  );
}
