import { Game } from '../src/core/game';
import { seededRng } from '../src/core/rng';
import { newGame, type GameState } from '../src/core/state';

/** A game with a controllable clock and a deterministic random source. */
export function testGame(setup: (s: GameState) => void = () => {}, rng = seededRng(1)) {
  let now = 1_000_000;
  const state = newGame(now);
  setup(state);
  const game = new Game(state, { clock: () => now, rng });
  return {
    game,
    state,
    advance(ms: number) {
      now += ms;
    },
    get now() {
      return now;
    },
  };
}

/** Always returns the same number: pins random outcomes (crits, spawns) in tests. */
export const fixedRng = (value: number) => () => value;
