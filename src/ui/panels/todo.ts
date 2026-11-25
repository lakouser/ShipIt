import { ACHIEVEMENTS } from '../../core/achievements';
import { STREAK } from '../../core/content';
import type { Game } from '../../core/game';
import { D, clock, fmt } from '../../core/num';
import { milestoneTaskProgress, milestoneTaskText, questProgress, questText } from '../../core/quests';
import { dayKey } from '../../core/streak';
import type { Hue } from '../hl';
import { setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { rewardText } from '../messages';

const progressText = (p: ReturnType<typeof D>, target: string): string => `${fmt(p.min(target))}/${fmt(target)}`;

/** The colour of a task's progress counter, by what it counts. */
const QUEST_HUE: Record<string, Hue> = { lines: 'loc', taps: 'tap', crits: 'tap', flow: 'tap', bugs: 'bug', scripts: 'name' };
const MILESTONE_HUE: Record<string, Hue> = { lines: 'loc' };

function streakGrid(game: Game): string {
  const s = game.state;
  const played = new Set(s.streak.days);
  const today = new Date(game.now());
  // Rows are weekdays, columns are weeks (oldest left), shaded by taps that day, like a contribution graph.
  const weeks = Math.ceil(STREAK.daysKept / 7);
  const busiest = Math.max(1, ...Object.values(s.streak.activity));
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (weeks * 7 - 1) + (6 - today.getDay()), 12);
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let html = '';
  for (let d = 0; d < 7; d++) {
    html += `<div class="hrow"><span class="hday">${d % 2 ? days[d] : ' '}</span>`;
    for (let w = 0; w < weeks; w++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d, 12);
      const key = dayKey(day.getTime());
      const future = day.getTime() > today.getTime() + 12 * 3600 * 1000;
      const taps = s.streak.activity[key] ?? 0;
      // Days played before taps were counted show the lightest shade.
      const level = future ? 0 : taps > 0 ? 1 + Math.min(2, Math.floor((taps / busiest) * 3)) : +played.has(key);
      html += `<span class="${future ? 'fut' : `l${level}`}" title="${key}${taps ? `: ${taps} taps` : ''}">■</span>`;
    }
    html += '</div>';
  }
  return `<div class="heat" role="img" aria-label="Days played in the last ${weeks} weeks">${html}</div><small class="dim hkey">less <span class="heat">${[0, 1, 2, 3].map((l) => `<span class="l${l}">■</span>`).join('')}</span> more taps</small>`;
}

export function renderTodo(game: Game): string {
  const s = game.state;
  let html = `<div class="cmd"><span><span class="ps">$</span> cat TODO.md</span><span class="aside">tasks pay permanent bonuses</span></div>`;

  const m = s.milestone;
  if (m) {
    html += `<div class="md"><div class="mdh">## v${m.release}.0 milestone ${tint('star', `+${m.stars} star${m.stars > 1 ? 's' : ''}`)}${m.done ? ' <span class="okc">done</span>' : ''}</div>`;
    m.tasks.forEach((t, i) => {
      html += `<div class="ck" data-ms="${i}"><span class="box">[ ]</span> ${hl(milestoneTaskText(t))} <span class="pg h h-${MILESTONE_HUE[t.kind] ?? 'num'}"></span></div>`;
    });
    html += '</div>';
  }

  html += '<div class="md"><div class="mdh">## tasks</div>';
  if (s.quests.length === 0) html += '<div class="ck dim">nothing yet</div>';
  s.quests.forEach((q, i) => {
    html += `<div class="ck" data-q="${i}"><span class="box">[ ]</span> ${hl(questText(q))} <span class="pg h h-${QUEST_HUE[q.template] ?? 'num'}"></span><small>→ ${hl(rewardText(q.reward))}</small></div>`;
  });
  html += '<div class="ck dim" data-refill></div></div>';

  html += `<div class="md"><div class="mdh">## commit streak ${tint('time', `${s.streak.count} day${s.streak.count === 1 ? '' : 's'}`)}</div>${streakGrid(game)}<small class="dim">${hl('play each day for a bonus; every 3rd day adds turbo.sh, every 7th sudo.sh')}</small></div>`;

  html += `<div class="md"><div class="mdh">## achievements ${s.achievements.length}/${ACHIEVEMENTS.length} ${tint('loc', `+${s.achievements.length}% output`)}</div><ul class="ach">${ACHIEVEMENTS.map((a) => {
    const done = s.achievements.includes(a.id);
    const hidden = a.secret && !done;
    return `<li class="${done ? '' : 'no'}"><span class="box">[${done ? 'x' : ' '}]</span> ${hidden ? '???' : a.name} <small>· ${hidden ? 'secret' : hl(a.description.toLowerCase())}</small></li>`;
  }).join('')}</ul></div>`;
  return html;
}

export function refreshTodo(game: Game, root: HTMLElement): void {
  const s = game.state;
  const m = s.milestone;
  if (m) {
    root.querySelectorAll<HTMLElement>('[data-ms]').forEach((el) => {
      const t = m.tasks[Number(el.dataset.ms)];
      if (!t) return;
      const p = milestoneTaskProgress(s, t);
      const done = m.done || p.gte(t.target);
      el.classList.toggle('done', done);
      setText(el.querySelector('.box'), done ? '[x]' : '[ ]');
      setText(el.querySelector('.pg'), progressText(p, t.target));
    });
  }
  root.querySelectorAll<HTMLElement>('[data-q]').forEach((el) => {
    const q = s.quests[Number(el.dataset.q)];
    if (!q) return;
    setText(el.querySelector('.pg'), progressText(questProgress(s, q), q.target));
  });
  const refill = root.querySelector('[data-refill]');
  const wait = (s.nextQuestAt - game.now()) / 1000;
  setHtml(refill, s.quests.length < 3 && wait > 0 ? `next task in ${tint('time', clock(wait))}` : '');
}
