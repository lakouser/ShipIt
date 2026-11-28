import { RIVALS } from '../core/content';
import { chart, rivalUsers, usersNow } from '../core/market';
import { fmt } from '../core/num';
import type { GameState, QuarterReport } from '../core/state';
import { esc } from './dom';

/*
 * Charts drawn as inline SVG: users over time against the nearest rivals (co/market), the stock by quarter and the
 * ticker tape (after the IPO). Lines keep their width when the chart stretches (vector-effect); labels are HTML, so
 * text is never stretched.
 */

const W = 300;

/** "12m ago", "3h ago", "2d ago". */
const ago = (ms: number): string => (ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60_000))}m ago` : ms < 172_800_000 ? `${Math.round(ms / 3_600_000)}h ago` : `${Math.round(ms / 86_400_000)}d ago`);

const points = (xs: number[], ys: number[]): string => xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');

/**
 * Users over time on a log scale: you, and the rivals just above and just below you now, each drawn where it was at
 * every sample. Needs two samples; before that, a line of text.
 */
export function usersChart(s: GameState, now: number): string {
  const h = s.market.history;
  if (!s.market.startedAt) return '';
  if (h.length < 2) return `<div class="grp"># users over time</div><div class="chartbox empty">the chart fills in as you play</div>`;
  const H = 96;
  // Samples are taken while playing, so they are spaced evenly: an absence would otherwise flatten the chart.
  const mine = [...h.map((p) => p.users), usersNow(s)];
  const times = [...h.map((p) => p.at), Math.max(now, h[h.length - 1].at)];
  const since = Math.max(0, now - h[0].at);

  // The rivals either side of you in the chart right now.
  const rows = chart(s, now);
  const me = rows.findIndex((r) => r.you);
  const near = [rows[me - 1], rows[me + 1]].filter((r): r is NonNullable<typeof r> => !!r && !r.you).map((r) => RIVALS.find((x) => x.id === r.id)!).filter(Boolean);
  const series = near.map((r) => ({ name: r.name, values: times.map((t) => rivalUsers(s, r, t)) }));

  const all = [...mine, ...series.flatMap((x) => x.values)].filter((v) => v > 0);
  const lo = Math.log10(Math.max(1, Math.min(...all)));
  const hi = Math.max(lo + 0.5, Math.log10(Math.max(10, ...all)));
  const step = W / (times.length - 1);
  const y = (v: number) => H - 6 - ((Math.log10(Math.max(1, v)) - lo) / (hi - lo)) * (H - 12);
  const xs = times.map((_, i) => i * step);
  const grid = [0.25, 0.5, 0.75].map((f) => `<line x1="0" x2="${W}" y1="${(H * f).toFixed(1)}" y2="${(H * f).toFixed(1)}" class="cg"/>`).join('');
  const rivalLines = series.map((r) => `<polyline class="cl rival" points="${points(xs, r.values.map(y))}"/>`).join('');
  const myY = mine.map(y);
  const area = `<polygon class="ca" points="0,${H} ${points(xs, myY)} ${W},${H}"/>`;
  const dot = `<circle class="cd" cx="${W - 1.5}" cy="${myY[myY.length - 1].toFixed(1)}" r="2.5"/>`;
  const legend = [`<span class="lg you">— ${esc(s.market.appName)}</span>`, ...series.map((r) => `<span class="lg">— ${esc(r.name)}</span>`)].join('');
  return `<div class="grp"># users over time <span class="aside2">since ${ago(since)} · log scale</span></div>
    <div class="chartbox"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Users over time">${grid}${area}${rivalLines}<polyline class="cl you" points="${points(xs, myY)}"/>${dot}</svg>
      <span class="cy top">${fmt(10 ** hi)}</span><span class="cy bot">${fmt(10 ** lo)}</span></div>
    <div class="clegend">${legend}</div>`;
}

/** The stock after each of the last quarters, oldest first, as a stepped line: a green dot for a beat, red for a miss. */
export function stockChart(reports: QuarterReport[], stock: number): string {
  const H = 56;
  const rs = [...reports].reverse();
  const values = rs.map((r) => r.stock);
  if (!values.length) values.push(stock);
  const lo = Math.min(...values) * 0.9;
  const hi = Math.max(...values) * 1.1;
  const n = values.length;
  const x = (i: number) => (n === 1 ? W / 2 : 8 + (i / (n - 1)) * (W - 16));
  const y = (v: number) => H - 6 - ((v - lo) / Math.max(1e-9, hi - lo)) * (H - 12);
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const dots = rs.map((r, i) => `<circle class="${r.beat ? 'cdok' : 'cdbad'}" cx="${x(i).toFixed(1)}" cy="${y(r.stock).toFixed(1)}" r="3"/>`).join('');
  const labels = rs.map((r, i) => `<span style="left:${((x(i) / W) * 100).toFixed(1)}%">Q${r.quarter}</span>`).join('');
  return `<div class="chartbox stock"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Stock price by quarter"><polyline class="cl star" points="${line}"/>${dots}</svg>
    <span class="cy top">${fmt(hi)}</span><span class="cy bot">${fmt(Math.max(0, lo))}</span></div><div class="cxl">${labels}</div>`;
}

/** A four-letter ticker symbol from a name. */
export const tickerSymbol = (name: string): string => name.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase() || 'SHIP';

/**
 * The ticker tape after the IPO: your stock and its last move, then the rivals still on the chart. Rivals have no
 * stock in the rules, so theirs is made from their users (bigger company, higher price) with a slow wobble.
 */
export function tickerItems(s: GameState, now: number): string {
  const c = s.corp;
  const prev = c.reports[1]?.stock ?? 100;
  const last = c.reports[0]?.stock ?? c.stock;
  const move = c.reports.length ? (last / prev - 1) * 100 : 0;
  const item = (sym: string, price: number, pct: number, you = false) =>
    `<span class="tk2${you ? ' you' : ''}"><b>${esc(sym)}</b> ${fmt(price)} <i class="${pct >= 0 ? 'up' : 'dn'}">${pct >= 0 ? '▲' : '▼'}${Math.abs(pct).toFixed(1)}%</i></span>`;
  const items = [item(tickerSymbol(s.market.appName), c.stock, move, true)];
  const slot = Math.floor(now / 20_000);
  RIVALS.filter((r) => !s.market.acquired.includes(r.id))
    .slice(-6)
    .forEach((r, i) => {
      const users = rivalUsers(s, r, now);
      const wobble = Math.sin(slot * 1.7 + i * 2.3) * 2.4;
      items.push(item(tickerSymbol(r.app), 12 * Math.log10(Math.max(10, users)) * (1 + wobble / 100), wobble));
    });
  return items.join('');
}
