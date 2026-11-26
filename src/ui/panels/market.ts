import { MARKET, RIVALS } from '../../core/content';
import type { Game } from '../../core/game';
import { chart, chartMultiplier, churnShare, graceLeft, minutesSinceUpdate, rating, standing, usersNow } from '../../core/market';
import { clock, fmt, fmtDuration, fmtMul } from '../../core/num';
import { esc, setHtml } from '../dom';
import { tint } from '../hl';

const starsText = (score: number): string => `${'★'.repeat(Math.round(score))}${'☆'.repeat(5 - Math.round(score))}`;
const ago = (ms: number): string => (ms < 60_000 ? 'just now' : `${fmtDuration(ms / 1000)} ago`);

export function renderMarket(game: Game): string {
  const s = game.state;
  const m = s.market;
  const row = (k: string, attr: string) => `<span class="k">${k}</span><span ${attr}></span>`;
  return `<div class="cmd"><span><span class="ps">$</span> app-store stats <input class="appname" data-appname maxlength="24" spellcheck="false" autocomplete="off" value="${esc(m.appName)}" aria-label="App name"></span></div>
    <div class="mkt">
      ${row('users', 'data-mk-users')}
      ${row('rating', 'data-mk-rating')}
      ${row('chart', 'data-mk-rank')}
      <span class="k" data-mk-launch-k hidden>launch</span><span data-mk-launch hidden></span>
    </div>
    <p class="caveat"># every release is reviewed: bigger releases with sprints merged and bugs squashed score better, and better reviews bring more users. users start drifting to rivals after ${MARKET.graceMinutes} minutes without an update (a ship or a major version), up to half of them; time away counts at ${Math.round(MARKET.awayChurnRate * 100)}% and on its own costs at most ${Math.round(MARKET.awayMaxChurn * 100)}%, so closing the game costs less than idling in it; a release reviewed ${MARKET.winBackAt}★ or better wins back half of those. each rival behind you adds ${Math.round(MARKET.rankBonus * 100)}% to all output.</p>
    <div class="cmd gap"><span><span class="ps">$</span> app-store top --category dev-tools</span><span class="aside">${RIVALS.length + 1} apps</span></div>
    <div class="chart" data-mk-chart></div>
    <div class="cmd gap"><span><span class="ps">$</span> curl -s news.feed | head</span></div>
    <div class="press" data-mk-press></div>`;
}

export function refreshMarket(game: Game, root: HTMLElement): void {
  const s = game.state;
  const m = s.market;
  const now = game.now();
  const users = usersNow(s);
  const churn = churnShare(s);
  const quiet = minutesSinceUpdate(s, now);
  const trend =
    churn > 0
      ? `<span class="bad">▼ ${Math.round(churn * 100)}% drifting to rivals · last update ${fmtDuration(quiet * 60)} ago</span>`
      : m.lastUpdateAt
        ? `<span class="cm">last update ${fmtDuration(quiet * 60)} ago · drifting starts in ${fmtDuration(graceLeft(s) * 60)} of play</span>`
        : '<span class="cm">ship a release to launch</span>';
  setHtml(root.querySelector('[data-mk-users]'), `${tint('num', fmt(users))} ${trend}`);
  const r = rating(s);
  setHtml(root.querySelector('[data-mk-rating]'), r === null ? '<span class="cm">no reviews yet</span>' : `<span class="h h-star">${starsText(r)}</span> ${r.toFixed(1)} <span class="cm">· last ${m.reviews.length} release${m.reviews.length === 1 ? '' : 's'}</span>`);
  const st = standing(s, now);
  setHtml(root.querySelector('[data-mk-rank]'), m.startedAt ? `#${st.rank} of ${RIVALS.length + 1} · ${tint('loc', `x${fmtMul(chartMultiplier(s, now))} output`)}` : '<span class="cm">not in the store yet</span>');

  const launchRival = m.launch ? RIVALS.find((x) => x.id === m.launch!.rival) : null;
  const lk = root.querySelector<HTMLElement>('[data-mk-launch-k]');
  const lv = root.querySelector<HTMLElement>('[data-mk-launch]');
  if (lk && lv) {
    lk.hidden = lv.hidden = !launchRival;
    if (launchRival && m.launch) setHtml(lv, `${esc(launchRival.name)} launches in ${tint('time', clock((m.launch.endsAt - now) / 1000))} · <span class="okc">ship first for x${MARKET.launch.stealMul} new users</span>`);
  }

  const rows = chart(s, now)
    .map((c, i) => {
      const launching = m.launch?.rival === c.id ? ' <span class="h h-time">launching</span>' : '';
      const name = c.you ? `<b>${esc(c.name)}</b> <span class="cm">(you)</span>` : `${esc(c.name)} <span class="cm">${esc(c.app)}</span>`;
      return `<div class="crow${c.you ? ' you' : ''}"><span class="cr">#${i + 1}</span><span class="cn">${name}${launching}</span><span class="cu">${fmt(c.users)}</span></div>`;
    })
    .join('');
  setHtml(root.querySelector('[data-mk-chart]'), rows);

  const press = m.press.length
    ? m.press.map((h) => `<div class="news"><span class="cm">${ago(now - h.at)} · ${esc(h.outlet)}</span><br>${esc(h.text)}</div>`).join('')
    : '<div class="news cm">no coverage yet</div>';
  setHtml(root.querySelector('[data-mk-press]'), press);
}
