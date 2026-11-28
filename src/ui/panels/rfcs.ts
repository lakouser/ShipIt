import { RFC, RFCS } from '../../core/content';
import type { Game } from '../../core/game';
import { findRfc, rfcHours, rfcProgress, rfcsOpen } from '../../core/rfcs';
import { esc, setText } from '../dom';
import { hl } from '../hl';
import { cssBar, setBar } from './ship';

/** "3h 12m", "41m", "50s". */
export function longClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

/** work/rfcs: the RFC under discussion, the ones still open, and those adopted. */
export function renderRfcs(game: Game, withdrawArmed: boolean): string {
  const s = game.state;
  const active = s.rfc.active ? findRfc(s.rfc.active.id) : undefined;
  const hours = rfcHours(s);
  let html = `<div class="cmd"><span><span class="ps">$</span> ls rfcs/</span><span class="aside">${s.rfc.done.length} of ${RFCS.length} adopted</span></div><!--help-->`;
  if (active) {
    html += `<div class="pr"><div class="prh">
      <div class="prt"><h3>RFC: ${esc(active.title)}</h3><span class="h h-time" data-rfc-left></span></div>
      ${cssBar('data-rfc-bar', 'loc')}
      <div class="chk"><span>${esc(active.blurb.toLowerCase())}</span></div>
      <div class="chk"><span>when adopted</span><b>${hl(active.rule)}</b></div>
      <div class="rules">${hl('under discussion · the clock runs while you are away')}</div>
    </div></div>
    <div class="row2"><button class="lnk${withdrawArmed ? ' bad' : ''}" data-rfc-withdraw>${withdrawArmed ? 'really withdraw? the time spent is lost' : 'withdraw this rfc'}</button></div>`;
  } else if (rfcsOpen(s).length) {
    html += `<p class="caveat">${hl(`# nothing under discussion. open one: the next takes ${hours}h of real time, playing or away.`)}</p>`;
  }
  const open = rfcsOpen(s).filter((r) => r.id !== active?.id);
  if (open.length) html += '<div class="grp"># open</div>';
  for (const r of open) {
    html += `<div class="perk co rfc"><div><span class="nm">${esc(r.title)}</span><small>${hl(r.rule)}</small><small class="cm">${esc(r.blurb.toLowerCase())}</small></div>
      <button class="buy perkbuy${active ? '' : ' ok'}" data-rfc="${r.id}"${active ? ' disabled' : ''}><span class="bq">open</span><span class="bc">${hours}h</span></button></div>`;
  }
  if (s.rfc.done.length) {
    html += '<div class="grp"># adopted</div><ul class="ach">';
    for (const id of s.rfc.done) {
      const r = findRfc(id);
      if (r) html += `<li><span class="box">[x]</span> ${esc(r.title)} <small>· ${hl(r.rule)}</small></li>`;
    }
    html += '</ul>';
  }
  if (!open.length && !active) html += `<p class="caveat">${hl('# every rfc is adopted. the process works.')}</p>`;
  return html;
}

export const rfcsKey = (game: Game, withdrawArmed: boolean): string => `${game.state.rfc.active?.id ?? '-'}|${game.state.rfc.done.length}|${withdrawArmed}`;

export const rfcsHelp = (): string =>
  hl(
    `an rfc is a change to how the company works. one is discussed at a time, and it takes real time, whether you are playing or away: ${RFC.hours.join('h, ')}h, then ${RFC.hours[RFC.hours.length - 1]}h for each one after. once adopted it is kept for good: through releases, rounds and major versions, and into the next company. withdrawing one loses the time spent on it.`,
  );

export function refreshRfcs(game: Game, root: HTMLElement): void {
  const p = rfcProgress(game.state, game.now());
  if (!p) return;
  setText(root.querySelector('[data-rfc-left]'), `${longClock(p.left)} left`);
  setBar(root.querySelector('[data-rfc-bar]'), p.progress);
}
