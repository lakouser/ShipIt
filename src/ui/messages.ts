import { EFFECTS, SHIP, packageName, type EffectId } from '../core/content';
import type { GameEvent } from '../core/game';
import { clock, fmt } from '../core/num';
import { questText } from '../core/quests';
import type { QuestReward, SprintResult } from '../core/state';

export { packageName };

/** How a log line is tagged in the editor: [ ok ], [warn], [fail], [info] or a $ prompt. */
export type LogKind = 'ok' | 'warn' | 'err' | 'info' | 'cmd';
export interface LogLine {
  kind: LogKind;
  text: string;
}

export const LOG_TAGS: Record<LogKind, string> = { ok: '[ ok ]', warn: '[warn]', err: '[fail]', info: '[info]', cmd: '$' };

export const scriptFile = (id: EffectId): string => EFFECTS[id].file ?? id;

const TAB_NAMES = { sprints: '1:sprints', todo: '2:todo', ship: '3:ship' } as const;

export function rewardText(r: QuestReward): string {
  if (r.kind === 'script') return `+1 ${scriptFile(r.script)}`;
  const pct = Math.round(r.amount * 100);
  return { tap: `+${pct}% per tap`, auto: `+${pct}% automation`, bug: `+${pct}% bug rewards`, sprint: `+${pct}% sprint rewards` }[r.kind];
}

/** Turns game events into log lines printed in the editor. */
export function describe(e: GameEvent): LogLine[] {
  switch (e.type) {
    case 'achievement':
      return [{ kind: 'ok', text: `achievement unlocked: ${e.achievement.name} (+1% output)` }];
    case 'purchase': {
      const { upgrade, count, doubledAt } = e.purchase;
      const lines: LogLine[] = [{ kind: 'cmd', text: `npm i ${packageName(upgrade.name)}${count > 1 ? ` --count ${count}` : ''}` }];
      if (doubledAt) lines.push({ kind: 'ok', text: `${packageName(upgrade.name)} output doubled at ${doubledAt} installed` });
      return lines;
    }
    case 'perk':
      return [{ kind: 'cmd', text: `git commit ~/dotfiles/${e.perk.file} -m "level ${e.level}"` }];
    case 'script':
      return [{ kind: 'cmd', text: `./${e.effect.file} (${e.effect.description}, ${e.effect.durationS}s)` }];
    case 'effectEnded':
      return [{ kind: 'info', text: `${EFFECTS[e.id].file ?? e.id} finished` }];
    case 'sprintStarted':
      return [{ kind: 'info', text: `sprint started: ${e.sprint.id} "${e.sprint.title}", ${fmt(e.sprint.target)} lines in ${clock(e.sprint.durationS)}` }];
    case 'sprintEnded':
      return [
        e.result.ok
          ? { kind: 'ok', text: `${e.result.ticketId} merged, +${fmt(e.result.reward)} lines${e.result.script ? `, found ${scriptFile(e.result.script)}` : ''}` }
          : { kind: 'err', text: `${e.result.ticketId} missed its deadline, lines kept` },
      ];
    case 'bugSquashed':
      return [{ kind: 'ok', text: `${e.auto ? 'on-call squashed' : 'squashed'} bug #${e.total}, +${fmt(e.reward)} lines` }];
    case 'bugEscaped':
      return [{ kind: 'warn', text: 'a bug slipped into production' }];
    case 'incidentSpawned':
      if (e.incident.kind === 'coffee') return [{ kind: 'info', text: 'someone brewed coffee. grab it before it goes cold' }];
      if (e.incident.kind === 'outage') return [{ kind: 'warn', text: `prod is down! tap the key ${e.incident.needed} times to hotfix` }];
      return [{ kind: 'warn', text: 'merge conflict in main.ts: pick the side that compiles' }];
    case 'incidentEnded':
      if (e.outcome === 'caught') return [{ kind: 'ok', text: `coffee: x${EFFECTS.coffee.allMul} everything for ${EFFECTS.coffee.durationS}s` }];
      if (e.outcome === 'fixed') return [{ kind: 'ok', text: `hotfix deployed, +${fmt(e.reward ?? 0)} lines` }];
      if (e.outcome === 'resolved') return [{ kind: 'ok', text: `conflict resolved, +${fmt(e.reward ?? 0)} lines` }];
      if (e.outcome === 'wrong') return [{ kind: 'err', text: 'that side did not compile. conflict reverted' }];
      return [{ kind: 'info', text: e.kind === 'coffee' ? 'the coffee went cold' : e.kind === 'outage' ? 'prod recovered on its own' : 'someone else resolved the conflict' }];
    case 'questDone':
      return [{ kind: 'ok', text: `TODO done: ${questText(e.quest)} (${rewardText(e.quest.reward)})` }];
    case 'milestoneDone':
      return [{ kind: 'ok', text: `v${e.milestone.release}.0 milestone complete, +${e.milestone.stars} star${e.milestone.stars > 1 ? 's' : ''}` }];
    case 'unlocked':
      return [{ kind: 'info', text: `new tab unlocked: ${TAB_NAMES[e.tab]}` }];
    case 'checkIn':
      return [{ kind: 'ok', text: `day ${e.checkIn.count} streak: +${fmt(e.checkIn.lines)} lines${e.checkIn.script ? ` and ${scriptFile(e.checkIn.script)}` : ''}` }];
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
    ? `${r.ticketId} merged with ${clock(r.secondsLeft)} to spare: +${fmt(r.reward)} lines${r.script ? `, found ${scriptFile(r.script)}` : ''}`
    : `${r.ticketId} missed the deadline (${fmt(r.progress)} of ${fmt(r.target)} lines). no bonus, but every line you wrote still counts`;
}

/** A text progress bar like ██████░░░░ 60%, split so the empty part can be dimmed. */
export function textBar(fraction: number, width = 20): { done: string; rest: string; pct: string } {
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const n = Math.round(f * width);
  return { done: '█'.repeat(n), rest: '░'.repeat(width - n), pct: `${Math.floor(f * 100)}%` };
}

export const barHtml = (fraction: number, width = 20, withPct = true): string => {
  const b = textBar(fraction, width);
  return `${b.done}<span class="rest">${b.rest}</span>${withPct ? ` ${b.pct}` : ''}`;
};
