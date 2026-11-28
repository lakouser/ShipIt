import { careerTitle, nextTitle } from '../../core/career';
import { FOUNDER, FOUNDER_TRAITS, FUNDING, RFCS } from '../../core/content';
import { projectOf, starBonus } from '../../core/economy';
import { roundName } from '../../core/funding';
import type { Game } from '../../core/game';
import { fmt, fmtDuration, fmtMul, fmtRate } from '../../core/num';
import { currentVersion } from '../../core/ship';
import type { GameState, ReleaseEntry } from '../../core/state';
import { setHtml, setText } from '../dom';
import { tint } from '../hl';
import { BOAT } from '../icons';
import { starRate } from './ship';
import { streakGrid } from './todo';

const SESSION_START = Date.now();

const entryRate = (r: ReleaseEntry): number | null => (r.seconds ? r.stars / (r.seconds / 60) : null);
/** A stable fake commit hash for a tagged release. */
const sha = (r: ReleaseEntry): string => {
  let h = Math.floor(r.at / 1000);
  for (const c of r.version) h = Math.imul(h ^ c.charCodeAt(0), 2654435761);
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
};

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
  return `<div class="cmd gap"><span><span class="ps">$</span> git log --oneline --tags</span><span class="aside">last ${s.releaseLog.length}</span></div><div class="rlog">${rows}</div>`;
}

export function renderStats(game: Game): string {
  const s = game.state;
  const project = projectOf(s);
  const row = (k: string, v: string, attr = '') => `<span class="k">${k}</span><span${attr}>${v}</span>`;
  const title = nextTitle(s);
  return `<div class="cmd"><span><span class="ps">$</span> neofetch</span></div>
    <div class="fetch">
      <pre aria-hidden="true">${BOAT}</pre>
      <div class="info">
        <span class="who">dev@ship-it</span><span class="rule">───────────</span>
        ${row('release', `v${currentVersion(s)} (${project.name.toLowerCase()})`)}
        ${row('title', `${careerTitle(s)}${title ? ` <span class="cm">· next at ${fmt(title.stars)}★ earned</span>` : ''}`)}
        ${row('stars', '', ' data-f-stars')}
        ${s.founder.exits > 0 ? row('founder', `company ${s.founder.exits + 1} · ${s.founder.traits.map((id) => FOUNDER_TRAITS.find((t) => t.id === id)?.name ?? id).join(', ')} (${tint('loc', `x${fmt(FOUNDER.exitMul ** s.founder.exits)}`)})`) : ''}
        ${s.rfc.done.length ? row('rfcs', `${s.rfc.done.length} of ${RFCS.length} adopted`) : ''}
        ${s.round > 0 ? row('funding', `${roundName(s.round)} (${tint('loc', `x${fmt(FUNDING.outputPerRound ** s.round)}`)})`) : ''}
        ${row('lines', '', ' class="h h-loc" data-f-lines')}
        ${row('loc/s', '', ' class="h h-auto" data-f-rate')}
        ${row('taps', '', ' class="h h-tap" data-f-taps')}
        ${row('sprints', `${tint('num', s.stats.sprints)} merged`)}
        ${row('bugs', `${tint('bug', s.stats.bugs)} squashed`)}
        ${s.stats.bossesBeaten + s.stats.bossesFailed > 0 ? row('bosses', `${tint('num', s.stats.bossesBeaten)} beaten, ${tint('num', s.stats.bossesFailed)} lost`) : ''}
        ${s.team.length ? row('team', `${tint('num', s.team.length)} developer${s.team.length === 1 ? '' : 's'}`) : ''}
        ${row('uptime', '', ' class="h h-time" data-f-up')}
      </div>
    </div>
    ${releaseLog(s)}
    <div class="cmd gap"><span><span class="ps">$</span> git log --since=6.weeks</span><span class="aside">streak ${tint('time', `${s.streak.count} day${s.streak.count === 1 ? '' : 's'}`)}</span></div>
    ${streakGrid(game)}
    <small class="dim">play each day for a bonus; every 3rd day adds turbo.sh, every 7th sudo.sh</small>`;
}

/** Changes when the stats page lists something new (a release, a title, a streak day, a teammate). */
export const statsKey = (game: Game): string => {
  const s = game.state;
  return [s.releaseLog.length, s.releaseLog[0]?.at ?? 0, careerTitle(s), s.round, s.stats.sprints, s.stats.bugs, s.stats.bossesBeaten, s.stats.bossesFailed, s.team.length, s.streak.count, s.streak.days.length].join('|');
};

export function refreshStats(game: Game, root: HTMLElement): void {
  const s = game.state;
  setHtml(root.querySelector('[data-f-stars]'), `${tint('star', fmt(s.stars))} (${tint('loc', `x${fmtMul(starBonus(s.stars))} output`)})`);
  setText(root.querySelector('[data-f-lines]'), fmt(s.lifetime));
  setText(root.querySelector('[data-f-rate]'), fmtRate(game.perSecond()));
  setText(root.querySelector('[data-f-taps]'), fmt(s.stats.taps));
  setText(root.querySelector('[data-f-up]'), uptime());
}
