import type { CloudDoc } from './types';

/**
 * The Claude artifact runtime, present only when the game is served as a Claude artifact.
 * Its `db` capability gives each signed-in player a private folder (data/users/<id>/) that
 * survives cleared browser storage and follows them across devices. The artifact must declare
 * `capabilities: { db: {}, user: {} }`.
 */
interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}
interface Snapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  /** fromCache: a copy kept on this device, not yet confirmed by the store (may be empty or old). */
  metadata?: { fromCache?: boolean };
}
interface DocRef {
  get(): Promise<Snapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  onSnapshot?(next: (snap: Snapshot) => void, error?: (e: unknown) => void): () => void;
}
interface Db {
  doc(path: string): DocRef;
}
interface User {
  id(): Promise<string | null>;
}

/** How long to wait for the store to confirm a read before giving up on it for now. */
const CONFIRM_MS = 15_000;

const bodyOf = (snap: Snapshot) => (snap.exists ? (snap.data() ?? null) : null);
const confirmed = (snap: Snapshot) => snap.metadata?.fromCache !== true;

/**
 * Reads the document as the store holds it. A copy from this device's cache is never taken as the
 * player's save: it can be empty or old (on the first visit after an update it was empty, and the
 * game started a new one over the real save). Waits for the store's own answer instead.
 */
async function readConfirmed(ref: DocRef, waitMs: number): Promise<Record<string, unknown> | null> {
  const first = await ref.get();
  if (confirmed(first)) return bodyOf(first);
  if (typeof ref.onSnapshot !== 'function') throw { code: 'unavailable', message: 'only a cached copy was available' };
  const subscribe = ref.onSnapshot.bind(ref);
  return new Promise((resolve, reject) => {
    let done = false;
    let stop: (() => void) | null = null;
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      stop?.();
      settle();
    };
    const timer = setTimeout(() => finish(() => reject({ code: 'unavailable', message: 'the store did not answer' })), waitMs);
    stop = subscribe(
      (snap) => {
        if (confirmed(snap)) finish(() => resolve(bodyOf(snap)));
      },
      (e) => finish(() => reject(e)),
    );
    if (done) stop(); // it answered before onSnapshot returned
  });
}

/** The player's private save document, or null where the runtime, db or a signed-in player is missing. */
export async function connectClaudeDb(name: string, confirmMs = CONFIRM_MS): Promise<CloudDoc | null> {
  const runtime = (globalThis as { claude?: ClaudeRuntime }).claude;
  if (!runtime || typeof runtime.use !== 'function') return null;
  try {
    const [db, user] = (await Promise.all([runtime.use('db'), runtime.use('user')])) as [Db | null, User | null];
    if (!db || !user) return null;
    const id = await user.id();
    if (!id) return null;
    const ref = db.doc(`data/users/${id}/${name}`);
    return {
      get: () => readConfirmed(ref, confirmMs),
      set: (data) => ref.set(data),
    };
  } catch {
    return null;
  }
}
