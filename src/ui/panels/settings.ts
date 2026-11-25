import type { Game } from '../../core/game';
import type { KeySound, Notation, Skin } from '../../core/state';
import { esc } from '../dom';

export interface SettingsView {
  exportText: string | null;
  importOpen: boolean;
  importError: boolean;
  resetArmed: boolean;
  hapticsSupported: boolean;
  version: string;
  save: { status: string; ok: boolean; backup: string | null };
}

export const SKINS: { id: Skin; label: string; unlocked: (g: Game) => boolean; hint: string }[] = [
  { id: 'pine', label: 'pine', unlocked: () => true, hint: '' },
  { id: 'paper', label: 'paper', unlocked: () => true, hint: '' },
  { id: 'phosphor', label: 'phosphor', unlocked: (g) => g.state.release > 1 || g.state.round > 0, hint: 'ship once' },
  { id: 'amber', label: 'amber', unlocked: (g) => g.state.stats.bugs >= 25, hint: 'squash 25 bugs' },
];

const KEY_SOUNDS: KeySound[] = ['thock', 'click', 'beep'];
const NOTATIONS: { id: Notation; label: string }[] = [
  { id: 'suffix', label: '1.23M' },
  { id: 'sci', label: '1.23e6' },
];

const toggle = (key: string, on: boolean, label: string, note = '') =>
  `<button class="opt" data-toggle="${key}" aria-pressed="${on}"><span class="box">[${on ? 'x' : ' '}]</span> ${label}${note ? ` <small>${note}</small>` : ''}</button>`;

const choice = (group: string, value: string, on: boolean, label: string, disabled = false, hint = '') =>
  `<button class="chip2" data-choice="${group}" data-value="${value}" aria-pressed="${on}"${disabled ? ' disabled' : ''}>${on ? '(•)' : '( )'} ${label}${hint ? ` <small>${hint}</small>` : ''}</button>`;

export function renderSettings(game: Game, view: SettingsView): string {
  const st = game.state.settings;
  let html = '<div class="cmd"><span><span class="ps">$</span> vim ~/.shiprc</span></div>';

  html += '<div class="grp"># save</div><div class="opts">';
  html += `<div class="savest ${view.save.ok ? '' : 'bad'}" data-save-status>${esc(view.save.status)}</div>`;
  if (view.save.backup) html += `<div class="row2"><button class="act" data-act="restore">restore backup</button><small class="dim">${esc(view.save.backup)}</small></div>`;
  html += '<div class="row2"><button class="act" data-act="export">export save</button><button class="act" data-act="import">import save</button><button class="act danger" data-act="reset">' + (view.resetArmed ? 'really reset? tap again' : 'reset progress') + '</button></div>';
  if (view.exportText !== null) {
    html += `<textarea class="savebox" readonly rows="3" aria-label="Exported save">${esc(view.exportText)}</textarea><div class="row2"><button class="act" data-act="copy">copy</button><small class="dim">keep it somewhere safe; paste it into import on any device</small></div>`;
  }
  if (view.importOpen) {
    html += `<textarea class="savebox" id="importBox" rows="3" placeholder="paste a SHIPIT: save here" aria-label="Save to import"></textarea><div class="row2"><button class="act" data-act="load">load save</button>${view.importError ? '<small class="bad">that save could not be read</small>' : '<small class="dim">replaces your current progress</small>'}</div>`;
  }
  html += '</div>';

  html += '<div class="grp"># sound</div><div class="opts">';
  html += toggle('sound', st.sound, 'key sounds');
  html += `<div class="row2"><span class="lbl">switch</span>${KEY_SOUNDS.map((k) => choice('keySound', k, st.keySound === k, k)).join('')}</div>`;
  html += toggle('haptics', st.haptics, 'haptics', view.hapticsSupported ? '' : 'not supported in this browser');
  html += '</div>';

  html += '<div class="grp"># display</div><div class="opts">';
  html += `<div class="row2"><span class="lbl">theme</span>${SKINS.map((k) => {
    const open = k.unlocked(game);
    return choice('skin', k.id, st.skin === k.id, k.label, !open, open ? '' : k.hint);
  }).join('')}</div>`;
  html += `<div class="row2"><span class="lbl">numbers</span>${NOTATIONS.map((n) => choice('notation', n.id, st.notation === n.id, n.label)).join('')}</div>`;
  html += toggle('reduceMotion', st.reduceMotion, 'reduce motion', 'no floating numbers, shaking, particles or screensaver');
  html += toggle('welcome', st.welcome, 'welcome-back screen', 'otherwise just a log line');
  html += toggle('screensaver', st.screensaver, 'screensaver', 'takes over the editor after a minute idle; automation keeps running');
  html += '</div>';

  html += `<div class="grp"># about</div><div class="opts"><button class="opt about" data-act="version">ship-it ${esc(view.version)} <small>${st.dev ? 'developer mode on' : 'an idle game about writing code'}</small></button></div>`;

  if (st.dev) {
    const dev = (action: string, label: string, extra = '') => `<button class="act" data-dev="${action}"${extra}>${label}</button>`;
    html += `<div class="grp"># developer</div><div class="opts"><div class="row2 wrap">
      ${dev('lines', 'lines x10')}${dev('stars', '+5 stars')}${dev('bug', 'spawn bug')}
      ${dev('incident', 'coffee', ' data-kind="coffee"')}${dev('incident', 'outage', ' data-kind="outage"')}${dev('incident', 'conflict', ' data-kind="conflict"')}
      ${dev('sprint', 'finish sprint')}${dev('scripts', '+1 every script')}${dev('quests', 'complete tasks')}
      ${dev('debt', '+30 debt')}${dev('applicant', 'new applicant')}${dev('boss', 'boss incident')}${dev('mail', 'send mail')}
      ${dev('unlock', 'unlock tabs')}${dev('warp', '+1h away')}${dev('off', 'dev mode off')}
    </div></div>`;
  }
  return html;
}
