import { BOSSES, DEBT, EFFECTS, FUNDING, LANGUAGES, MARKET, MILESTONE, ROLES, TRAITS, packageName, type EffectId, type ForkDef, type UpgradeKind } from '../core/content';
import { starBonus } from '../core/economy';
import type { GameEvent } from '../core/game';
import { mailDef } from '../core/mail';
import { findChallenge } from '../core/major';
import { clock, fmt, fmtDuration, fmtMul } from '../core/num';
import { questText } from '../core/quests';
import type { ShipResult } from '../core/ship';
import type { QuestReward, SprintResult } from '../core/state';
import { unlockPath } from './nav';

export { packageName };

/** How a log line is tagged in the editor: [ ok ], [warn], [fail], [info] or a $ prompt. */
export type LogKind = 'ok' | 'warn' | 'err' | 'info' | 'cmd';
export interface LogLine {
  kind: LogKind;
  text: string;
}

export const LOG_TAGS: Record<LogKind, string> = { ok: '[ ok ]', warn: '[warn]', err: '[fail]', info: '[info]', cmd: '$' };

export const scriptFile = (id: EffectId): string => EFFECTS[id].file ?? id;


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
      const { upgrade, count, upgradeAt } = e.purchase;
      const lines: LogLine[] = [{ kind: 'cmd', text: `npm i ${packageName(upgrade.name)}${count > 1 ? ` --count ${count}` : ''}` }];
      if (upgradeAt) lines.push({ kind: 'info', text: `${packageName(upgrade.name)} reached ${upgradeAt} installed: pick its upgrade in 0:pkgs` });
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
      return [{ kind: 'ok', text: `release milestone done: this release ships with +${Math.round(MILESTONE.shipBonus * 100)}% stars (at least ${e.milestone.stars})` }];
    case 'unlocked':
      return [{ kind: 'info', text: `unlocked: ${unlockPath(e.tab)}` }];
    case 'checkIn':
      return [{ kind: 'ok', text: `day ${e.checkIn.count} streak: +${fmt(e.checkIn.lines)} lines${e.checkIn.script ? ` and ${scriptFile(e.checkIn.script)}` : ''}` }];
    case 'shipped': {
      const lines: LogLine[] = [...challengeLines(e.result.challenge), { kind: 'ok', text: `${e.auto ? 'release.yml ' : ''}shipped v${e.result.version}${e.result.seconds !== null ? ` after ${fmtDuration(e.result.seconds)}` : ''}, +${fmt(e.result.stars)} star${e.result.stars > 1 ? 's' : ''}, output x${fmtMul(starBonus(e.totalStars))}` }];
      if (e.result.next.id !== 'webapp' || e.result.shipped.id !== 'webapp') lines.push({ kind: 'cmd', text: `git init ~/${e.result.next.dir} (${e.result.next.rules.join(', ')})` });
      return lines;
    }
    case 'forkChosen':
      return [{ kind: 'cmd', text: `npm update ${packageName(e.upgrade.name)} --${e.fork.id} (${forkSummary(e.fork, e.upgrade.kind)})` }];
    case 'refactored':
      return [{ kind: 'ok', text: `refactored: ${Math.round(e.refactor.cleared)}% tech debt cleared for ${fmt(e.refactor.cost)} lines` }];
    case 'debtHigh':
      return [{ kind: 'warn', text: `tech debt passed ${DEBT.warnAt}%: automation is slowing down. refactor from 0:pkgs` }];
    case 'applicant':
      return [{ kind: 'info', text: `${e.dev.name} (${TRAITS[e.dev.trait].label}) applied to join the team: see 4:team` }];
    case 'hired':
      return [{ kind: 'ok', text: `${e.dev.name} joined the team for ${fmt(e.cost)} lines` }];
    case 'assigned':
      return [{ kind: 'cmd', text: `assign ${e.dev.name} --to ${ROLES[e.dev.role].label} (${ROLES[e.dev.role].summary})` }];
    case 'letGo':
      return [{ kind: 'info', text: `${e.dev.name} left the team` }];
    case 'bossIncoming':
      return [{ kind: 'err', text: `${BOSSES[e.boss.kind].name}: ${BOSSES[e.boss.kind].intro}. engage, or sit it out` }];
    case 'bossIgnored':
      return [{ kind: 'info', text: `${BOSSES[e.kind].name.toLowerCase()}: someone else dealt with it` }];
    case 'bossEngaged':
      return [{ kind: 'warn', text: `war room open: ${BOSSES[e.boss.kind].stages.length} stages` }];
    case 'bossStage':
      return [{ kind: 'ok', text: `stage ${e.stage + 1} cleared: ${BOSSES[e.kind].stages[e.stage].label}, +${fmt(e.reward)} lines` }];
    case 'bossWon':
      return [{ kind: 'ok', text: `${BOSSES[e.kind].name.toLowerCase()} resolved: +${fmt(e.reward)} lines, ${e.scripts.map(scriptFile).join(' and ')}, ${DEBT.bossBeaten} tech debt` }];
    case 'bossFailed':
      return [{ kind: 'err', text: `${BOSSES[e.kind].name.toLowerCase()} got away at stage ${e.stage + 1}: +${DEBT.bossFailed} tech debt` }];
    case 'autoInstalled':
      // Packages are re-installed after every release, so automatic installs stay out of the log.
      return [];
    case 'promoted':
      return [{ kind: 'ok', text: `promoted to ${e.title}` }];
    case 'workflowUnlocked':
      return [{ kind: 'ok', text: `new workflow: .github/workflows/${e.workflow.file} (${e.workflow.summary}). switch it off in 3:ship` }];
    case 'majorCut':
      return [{ kind: 'ok', text: `cut v${e.result.version}: ${fmt(e.result.starsBanked)} stars banked for +${fmt(e.result.xp)} xp` }];
    case 'skill':
      return [{ kind: 'cmd', text: `echo "${e.skill.name} (level ${e.level})" >> ~/resume.md` }];
    case 'challengeStarted':
      return [{ kind: 'cmd', text: `git switch -c challenge/${e.challenge.branch}` }, { kind: 'warn', text: `${e.challenge.name}: ${e.challenge.restriction}. ship with the goal met for ${e.challenge.reward}` }];
    case 'challengeAbandoned':
      return [{ kind: 'info', text: `challenge/${findChallenge(e.id).branch} abandoned` }];
    case 'reviewed': {
      const n = e.news;
      const back = n.regained >= 1 ? `, ${fmt(n.regained)} came back` : n.lost >= 1 ? `, ${fmt(n.lost)} went to rivals` : '';
      const lines: LogLine[] = [{ kind: 'ok', text: `reviews are in: ${n.review.toFixed(1)}★, +${fmt(n.newUsers)} users${back}` }];
      for (const r of n.overtook) lines.push({ kind: 'ok', text: `overtook ${r.name} in the charts, found ${MARKET.overtakeScripts} scripts` });
      for (const h of n.headlines) lines.push({ kind: 'info', text: `${h.outlet}: ${h.text}` });
      return lines;
    }
    case 'market': {
      const n = e.news;
      if (n.kind === 'launch') return [{ kind: 'warn', text: `${n.rival.name} launches in ${clock(MARKET.launch.warningMs / 1000)}: ship first to steal the headline` }, { kind: 'info', text: `${n.headline.outlet}: ${n.headline.text}` }];
      if (n.kind === 'stale') return [{ kind: 'warn', text: `no update for ${MARKET.graceMinutes} minutes: users are drifting to rivals` }, { kind: 'info', text: `${n.headline.outlet}: ${n.headline.text}` }];
      return [{ kind: n.kind === 'overtaken' ? 'warn' : 'info', text: `${n.headline.outlet}: ${n.headline.text}` }];
    }
    case 'news':
      return [{ kind: 'info', text: `${e.headline.outlet}: ${e.headline.text}` }];
    case 'raised':
      return [
        { kind: 'ok', text: `${e.result.name} round closed: x${FUNDING.outputPerRound} output for good, +${e.result.equity} equity` },
        { kind: 'cmd', text: `git init --lang ${LANGUAGES[e.result.round % LANGUAGES.length].name.toLowerCase()} (the rewrite begins)` },
      ];
    case 'companyPerk':
      return [{ kind: 'cmd', text: `board approve ${e.perk.name} --level ${e.level}` }];
    case 'mail': {
      const def = mailDef(e.item.id);
      return def ? [{ kind: 'info', text: `new mail from ${def.from}: "${def.subject}" (5:mail)` }] : [];
    }
    case 'mailAnswered':
      return [{ kind: 'cmd', text: `reply "${e.answer.option.label}" (${e.answer.outcome})` }];
    case 'offline':
      return [{ kind: 'info', text: `while you were away your team wrote ${fmt(e.lines)} lines` }];
    default:
      return [];
  }
}

/** What a fork does, in words: "x2 output", "x1.4 output, +8% to all typing packages", ... */
export function forkSummary(f: ForkDef, kind: UpgradeKind): string {
  const parts = [`x${f.outputMul} output`];
  if (f.kindBonus) parts.push(`+${Math.round(f.kindBonus * 100)}% to all ${kind === 'tap' ? 'typing' : 'automation'} packages`);
  if (f.costMul) parts.push(`costs ${Math.round((1 - f.costMul) * 100)}% less`);
  return parts.join(', ');
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
