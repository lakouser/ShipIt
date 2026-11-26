import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectClaudeDb } from '../src/platform/claude';
import { SaveStore } from '../src/platform/saves';
import type { KeyValueStore } from '../src/platform/types';

/**
 * A stand-in for the Claude artifact runtime's db. `get()` answers from this device's cache first
 * (fromCache: true), as the runtime may, and the store confirms later through onSnapshot. On the
 * first visit after an update the cache is empty, which is how the real save used to be lost.
 */
function fakeRuntime(opts: { server: Record<string, unknown> | null; cache: Record<string, unknown> | null; confirmAfterMs: number | null; syncSnapshot?: boolean }) {
  const state = { server: opts.server, sets: [] as Record<string, unknown>[], unsubscribed: 0, gets: 0, listeners: [] as ((s: ReturnType<typeof snap>) => void)[] };
  const snap = (data: Record<string, unknown> | null, fromCache: boolean) => ({ exists: data !== null, data: () => data ?? undefined, metadata: { fromCache, hasPendingWrites: false } });
  const ref = {
    get: async () => (state.gets++, snap(opts.cache, true)),
    set: async (d: Record<string, unknown>) => {
      state.server = d;
      state.sets.push(d);
      for (const l of state.listeners) l(snap(d, false));
    },
    onSnapshot(next: (s: ReturnType<typeof snap>) => void) {
      let live = true;
      state.listeners.push((x) => live && next(x));
      if (opts.syncSnapshot && opts.confirmAfterMs !== null) next(snap(state.server, false));
      else {
        setTimeout(() => live && next(snap(opts.cache, true)), 0);
        if (opts.confirmAfterMs !== null) setTimeout(() => live && next(snap(state.server, false)), opts.confirmAfterMs);
      }
      return () => {
        live = false;
        state.unsubscribed++;
      };
    },
  };
  const runtime = {
    use: async (name: string) =>
      name === 'db' ? { doc: (path: string) => (expect(path).toBe('data/users/u_1/shipit'), ref) } : name === 'user' ? { id: async () => 'u_1' } : null,
  };
  /** Another tab or device writes the document. */
  const otherCopyWrites = (d: Record<string, unknown>) => {
    state.server = d;
    for (const l of state.listeners) l(snap(d, false));
  };
  return { runtime, state, otherCopyWrites };
}

const KEY = 'shipit.save';
const save = (savedAt: number, lifetime: number, release = 1) => JSON.stringify({ v: 2, savedAt, lifetime: String(lifetime), release });

function emptyDevice(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, get: async (k) => map.get(k) ?? null, set: async (k, v) => void map.set(k, v), remove: async (k) => void map.delete(k), probe: async () => true };
}

const g = globalThis as { claude?: unknown };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => {
  delete g.claude;
  vi.useRealTimers();
});

describe('reading the account save', () => {
  it('waits for the store instead of taking an empty cached copy', async () => {
    const real = { save: save(900_000, 5e9, 4), savedAt: 900_000, lifetime: 5e9, release: 4 };
    const { runtime, state } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 500 });
    g.claude = runtime;
    const doc = (await connectClaudeDb('shipit'))!;
    const p = doc.get();
    await vi.advanceTimersByTimeAsync(600);
    expect(await p).toEqual(real);
    expect(state.unsubscribed).toBe(0); // kept, to follow later changes
  });

  it('copes with a store that confirms inside onSnapshot itself', async () => {
    const real = { save: save(900_000, 5e9, 4) };
    const { runtime } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 0, syncSnapshot: true });
    g.claude = runtime;
    const doc = (await connectClaudeDb('shipit'))!;
    expect(await doc.get()).toEqual(real);
  });

  it('keeps waiting for a store that answers only with its periodic refresh (about 30 s), asking get() again meanwhile', async () => {
    const real = { save: save(900_000, 5e9, 4) };
    const { runtime, state } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 31_000 });
    g.claude = runtime;
    const doc = (await connectClaudeDb('shipit'))!;
    let answer: unknown = 'pending';
    void doc.get().then((d) => (answer = d));
    await vi.advanceTimersByTimeAsync(25_000);
    expect(answer).toBe('pending'); // no deadline: a 15 s one used to give up here for the whole session
    expect(state.gets).toBeGreaterThan(1);
    await vi.advanceTimersByTimeAsync(7000);
    expect(answer).toEqual(real);
  });

  it('passes later confirmed changes to watch: its own writes and other copies\'', async () => {
    const { runtime, otherCopyWrites } = fakeRuntime({ server: null, cache: null, confirmAfterMs: 10 });
    g.claude = runtime;
    const doc = (await connectClaudeDb('shipit'))!;
    const seen: unknown[] = [];
    const p = doc.get();
    await vi.advanceTimersByTimeAsync(20);
    expect(await p).toBeNull();
    doc.watch!((d) => seen.push(d));
    await doc.set({ save: 'mine' });
    otherCopyWrites({ save: 'theirs' });
    expect(seen).toEqual([{ save: 'mine' }, { save: 'theirs' }]);
  });
});

