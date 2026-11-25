import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import wavDataUrl from '../src/assets/keyboard.wav?inline';
import { KEYBOARD_CLIPS as CLIPS } from '../src/ui/keyboard-sprite';
import { createKeySounds } from '../src/ui/sound';

type Played = { offset: number; duration: number; rate: number; gain: number };
let played: Played[] = [];

/** Just enough Web Audio to see which clip plays, at what pitch and level. */
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createGain() {
    return { gain: { value: 1 }, connect: (n: unknown) => n };
  }
  createBufferSource() {
    const src = {
      buffer: null as unknown,
      playbackRate: { value: 1 },
      out: null as null | { gain: { value: number } },
      connect(node: { gain: { value: number } }) {
        src.out = node;
        return node;
      },
      start: (_when: number, offset: number, duration: number) => played.push({ offset, duration, rate: src.playbackRate.value, gain: src.out!.gain.value }),
    };
    return src;
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 2.5 });
  }
  resume() {}
}

const g = globalThis as Record<string, unknown>;
const settle = () => new Promise((r) => setTimeout(r, 0));
const clipOf = (p: Played) => [p.offset, p.duration];

beforeEach(() => {
  played = [];
  g.AudioContext = FakeAudioContext;
  g.OfflineAudioContext = FakeAudioContext;
  g.window = globalThis;
  g.fetch = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ['AudioContext', 'OfflineAudioContext', 'window', 'fetch']) delete g[k];
});

describe('key sounds from the recording', () => {
  it('plays a press, then that same keystroke\'s release at the same pitch', async () => {
    const keys = createKeySounds();
    keys.preload();
    await settle();
    keys.press();
    keys.release();
    expect(played).toHaveLength(2);
    const i = CLIPS.press.findIndex((c) => c[0] === played[0]!.offset);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(clipOf(played[1]!)).toEqual([...CLIPS.release[i]!]);
    expect(played[1]!.rate).toBe(played[0]!.rate);
    expect(played[0]!.rate).toBeGreaterThanOrEqual(0.97);
    expect(played[0]!.rate).toBeLessThanOrEqual(1.03);
  });

  it('never plays the same press twice in a row', async () => {
    const keys = createKeySounds();
    keys.preload();
    await settle();
    for (let n = 0; n < 200; n++) keys.press();
    for (let n = 1; n < played.length; n++) expect(played[n]!.offset).not.toBe(played[n - 1]!.offset);
    expect(new Set(played.map((p) => p.offset)).size).toBe(CLIPS.press.length); // and uses them all
  });

  it('uses the heavy press for crits and a run of keys for rewards', async () => {
    const keys = createKeySounds();
    keys.preload();
    await settle();
    keys.press(true);
    keys.run();
    expect(CLIPS.heavy.some((c) => c[0] === played[0]!.offset)).toBe(true);
    expect(CLIPS.runs.some((c) => c[0] === played[1]!.offset)).toBe(true);
  });

  it('plays no release without a press, or long after one', async () => {
    const keys = createKeySounds();
    keys.preload();
    await settle();
    keys.release();
    expect(played).toHaveLength(0);
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    keys.press();
    now.mockReturnValue(5000);
    keys.release();
    expect(played).toHaveLength(1);
  });

  it('the very first press waits for the file, but is dropped if it would come late', async () => {
    let finish!: () => void;
    g.fetch = vi.fn(() => new Promise((r) => (finish = () => r({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))));
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const keys = createKeySounds();
    keys.press();
    finish();
    await settle();
    expect(played).toHaveLength(1); // loaded quickly: plays
    const slow = createKeySounds();
    slow.press();
    now.mockReturnValue(1500);
    finish();
    await settle();
    expect(played).toHaveLength(1); // half a second late: skipped
  });

  it('a stroke is a press followed by its release', async () => {
    vi.useFakeTimers();
    const keys = createKeySounds();
    keys.preload();
    await vi.advanceTimersByTimeAsync(0);
    keys.stroke();
    await vi.advanceTimersByTimeAsync(120);
    vi.useRealTimers();
    const i = CLIPS.press.findIndex((c) => c[0] === played[0]!.offset);
    expect(clipOf(played[1]!)).toEqual([...CLIPS.release[i]!]);
  });
});

describe('the sound file', () => {
  // keyboard.wav: 16-bit mono PCM; every clip sits where keyboard-sprite.ts says, with silence between.
  const bytes = Uint8Array.from(atob(wavDataUrl.slice(wavDataUrl.indexOf(',') + 1)), (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const rate = view.getUint32(24, true);
  let dataAt = 12;
  while (String.fromCharCode(...bytes.slice(dataAt, dataAt + 4)) !== 'data') dataAt += 8 + view.getUint32(dataAt + 4, true);
  const samples = new Int16Array(bytes.buffer.slice(dataAt + 8));
  const level = (from: number, to: number) => {
    let max = 0;
    for (let i = Math.floor(from * rate); i < Math.floor(to * rate); i++) max = Math.max(max, Math.abs(samples[i] ?? 0));
    return max / 32768;
  };
  const all = Object.values(CLIPS).flat().sort((a, b) => a[0] - b[0]);

  it('is 16-bit mono and holds every clip', () => {
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    expect(all.at(-1)![0] + all.at(-1)![1]).toBeLessThanOrEqual(samples.length / rate);
    expect(CLIPS.press.length).toBe(CLIPS.release.length);
  });

  it('has a keystroke at the start of each clip and silence between clips', () => {
    for (const [start] of all) expect(level(start, start + 0.012)).toBeGreaterThan(0.05);
    for (let n = 1; n < all.length; n++) {
      const end = all[n - 1]![0] + all[n - 1]![1];
      expect(all[n]![0]).toBeGreaterThan(end);
      expect(level(end + 0.003, all[n]![0] - 0.001)).toBeLessThan(0.002);
    }
  });
});
