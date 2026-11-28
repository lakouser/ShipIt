import { PULLS } from '../../core/content';
import type { Game } from '../../core/game';
import { fmt } from '../../core/num';
import { findPull, pullReward, type PullReward } from '../../core/pulls';
import { esc } from '../dom';
import { hl } from '../hl';

/** What merging a pull request does, in a few words. */
export function rewardWords(r: PullReward): string {
  if (r.lines) return `+${fmt(r.lines)} lines`;
  if (r.scripts) return `+${r.scripts} scripts for ~/bin`;
  if (r.debt) return `${Math.round(r.debt)} tech debt`;
  if (r.users) return `+${fmt(r.users)} users`;
  if (r.stars) return `+${fmt(r.stars)} ★`;
  if (r.bonus) return `+${Math.round(r.bonus * 100)}% all output, for good`;
  return 'nothing left to gain';
}

/** The pull requests waiting to be merged, as buttons (shared by co/mail and the welcome-back screen). */
export function pullsHtml(game: Game): string {
  const s = game.state;
  if (!s.pulls) return '';
  const tier = s.pulls.tier;
  const rows = s.pulls.options
    .map((id, i) => {
      const def = findPull(id);
      return `<button class="reply pull${id === 'core' ? ' rare' : ''}" data-pull="${i}"><b>&gt; ${esc(def.title)}</b><small>@${esc(def.author)} · ${hl(rewardWords(pullReward(s, id, tier, game.now())))}</small></button>`;
    })
    .join('');
  return `<div class="pulls"><div class="cmd"><span><span class="ps">$</span> gh pr list</span><span class="aside">${s.pulls.options.length} open · merge one</span></div>
    <div class="replies">${rows}</div>
    <p class="caveat">${hl(`# contributors were busy while you were away. merging one closes the rest.${tier < 3 ? ` longer absences (${PULLS.tierSeconds.map((t) => `${t / 3600}h`).join(', ')}) bring better ones.` : ''}`)}</p></div>`;
}
