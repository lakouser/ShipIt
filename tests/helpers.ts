import { Game } from '../src/core/game';
import { newGame, type GameState } from '../src/core/state';

/** A game with a controllable clock and a deterministic random source. */
export function testGame(setup: (s: GameState) => void = () => {}) {
  let now = 1_000_000;
  let seed = 1;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
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
