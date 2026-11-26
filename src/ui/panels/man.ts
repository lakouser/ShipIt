import type { Game } from '../../core/game';
import { MAN_PAGES, manPage, manUnlockedCount } from '../../core/man';
import { esc } from '../dom';
import { hl, tint } from '../hl';

function manView(id: string): string {
  const page = manPage(id);
  if (!page) return '';
  const head = page.title.toUpperCase();
  return `<div class="man">
    <div class="manh"><span>${esc(head)}</span><span>Ship It Manual</span><span>${esc(head)}</span></div>
    <div class="mans">NAME</div><p>${esc(page.title.replace(/\(.*/, ''))} - ${esc(page.summary)}</p>
    <div class="mans">DESCRIPTION</div>${page.body.map((p) => `<p>${hl(p)}</p>`).join('')}
  </div>`;
}

/** The man pages: lore that unlocks as you discover the game, one open at a time. */
export function renderMan(game: Game, openMan: string | null): string {
  const s = game.state;
  let html = `<div class="cmd"><span><span class="ps">$</span> man -k .</span><span class="aside">${tint('num', manUnlockedCount(s))}/${tint('num', MAN_PAGES.length)} pages</span></div><div class="inbox">`;
  for (const page of MAN_PAGES) {
    const unlocked = page.unlocked(s);
    const open = openMan === page.id;
    const fresh = unlocked && !s.manRead.includes(page.id);
    html += unlocked
      ? `<button class="mrow man1${fresh ? ' unread' : ''}${open ? ' open' : ''}" data-man="${page.id}" aria-expanded="${open}"><span class="flag">${fresh ? 'N' : ' '}</span><span class="from">${esc(page.title)}</span><span class="subj">${esc(page.summary)}</span></button>`
      : `<div class="mrow man1 locked"><span class="flag"> </span><span class="from">????(?)</span><span class="subj">${hl(page.hint)}</span></div>`;
    if (open && unlocked) html += manView(page.id);
  }
  return html + '</div>';
}

export const manKey = (game: Game): string => `${manUnlockedCount(game.state)}|${game.state.manRead.length}`;
