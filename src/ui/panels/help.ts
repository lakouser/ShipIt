import type { Game } from '../../core/game';
import type { Tab } from '../../core/state';
import { majorHelp } from './major';
import { marketHelp } from './market';
import { autoHelp, dotfilesHelp, roundHelp, shipHelp } from './ship';
import { sprintsHelp } from './sprints';
import { teamHelp } from './team';
import { todoHelp } from './todo';
import { upgradesHelp } from './upgrades';

/** The rules behind a panel, shown by its `?` (`man ship` in the release panel); null where there is nothing to explain. */
export function helpFor(game: Game, tab: Tab): string | null {
  switch (tab) {
    case 'upgrades':
      return upgradesHelp();
    case 'sprints':
      return sprintsHelp();
    case 'todo':
      return todoHelp();
    case 'ship':
      return shipHelp();
    case 'dotfiles':
      return dotfilesHelp();
    case 'auto':
      return autoHelp();
    case 'major':
      return majorHelp();
    case 'round':
      return roundHelp(game);
    case 'team':
      return teamHelp();
    case 'market':
      return marketHelp();
    case 'trophies':
      return 'each trophy adds 1% to all output, for good. a few are secret.';
    default:
      return null;
  }
}

/** Panels that show their own help link instead of the `?` in the sub-tab row. */
export const OWN_HELP_LINK: ReadonlySet<Tab> = new Set(['upgrades', 'ship']);
