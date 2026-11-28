import { INFRA, LINKS, PATTERNS, ROUNDS, SERVICES, type Mods, type ServiceId } from '../../core/content';
import type { Game } from '../../core/game';
import { activeLinks, activePatterns, boardParts, draftDirty, findService, infraSlots, monitored, type Board } from '../../core/infra';
import { esc } from '../dom';
import { hl } from '../hl';

/** What the board panel remembers between renders: the slot whose service picker is open. */
export interface InfraView {
  slot: number | null;
}

const pct = (x: number): string => `${Math.round(Math.abs(x) * 100)}%`;
const mul = (x: number): string => `x${Number(x.toFixed(2))}`;

/** What a set of parts adds up to, as a few words each: "x1.27 per tap", "+19% stars". */
export function partsSummary(parts: Partial<Mods>[]): string[] {
  const m = { tapMul: 1, autoMul: 1, allMul: 1, costMul: 1, sprintReward: 1, bugReward: 1, starGain: 1, debtMul: 1, churnMul: 1, usersMul: 1, critAdd: 0 };
  for (const p of parts) {
    for (const k of ['tapMul', 'autoMul', 'allMul', 'costMul', 'sprintReward', 'bugReward', 'starGain', 'debtMul', 'churnMul', 'usersMul'] as const) m[k] *= p[k] ?? 1;
    m.critAdd += p.critAdd ?? 0;
  }
  const out: string[] = [];
  if (m.allMul !== 1) out.push(`${mul(m.allMul)} everything`);
  if (m.tapMul !== 1) out.push(`${mul(m.tapMul)} per tap`);
  if (m.autoMul !== 1) out.push(`${mul(m.autoMul)} automation`);
  if (m.starGain !== 1) out.push(`+${pct(m.starGain - 1)} stars`);
  if (m.costMul !== 1) out.push(`packages ${pct(1 - m.costMul)} cheaper`);
  if (m.critAdd > 0) out.push(`+${pct(m.critAdd)} critical tap chance`);
  if (m.sprintReward !== 1) out.push(`+${pct(m.sprintReward - 1)} sprint rewards`);
  if (m.bugReward !== 1) out.push(`+${pct(m.bugReward - 1)} bug rewards`);
  if (m.usersMul !== 1) out.push(`+${pct(m.usersMul - 1)} new users`);
  if (m.debtMul !== 1) out.push(`tech debt ${pct(1 - m.debtMul)} slower`);
  if (m.churnMul !== 1) out.push(`users drift ${pct(1 - m.churnMul)} slower`);
  return out;
}

/** The round at which slot i opens. */
const opensAt = (i: number): string => ROUNDS[Math.min(ROUNDS.length - 1, INFRA.unlockRound + Math.max(0, i + 1 - INFRA.baseSlots))];

/** The services a service links with, for the picker. */
const partners = (id: ServiceId): string => LINKS.filter((l) => l.pair.includes(id)).map((l) => (l.pair[0] === id ? l.pair[1] : l.pair[0])).join(', ');

/** The board as a grid of slots with wires between linked neighbours (traffic runs along them once deployed). */
function boardHtml(board: Board, live: Board, slots: number, open: number | null): string {
  const cols = INFRA.columns;
  let html = `<div class="board" style="--cols:${cols}">`;
  for (let i = 0; i < INFRA.maxSlots; i++) {
    if (i >= slots) {
      html += `<div class="cell lk"><span class="cn">slot ${i + 1}</span><small>${esc(opensAt(i).toLowerCase())}</small></div>`;
      continue;
    }
    const def = board[i] ? findService(board[i]!) : undefined;
    const changed = (board[i] ?? null) !== (live[i] ?? null);
    const cls = ['cell', def ? 'on' : 'empty', changed ? 'chg' : '', open === i ? 'sel' : '', def && monitored(board, slots, i) ? 'mon' : ''].filter(Boolean).join(' ');
    html += `<button class="${cls}" data-slot="${i}" aria-pressed="${open === i}" aria-label="Slot ${i + 1}${def ? `: ${def.name}` : ', empty'}">
      <span class="cn">${def ? esc(def.name) : '+ add'}</span><small>${def ? esc(def.image) : `slot ${i + 1}`}</small></button>`;
  }
  for (const { a, b } of activeLinks(board, slots)) {
    const horizontal = b === a + 1;
    html += `<i class="wire ${horizontal ? 'wh' : 'wv'}" style="--c:${a % cols};--r:${Math.floor(a / cols)}"></i>`;
  }
  return html + '</div>';
}

