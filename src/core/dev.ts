import { CORP, ISSUES, SCRIPT_IDS, type IncidentKind } from './content';
import { addDebt } from './debt';
import { addLines } from './economy';
import { grantScript } from './effects';
import { updateIncident } from './incidents';
import { Decimal } from './num';
import type { Rng } from './rng';
import type { GameState, Incident } from './state';

export type DevAction = 'lines' | 'stars' | 'bug' | 'incident' | 'sprint' | 'scripts' | 'quests' | 'unlock' | 'debt' | 'applicant' | 'boss' | 'mail' | 'warp' | 'issues' | 'quarter' | 'cash';

/** Developer shortcuts for testing. Returns a spawned incident, if any, so the game can announce it. */
export function applyDev(s: GameState, action: DevAction, now: number, rng: Rng, incident?: IncidentKind): Incident | null {
  switch (action) {
    case 'lines':
      // x10 the current lines (at least +1,000).
      addLines(s, Decimal.max(1000, s.lines.mul(9)));
      return null;
    case 'stars':
      s.stars += 5;
      return null;
    case 'bug':
      s.bug = null;
      s.nextBugAt = now;
      return null;
    case 'incident': {
      s.incident = null;
      const change = updateIncident(s, now, rng, true, incident);
      return change?.type === 'spawned' ? change.incident : null;
    }
    case 'sprint':
      if (s.sprint) s.sprint.progress = s.sprint.target;
      return null;
    case 'scripts':
      for (const id of SCRIPT_IDS) grantScript(s, id);
      return null;
    case 'quests':
      for (const q of s.quests) q.target = '0';
      s.nextQuestAt = 0;
      return null;
    case 'unlock':
      s.unlocked = { sprints: true, todo: true, ship: true, team: true, mail: true, major: true, market: true, tests: true, issues: true };
      return null;
    case 'issues':
      // Files the next few issues now.
      s.unlocked.issues = true;
      s.issues.nextAt = now - 2 * ISSUES.everyMinutes * 60_000;
      return null;
    case 'quarter':
      // Runs the quarter clock to its last second; the next tick closes it.
      if (s.corp.ipoAt) s.corp.elapsed = Math.max(s.corp.elapsed, CORP.quarterMinutes * 60 - 0.001);
      return null;
    case 'cash':
      s.corp.cash = Math.max(1e6, s.corp.cash * 10);
      return null;
    case 'debt':
      addDebt(s, 30);
      return null;
    case 'applicant':
      s.unlocked.team = true;
      s.applicant = null;
      s.nextApplicantAt = now;
      return null;
    // Handled by the game, which announces them.
    case 'boss':
    case 'mail':
    case 'warp':
      return null;
  }
}