describe('the first visit after an update (empty device storage, empty runtime cache)', () => {
  const real = { save: save(900_000, 5e9, 4), savedAt: 900_000, lifetime: 5e9, release: 4 };
  const store = (device: KeyValueStore) => new SaveStore(device, () => connectClaudeDb('shipit'), { key: KEY, waitMs: 3000, cloudEveryMs: 60_000, visible: () => true });

  it('loads the account save', async () => {
    const { runtime } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 800 });
    g.claude = runtime;
    const saves = store(emptyDevice());
    const p = saves.load();
    await vi.advanceTimersByTimeAsync(1000);
    const list = await p;
    expect(list.map((c) => c.source)).toEqual(['cloud']);
    expect(list[0]!.meta.release).toBe(4);
  });

  it('never writes a new game over the account save while the store has not answered, and switches to it when it does', async () => {
    const { runtime, state } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 90_000 });
    g.claude = runtime;
    const device = emptyDevice();
    const saves = store(device);
    const late = vi.fn();
    saves.onLateSave(late);
    const p = saves.load();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await p).toEqual([]); // nothing to start from yet: a stand-in new game
    saves.started(null);
    for (let i = 1; i <= 12; i++) {
      saves.save(save(1_000_000 + i * 5000, i * 10));
      await vi.advanceTimersByTimeAsync(5000);
    }
    await saves.flush();
    expect(saves.status().cloud).toBe('connecting');
    expect(state.sets).toEqual([]);
    expect(state.server).toBe(real);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(late).toHaveBeenCalledWith(real.save, 'progress');
    // and next time, with the store answering, the real save wins over the stand-in kept on the device
    const { runtime: answering } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 100 });
    g.claude = answering;
    const next = store(device);
    const q = next.load();
    await vi.advanceTimersByTimeAsync(200);
    expect((await q)[0]!.text).toBe(real.save);
  });

  it('where this device keeps nothing, waits for a slow store and starts from the account save', async () => {
    const { runtime } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 30_000 });
    g.claude = runtime;
    const keepsNothing = { ...emptyDevice(), probe: async () => false };
    const saves = store(keepsNothing);
    const p = saves.load();
    await vi.advanceTimersByTimeAsync(31_000);
    expect((await p).map((c) => c.source)).toEqual(['cloud']);
  });

  it('an import made while the store is slow waits for it, then reaches the account', async () => {
    const { runtime, state } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 30_000 });
    g.claude = runtime;
    const keepsNothing = { ...emptyDevice(), probe: async () => false, get: async () => null };
    const saves = new SaveStore(keepsNothing, () => connectClaudeDb('shipit'), { key: KEY, waitMs: 3000, noStorageWaitMs: 3000, cloudEveryMs: 60_000, visible: () => true });
    const p = saves.load();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await p).toEqual([]);
    saves.started(null);
    const imported = save(1_003_000, 1e7, 2);
    let kept: boolean | null = null;
    void saves.replace(imported).then((k) => (kept = k));
    await vi.advanceTimersByTimeAsync(28_000);
    expect(kept).toBe(true);
    expect(state.server).toMatchObject({ save: imported, resetAt: expect.any(Number) });
  });
});
