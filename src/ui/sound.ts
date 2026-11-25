import type { KeySound } from '../core/state';

interface Voice {
  type: OscillatorType;
  from: number;
  to: number;
  gain: number;
  ms: number;
}

/** Three switch types: a deep linear thock, a clicky blue switch, and a retro terminal beep. */
const VOICES: Record<KeySound, Voice> = {
  thock: { type: 'triangle', from: 190, to: 55, gain: 0.16, ms: 70 },
  click: { type: 'square', from: 2400, to: 900, gain: 0.05, ms: 25 },
  beep: { type: 'square', from: 880, to: 880, gain: 0.04, ms: 45 },
};

/** Synthesised key sounds. Audio can only start after a user gesture, so the context is created lazily. */
export function createClicker(): { click(kind: KeySound, accent?: boolean): void } {
  let ctx: AudioContext | null = null;
  return {
    click(kind, accent = false) {
      try {
        ctx ??= new AudioContext();
        const v = VOICES[kind];
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const pitch = (accent ? 1.5 : 1) * (0.92 + Math.random() * 0.16);
        osc.type = v.type;
        osc.frequency.setValueAtTime(v.from * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.to * pitch), t + v.ms / 1000);
        gain.gain.setValueAtTime(v.gain, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + v.ms / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + v.ms / 1000 + 0.01);
      } catch {
        /* no audio available */
      }
    },
  };
}
