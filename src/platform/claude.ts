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

/** While get() only answers from this device's cache, ask it again at these times (ms), alongside the listener. */
const GET_RETRIES = [2000, 5000, 10_000, 20_000];

const bodyOf = (snap: Snapshot) => (snap.exists ? (snap.data() ?? null) : null);
const confirmed = (snap: Snapshot) => snap.metadata?.fromCache !== true;

/**
 * The document as the store holds it, followed live. A copy from this device's cache is never taken as
 * the player's save: it can be empty or old (on the first visit after an update it was empty, and the game
 * started a new one over the real save). The first read waits for the store's own answer, with no
 * deadline: where live updates aren't available the answer comes with the store's periodic refresh (about
 * 30 s), and giving up sooner left whole sessions, and the imports made in them, never reaching the
 * account. Later answers go to watch(): this game's own writes, and other open copies'.
 */
function liveDoc(ref: DocRef): CloudDoc {
  const watchers: ((data: Record<string, unknown> | null) => void)[] = [];
  let first: Promise<Record<string, unknown> | null> | null = null;
  const read = () =>
    (first ??= new Promise((resolve, reject) => {
      let answered = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const settle = (done: () => void) => {
        answered = true;
        timers.forEach(clearTimeout);
        done();
      };
      const deliver = (snap: Snapshot) => {
        if (!confirmed(snap)) return;
        const body = bodyOf(snap);
        if (!answered) settle(() => resolve(body));
        else for (const w of watchers) w(body);
      };
      const ask = () => ref.get().then(deliver, () => {});
      void ask();
      if (typeof ref.onSnapshot === 'function') {
        // Subscribed once, for the whole session. A terminal error before any answer fails the read.
        ref.onSnapshot(deliver, (e) => {
          if (!answered) settle(() => reject(e));
        });
        for (const ms of GET_RETRIES) timers.push(setTimeout(() => void (answered || ask()), ms));
      } else {
        // No live updates in this runtime: get() is all there is.
        GET_RETRIES.forEach((ms, i) =>
          timers.push(setTimeout(() => {
            if (answered) return;
            if (i < GET_RETRIES.length - 1) void ask();
            else settle(() => reject({ code: 'unavailable', message: 'only a cached copy was available' }));
          }, ms)),
        );
      }
    }));
  return {
    get: read,
    set: (data) => ref.set(data),
    watch: (listener) => void watchers.push(listener),
  };
}

/** The player's private save document, or null where the runtime, db or a signed-in player is missing. */
export async function connectClaudeDb(name: string): Promise<CloudDoc | null> {
  const runtime = (globalThis as { claude?: ClaudeRuntime }).claude;
  if (!runtime || typeof runtime.use !== 'function') return null;
  try {
    const [db, user] = (await Promise.all([runtime.use('db'), runtime.use('user')])) as [Db | null, User | null];
    if (!db || !user) return null;
    const id = await user.id();
    if (!id) return null;
    return liveDoc(db.doc(`data/users/${id}/${name}`));
  } catch {
    return null;
  }
}
