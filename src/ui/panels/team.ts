import { ROLE_IDS, ROLES, TEAM, TRAITS, type RoleId } from '../../core/content';
import { teamSlots, traitMultiplier } from '../../core/economy';
import type { Game } from '../../core/game';
import { fmt } from '../../core/num';
import type { Developer } from '../../core/state';
import { hireCost, teamFull } from '../../core/team';
import { esc, setText } from '../dom';
import { hl, tint } from '../hl';

/** ASCII portraits, three lines each. */
export const FACES: readonly string[][] = [
  [String.raw` .---. `, String.raw`( o.o )`, String.raw` '-^-' `],
  [String.raw` /^^^\ `, String.raw`( -_- )`, String.raw` \_~_/ `],
  [String.raw` _____ `, String.raw`[ o_o ]`, String.raw` |_=_| `],
  [String.raw` .-"-. `, String.raw`( ^.^ )`, String.raw` '-u-' `],
  [String.raw` ,___, `, String.raw`( O,O )`, String.raw` /)_)\ `],
  [String.raw` |\_/| `, String.raw`( o.o )`, String.raw`  >^<  `],
  [String.raw` .===. `, String.raw`( >_< )`, String.raw` '-o-' `],
  [String.raw` /"""\ `, String.raw`( o_O )`, String.raw` \_-_/ `],
];

export const face = (d: Developer): string => FACES[d.face % FACES.length].join('\n');
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

/** A teammate: what they do, and a dropdown for their role (letting them go is in it too, with a confirm). */
function devRow(d: Developer, letGoArmed: boolean): string {
  const trait = TRAITS[d.trait];
  if (letGoArmed)
    return `<div class="mem arm">
      <div><span class="nm">${esc(d.name)}</span> · let ${esc(d.name)} go?<small>${hl('they leave the team for good')}</small></div>
      <div class="memb"><button class="act danger" data-letgo="${d.id}">let go</button><button class="act" data-keep>keep</button></div>
    </div>`;
  return `<div class="mem">
    <div><span class="nm">${esc(d.name)}</span> · ${trait.label.toLowerCase()}<small>${hl(roleEffect(d))}</small></div>
    <label class="sel"><span class="vh">Role for ${esc(d.name)}</span><select data-role-of="${d.id}">
      ${ROLE_IDS.map((r) => `<option value="${r}"${d.role === r ? ' selected' : ''}>${ROLES[r].label}</option>`).join('')}
      <option value="letgo">let go…</option>
    </select></label>
  </div>`;
}

/** The applicant (if any) and the team with their roles. `letGoArmed`: the developer waiting for a confirm to leave. */
export function renderTeam(game: Game, letGoArmed: number | null): string {
  const s = game.state;
  let html = `<div class="cmd"><span><span class="ps">$</span> who</span><span class="aside">${tint('num', s.team.length)} of ${tint('num', teamSlots(s))} desks</span></div>`;
  const a = s.applicant;
  if (a) {
    const trait = TRAITS[a.trait];
    html += `<article class="appl">
      <div class="tag-a">applicant</div>
      <div><span class="nm">${esc(a.name)}</span> · ${trait.label.toLowerCase()}</div>
      <small>${hl(trait.blurb)}</small>
      <div class="memb"><button class="go hire" data-hire><span>hire</span><b data-hire-cost></b></button><button class="act" data-pass>pass</button></div>
      <small class="dim" data-hire-note></small>
    </article>`;
  } else html += '<div class="ck dim" data-next-applicant></div>';
  if (s.team.length === 0) html += '<div class="ck dim">nobody yet. hire the first applicant, then give them a role.</div>';
  for (const d of s.team) html += devRow(d, letGoArmed === d.id);
  return html;
}

/** What the `?` in team explains. */
export const teamHelp = (): string =>
  `<ul class="ach roles2">${ROLE_IDS.map((r) => `<li><span class="h h-name">${ROLES[r].label}</span> <small>· ${hl(ROLES[r].summary)} per developer</small></li>`).join('')}</ul><p>${hl('the team stays through every release, round and major version. traits multiply what a developer does in their role.')}</p>`;

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
    setText(hire.querySelector('[data-hire-cost]'), fmt(cost));
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
