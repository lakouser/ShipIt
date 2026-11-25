import type { CloudDoc, KeyValueStore } from './types';

/**
 * Where saves live. Every save goes to this device straight away and, where the host offers one
 * (the Claude artifact database today), to a copy in the player's account about once a minute and
 * whenever the game is hidden. Browser storage alone is not enough: some views drop it (the Claude
 * phone app lost a player's save this way).
 *
 * Rules that keep a save from being lost:
 * - The cloud copy is read, as the store confirms it (never a cached copy), before anything is
 *   written to it, so a stand-in new game started while the cloud was out of reach can never
 *   overwrite it. If the cloud answers late with a better save, the game is told (onLateSave) and
 *   switches to it.
 * - The game starts from the save with the most progress, this device's or the cloud's, not the
 *   newest: a new game started while the real save was out of reach is newer but must not win.
 * - The one exception is a deliberate replacement (reset, import, restoring a backup). It starts a
 *   new generation (resetAt), recorded on this device and in the cloud with every save written
 *   after it; saves from an older generation no longer count. Generations don't depend on device
 *   clocks agreeing.
 * - A save with more progress than the one the game starts from or replaces it with (a reset, an
 *   import, another device) is kept as a backup, on this device and in the cloud, which the player
 *   can restore.
 * - A save that fails to load is kept aside instead of being overwritten, and a save this version
 *   can't read is not written over at all (hold).
 *
 * This file knows only the few fields it compares saves by (savedAt, lifetime, release), not the
 * rest of the format.
 */

export interface SaveMeta {
  savedAt: number;
  lifetime: number;
  release: number;
}

export interface Candidate {
  text: string;
  source: 'device' | 'cloud';
  meta: SaveMeta;
  /** The generation (deliberate replacement) this save belongs to; see resetAt. */
  gen: number;
}

export type CloudState = 'off' | 'connecting' | 'synced' | 'saving' | 'error';

export interface SaveStatus {
  /** This device's storage works. */
  device: boolean;
  cloud: CloudState;
  /** When the cloud last confirmed a save (ms), if this session wrote or read one. */
  cloudSavedAt: number | null;
  /** Nothing is being saved: this version could not read the player's save (see hold). */
  held: boolean;
}

export interface Backup {
  text: string;
  meta: SaveMeta;
}

export interface SaveStoreOptions {
  key: string;
  /** How long to wait for the cloud before starting from this device's save. */
  waitMs: number;
  /** Minimum time between routine cloud writes. */
  cloudEveryMs: number;
  /** Routine cloud writes only happen while the game is on screen. */
  visible: () => boolean;
}

