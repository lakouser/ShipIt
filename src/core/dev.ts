import { CORP, FUNDING, ISSUES, RIVALS, SCRIPT_IDS, type IncidentKind } from './content';
import { addDebt } from './debt';
import { addLines } from './economy';
import { grantScript } from './effects';
import { updateIncident } from './incidents';
import { Decimal } from './num';
import type { Rng } from './rng';
import type { GameState, Incident } from './state';

export type DevAction = 'lines' | 'stars' | 'bug' | 'incident' | 'sprint' | 'scripts' | 'quests' | 'unlock' | 'debt' | 'applicant' | 'boss' | 'mail' | 'warp' | 'issues' | 'quarter' | 'cash' | 'rfc' | 'pulls' | 'round' | 'rivals';

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
      s.unlocked = { sprints: true, todo: true, ship: true, team: true, mail: true, major: true, market: true, tests: true, issues: true, infra: s.round >= 1, roadmap: true, rfcs: true };
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
    case 'rfc':
      // The RFC under discussion finishes on the next tick.
      if (s.rfc.active) s.rfc.active.endsAt = now;
      return null;
    case 'round':
      // Enough stars for the next round.
      if (s.round < FUNDING.maxRounds) s.stars = Math.max(s.stars, FUNDING.starsPerRound[Math.min(s.round, FUNDING.starsPerRound.length - 1)]);
      return null;
    case 'rivals':
      // After the IPO: every rival but the last is bought, and there is cash for the last.
      if (s.corp.ipoAt) {
        for (const r of RIVALS.slice(0, -1)) if (!s.market.acquired.includes(r.id)) s.market.acquired.push(r.id);
        s.corp.cash = Math.max(s.corp.cash, 1e30);
        s.corp.hearingRetryAt = 0;
      }
      return null;
    // Handled by the game, which announces them.
    case 'pulls':
    case 'boss':
    case 'mail':
    case 'warp':
      return null;
  }
}
