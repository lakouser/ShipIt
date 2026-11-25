/** A short synthesised key "thock". Audio can only start after a user gesture, so the context is created lazily. */
export function createClicker(): { click(): void } {
  let ctx: AudioContext | null = null;
  return {
    click() {
      try {
        ctx ??= new AudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(170 + Math.random() * 50, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.05);
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      } catch {
        /* no audio available */
      }
    },
  };
}
