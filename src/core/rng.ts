/** A source of random numbers in [0, 1). Injected so tests and simulations are deterministic. */
export type Rng = () => number;

/** Deterministic generator for tests and the pacing simulator (Park–Miller). */
export function seededRng(seed = 1): Rng {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
