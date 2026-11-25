import type { CloudDoc, KeyValueStore } from './types';

/**
 * Where saves live. Every save goes to this device straight away and, where the host offers one
 * (the Claude artifact database today), to a copy in the player's account about once a minute and
 * whenever the game is hidden. Browser storage alone is not enough: some views drop it (the Claude
 * phone app lost a player's save this way).
 *
 * Rules that keep a save from being lost:
 * - The cloud copy is read before anything is written to it, so a stand-in new game started while
 *   the cloud was slow can never overwrite it. If the cloud answers late with a newer save, the
 *   game is told (onLateSave) and switches to it.
 * - The game starts from whichever save is newer, this device's or the cloud's.
 * - Writing a save with less progress than the one it replaces (a reset, an import, another device)
 *   keeps the old one as a backup, on this device and in the cloud, which the player can restore.
 * - A save that fails to load is kept aside instead of being overwritten.
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
}

export type CloudState = 'off' | 'connecting' | 'synced' | 'saving' | 'error';

export interface SaveStatus {
  /** This device's storage works. */
  device: boolean;
  cloud: CloudState;
  /** When the cloud last confirmed a save (ms), if this session wrote or read one. */
  cloudSavedAt: number | null;
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
  };
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
  /** The save this session started from, when the cloud had not answered yet. */
  private bootMeta: SaveMeta | null = null;
  private lateText: string | null = null;
  private lateListener: ((text: string) => void) | null = null;
  /** Set once the game is switching saves: nothing more is written. */
  private stopped = false;
  private best: Backup | null = null;

  constructor(
    private readonly local: KeyValueStore,
    private readonly connect: () => Promise<CloudDoc | null>,
    private readonly opts: SaveStoreOptions,
  ) {}

  private get prevKey(): string {
    return `${this.opts.key}.prev`;
  }

  /** The saves to start from, newest first. Waits up to waitMs for the cloud. */
  async load(): Promise<Candidate[]> {
    this.device = await this.local.probe();
    const localText = await this.local.get(this.opts.key);
    const localMeta = metaOf(localText);
    if (localText && localMeta) this.lastLocal = { text: localText, meta: localMeta };

    this.cloudState = 'connecting';
    this.reading = this.readCloud();
    const first = await Promise.race([this.reading, sleep(this.opts.waitMs).then(() => 'timeout' as const)]);

    const list: Candidate[] = [];
    if (localText) list.push({ text: localText, source: 'device', meta: localMeta ?? { savedAt: 0, lifetime: 0, release: 1 } });
    if (first === 'timeout') {
      this.bootMeta = localMeta;
      void this.reading.then(() => this.afterLateRead());
    } else if (first?.save) {
      list.push({ text: first.save, source: 'cloud', meta: metaOf(first.save) ?? { savedAt: first.savedAt, lifetime: first.lifetime, release: first.release } });
    }
    await this.refreshBackup();
    return list.sort((a, b) => b.meta.savedAt - a.meta.savedAt);
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
      this.cloudReady = true;
      this.cloudState = 'synced';
      this.cloudSavedAt = this.remote?.savedAt || null;
      return this.remote;
    } catch {
      this.cloudState = 'error';
      return null;
    }
  }

  /** The cloud answered after the game had started from this device's save. */
  private async afterLateRead(): Promise<void> {
    await this.refreshBackup();
    if (!this.cloudReady) return;
    const cloudMeta = metaOf(this.remote?.save);
    if (this.remote?.save && cloudMeta && cloudMeta.savedAt > (this.bootMeta?.savedAt ?? -1)) {
      this.stopped = true; // the stand-in game must never reach the cloud
      this.pending = null;
      this.lateText = this.remote.save;
      this.lateListener?.(this.lateText);
    } else this.schedule();
  }

  /** The save the game started from, so a later save with less progress is caught and backed up. */
  started(text: string | null): void {
    const meta = metaOf(text);
    this.lastLocal = text && meta ? { text, meta } : null;
  }

  /** Called if a newer save arrives from the cloud after the game started. */
  onLateSave(listener: (text: string) => void): void {
    this.lateListener = listener;
    if (this.lateText) listener(this.lateText);
  }

  /** Saves to this device now and queues the cloud copy. */
  save(text: string): void {
    if (this.stopped) return;
    const meta = metaOf(text);
    if (!meta) return;
    if (this.lastLocal && meta.lifetime < this.lastLocal.meta.lifetime) this.keepBackup(this.lastLocal.text);
    void this.local.set(this.opts.key, text);
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

  /** Replaces the save everywhere (import, restoring a backup, a newer cloud save). Call before reloading. */
  async replace(text: string): Promise<void> {
    this.stopped = true;
    const meta = metaOf(text);
    if (this.lastLocal && meta && meta.lifetime < this.lastLocal.meta.lifetime) this.keepBackup(this.lastLocal.text);
    await this.local.set(this.opts.key, text);
    await this.whenReadable();
    if (this.remote?.save !== text) await this.writeCloud(text);
  }

  /** Erases progress (reset). The erased save stays restorable as a backup. */
  async clear(): Promise<void> {
    this.stopped = true;
    const current = this.lastLocal?.text ?? this.remote?.save;
    if (current) this.keepBackup(current);
    await this.local.remove(this.opts.key);
    await this.whenReadable();
    if (this.cloud && this.cloudReady && this.remote?.save) {
      await this.idle();
      try {
        await this.cloud.set({ save: '', savedAt: Date.now(), lifetime: 0, release: 1, prev: this.bestOf(this.remote.save, this.remote.prev ?? null) ?? this.remote.save });
      } catch {
        /* the cloud keeps the old save; it will win on the next load, which is the safe failure */
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
    return { device: this.device, cloud: this.cloudState, cloudSavedAt: this.cloudSavedAt };
  }

  // ---------- internals ----------

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
    if (!this.cloudReady || this.stopped || this.timer || this.writing) return;
    if (this.pending === null || this.pending === this.written || !this.opts.visible()) return;
    const wait = Math.max(0, this.lastCloudWrite + this.opts.cloudEveryMs - Date.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push();
    }, wait);
  }

  private async push(): Promise<void> {
    if (this.stopped || this.writing || this.pending === null || this.pending === this.written) return;
    await this.writeCloud(this.pending);
    this.schedule();
  }

  private async writeCloud(text: string): Promise<void> {
    if (!this.cloud || !this.cloudReady) return;
    await this.idle();
    const meta = metaOf(text);
    if (!meta) return;
    const body: CloudBody = { save: text, savedAt: meta.savedAt, lifetime: meta.lifetime, release: meta.release };
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
