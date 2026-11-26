import { MARKET, RIVALS } from '../../core/content';
import type { Game } from '../../core/game';
import { chart, chartMultiplier, churnShare, graceLeft, minutesSinceUpdate, rating, standing, usersNow } from '../../core/market';
import { clock, fmt, fmtDuration, fmtMul } from '../../core/num';
import { esc, setHtml } from '../dom';
import { hl, tint } from '../hl';
import { mailWaiting } from '../nav';

const starsText = (score: number): string => `${'★'.repeat(Math.round(score))}${'☆'.repeat(5 - Math.round(score))}`;
const ago = (ms: number): string => (ms < 60_000 ? 'just now' : `${fmtDuration(ms / 1000)} ago`);
/** Press headlines shown. */
const PRESS_SHOWN = 3;

export const marketKey = (game: Game): string => `${game.state.unlocked.mail}|${!!game.state.market.startedAt}`;

export function renderMarket(game: Game, fullChart: boolean): string {
  const s = game.state;
  const m = s.market;
  const row = (k: string, attr: string) => `<span class="k">${k}</span><span ${attr}></span>`;
  // Where you stand first, then the inbox, then the numbers behind it.
  return `<div class="cmd"><span><span class="ps">$</span> app-store top</span><button class="lnk" data-fullchart>${fullChart ? 'around me' : `all ${RIVALS.length + 1}`}</button></div>
    <div class="chart" data-mk-chart></div>
    ${s.unlocked.mail ? `<button class="inboxrow" data-goto="mail"><span class="k">inbox</span><span data-mk-inbox></span><span class="go2">read ▸</span></button>` : ''}
    <div class="cmd gap"><span><span class="ps">$</span> app-store stats <input class="appname" data-appname maxlength="24" spellcheck="false" autocomplete="off" value="${esc(m.appName)}" aria-label="App name"></span></div>
    <div class="mkt">
      ${row('users', 'data-mk-users')}
      ${row('rating', 'data-mk-rating')}
      <span class="k" data-mk-launch-k hidden>launch</span><span data-mk-launch hidden></span>
    </div>
    <div class="cmd gap"><span><span class="ps">$</span> curl -s news.feed | head -${PRESS_SHOWN}</span></div>
    <div class="press" data-mk-press></div>`;
}

/** What the `?` in market explains. */
export const marketHelp = (): string =>
  hl(
    `every release is reviewed: bigger releases with sprints merged and bugs squashed score better, and better reviews bring more users. users start drifting to rivals after ${MARKET.graceMinutes} minutes without an update (a ship or a major version), up to half of them; time away counts at ${Math.round(MARKET.awayChurnRate * 100)}% and on its own costs at most ${Math.round(MARKET.awayMaxChurn * 100)}%. a release reviewed ${MARKET.winBackAt}★ or better wins back half. each rival behind you adds ${Math.round(MARKET.rankBonus * 100)}% to all output. rivals announce launches: ship first for x${MARKET.launch.stealMul} new users.`,
  );

export function refreshMarket(game: Game, root: HTMLElement, fullChart: boolean): void {
  const s = game.state;
  const m = s.market;
  const now = game.now();
  const users = usersNow(s);
  const churn = churnShare(s);
  const quiet = minutesSinceUpdate(s, now);
  const trend =
    churn > 0
      ? `<span class="bad">▼ ${Math.round(churn * 100)}% drifting · update ${fmtDuration(quiet * 60)} ago</span>`
      : m.lastUpdateAt
        ? `<span class="cm">drifting starts in ${fmtDuration(graceLeft(s) * 60)}</span>`
        : '<span class="cm">ship a release to launch</span>';
  setHtml(root.querySelector('[data-mk-users]'), `${tint('num', fmt(users))} ${trend}`);
  const r = rating(s);
  const st = standing(s, now);
  const rank = m.startedAt ? ` · <span class="cm">#${st.rank} · ${tint('loc', `x${fmtMul(chartMultiplier(s, now))} output`)}</span>` : '';
  setHtml(root.querySelector('[data-mk-rating]'), r === null ? `<span class="cm">no reviews yet</span>${rank}` : `<span class="h h-star">${starsText(r)}</span> ${r.toFixed(1)}${rank}`);

  const launchRival = m.launch ? RIVALS.find((x) => x.id === m.launch!.rival) : null;
  const lk = root.querySelector<HTMLElement>('[data-mk-launch-k]');
  const lv = root.querySelector<HTMLElement>('[data-mk-launch]');
  if (lk && lv) {
    lk.hidden = lv.hidden = !launchRival;
    if (launchRival && m.launch) setHtml(lv, `${esc(launchRival.name)} in ${tint('time', clock((m.launch.endsAt - now) / 1000))} · <span class="okc">ship first: x${MARKET.launch.stealMul} users</span>`);
  }

  // The rows around you (or the whole chart), each with a bar scaled to the biggest shown.
  const all = chart(s, now);
  const me = Math.max(0, all.findIndex((c) => c.you));
  const rows = fullChart ? all.map((c, i) => ({ c, i })) : all.map((c, i) => ({ c, i })).slice(Math.max(0, me - 1), me + 2);
  const top = Math.max(1, ...rows.map(({ c }) => c.users));
  setHtml(
    root.querySelector('[data-mk-chart]'),
    rows
      .map(({ c, i }) => {
        const launching = m.launch?.rival === c.id ? ' <span class="h h-time">launching</span>' : '';
        return `<div class="crow${c.you ? ' you' : ''}"><span class="cr">#${i + 1}</span><span class="cn">${esc(c.name)}${launching}</span><span class="cb"><i style="width:${((c.users / top) * 100).toFixed(1)}%"></i></span><span class="cu">${fmt(c.users)}</span></div>`;
      })
      .join(''),
  );

  const press = m.press.length
    ? m.press
        .slice(0, PRESS_SHOWN)
        .map((h) => `<div class="news"><span class="cm">${ago(now - h.at)} · ${esc(h.outlet)}</span><br>${esc(h.text)}</div>`)
        .join('')
    : '<div class="news cm">no coverage yet</div>';
  setHtml(root.querySelector('[data-mk-press]'), press);

  const waiting = mailWaiting(s);
  setHtml(root.querySelector('[data-mk-inbox]'), waiting ? `${tint('num', waiting)} waiting from the team` : '<span class="cm">inbox zero</span>');
}
