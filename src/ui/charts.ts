/** Braille block characters (U+2800 to U+28FF): each draws a 2×4 grid of dots. */
const BRAILLE_BASE = 0x2800;
/** Dot bits by column (left, right), bottom row last. */
const DOTS = [
  [1, 2, 4, 64],
  [8, 16, 32, 128],
];

/** A bar chart of `values` (0–1) drawn in braille: two bars per character, `rows` characters tall (4 dots each). */
export function brailleBars(values: number[], rows: number): string[] {
  const height = rows * 4;
  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let i = 0; i < values.length; i += 2) {
      let bits = 0;
      for (let col = 0; col < 2; col++) {
        const v = values[i + col];
        if (v === undefined) continue;
        const f = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
        const dots = f > 0 ? Math.max(1, Math.round(f * height)) : 0;
        for (let d = 0; d < 4; d++) if ((rows - 1 - row) * 4 + (3 - d) < dots) bits |= DOTS[col][d];
      }
      line += String.fromCharCode(BRAILLE_BASE + bits);
    }
    lines.push(line);
  }
  return lines;
}

/** A meter as pipes: `||||||    ` (at least one pipe for anything above zero). */
export function pipeMeter(fraction: number, width = 16): { on: string; off: string } {
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const n = f > 0 ? Math.max(1, Math.round(f * width)) : 0;
  return { on: '|'.repeat(n), off: ' '.repeat(width - n) };
}
