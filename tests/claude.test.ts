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
  const state = { server: opts.server, sets: [] as Record<string, unknown>[], unsubscribed: 0 };
  const snap = (data: Record<string, unknown> | null, fromCache: boolean) => ({ exists: data !== null, data: () => data ?? undefined, metadata: { fromCache, hasPendingWrites: false } });
  const ref = {
    get: async () => snap(opts.cache, true),
    set: async (d: Record<string, unknown>) => {
      state.server = d;
      state.sets.push(d);
    },
    onSnapshot(next: (s: ReturnType<typeof snap>) => void) {
      let live = true;
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
  return { runtime, state };
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
    expect(state.unsubscribed).toBe(1);
  });

  it('copes with a store that confirms inside onSnapshot itself', async () => {
    const real = { save: save(900_000, 5e9, 4) };
    const { runtime, state } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 0, syncSnapshot: true });
    g.claude = runtime;
    const doc = (await connectClaudeDb('shipit'))!;
    expect(await doc.get()).toEqual(real);
    expect(state.unsubscribed).toBe(1);
  });

  it('gives up (rejects) when the store never confirms', async () => {
    const { runtime } = fakeRuntime({ server: { save: 'x' }, cache: null, confirmAfterMs: null });
    g.claude = runtime;
    const doc = (await connectClaudeDb('shipit', 2000))!;
    const p = doc.get().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(2100);
    expect(await p).toMatchObject({ code: 'unavailable' });
  });
});

describe('the first visit after an update (empty device storage, empty runtime cache)', () => {
  const real = { save: save(900_000, 5e9, 4), savedAt: 900_000, lifetime: 5e9, release: 4 };
  const store = (device: KeyValueStore) => new SaveStore(device, () => connectClaudeDb('shipit', 2000), { key: KEY, waitMs: 3000, cloudEveryMs: 60_000, visible: () => true });

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

  it('never writes a new game over the account save when the store does not answer', async () => {
    const { runtime, state } = fakeRuntime({ server: real, cache: null, confirmAfterMs: null });
    g.claude = runtime;
    const device = emptyDevice();
    const saves = store(device);
    const p = saves.load();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await p).toEqual([]); // nothing to start from yet: a stand-in new game
    saves.started(null);
    for (let i = 1; i <= 12; i++) {
      saves.save(save(1_000_000 + i * 5000, i * 10));
      await vi.advanceTimersByTimeAsync(5000);
    }
    await saves.flush();
    expect(saves.status().cloud).toBe('error');
    expect(state.sets).toEqual([]);
    expect(state.server).toBe(real);
    // and next time, with the store answering, the real save wins over the stand-in kept on the device
    const { runtime: answering } = fakeRuntime({ server: real, cache: null, confirmAfterMs: 100 });
    g.claude = answering;
    const next = store(device);
    const q = next.load();
    await vi.advanceTimersByTimeAsync(200);
    expect((await q)[0]!.text).toBe(real.save);
  });
});
