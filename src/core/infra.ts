import { INFRA, LINKS, PATTERNS, SERVICES, type LinkDef, type Mods, type PatternDef, type ServiceDef, type ServiceId } from './content';
import type { GameState } from './state';

/*
 * The architecture board (docker-compose.yml). Slots hold services; each service has its own effect, services in
 * neighbouring slots form links, and three linked services of the right kinds make a named pattern. There are more
 * services than slots. The player arranges a draft and deploys it, once per release, so a board can't be swapped
 * around for whatever is about to happen.
 */

export type Board = readonly (ServiceId | null)[];

export const findService = (id: ServiceId): ServiceDef | undefined => SERVICES.find((x) => x.id === id);

/** Slots the board has: none before the first round, then one more each round up to INFRA.maxSlots. */
export const infraSlots = (s: GameState): number => (s.round < INFRA.unlockRound ? 0 : Math.min(INFRA.maxSlots, INFRA.baseSlots + s.round - INFRA.unlockRound));

/** The board opens with the first funding round. */
export const infraReady = (s: GameState): boolean => s.round >= INFRA.unlockRound;

/** Slots next to slot i (up, down, left, right) on a board with `slots` slots. */
export function neighbours(i: number, slots: number): number[] {
  const c = INFRA.columns;
  const out: number[] = [];
  if (i % c > 0) out.push(i - 1);
  if (i % c < c - 1 && i + 1 < slots) out.push(i + 1);
  if (i - c >= 0) out.push(i - c);
  if (i + c < slots) out.push(i + c);
  return out;
}

export interface ActiveLink {
  link: LinkDef;
  a: number;
  b: number;
}

/** Links formed by services in neighbouring slots. */
export function activeLinks(board: Board, slots: number): ActiveLink[] {
  const out: ActiveLink[] = [];
  for (let a = 0; a < slots; a++) {
    for (const b of neighbours(a, slots)) {
      if (b < a) continue;
      const x = board[a];
      const y = board[b];
      if (!x || !y) continue;
      const link = LINKS.find((l) => (l.pair[0] === x && l.pair[1] === y) || (l.pair[0] === y && l.pair[1] === x));
      if (link) out.push({ link, a, b });
    }
  }
  return out;
}

/** Patterns on the board: all three services placed, each next to at least one of the other two. */
export function activePatterns(board: Board, slots: number): PatternDef[] {
  return PATTERNS.filter((p) => {
    const at = p.needs.map((id) => board.indexOf(id));
    if (at.some((i) => i < 0 || i >= slots)) return false;
    return at.every((i) => neighbours(i, slots).some((n) => n !== i && at.includes(n)));
  });
}

/** A part's effect at a strength: x1.15 at strength 1.5 is x1.225, 6% off is 9% off; a flat bonus scales directly. */
export function scaleMods(part: Partial<Mods>, strength: number): Partial<Mods> {
  const out: Partial<Mods> = { ...part };
  for (const key of ['tapMul', 'autoMul', 'allMul', 'costMul', 'sprintReward', 'bugReward', 'starGain', 'debtMul', 'coverageMul', 'churnMul', 'usersMul'] as const) {
    const x = part[key];
    if (x !== undefined) out[key] = 1 + (x - 1) * strength;
  }
  if (part.critAdd !== undefined) out.critAdd = part.critAdd * strength;
  return out;
}

/** True when the service in slot i sits next to the monitor. */
export const monitored = (board: Board, slots: number, i: number): boolean => board[i] !== 'monitor' && neighbours(i, slots).some((n) => board[n] === 'monitor');

/** Everything a board does, as rule changes: each service (stronger next to the monitor), each link, each pattern. */
export function boardParts(board: Board, slots: number): Partial<Mods>[] {
  const parts: Partial<Mods>[] = [];
  for (let i = 0; i < slots; i++) {
    const def = board[i] ? findService(board[i]!) : undefined;
    if (def) parts.push(monitored(board, slots, i) ? scaleMods(def.mods, 1 + INFRA.monitorBoost) : def.mods);
  }
  for (const { link } of activeLinks(board, slots)) parts.push(link.mods);
  for (const p of activePatterns(board, slots)) parts.push(p.mods);
  return parts;
}

let memoSlots = -1;
let memoBoard: (ServiceId | null)[] = [];
let memoParts: Partial<Mods>[] = [];
const NONE: Partial<Mods>[] = [];

/**
 * The rule changes from the board that is running. Memoised on the board's contents, without allocating: this is asked
 * for on every output and price calculation.
 */
export function infraParts(s: GameState): Partial<Mods>[] {
  const slots = infraSlots(s);
  if (slots === 0) return NONE;
  const live = s.infra.live;
  let same = slots === memoSlots;
  for (let i = 0; same && i < slots; i++) same = (live[i] ?? null) === memoBoard[i];
  if (!same) {
    memoSlots = slots;
    memoBoard = Array.from({ length: slots }, (_, i) => live[i] ?? null);
    memoParts = boardParts(memoBoard, slots);
  }
  return memoParts;
}

const padded = (board: Board): (ServiceId | null)[] => Array.from({ length: INFRA.maxSlots }, (_, i) => board[i] ?? null);

/** Puts a service in a draft slot (or clears it with null). A service already on the draft moves, swapping with what was there. */
export function placeService(s: GameState, slot: number, id: ServiceId | null): boolean {
  if (slot < 0 || slot >= infraSlots(s) || (id !== null && !findService(id))) return false;
  const draft = padded(s.infra.draft);
  if (id !== null) {
    const from = draft.indexOf(id);
    if (from === slot) return false;
    if (from >= 0) draft[from] = draft[slot];
  }
  draft[slot] = id;
  s.infra.draft = draft;
  return true;
}

/** True when the draft differs from the running board. */
export function draftDirty(s: GameState): boolean {
  const slots = infraSlots(s);
  for (let i = 0; i < slots; i++) if ((s.infra.draft[i] ?? null) !== (s.infra.live[i] ?? null)) return true;
  return false;
}

/** Throws the draft away: back to what is running. */
export function discardDraft(s: GameState): void {
  s.infra.draft = padded(s.infra.live);
}

export interface Deploy {
  links: ActiveLink[];
  patterns: PatternDef[];
  /** Patterns built for the first time. */
  found: PatternDef[];
}

/** `docker compose up -d`: the draft becomes the running board. Once per release. */
export function deploy(s: GameState): Deploy | null {
  if (!s.unlocked.infra || !s.infra.canDeploy || !draftDirty(s)) return null;
  const slots = infraSlots(s);
  s.infra.live = padded(s.infra.draft).map((x, i) => (i < slots ? x : null));
  s.infra.draft = [...s.infra.live];
  s.infra.canDeploy = false;
  s.stats.deploys++;
  const patterns = activePatterns(s.infra.live, slots);
  const found = patterns.filter((p) => !s.infra.found.includes(p.id));
  for (const p of found) s.infra.found.push(p.id);
  return { links: activeLinks(s.infra.live, slots), patterns, found };
}
