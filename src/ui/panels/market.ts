import { CORP, MARKET, RIVALS } from '../../core/content';
import { acquirePrice, rivalsLeft } from '../../core/corp';
import type { Game } from '../../core/game';
import { chart, chartMultiplier, churnShare, graceLeft, minutesSinceUpdate, rating, rivalUsers, standing, usersNow } from '../../core/market';
import { clock, fmt, fmtDuration, fmtMoney, fmtMul } from '../../core/num';
import { esc, setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { mailWaiting } from '../nav';

const starsText = (score: number): string => `${'★'.repeat(Math.round(score))}${'☆'.repeat(5 - Math.round(score))}`;
const ago = (ms: number): string => (ms < 60_000 ? 'just now' : `${fmtDuration(ms / 1000)} ago`);
/** Press headlines shown. */
const PRESS_SHOWN = 3;
/** Rivals listed for acquisition, cheapest first. */
const ACQUIRE_SHOWN = 3;

export const marketKey = (game: Game): string => `${game.state.unlocked.mail}|${!!game.state.market.startedAt}|${game.state.corp.ipoAt > 0}|${game.state.market.acquired.length}`;

/** After the IPO: the cheapest rivals to buy, with their price in cash. */
function acquisitions(game: Game): string {
  const s = game.state;
  const left = rivalsLeft(s).length;
  if (!s.corp.ipoAt) return '';
  const head = `<div class="cmd gap"><span><span class="ps">$</span> acquire --list</span><span class="aside">${s.market.acquired.length} of ${RIVALS.length} bought</span></div>`;
  if (!left) return `${head}<p class="caveat">${hl('# every rival is yours. the chart is a list of one.')}</p>`;
  const rows = Array.from({ length: Math.min(ACQUIRE_SHOWN, left) }, (_, i) => `<div class="perk co" data-acq-row="${i}"><div><span class="nm"></span> <small class="ps2"></small></div><button class="buy star perkbuy" data-acquire=""><span class="bq">buy</span><span class="bc"></span></button></div>`).join('');
  return `${head}<div class="mkt"><span class="k">cash</span><span data-acq-cash></span></div>${rows}<p class="caveat">${hl(`# their users join yours (${Math.round(CORP.keepUsers * 100)}% stay) and +${Math.round(CORP.acquireBonus * 100)}% output for good. each purchase makes the next one dearer; a higher stock makes them cheaper.`)}</p>`;
}

export function renderMarket(game: Game, fullChart: boolean): string {
  const s = game.state;
  const m = s.market;
  const row = (k: string, attr: string) => `<span class="k">${k}</span><span ${attr}></span>`;
  // Where you stand first, then the inbox, then the numbers behind it.
  return `<div class="cmd"><span><span class="ps">$</span> app-store top</span><button class="lnk" data-fullchart>${fullChart ? 'around me' : `all ${RIVALS.length + 1}`}</button></div>
    <div class="chart" data-mk-chart></div>
    ${s.unlocked.mail ? `<button class="inboxrow" data-goto="mail"><span class="k">inbox</span><span data-mk-inbox></span><span class="go2">read ▸</span></button>` : ''}
    ${acquisitions(game)}
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
    `every release is reviewed: bigger releases with sprints merged, bugs squashed and tests written score better, and better reviews bring more users. users start drifting to rivals after ${MARKET.graceMinutes} minutes without an update (a ship or a major version), up to half of them; time away counts at ${+(MARKET.awayChurnRate * 100).toFixed(1)}% and on its own costs at most ${Math.round(MARKET.awayMaxChurn * 100)}%. a release reviewed ${MARKET.winBackAt}★ or better wins back half. each rival behind you adds ${Math.round(MARKET.rankBonus * 100)}% to all output. rivals announce launches: ship first for x${MARKET.launch.stealMul} new users.`,
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

  if (s.corp.ipoAt) {
    setHtml(root.querySelector('[data-acq-cash]'), tint('star', fmtMoney(s.corp.cash)));
    const offers = rivalsLeft(s)
      .map((r) => ({ r, price: acquirePrice(s, r, now) }))
      .sort((a, b) => a.price - b.price)
      .slice(0, ACQUIRE_SHOWN);
    offers.forEach(({ r, price }, i) => {
      const row = root.querySelector<HTMLElement>(`[data-acq-row="${i}"]`);
      if (!row) return;
      setText(row.querySelector('.nm'), r.name);
      setHtml(row.querySelector('.ps2'), `${esc(r.app)} · ${tint('num', fmt(rivalUsers(s, r, now)))} users`);
      const btn = row.querySelector<HTMLButtonElement>('button')!;
      btn.dataset.acquire = r.id;
      const ok = s.corp.cash >= price;
      btn.disabled = !ok;
      btn.classList.toggle('ok', ok);
      btn.style.setProperty('--p', `${ok ? 0 : Math.min(100, (s.corp.cash / price) * 100).toFixed(1)}%`);
      setText(btn.lastElementChild, fmtMoney(price));
    });
  }
}
