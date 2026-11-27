import { STACKS, type LanguageId } from '../../core/content';
import type { GameState } from '../../core/state';
import { stackUnlocked } from '../../core/stacks';
import { esc } from '../dom';
import { hl } from '../hl';

/** The stack the picker shows as chosen: the one asked for if it's open, otherwise this run's. */
export function pickedStack(s: GameState, want: LanguageId | null): LanguageId {
  const st = STACKS.find((x) => x.id === want);
  return st && stackUnlocked(s, st) ? st.id : s.stack;
}

/**
 * Chips for the language of the next run (a funding round or a major version), with the picked one's rules below.
 * Locked stacks show dashed, with how they unlock.
 */
export function stackPicker(s: GameState, want: LanguageId | null, label: string): string {
  const picked = pickedStack(s, want);
  const def = STACKS.find((x) => x.id === picked)!;
  const chips = STACKS.map((st) => {
    const open = stackUnlocked(s, st);
    if (!open && !s.stacksUsed.includes(st.id) && st.id === 'cob' && !s.corp.ipoAt) return ''; // COBOL stays a secret until the IPO
    return `<button class="pj${open ? '' : ' lk'}" role="radio" data-stack="${st.id}" aria-checked="${st.id === picked}"${open ? '' : ` disabled title="${esc(st.hint ?? '')}"`}>${esc(st.name.toLowerCase())}${st.id === s.stack ? ' <small>now</small>' : ''}</button>`;
  }).join('');
  const locked = STACKS.filter((st) => !stackUnlocked(s, st) && st.hint && (st.id !== 'cob' || s.corp.ipoAt));
  return `<div class="proj" role="radiogroup" aria-label="${esc(label)}">
    <div class="cm">${esc(label)}</div>
    <div class="pjs">${chips}</div>
    <small>${hl(`${def.blurb.toLowerCase()} · ${def.rules.join(' · ')}`)}</small>
    ${locked.length ? `<small class="cm">${locked.map((st) => `${esc(st.name.toLowerCase())}: ${esc(st.hint!)}`).join(' · ')}</small>` : ''}
  </div>`;
}
