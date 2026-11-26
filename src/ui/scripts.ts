import { EFFECTS, type EffectId } from '../core/content';
import { effectActive, effectSecondsLeft } from '../core/effects';
import type { Game } from '../core/game';
import { clock } from '../core/num';
import { setHtml } from './dom';

/** The order of the slots under the key. */
const SLOTS: readonly EffectId[] = ['turbo', 'sudo', 'nightly', 'autotype'];
/** Long file names lose ".sh" to fit a slot on a phone. */
const label = (id: EffectId): string => {
  const file = EFFECTS[id].file ?? id;
  return file.length > 10 ? file.replace(/\.sh$/, '') : file;
};

/**
 * The ~/bin scripts as four fixed slots under the key: how many of each you have, or the time left
 * while one runs. Tapping a slot runs it (again, to add its time). The row keeps its height whatever
 * runs, so the key never moves.
 */
export class ScriptsRow {
  constructor(
    private readonly el: HTMLElement,
    private readonly game: Game,
    onRun: () => void,
  ) {
    el.innerHTML = SLOTS.map(
      (id) => `<button class="slot s-${id}" data-slot="${id}" aria-label="Run ${EFFECTS[id].file}: ${EFFECTS[id].description}"><span class="sn">${label(id)}</span><span class="sv"></span></button>`,
    ).join('');
    el.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('[data-slot]');
      if (btn && !btn.disabled && game.runScript(btn.dataset.slot as EffectId)) onRun();
    });
  }

  update(): void {
    const s = this.game.state;
    const now = this.game.now();
    this.el.hidden = !s.unlocked.sprints && !SLOTS.some((id) => (s.scripts[id] ?? 0) > 0 || effectActive(s, id, now));
    if (this.el.hidden) return;
    for (const id of SLOTS) {
      const btn = this.el.querySelector<HTMLButtonElement>(`[data-slot="${id}"]`)!;
      const count = s.scripts[id] ?? 0;
      const active = effectActive(s, id, now);
      btn.disabled = count < 1;
      btn.classList.toggle('on', active);
      btn.classList.toggle('none', count < 1 && !active);
      setHtml(btn.lastElementChild, active ? `${clock(effectSecondsLeft(s, id, now))} left${count ? ` <span class="cm">+${count}</span>` : ''}` : count ? `x${count} · run` : 'none');
    }
  }
}
