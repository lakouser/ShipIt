import { BOSS, BOSSES, DEBT } from '../core/content';
import { currentStage } from '../core/bosses';
import type { Game } from '../core/game';
import { clock } from '../core/num';
import type { Boss } from '../core/state';
import { esc, setHtml, setText } from './dom';
import { hl } from './hl';
import { barHtml } from './messages';

/** Pairs of a line that compiles and the same line broken: merge conflicts and "find the broken line" stages. */
export const CODE_PAIRS: readonly [string, string][] = [
  ['const user = await fetchUser(id);', 'const user = await fetchUser(id;'],
  ['if (cache.size > 0) { flush(); }', 'if (cache.size > 0) { flush(); '],
  ['return items.map((x) => x.id);', 'return items.map((x) => x.id;'],
  ['export default function App() {}', 'export defualt function App() {}'],
  ['const total = price * qty;', 'cosnt total = price * qty;'],
  ["import { Ticket } from './types';", "import { Ticket } from './types;"],
  ['for (let i = 0; i < n; i++) {}', 'for (let i = 0; i < n; i++ {}'],
  ['const ok = a === b;', 'const ok = a === = b;'],
  ['await db.query(sql, [userId]);', 'await db.query(sql, [userId);'],
  ['const key = process.env.API_KEY;', 'const key = process.env.API_KEY";'],
  ['while (queue.length) queue.pop();', 'while (queue.length) queue.pop(;'],
  ['function retry(fn, times = 3) {}', 'fucntion retry(fn, times = 3) {}'],
  ['res.status(200).json({ ok: true });', 'res.status(200).json({ ok: true );'],
];

/** `count` lines starting from `variant`, with the broken one at `broken`. */
function stageLines(variant: number, count: number, broken: number): string[] {
  const n = CODE_PAIRS.length;
  return Array.from({ length: count }, (_, i) => CODE_PAIRS[(variant + i * 5) % n][+(i === broken)]);
}

/** The boss incident card over the editor: the warning, then each stage of the fight. */
export class BossView {
  private el: HTMLElement | null = null;
  private key = '';
  /** "sit it out": the warning stays hidden until this boss is gone. */
  private dismissed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly game: Game,
  ) {}

  get fighting(): boolean {
    return this.game.state.boss?.phase === 'fight';
  }

  update(): void {
    const b = this.game.state.boss;
    if (!b) {
      this.dismissed = false;
      if (this.el) this.remove();
      return;
    }
    if (b.phase === 'incoming' && this.dismissed) {
      if (this.el) this.remove();
      return;
    }
    const key = `${b.kind}|${b.phase}|${b.stage}`;
    if (key !== this.key) this.build(b, key);
    const left = (b.endsAt - this.game.now()) / 1000;
    setText(this.el?.querySelector('[data-left]') ?? null, clock(left));
    const stage = currentStage(b);
    if (b.phase === 'fight' && stage) {
      setHtml(this.el?.querySelector('[data-time]') ?? null, barHtml(left / stage.seconds, 24, false));
      if (stage.type === 'mash') setHtml(this.el?.querySelector('[data-mash]') ?? null, `${barHtml(b.taps / b.needed, 20, false)} ${b.taps}/${b.needed}`);
    }
  }

  private remove(): void {
    this.el?.remove();
    this.el = null;
    this.key = '';
  }

  private build(b: Boss, key: string): void {
    this.remove();
    this.key = key;
    const def = BOSSES[b.kind];
    const el = document.createElement('div');
    el.className = `boss ${b.phase}${b.phase === 'fight' ? ` ${def.stages[b.stage].type}` : ''}`;
    el.setAttribute('role', b.phase === 'incoming' ? 'alertdialog' : 'alert');
    el.setAttribute('aria-label', `Boss incident: ${def.name}`);
    if (b.phase === 'incoming') {
      el.innerHTML = `<div class="bh"><span class="tag tag-err">[FAIL]</span> major incident <span class="ol" data-left></span></div>
        <div class="bname">${esc(def.name)}</div>
        <div class="bintro">${esc(def.intro)}</div>
        <div class="bterms">${hl(`${def.stages.length} stages. win: a big pile of lines, ${BOSS.scripts} scripts, ${DEBT.bossBeaten} tech debt. lose a stage: +${DEBT.bossFailed} tech debt. sitting it out costs nothing.`)}</div>
        <div class="bbtns"><button class="go bgo" data-engage>open the war room</button><button class="act" data-sit>sit it out</button></div>`;
    } else {
      const stage = def.stages[b.stage];
      const stages = def.stages
        .map((s, i) => `<div class="bst ${i < b.stage ? 'done' : i === b.stage ? 'now' : ''}"><span class="box">${i < b.stage ? '[x]' : i === b.stage ? '[>]' : '[ ]'}</span> ${esc(s.label)}</div>`)
        .join('');
      const action =
        stage.type === 'mash'
          ? `<div class="bdo">mash the key!</div><div class="tbar bmash" data-mash></div>`
          : `<div class="bdo">tap the broken line</div>${stageLines(b.variant, stage.options, b.correct)
              .map((line, i) => `<button class="side bpick" data-pick="${i}">${esc(line)}</button>`)
              .join('')}`;
      el.innerHTML = `<div class="bh"><span><span class="tag tag-err">[FAIL]</span> ${esc(def.name)}</span><span class="ol">stage ${b.stage + 1}/${def.stages.length} · <b data-left></b></span></div>
        <div class="tbar btime" data-time></div>
        <div class="bstages">${stages}</div>
        ${action}`;
    }
    // Taps on the card are not taps on the key.
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest('button');
      if (!btn) return;
      if ('engage' in btn.dataset) this.game.engageBoss();
      else if ('sit' in btn.dataset) this.dismissed = true;
      else if (btn.dataset.pick) this.game.bossPick(Number(btn.dataset.pick));
      this.update();
    });
    this.host.appendChild(el);
    this.el = el;
  }
}