/** pkgs/infra: the architecture board. The draft is shown; deploying makes it the running board. */
export function renderInfra(game: Game, view: InfraView): string {
  const s = game.state;
  const slots = infraSlots(s);
  const draft = s.infra.draft;
  const live = s.infra.live;
  const dirty = draftDirty(s);
  const placed = draft.slice(0, slots).filter(Boolean).length;
  const links = activeLinks(draft, slots);
  const patterns = activePatterns(draft, slots);
  const summary = partsSummary(boardParts(draft, slots));

  let html = `<div class="cmd"><span><span class="ps">$</span> docker compose ${dirty ? 'config' : 'ps'}</span><span class="aside">${placed} of ${slots} slots${slots < INFRA.maxSlots ? ` · more with each round` : ''}</span></div><!--help-->`;
  html += boardHtml(draft, live, slots, view.slot);

  if (view.slot !== null && view.slot < slots) {
    const here = draft[view.slot] ?? null;
    html += `<div class="svcs"><div class="fh">slot ${view.slot + 1}: pick a service</div>`;
    for (const def of SERVICES) {
      const at = draft.indexOf(def.id);
      const where = at === view.slot ? 'here' : at >= 0 && at < slots ? `moves from slot ${at + 1}` : '';
      html += `<button class="svc${at === view.slot ? ' here' : ''}" data-svc="${def.id}"><b>${esc(def.name)}</b> <span class="fn2">${esc(def.image)}</span>${where ? ` <span class="nw">${where}</span>` : ''}<small>${hl(def.rule)}</small><small class="cm">links with ${esc(partners(def.id)) || 'nothing'}</small></button>`;
    }
    if (here) html += `<button class="svc rm" data-svc=""><b>docker compose rm ${esc(here)}</b><small>empty this slot</small></button>`;
    html += '</div>';
  }

  if (summary.length) html += `<div class="rules bsum">${dirty ? 'this board would give' : 'running'}: ${hl(summary.join(' · '))}</div>`;
  else html += `<p class="caveat">${hl('# an empty board does nothing. tap a slot to add a service.')}</p>`;

  if (links.length || patterns.length) {
    html += '<div class="grp"># links and patterns</div>';
    for (const p of patterns) html += `<div class="lk2 pat"><span><span class="h h-star">★ ${esc(p.name)}</span> <span class="cm">${esc(p.needs.join(' + '))}</span></span><b>${hl(p.rule)}</b></div>`;
    for (const { link } of links) html += `<div class="lk2"><span><span class="h h-name">${esc(link.pair.join(' ↔ '))}</span> <span class="cm">${esc(link.name)}</span></span><b>${hl(link.rule)}</b></div>`;
  }

  if (dirty) {
    html += s.infra.canDeploy
      ? `<button class="shipbtn ready" data-deploy>docker compose up -d</button><div class="row2"><button class="lnk" data-discard>discard changes</button><small class="dim">one deploy per release</small></div>`
      : `<button class="shipbtn" disabled>deployed this release: ship to deploy again</button><div class="row2"><button class="lnk" data-discard>discard changes</button></div>`;
  } else if (!s.infra.canDeploy) html += `<p class="caveat">${hl('# deployed. the board can change again after you ship.')}</p>`;

  const found = s.infra.found.length;
  html += `<p class="foot">patterns built: ${found} of ${PATTERNS.length}${found < PATTERNS.length ? ' · three services that belong together, side by side' : ''}</p>`;
  return html;
}

export const infraKey = (game: Game, view: InfraView): string => {
  const s = game.state;
  return `${infraSlots(s)}|${s.infra.draft.join(',')}|${s.infra.live.join(',')}|${s.infra.canDeploy}|${view.slot}|${s.infra.found.length}`;
};

export const infraHelp = (): string =>
  hl(
    `the board holds your services: ${INFRA.baseSlots} slots at the seed round, one more each round, up to ${INFRA.maxSlots}. there are ${SERVICES.length} services, so the board is a choice. each service has its own effect; two that work together form a link when they sit side by side (up, down, left or right); three of the right kinds, joined up, make a named pattern. a service next to the monitor has its own effect raised by ${Math.round(INFRA.monitorBoost * 100)}%. arrange the board, then deploy it: one deploy per release. the board stays through rounds and major versions.`,
  );