/** The cloud document: the save as a string (so its shape and depth never matter to the store). */
interface CloudBody {
  save: string;
  savedAt: number;
  lifetime: number;
  release: number;
  prev?: string;
  /** The generation `save` belongs to: when the player last deliberately replaced their save. */
  resetAt?: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Reads the fields saves are compared by. Null for anything that isn't a save. */
export function metaOf(text: string | null | undefined): SaveMeta | null {
  if (!text) return null;
  try {
    const d = JSON.parse(text) as Record<string, unknown> | null;
    if (!d || typeof d !== 'object') return null;
    return { savedAt: Number(d.savedAt) || 0, lifetime: parseFloat(String(d.lifetime)) || 0, release: Number(d.release) || 1 };
  } catch {
    return null;
  }
}

function asBody(data: Record<string, unknown> | null): CloudBody | null {
  if (!data || typeof data.save !== 'string') return null;
  return {
    save: data.save,
    savedAt: Number(data.savedAt) || 0,
    lifetime: Number(data.lifetime) || 0,
    release: Number(data.release) || 1,
    ...(typeof data.prev === 'string' && data.prev ? { prev: data.prev } : {}),
    ...(Number(data.resetAt) > 0 ? { resetAt: Number(data.resetAt) } : {}),
  };
}

/**
 * Saves best first: the most progress wins (lifetime only ever grows in play), then the newest.
 * Saves from before the latest deliberate replacement (gen below resetAt) are left out.
 */
export function rank<T extends { meta: SaveMeta; gen: number }>(list: T[], resetAt: number): T[] {
  return list
    .filter((c) => c.gen >= resetAt)
    .sort((a, b) => b.meta.lifetime - a.meta.lifetime || b.meta.savedAt - a.meta.savedAt);
}

/** Errors after which this session stops trying the cloud. */
const FATAL = new Set(['invalid_argument', 'revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'quota_exceeded']);
const isFatal = (e: unknown) => typeof e === 'object' && e !== null && FATAL.has(String((e as { code?: unknown }).code));

export class SaveStore {
  private cloud: CloudDoc | null = null;
  private cloudState: CloudState = 'off';
  /** The cloud document as last read or written. */
  private remote: CloudBody | null = null;
  /** The cloud has been read this session, so writing to it is allowed. */
  private cloudReady = false;
  private reading: Promise<CloudBody | null> | null = null;
  private pending: string | null = null;
  private written: string | null = null;
  private writing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastCloudWrite = 0;
  private cloudSavedAt: number | null = null;
  private device = true;
  private lastLocal: { text: string; meta: SaveMeta } | null = null;
  /** The latest generation known to this device or the cloud (0: never replaced on purpose). */
  private resetAt = 0;
  /** The generation of the save on this device. */
  private localGen = 0;
  /** Every save load() found, so one with more progress than the one started from is kept as a backup. */
  private found: string[] = [];
  /** The cloud had not answered when the game started: no cloud writes until its answer is weighed. */
  private deciding = false;
  /** The cloud's late answer, once the game must switch to it (see onLateSave). */
  private late: { text: string | null } | null = null;
  private lateListener: ((text: string | null) => void) | null = null;
  /** Set once the game is switching saves: nothing more is written. */
  private stopped = false;
  /** Set when this version could not read the player's save (see hold). */
  private held = false;
  private best: Backup | null = null;

  constructor(
    private readonly local: KeyValueStore,
    private readonly connect: () => Promise<CloudDoc | null>,
    private readonly opts: SaveStoreOptions,
  ) {}

  private get prevKey(): string {
    return `${this.opts.key}.prev`;
  }

  private get genKey(): string {
    return `${this.opts.key}.resetAt`;
  }

  /** The saves to start from, best first (see rank). Waits up to waitMs for the cloud. */
  async load(): Promise<Candidate[]> {
    this.device = await this.local.probe();
    const localText = await this.local.get(this.opts.key);
    const localMeta = metaOf(localText);
    if (localText && localMeta) this.lastLocal = { text: localText, meta: localMeta };
    this.localGen = Number(await this.local.get(this.genKey)) || 0;
    this.resetAt = this.localGen;

    this.cloudState = 'connecting';
    this.reading = this.readCloud();
    const first = await Promise.race([this.reading, sleep(this.opts.waitMs).then(() => 'timeout' as const)]);

    const list: Candidate[] = [];
    if (localText && localMeta) list.push({ text: localText, source: 'device', meta: localMeta, gen: this.localGen });
    if (first === 'timeout') {
      this.deciding = true;
      void this.reading.then(() => this.afterLateRead());
    } else if (first?.save) {
      const meta = metaOf(first.save) ?? { savedAt: first.savedAt, lifetime: first.lifetime, release: first.release };
      list.push({ text: first.save, source: 'cloud', meta, gen: first.resetAt ?? 0 });
    }
    this.found = list.map((c) => c.text);
    await this.refreshBackup();
    const ranked = rank(list, this.resetAt);
    // A device save that isn't even JSON goes last, so the game still keeps it aside.
    if (localText && !localMeta) ranked.push({ text: localText, source: 'device', meta: { savedAt: 0, lifetime: 0, release: 1 }, gen: this.localGen });
    return ranked;
  }

  private async readCloud(): Promise<CloudBody | null> {
    try {
      this.cloud = await this.connect();
      if (!this.cloud) {
        this.cloudState = 'off';
        return null;
      }
      let data: Record<string, unknown> | null;
      try {
        data = await this.cloud.get();
      } catch (e) {
        if (isFatal(e)) throw e;
        await sleep(400 + Math.random() * 600);
        data = await this.cloud.get();
      }
      this.remote = asBody(data);
      this.resetAt = Math.max(this.resetAt, this.remote?.resetAt ?? 0);
      this.cloudReady = true;
      this.cloudState = 'synced';
      this.cloudSavedAt = this.remote?.savedAt || null;
      return this.remote;
    } catch {
      this.cloudState = 'error';
      return null;
    }
  }

  /**
   * The cloud answered after the game had started without it (from this device's save, or a new
   * game). Decided before anything else can run, so the game in progress can't reach the cloud first.
   */
  private async afterLateRead(): Promise<void> {
    if (!this.cloudReady || this.stopped) {
      this.deciding = false;
      return void (await this.refreshBackup());
    }
    const cloudText = this.remote?.save || null;
    const cloudMeta = metaOf(cloudText);
    const here: Candidate[] = this.lastLocal ? [{ ...this.lastLocal, source: 'device', gen: this.localGen }] : [];
    const there: Candidate[] = cloudText && cloudMeta ? [{ text: cloudText, meta: cloudMeta, source: 'cloud', gen: this.remote?.resetAt ?? 0 }] : [];
    const best = rank([...here, ...there], this.resetAt)[0];
    let switchTo: string | null | undefined;
    if (best?.source === 'cloud') {
      if (cloudText !== this.lastLocal?.text) switchTo = cloudText; // the cloud's save is better
    } else if (!best && here.length > 0) switchTo = null; // the save in play was reset on another device
    if (switchTo !== undefined) {
      this.stopped = true; // the game in progress must never reach the cloud
      this.pending = null;
      this.deciding = false;
      this.late = { text: switchTo };
      this.lateListener?.(switchTo);
      return;
    }
    this.deciding = false;
    await this.refreshBackup();
    this.schedule();
  }

  /**
   * The save the game started from, so a later save with less progress is caught and backed up.
   * Any other save load() found with more progress (one replaced on purpose elsewhere, or one this
   * version could not read) is kept as a backup.
   */
  started(text: string | null): void {
    const meta = metaOf(text);
    this.lastLocal = text && meta ? { text, meta } : null;
    for (const other of this.found) {
      const m = metaOf(other);
      if (other !== text && m && m.lifetime > (meta?.lifetime ?? 0)) this.keepBackup(other);
    }
  }

  /** Stops all saving for this session: this version can't read the player's save and must not overwrite it. */
  hold(): void {
    this.stopped = true;
    this.held = true;
    this.pending = null;
  }

  /**
   * Called if the cloud answers after the game started with a save to switch to: a better save, or
   * null when the save in play was reset on another device (start a new game).
   */
  onLateSave(listener: (text: string | null) => void): void {
    this.lateListener = listener;
    if (this.late) listener(this.late.text);
  }

  /** Saves to this device now and queues the cloud copy. */
  save(text: string): void {
    if (this.stopped) return;
    const meta = metaOf(text);
    if (!meta) return;
    if (this.lastLocal && meta.lifetime < this.lastLocal.meta.lifetime) this.keepBackup(this.lastLocal.text);
    void this.local.set(this.opts.key, text);
    if (this.localGen !== this.resetAt) this.setLocalGen(this.resetAt);
    this.lastLocal = { text, meta };
    this.pending = text;
    this.schedule();
  }

  /** Writes the latest save to the cloud now (the game was hidden, or something big happened). */
  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.push();
  }

  /**
   * The player replaces their save on purpose (import, restoring a backup): it becomes the save
   * everywhere, even with less progress, and saves from before it stop counting. Call before reloading.
   */
  async replace(text: string): Promise<void> {
    this.stopped = true;
    const meta = metaOf(text);
    if (!meta) return;
    if (this.lastLocal && meta.lifetime < this.lastLocal.meta.lifetime) this.keepBackup(this.lastLocal.text);
    this.newGeneration();
    await this.local.set(this.opts.key, text);
    await this.whenReadable();
    if (this.localGen < this.resetAt) this.newGeneration(); // the cloud knew a later one
    await this.writeCloud(text);
  }

  /** Takes the cloud's answer onto this device (see onLateSave; null starts a new game). Call before reloading. */
  async adopt(text: string | null): Promise<void> {
    this.stopped = true;
    const meta = metaOf(text);
    if (this.lastLocal && (!meta || meta.lifetime < this.lastLocal.meta.lifetime)) this.keepBackup(this.lastLocal.text);
    if (text) await this.local.set(this.opts.key, text);
    else await this.local.remove(this.opts.key);
    this.setLocalGen(this.resetAt);
  }

  /** Erases progress (reset). The erased save stays restorable as a backup. */
  async clear(): Promise<void> {
    this.stopped = true;
    const current = this.lastLocal?.text ?? this.remote?.save ?? null;
    if (current) this.keepBackup(current);
    this.newGeneration();
    await this.local.remove(this.opts.key);
    await this.whenReadable();
    if (this.localGen < this.resetAt) this.newGeneration(); // the cloud knew a later one
    if (this.cloud && this.cloudReady) {
      await this.idle();
      const prev = this.bestOf(this.bestOf(this.remote?.save ?? null, this.remote?.prev ?? null), current);
      const body: CloudBody = { save: '', savedAt: Date.now(), lifetime: 0, release: 1, resetAt: this.resetAt, ...(prev ? { prev } : {}) };
      try {
        await this.cloud.set(body as unknown as Record<string, unknown>);
        this.remote = body;
      } catch {
        /* the cloud keeps the old save; this device's newer generation still wins here, and is uploaded next time */
      }
    }
  }

  /** Keeps a save that failed to load, instead of letting the new game overwrite it. */
  async keepUnreadable(text: string): Promise<void> {
    await this.local.set(`${this.opts.key}.unreadable.${Date.now()}`, text);
  }

  /** The backup with the most progress, if any. */
  backup(): Backup | null {
    return this.best;
  }

  status(): SaveStatus {
    return { device: this.device, cloud: this.cloudState, cloudSavedAt: this.cloudSavedAt, held: this.held };
  }

  // ---------- internals ----------

  /** A deliberate replacement: a generation above every one known, whatever this device's clock says. */
  private newGeneration(): void {
    this.resetAt = Math.max(Date.now(), this.resetAt + 1);
    this.setLocalGen(this.resetAt);
  }

  private setLocalGen(gen: number): void {
    this.localGen = gen;
    void this.local.set(this.genKey, String(gen));
  }

  private keepBackup(text: string): void {
    const better = this.bestOf(text, this.best?.text ?? null);
    if (better === text) {
      void this.local.set(this.prevKey, text);
      const meta = metaOf(text);
      if (meta) this.best = { text, meta };
    }
  }

  /** Of two saves, the one with more progress. */
  private bestOf(a: string | null, b: string | null): string | null {
    const ma = metaOf(a);
    const mb = metaOf(b);
    if (!ma) return mb ? b : null;
    if (!mb) return a;
    return ma.lifetime >= mb.lifetime ? a : b;
  }

  private async refreshBackup(): Promise<void> {
    const text = this.bestOf(this.bestOf(await this.local.get(this.prevKey), this.remote?.prev ?? null), this.best?.text ?? null);
    const meta = metaOf(text);
    this.best = text && meta ? { text, meta } : null;
  }

  /** Waits (a little) for the first cloud read, so a reset or import isn't undone by a cloud copy. */
  private async whenReadable(): Promise<void> {
    if (this.reading && !this.cloudReady) await Promise.race([this.reading, sleep(5000)]);
  }

  private async idle(): Promise<void> {
    while (this.writing) await sleep(50);
  }

  private schedule(): void {
    if (!this.cloudReady || this.deciding || this.stopped || this.timer || this.writing) return;
    if (this.pending === null || this.pending === this.written || !this.opts.visible()) return;
    const wait = Math.max(0, this.lastCloudWrite + this.opts.cloudEveryMs - Date.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push();
    }, wait);
  }

  private async push(): Promise<void> {
    if (this.stopped || this.deciding || this.writing || this.pending === null || this.pending === this.written) return;
    await this.writeCloud(this.pending);
    this.schedule();
  }

  private async writeCloud(text: string): Promise<void> {
    if (!this.cloud || !this.cloudReady) return;
    await this.idle();
    const meta = metaOf(text);
    if (!meta) return;
    const body: CloudBody = { save: text, savedAt: meta.savedAt, lifetime: meta.lifetime, release: meta.release };
    if (this.resetAt > 0) body.resetAt = this.resetAt;
    // Keep the cloud's best older save while it still has more progress than this one.
    const prev = this.bestOf(this.remote?.save ?? null, this.remote?.prev ?? null);
    const prevMeta = metaOf(prev);
    if (prev && prevMeta && prevMeta.lifetime > meta.lifetime) body.prev = prev;
    this.writing = true;
    this.cloudState = 'saving';
    try {
      await this.cloud.set(body as unknown as Record<string, unknown>);
      this.remote = body;
      this.written = text;
      if (body.prev && this.bestOf(body.prev, this.best?.text ?? null) === body.prev) this.best = { text: body.prev, meta: metaOf(body.prev)! };
      this.cloudSavedAt = Date.now();
      this.cloudState = 'synced';
    } catch (e) {
      this.cloudState = 'error';
      if (isFatal(e)) this.cloudReady = false;
    } finally {
      this.lastCloudWrite = Date.now();
      this.writing = false;
    }
  }
}
