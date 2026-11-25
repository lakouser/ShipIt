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
interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
}
interface Db {
  doc(path: string): DocRef;
}
interface User {
  id(): Promise<string | null>;
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
    const ref = db.doc(`data/users/${id}/${name}`);
    return {
      async get() {
        const snap = await ref.get();
        return snap.exists ? (snap.data() ?? null) : null;
      },
      set: (data) => ref.set(data),
    };
  } catch {
    return null;
  }
}
