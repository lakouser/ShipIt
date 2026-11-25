import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveStore } from '../src/platform/saves';
import type { CloudDoc, KeyValueStore } from '../src/platform/types';

const KEY = 'shipit.save';
const save = (savedAt: number, lifetime: number, release = 1) => JSON.stringify({ v: 2, savedAt, lifetime: String(lifetime), release });

function fakeLocal(initial: Record<string, string> = {}, works = true) {
  const map = new Map(Object.entries(initial));
  const store: KeyValueStore & { map: Map<string, string> } = {
    map,
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => void map.set(k, v),
    remove: async (k) => void map.delete(k),
    probe: async () => works,
  };
  return store;
}

function fakeCloud(initial: Record<string, unknown> | null = null, delayMs = 50) {
  const cloud = {
    data: initial,
    sets: [] as Record<string, unknown>[],
    fail: null as null | { code: string },
    doc: {
      get: () => new Promise<Record<string, unknown> | null>((r) => setTimeout(() => r(cloud.data), delayMs)),
      set: (d: Record<string, unknown>) =>
        new Promise<void>((resolve, reject) =>
          setTimeout(() => {
            if (cloud.fail) return reject(cloud.fail);
            cloud.data = d;
            cloud.sets.push(d);
            resolve();
          }, 10),
        ),
    } satisfies CloudDoc,
  };
  return cloud;
}

let visible = true;
const make = (local: KeyValueStore, cloud: ReturnType<typeof fakeCloud> | null) =>
  new SaveStore(local, async () => cloud?.doc ?? null, { key: KEY, waitMs: 3000, cloudEveryMs: 60_000, visible: () => visible });

async function flush(store: SaveStore) {
  const p = store.flush();
  await vi.advanceTimersByTimeAsync(20);
  await p;
}

async function load(store: SaveStore) {
  const p = store.load();
  await vi.advanceTimersByTimeAsync(100);
  return p;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  visible = true;
});
afterEach(() => vi.useRealTimers());

describe('loading', () => {
  it('restores from the cloud when this device lost its save (the phone case)', async () => {
    const cloud = fakeCloud({ save: save(900_000, 5e9, 4), savedAt: 900_000, lifetime: 5e9, release: 4 });
    const list = await load(make(fakeLocal(), cloud));
    expect(list.map((c) => c.source)).toEqual(['cloud']);
    expect(list[0]!.meta.release).toBe(4);
  });

  it('starts from whichever save is newer', async () => {
    const older = save(800_000, 100);
    const newer = save(900_000, 50);
    let list = await load(make(fakeLocal({ [KEY]: newer }), fakeCloud({ save: older })));
    expect(list.map((c) => c.source)).toEqual(['device', 'cloud']);
    list = await load(make(fakeLocal({ [KEY]: older }), fakeCloud({ save: newer })));
    expect(list.map((c) => c.source)).toEqual(['cloud', 'device']);
  });

  it('works with no cloud at all (other hosts)', async () => {
    const store = make(fakeLocal({ [KEY]: save(1, 10) }), null);
    const list = await load(store);
    expect(list.map((c) => c.source)).toEqual(['device']);
    expect(store.status()).toMatchObject({ device: true, cloud: 'off' });
  });

  it('reports a device that keeps nothing', async () => {
    const store = make(fakeLocal({}, false), null);
    await load(store);
    expect(store.status()).toMatchObject({ device: false, cloud: 'off' });
  });
});

describe('a slow cloud', () => {
  it('never lets the stand-in game overwrite the cloud, and switches to the newer cloud save', async () => {
    const cloud = fakeCloud({ save: save(900_000, 5e9, 4) }, 8000);
    const store = make(fakeLocal(), cloud);
    const late = vi.fn();
    store.onLateSave(late);
    const p = store.load();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await p).toEqual([]); // started a new game
    store.save(save(1_003_000, 10));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(late).toHaveBeenCalledWith(save(900_000, 5e9, 4));
    store.save(save(1_013_000, 20));
    await flush(store);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(cloud.sets).toEqual([]);
  });

  it('uploads this device once the cloud turns out to be older', async () => {
    const cloud = fakeCloud({ save: save(500_000, 10) }, 8000);
    const store = make(fakeLocal({ [KEY]: save(900_000, 99) }), cloud);
    const late = vi.fn();
    store.onLateSave(late);
    const p = store.load();
    await vi.advanceTimersByTimeAsync(3000);
    await p;
    store.save(save(1_003_000, 120));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(late).not.toHaveBeenCalled();
    expect(cloud.sets.map((d) => d.lifetime)).toEqual([120]);
  });
});

