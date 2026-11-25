import { SHIP } from '../core/content';
import type { GameEvent } from '../core/game';
import { clock, fmt } from '../core/num';
import type { SprintResult } from '../core/state';

/** How a log line is tagged in the editor: [ ok ], [warn], [fail], [info] or a $ prompt. */
export type LogKind = 'ok' | 'warn' | 'err' | 'info' | 'cmd';
export interface LogLine {
  kind: LogKind;
  text: string;
}

export const LOG_TAGS: Record<LogKind, string> = { ok: '[ ok ]', warn: '[warn]', err: '[fail]', info: '[info]', cmd: '$' };

/** Upgrade names as package names: "Rubber duck" → "rubber-duck". */
export const packageName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Turns game events into log lines printed in the editor. */
export function describe(e: GameEvent): LogLine[] {
  switch (e.type) {
    case 'achievement':
      return [{ kind: 'ok', text: `achievement unlocked: ${e.achievement.name}` }];
    case 'purchase': {
      const { upgrade, count, doubledAt } = e.purchase;
      const lines: LogLine[] = [{ kind: 'cmd', text: `npm i ${packageName(upgrade.name)}${count > 1 ? ` --count ${count}` : ''}` }];
      if (doubledAt) lines.push({ kind: 'ok', text: `${packageName(upgrade.name)} output doubled at ${doubledAt} installed` });
      return lines;
    }
    case 'sprintStarted':
      return [{ kind: 'info', text: `sprint started: ${e.sprint.id} "${e.sprint.title}", ${fmt(e.sprint.target)} lines in ${clock(e.sprint.durationS)}` }];
    case 'sprintEnded':
      return [
        e.result.ok
          ? { kind: 'ok', text: `${e.result.ticketId} merged, +${fmt(e.result.reward)} lines${e.result.boosted ? ', x2 output for 30s' : ''}` }
          : { kind: 'err', text: `${e.result.ticketId} missed its deadline, lines kept` },
      ];
    case 'bugSquashed':
      return [{ kind: 'ok', text: `squashed bug #${e.total}, +${fmt(e.reward)} lines` }];
    case 'bugEscaped':
      return [{ kind: 'warn', text: 'a bug slipped into production' }];
    case 'shipped':
      return [{ kind: 'ok', text: `shipped v${e.result.release}.0, +${e.result.stars} star${e.result.stars > 1 ? 's' : ''}, output +${Math.round(e.totalStars * SHIP.bonusPerStar * 100)}%` }];
    case 'offline':
      return [{ kind: 'info', text: `while you were away your team wrote ${fmt(e.lines)} lines` }];
    default:
      return [];
  }
}

export function sprintResultText(r: SprintResult): string {
  return r.ok
    ? `${r.ticketId} merged with ${clock(r.secondsLeft)} to spare: +${fmt(r.reward)} lines${r.boosted ? ' and x2 output for 30s' : ''}`
    : `${r.ticketId} missed the deadline (${fmt(r.progress)} of ${fmt(r.target)} lines). no bonus, but every line you wrote still counts`;
}

/** A text progress bar like ██████░░░░ 60%, split so the empty part can be dimmed. */
export function textBar(fraction: number, width = 20): { done: string; rest: string; pct: string } {
  const f = Math.max(0, Math.min(1, fraction));
  const n = Math.round(f * width);
  return { done: '█'.repeat(n), rest: '░'.repeat(width - n), pct: `${Math.floor(f * 100)}%` };
}
