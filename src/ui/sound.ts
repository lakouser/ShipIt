import spriteUrl from '../assets/keyboard.wav?url';
import { KEYBOARD_CLIPS as CLIPS } from './keyboard-sprite';

/** Key sounds cut from a recording of the player's own mechanical keyboard (see scripts/keyboard-sprite.py). */
export interface KeySounds {
  /** Fetches and decodes the recording ahead of the first press. Plays nothing, so needs no gesture. */
  preload(): void;
  /** A key going down; heavy (the spacebar-like press) for a crit. */
  press(heavy?: boolean): void;
  /** That key coming back up: the release of the oldest press still down. */
  release(): void;
  /** A quick run of keystrokes, for rewards. */
  run(): void;
  /** A whole keystroke, press then release, for other buttons. */
  stroke(): void;
}

type Clip = readonly [start: number, duration: number];

/** Overall level: about as loud as the old synthesised thock. */
const VOLUME = 0.5;
/** A press arriving later than this (the very first one, while the file loads) is skipped. */
const LATE_MS = 150;
/** A release long after its press (sound switched off meanwhile, a missed key-up) is not played. */
const HELD_MS = 3000;

/** A random index, never the same as last time, so fast typing doesn't machine-gun one clip. */
function pick(count: number, last: number): number {
  if (count < 2) return 0;
  const i = Math.floor(Math.random() * (count - 1));
  return i >= last ? i + 1 : i;
}

export function createKeySounds(): KeySounds {
  let ctx: AudioContext | null = null;
  let buffer: AudioBuffer | null = null;
  let loading: Promise<AudioBuffer | null> | null = null;
  const last = { press: -1, heavy: -1, run: -1 };
  /** Presses still down, oldest first: which release to play and at what pitch. */
  const held: { release: number; rate: number; at: number }[] = [];

  function load(): Promise<AudioBuffer | null> {
    loading ??= fetch(spriteUrl)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`keyboard sounds: ${r.status}`))))
      // An offline context decodes without a user gesture; the buffer then plays in any context.
      .then((bytes) => (ctx ?? new OfflineAudioContext(1, 1, 48_000)).decodeAudioData(bytes))
      .then((b) => (buffer = b))
      .catch(() => {
        loading = null; // try again on the next press
        return null;
      });
    return loading;
  }

  function play(clip: Clip, gain: number, rate: number): void {
    try {
      ctx ??= new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      const asked = performance.now();
      const start = (buf: AudioBuffer | null) => {
        if (!buf || !ctx || performance.now() - asked > LATE_MS) return;
        const src = ctx.createBufferSource();
        const level = ctx.createGain();
        src.buffer = buf;
        src.playbackRate.value = rate;
        level.gain.value = gain * VOLUME;
        src.connect(level).connect(ctx.destination);
        src.start(ctx.currentTime, clip[0], clip[1]);
      };
      if (buffer) start(buffer);
      else void load().then(start);
    } catch {
      /* no audio available */
    }
  }

  /** Small differences in pitch and level between presses, as a real hand makes. */
  const rate = () => 0.97 + Math.random() * 0.06;
  const gain = () => 0.85 + Math.random() * 0.15;

  const sounds: KeySounds = {
    preload: () => void load(),
    press(heavy = false) {
      const r = rate();
      let release: number;
      if (heavy) {
        last.heavy = pick(CLIPS.heavy.length, last.heavy);
        play(CLIPS.heavy[last.heavy]!, 1, r);
        release = Math.floor(Math.random() * CLIPS.release.length);
      } else {
        last.press = pick(CLIPS.press.length, last.press);
        play(CLIPS.press[last.press]!, gain(), r);
        release = last.press; // the same keystroke's own release
      }
      held.push({ release, rate: r, at: performance.now() });
      if (held.length > 16) held.shift();
    },
    release() {
      const h = held.shift();
      if (h && performance.now() - h.at < HELD_MS) play(CLIPS.release[h.release]!, gain(), h.rate);
    },
    run() {
      last.run = pick(CLIPS.runs.length, last.run);
      play(CLIPS.runs[last.run]!, 1, 1);
    },
    stroke() {
      sounds.press();
      window.setTimeout(() => sounds.release(), 70 + Math.random() * 30);
    },
  };
  return sounds;
}
