import type { GameEvent } from '../core/game';
import { SHIP } from '../core/content';
import { clock, fmt } from '../core/num';
import type { SprintResult } from '../core/state';

/** Turns game events into the log lines printed in the editor. Events not listed print nothing. */
export function describe(e: GameEvent): string | null {
  switch (e.type) {
    case 'achievement':
      return `✓ achievement unlocked: ${e.achievement.name}`;
    case 'purchase':
      return e.purchase.doubledAt ? `${e.purchase.upgrade.name} output doubled at ${e.purchase.doubledAt} owned` : null;
    case 'sprintStarted':
      return `sprint started: ${e.sprint.id} ${e.sprint.title}, ${fmt(e.sprint.target)} lines in ${clock(e.sprint.durationS)}`;
    case 'sprintEnded':
      return e.result.ok
        ? `✓ ${e.result.ticketId} merged, +${fmt(e.result.reward)} lines${e.result.boosted ? ', ×2 output for 30 s' : ''}`
        : `✗ ${e.result.ticketId} missed its deadline, lines kept`;
    case 'bugSquashed':
      return `squashed bug #${e.total}, +${fmt(e.reward)} lines`;
    case 'bugEscaped':
      return 'a bug slipped into production. It happens.';
    case 'shipped':
      return `shipped v${e.result.release}.0, +${e.result.stars} star${e.result.stars > 1 ? 's' : ''}, output now +${Math.round(e.totalStars * SHIP.bonusPerStar * 100)}%`;
    case 'offline':
      return `while you were away, your team wrote ${fmt(e.lines)} lines`;
    default:
      return null;
  }
}

export function sprintResultText(r: SprintResult): string {
  return r.ok
    ? `${r.ticketId} merged with ${clock(r.secondsLeft)} to spare: +${fmt(r.reward)} lines${r.boosted ? ' and ×2 output for 30 seconds' : ''}.`
    : `Missed the deadline on ${r.ticketId} (${fmt(r.progress)} of ${fmt(r.target)} lines). No bonus, but every line you wrote still counts.`;
}
