import { EFFECTS, MILESTONE, packageName, type EffectId } from '../core/content';
import { starMultiplier } from '../core/economy';
import type { GameEvent } from '../core/game';
import { clock, fmt, fmtDuration, fmtMul } from '../core/num';
import { findChallenge } from '../core/major';
import { questText } from '../core/quests';
import type { ShipResult } from '../core/ship';
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

const TAB_NAMES = { sprints: '1:sprints', todo: '2:todo', ship: '3:ship', major: '4:major' } as const;

export function rewardText(r: QuestReward): string {
  if (r.kind === 'script') return `+1 ${scriptFile(r.script)}`;
  const pct = Math.round(r.amount * 100);
  return { tap: `+${pct}% per tap`, auto: `+${pct}% automation`, bug: `+${pct}% bug rewards`, sprint: `+${pct}% sprint rewards` }[r.kind];
}

function challengeLines(c: ShipResult['challenge']): LogLine[] {
  if (!c) return [];
  const def = findChallenge(c.id);
  return [c.done ? { kind: 'ok', text: `challenge complete: ${def.name}. ${def.reward}` } : { kind: 'info', text: `${def.name} shipped short of its goal: no reward this time` }];
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
    case 'majorCut':
      return [{ kind: 'ok', text: `cut v${e.result.version} in ${e.result.stack}: ${fmt(e.result.starsBanked)} stars banked for +${fmt(e.result.xp)} xp` }];
    case 'skill':
      return [{ kind: 'cmd', text: `echo "${e.skill.name} (level ${e.level})" >> ~/resume.md` }];
    case 'challengeStarted':
      return [{ kind: 'cmd', text: `git switch -c challenge/${e.challenge.branch}` }, { kind: 'warn', text: `${e.challenge.name}: ${e.challenge.restriction}. ship with the goal met for ${e.challenge.reward}` }];
    case 'challengeAbandoned':
      return [{ kind: 'info', text: `challenge/${findChallenge(e.id).branch} abandoned` }];
    case 'autoInstalled':
      return e.doublings.map((p) => ({ kind: 'ok' as const, text: `${packageName(p.upgrade.name)} output doubled at ${p.doubledAt} installed` }));
    case 'promoted':
      return [{ kind: 'ok', text: `promoted to ${e.title}` }];
    case 'workflowUnlocked':
      return [{ kind: 'ok', text: `new workflow: .github/workflows/${e.workflow.file} (${e.workflow.summary}). switch it off in 3:ship` }];
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
      return [{ kind: 'ok', text: `release milestone done: this release ships with +${Math.round(MILESTONE.shipBonus * 100)}% stars (at least ${e.milestone.stars})` }];
    case 'unlocked':
      return [{ kind: 'info', text: `new tab unlocked: ${TAB_NAMES[e.tab]}` }];
    case 'checkIn':
      return [{ kind: 'ok', text: `day ${e.checkIn.count} streak: +${fmt(e.checkIn.lines)} lines${e.checkIn.script ? ` and ${scriptFile(e.checkIn.script)}` : ''}` }];
    case 'shipped':
      return [...challengeLines(e.result.challenge), { kind: 'ok', text: `${e.auto ? 'release.yml ' : ''}shipped v${e.result.version}${e.result.seconds !== null ? ` after ${fmtDuration(e.result.seconds)}` : ''}, +${fmt(e.result.stars)} star${e.result.stars > 1 ? 's' : ''}, output x${fmtMul(starMultiplier(e.totalStars))}` }];
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
