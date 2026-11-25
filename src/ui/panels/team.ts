import { ROLE_IDS, ROLES, TEAM, TRAITS, type RoleId } from '../../core/content';
import { teamSlots, traitMultiplier } from '../../core/economy';
import type { Game } from '../../core/game';
import { fmt } from '../../core/num';
import type { Developer } from '../../core/state';
import { hireCost, teamFull } from '../../core/team';
import { esc, setText } from '../dom';
import { hl, tint } from '../hl';

/** ASCII portraits, three lines each. */
const FACES: readonly string[][] = [
  [String.raw` .---. `, String.raw`( o.o )`, String.raw` '-^-' `],
  [String.raw` /^^^\ `, String.raw`( -_- )`, String.raw` \_~_/ `],
  [String.raw` _____ `, String.raw`[ o_o ]`, String.raw` |_=_| `],
  [String.raw` .-"-. `, String.raw`( ^.^ )`, String.raw` '-u-' `],
  [String.raw` ,___, `, String.raw`( O,O )`, String.raw` /)_)\ `],
  [String.raw` |\_/| `, String.raw`( o.o )`, String.raw`  >^<  `],
  [String.raw` .===. `, String.raw`( >_< )`, String.raw` '-o-' `],
  [String.raw` /"""\ `, String.raw`( o_O )`, String.raw` \_-_/ `],
];

const face = (d: Developer): string => FACES[d.face % FACES.length].join('\n');
const pct = (x: number): string => `${Math.round(x * 100)}%`;

/** What a developer does in a role, with their trait. */
function roleEffect(d: Developer, role: RoleId = d.role): string {
  const m = traitMultiplier(d, role);
  switch (role) {
    case 'features':
      return `+${pct(TEAM.featuresAuto * m)} automation`;
    case 'sprints':
      return `+${pct(TEAM.sprintReward * m)} sprint rewards`;
    case 'oncall':
      return `${pct(TEAM.oncallTaps * m)} fewer taps in outages and boss fights`;
    case 'bugs':
      return `squashes ${pct(TEAM.bugAuto * m)} of bugs, +${pct(TEAM.bugReward * m)} bug rewards`;
    case 'refactor':
      return `-${(TEAM.refactorPerMinute * m).toFixed(1)} tech debt per minute`;
  }
}

function devCard(d: Developer, letGoArmed: boolean): string {
  const trait = TRAITS[d.trait];
  return `<article class="dev" data-dev-card="${d.id}">
    <pre class="face" aria-hidden="true">${esc(face(d))}</pre>
    <div class="dinfo">
      <div><span class="nm">${esc(d.name)}</span> <span class="trait">${trait.label}</span></div>
      <small>${hl(trait.blurb)}</small>
      <small class="doing">→ ${hl(roleEffect(d))}</small>
    </div>
    <div class="roles" role="radiogroup" aria-label="Role for ${esc(d.name)}">
      ${ROLE_IDS.map((r) => `<button class="chip2" role="radio" data-assign="${d.id}" data-role="${r}" aria-checked="${d.role === r}" aria-pressed="${d.role === r}">${d.role === r ? '(•)' : '( )'} ${ROLES[r].label}</button>`).join('')}
      <button class="chip2 lg" data-letgo="${d.id}">${letGoArmed ? 'really? tap again' : 'let go'}</button>
    </div>
  </article>`;
}

/** The applicant (if any), the team with their roles, and what each role does. `letGoArmed`: the developer whose "let go" waits for a second tap. */
export function renderTeam(game: Game, letGoArmed: number | null): string {
  const s = game.state;
  let html = `<div class="cmd"><span><span class="ps">$</span> who</span><span class="aside">${tint('num', s.team.length)}/${tint('num', teamSlots(s))} seats · the team stays through every release</span></div>`;
  const a = s.applicant;
  if (a) {
    const trait = TRAITS[a.trait];
    html += `<article class="dev apply">
      <pre class="face" aria-hidden="true">${esc(face(a))}</pre>
      <div class="dinfo">
        <div><span class="tag tag-info">[new]</span> <span class="nm">${esc(a.name)}</span> <span class="trait">${trait.label}</span> wants to join</div>
        <small>${hl(trait.blurb)}</small>
      </div>
      <div class="roles">
        <button class="act hire" data-hire><span>hire</span> <b data-hire-cost></b></button>
        <button class="act" data-pass>pass</button>
        <small class="dim" data-hire-note></small>
      </div>
    </article>`;
  } else html += '<div class="ck dim" data-next-applicant></div>';
  if (s.team.length === 0) html += '<div class="ck dim">nobody yet. hire the first applicant, then give them a role.</div>';
  for (const d of s.team) html += devCard(d, letGoArmed === d.id);
  html += '<div class="grp"># roles</div><ul class="ach roles2">';
  for (const r of ROLE_IDS) html += `<li><span class="h h-name">${ROLES[r].label}</span> <small>· ${hl(ROLES[r].summary)} per developer</small></li>`;
  return html + '</ul>';
}

export function refreshTeam(game: Game, root: HTMLElement): void {
  const s = game.state;
  const now = game.now();
  const hire = root.querySelector<HTMLButtonElement>('[data-hire]');
  if (hire) {
    const cost = hireCost(s, now);
    const full = teamFull(s);
    const ok = !full && s.lines.gte(cost);
    hire.disabled = !ok;
    hire.classList.toggle('ok', ok);
    setText(hire.querySelector('[data-hire-cost]'), `-${fmt(cost)}`);
    setText(root.querySelector('[data-hire-note]'), full ? 'every seat is taken: let someone go first' : '');
  }
  const next = root.querySelector('[data-next-applicant]');
  if (next) {
    const secs = Math.max(0, Math.ceil((s.nextApplicantAt - now) / 1000));
    setText(next, secs > 0 ? `next applicant in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : 'an applicant is on the way');
  }
}

/** Changes when the panel needs re-rendering. */
export const teamKey = (game: Game): string => {
  const s = game.state;
  return `${s.applicant?.id ?? '-'}|${s.team.map((d) => `${d.id}${d.role}`).join(',')}|${teamSlots(s)}`;
};
