import { ROADMAP, SEGMENTS, type SegmentId } from '../../core/content';
import type { Game } from '../../core/game';
import { fmt } from '../../core/num';
import { generalShare, nextFeature, segmentShare } from '../../core/roadmap';
import { usersNow } from '../../core/market';
import { esc, setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { cssBar, setBar } from './ship';

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const HUE: Record<SegmentId, string> = { dev: 'auto', biz: 'star', fun: 'tap' };

/** What a segment pays at its current share. */
function payoff(id: SegmentId, share: number): string {
  if (id === 'dev') return `x${(1 + ROADMAP.devAuto * share).toFixed(2)} automation`;
  if (id === 'biz') return `+${pct(ROADMAP.bizStars * share)} stars from shipping`;
  return `x${(1 + ROADMAP.funTap * share).toFixed(2)} per tap, +${pct(ROADMAP.funUsers * share)} new users`;
}

/** What a segment would pay if every user belonged to it. */
function ceiling(id: SegmentId): string {
  if (id === 'dev') return `up to x${1 + ROADMAP.devAuto} automation`;
  if (id === 'biz') return `up to +${pct(ROADMAP.bizStars)} stars, and x${1 + ROADMAP.bizRevenue} revenue after the ipo`;
  return `up to x${1 + ROADMAP.funTap} per tap and +${pct(ROADMAP.funUsers)} new users`;
}

/** pkgs/features: who the app is for, and the headline feature of the next release. */
export function renderRoadmap(game: Game): string {
  const s = game.state;
  const focus = s.roadmap.focus;
  const cards = SEGMENTS.map((seg) => {
    const on = focus === seg.id;
    return `<button class="seg${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-focus="${seg.id}">
      <div class="sgh"><span><span class="box">${on ? '(•)' : '( )'}</span> <b>${esc(seg.name)}</b></span><b data-seg-share="${seg.id}"></b></div>
      ${cssBar(`data-seg-bar="${seg.id}"`, HUE[seg.id])}
      <small data-seg-pay="${seg.id}"></small>
      <small class="cm">${esc(seg.blurb.toLowerCase())} ${esc(ceiling(seg.id))}</small>
      <small>next: <span class="h h-name">${esc(nextFeature(s, seg.id))}</span>${on ? ' <span class="okc">· headlines the next release</span>' : ''}</small>
    </button>`;
  }).join('');
  const shipped = SEGMENTS.reduce((n, seg) => n + (s.roadmap.shipped[seg.id] ?? 0), 0);
  return `<div class="cmd"><span><span class="ps">$</span> cat ROADMAP.md</span><span class="aside" data-rm-users></span></div><!--help-->
    <div class="segs" role="radiogroup" aria-label="Who the roadmap is for">${cards}</div>
    <div class="chk"><span>nobody in particular</span><b data-rm-general></b></div>
    <p class="caveat">${hl(
      focus
        ? `# every release ships that feature as its headline: x${ROADMAP.headlineUsers} new users, and all of them join that segment. a release that doubles your users moves the mix halfway.`
        : `# pick who the roadmap is for. until you do, releases have no headline feature and new users are nobody in particular.`,
    )}</p>
    <p class="foot">headline features shipped: ${shipped}${shipped ? ` · ${SEGMENTS.map((seg) => `${seg.name} ${s.roadmap.shipped[seg.id] ?? 0}`).join(' · ')}` : ''}</p>`;
}

export const roadmapKey = (game: Game): string => `${game.state.roadmap.focus}|${SEGMENTS.map((x) => game.state.roadmap.shipped[x.id]).join(',')}`;

export const roadmapHelp = (): string =>
  hl(
    `users come in three kinds, and each pays its own way, in proportion to its share of all your users. developers send pull requests: up to x${1 + ROADMAP.devAuto} automation. companies sign contracts: up to +${pct(ROADMAP.bizStars)} stars from shipping, and x${1 + ROADMAP.bizRevenue} revenue once you are public. everyone else tells their friends: up to x${1 + ROADMAP.funTap} per tap and +${pct(ROADMAP.funUsers)} new users from a release. point the roadmap at one: every release then ships that segment's next feature as its headline, which brings x${ROADMAP.headlineUsers} new users, all of them that kind. users you had before, and users who come with a company you buy, are nobody in particular.`,
  );

export function refreshRoadmap(game: Game, root: HTMLElement): void {
  const s = game.state;
  setHtml(root.querySelector('[data-rm-users]'), `${tint('num', fmt(usersNow(s)))} users`);
  for (const seg of SEGMENTS) {
    const share = segmentShare(s, seg.id);
    setText(root.querySelector(`[data-seg-share="${seg.id}"]`), pct(share));
    setBar(root.querySelector(`[data-seg-bar="${seg.id}"]`), share);
    setHtml(root.querySelector(`[data-seg-pay="${seg.id}"]`), share > 0.005 ? hl(payoff(seg.id, share)) : '<span class="cm">nothing yet</span>');
  }
  setText(root.querySelector('[data-rm-general]'), pct(generalShare(s)));
}
