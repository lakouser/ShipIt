import { BOSSES, EFFECTS, MARKET, RIVALS } from '../core/content';
import { effectActive, effectSecondsLeft } from '../core/effects';
import type { Game } from '../core/game';
import { clock, fmt } from '../core/num';
import { esc, setHtml } from './dom';
import { tint } from './hl';

export type EventKind = 'ok' | 'warn' | 'err' | 'star';

interface Notice {
  kind: EventKind;
  title: string;
  text: string;
  ms: number;
}

/** Notices waiting their turn, at most; older ones are dropped. */
const MAX_QUEUED = 4;
/** A notice shows at least this long, even when others are waiting. */
const MIN_MS = 1600;

/**
 * The one-line event strip between the editor and the key. Short notices (an achievement, a new
 * panel, mail) take turns; between them it shows whatever is running against the clock (a boss, an
 * outage, coffee, a rival's launch, a sprint), and otherwise the last notice, dimmed. It sits outside
 * the editor, so it never covers an incident banner.
 */
export class EventLine {
  private readonly queue: Notice[] = [];
  private current: Notice | null = null;
  private shownAt = 0;
  private last: Notice | null = null;

  constructor(
    private readonly el: HTMLElement,
    private readonly game: Game,
  ) {}

  push(kind: EventKind, title: string, text: string, ms = 3200): void {
    this.queue.push({ kind, title, text: esc(text), ms });
    if (this.queue.length > MAX_QUEUED) this.queue.shift();
    this.update();
  }

  update(): void {
    const now = performance.now();
    if (this.current) {
      const elapsed = now - this.shownAt;
      if (elapsed >= this.current.ms || (this.queue.length && elapsed >= MIN_MS)) {
        this.last = this.current;
        this.current = null;
      }
    }
    if (!this.current && this.queue.length) {
      this.current = this.queue.shift()!;
      this.shownAt = now;
    }
    const n = this.current ?? this.running() ?? this.last;
    const stale = !this.current && n === this.last;
    setHtml(
      this.el,
      n ? `<span class="et">${esc(n.title)}</span> <span class="ex">${n.text}</span>` : '<span class="cm"># all quiet</span>',
    );
    this.el.className = `event${n ? ` ev-${n.kind}` : ''}${stale ? ' stale' : ''}`;
  }

  /** Whatever is running against the clock right now, most urgent first. */
  private running(): Notice | null {
    const g = this.game;
    const s = g.state;
    const now = g.now();
    const notice = (kind: EventKind, title: string, text: string): Notice => ({ kind, title, text, ms: 0 });
    if (s.boss) {
      const left = tint('time', clock((s.boss.endsAt - now) / 1000));
      return notice('err', 'incident', `${esc(BOSSES[s.boss.kind].name.toLowerCase())} · ${s.boss.phase === 'incoming' ? `incoming, ${left} to answer` : `stage ${s.boss.stage + 1} · ${left}`}`);
    }
    if (s.incident?.kind === 'outage') return notice('err', 'outage', 'prod is down · mash the key to hotfix');
    if (s.incident?.kind === 'conflict') return notice('warn', 'merge conflict', 'pick the side that compiles');
    if (effectActive(s, 'coffee', now)) return notice('ok', 'coffee', `${esc(EFFECTS.coffee.description)} · ${tint('time', clock(effectSecondsLeft(s, 'coffee', now)))}`);
    const launch = s.market.launch;
    if (launch) {
      const rival = RIVALS.find((r) => r.id === launch.rival);
      if (rival) return notice('warn', 'launch', `${esc(rival.app)} in ${tint('time', clock((launch.endsAt - now) / 1000))} · beat it: x${MARKET.launch.stealMul} users`);
    }
    if (s.sprint)
      return notice('ok', 'sprint', `${esc(s.sprint.title.toLowerCase())} · ${tint('time', clock((s.sprint.endsAt - now) / 1000))} · ${Math.floor(Math.min(1, s.sprint.progress.div(s.sprint.target).toNumber()) * 100)}% of ${fmt(s.sprint.target)}`);
    return null;
  }
}