describe('writing', () => {
  it('writes to this device every time but to the cloud at most once a minute, and flushes on demand', async () => {
    const local = fakeLocal();
    const cloud = fakeCloud(null);
    const store = make(local, cloud);
    await load(store);
    for (let i = 1; i <= 6; i++) {
      store.save(save(1_000_000 + i * 5000, i));
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(local.map.get(KEY)).toBe(save(1_030_000, 6));
    expect(cloud.sets.length).toBe(1);
    store.save(save(1_040_000, 7));
    await flush(store);
    expect(cloud.sets.at(-1)!.lifetime).toBe(7);
    await flush(store); // unchanged: no write
    expect(cloud.sets.length).toBe(2);
  });

  it('skips routine cloud writes while hidden', async () => {
    const cloud = fakeCloud(null);
    const store = make(fakeLocal(), cloud);
    await load(store);
    visible = false;
    store.save(save(1_001_000, 1));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(cloud.sets.length).toBe(0);
  });

  it('stops using the cloud after a refusal and says so', async () => {
    const cloud = fakeCloud(null);
    const store = make(fakeLocal(), cloud);
    await load(store);
    cloud.fail = { code: 'revoked' };
    store.save(save(1_001_000, 1));
    await flush(store);
    expect(store.status().cloud).toBe('error');
    cloud.fail = null;
    store.save(save(1_002_000, 2));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(cloud.sets.length).toBe(0);
  });
});

describe('backups', () => {
  it('keeps the save with more progress when a smaller one replaces it, until it is overtaken', async () => {
    const big = save(900_000, 5e9, 4);
    const local = fakeLocal({ [KEY]: save(800_000, 4e9, 3) });
    const cloud = fakeCloud({ save: big });
    const store = make(local, cloud);
    await load(store);
    store.started(big);
    // the game started from the bigger cloud save; then the player imports a small one
    store.save(save(1_001_000, 100));
    await flush(store);
    expect(cloud.data!.prev).toBe(big);
    expect(local.map.get(`${KEY}.prev`)).toBe(big);
    expect(store.backup()!.meta.lifetime).toBe(5e9);
    // prev travels with later writes while it still has more progress
    store.save(save(1_070_000, 200));
    await flush(store);
    expect(cloud.data!.prev).toBe(big);
    // and is dropped once the current save overtakes it
    store.save(save(1_140_000, 6e9, 5));
    await flush(store);
    expect(cloud.data!.prev).toBeUndefined();
  });

  it('reset clears this device and the cloud but keeps the old save restorable', async () => {
    const local = fakeLocal({ [KEY]: save(900_000, 5e9, 4) });
    const cloud = fakeCloud({ save: save(900_000, 5e9, 4) });
    const store = make(local, cloud);
    await load(store);
    const p = store.clear();
    await vi.advanceTimersByTimeAsync(20);
    await p;
    expect(local.map.has(KEY)).toBe(false);
    expect(local.map.get(`${KEY}.prev`)).toBe(save(900_000, 5e9, 4));
    expect(cloud.data).toMatchObject({ save: '', prev: save(900_000, 5e9, 4) });
    // next load: nothing to start from, but the backup is offered
    const next = make(local, cloud);
    expect(await load(next)).toEqual([]);
    expect(next.backup()!.meta.release).toBe(4);
  });

  it('keeps a save that failed to load', async () => {
    const local = fakeLocal();
    const store = make(local, null);
    await store.keepUnreadable('{"v":99}');
    expect([...local.map.values()]).toContain('{"v":99}');
  });
});
