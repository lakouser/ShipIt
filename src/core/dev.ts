import { SCRIPT_IDS, type IncidentKind } from './content';
import { addLines } from './economy';
import { grantScript } from './effects';
import { updateIncident } from './incidents';
import { Decimal } from './num';
import type { Rng } from './rng';
import type { GameState, Incident } from './state';

export type DevAction = 'lines' | 'stars' | 'bug' | 'incident' | 'sprint' | 'scripts' | 'quests' | 'unlock' | 'warp';

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
      s.unlocked = { sprints: true, todo: true, ship: true, major: true, market: true };
      return null;
    case 'warp':
      return null;
  }
}
