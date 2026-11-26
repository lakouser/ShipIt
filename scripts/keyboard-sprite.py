#!/usr/bin/env python3
"""Cuts the key sounds out of a recording of the player's own mechanical keyboard.

Usage: python3 scripts/keyboard-sprite.py <recording> [--check]
Needs ffmpeg and numpy. Writes src/assets/keyboard.wav (every clip in one file, 32 kHz mono) and
src/ui/keyboard-sprite.ts (where each clip starts and how long it is).

The clips were picked from the 56 s recording by finding every keystroke (about 660), then keeping
the cleanest: loud, unclipped presses that are a single decaying transient (no other key under them
for the whole clip), each paired with the quiet release of the same key 60-140 ms later, checked the
same way; the two presses with the most low end (spacebar-like) for crits; and short natural runs of
four keys for rewards. The times below are those picks (seconds into the recording), with how long
each stays clean.
--check prints each clip's level instead of writing files.
"""
import pathlib
import subprocess
import sys

import numpy as np

SR = 48_000
OUT_SR = 32_000  # the recording has nothing above 16 kHz (AAC), so 32 kHz loses nothing
ROOT = pathlib.Path(__file__).resolve().parent.parent

# (press onset, clean length, release onset, clean length) of the same keystroke.
PAIRS = [
    (17.2885, 0.079, 17.3740, 0.050), (17.8790, 0.065, 18.0165, 0.031),
    (19.7535, 0.062, 19.8215, 0.041), (27.0585, 0.071, 27.1615, 0.050),
    (33.9120, 0.071, 34.0035, 0.050), (34.4020, 0.063, 34.4710, 0.041),
    (35.7305, 0.078, 35.8150, 0.050), (37.5265, 0.069, 37.6560, 0.039),
]
# Heavier presses (the most low end): crits. (onset, clean length)
HEAVY = [(3.3085, 0.100), (39.1875, 0.083)]
# Runs of four quick keystrokes: rewards. (first onset, end)
RUNS = [(29.9925, 30.2150), (26.5520, 26.8450), (7.5640, 8.0400)]

PRE = 0.003  # keep 3 ms before each onset so the attack is whole
GAP = 0.015  # silence between clips in the file


def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def highpass(x: np.ndarray, hz: float = 80.0) -> np.ndarray:
    """Second-order Butterworth high-pass: removes the room rumble under the recording."""
    w = 2 * np.pi * hz / SR
    alpha = np.sin(w) / np.sqrt(2)
    cw = np.cos(w)
    b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
    a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        out = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, out
        y[i] = out
    return y


def cut(x: np.ndarray, onset: float, length: float, fade_out: float) -> np.ndarray:
    """onset-PRE .. onset+length, filtered, with a 2 ms fade in and a raised-cosine fade out."""
    pad = int(0.05 * SR)  # lets the filter settle before the clip starts
    s, e = int((onset - PRE) * SR), int((onset + length) * SR)
    clip = highpass(x[s - pad:e])[pad:]
    n_in, n_out = int(0.002 * SR), int(fade_out * SR)
    clip[:n_in] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n_in))
    clip[-n_out:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_out))
    return clip


def body_rms(clip: np.ndarray, ms: float = 25) -> float:
    s = int(PRE * SR)
    return float(np.sqrt(np.mean(clip[s:s + int(ms / 1000 * SR)] ** 2)))


def main() -> None:
    x = decode(sys.argv[1])
    presses = [cut(x, p, n, min(0.035, n / 2)) for p, n, _, _ in PAIRS]
    releases = [cut(x, r, n, min(0.025, n * 0.6)) for _, _, r, n in PAIRS]
    heavy = [cut(x, t, n, 0.04) for t, n in HEAVY]
    runs = [cut(x, a, b - a, 0.04) for a, b in RUNS]

    # Even out the levels: every press at the median press level (keystrokes vary by ±6 dB in the
    # recording), releases at the median release-to-press ratio, heavy presses 3 dB above presses,
    # and each run with its loudest key at press level.
    target = float(np.median([body_rms(c) for c in presses]))
    ratio = float(np.median([body_rms(r, 15) / body_rms(p) for p, r in zip(presses, releases)]))
    presses = [c * target / body_rms(c) for c in presses]
    releases = [c * target * ratio / body_rms(c, 15) for c in releases]
    heavy = [c * target * 1.41 / body_rms(c) for c in heavy]

    def loudest_key(c: np.ndarray) -> float:
        w = int(0.025 * SR)
        return max(float(np.sqrt(np.mean(c[i:i + w] ** 2))) for i in range(0, len(c) - w, int(0.005 * SR)))

    runs = [c * target / loudest_key(c) for c in runs]
    groups = {'press': presses, 'release': releases, 'heavy': heavy, 'runs': runs}
    peak = max(float(np.abs(c).max()) for g in groups.values() for c in g)
    scale = 0.89 / peak  # loudest sample at -1 dBFS

    if '--check' in sys.argv:
        for name, g in groups.items():
            print(name, [f'{20 * np.log10(body_rms(c * scale, 15 if name == "release" else 25) + 1e-9):.1f}' for c in g])
        print('release/press ratio', f'{20 * np.log10(ratio):.1f} dB', 'scale', f'{20 * np.log10(scale):.1f} dB')
        return

    parts, manifest, at = [np.zeros(int(GAP * SR))], {}, GAP
    for name, g in groups.items():
        manifest[name] = []
        for c in g:
            manifest[name].append((round(at, 4), round(len(c) / SR, 4)))
            parts += [c * scale, np.zeros(int(GAP * SR))]
            at += len(c) / SR + GAP
    audio = np.concatenate(parts).astype(np.float32)
    wav = ROOT / 'src/assets/keyboard.wav'
    wav.parent.mkdir(exist_ok=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-ar', str(OUT_SR), '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', str(wav)],
                   input=audio.tobytes(), check=True)
    fmt = lambda clips: '[' + ', '.join(f'[{s}, {d}]' for s, d in clips) + ']'
    ts = (
        '// Generated by scripts/keyboard-sprite.py from a recording of the player\'s own mechanical keyboard.\n'
        '// Re-run the script to change the cut; don\'t edit by hand.\n\n'
        '/** [start, duration] in seconds within keyboard.wav. press[i] and release[i] are the same keystroke. */\n'
        'export const KEYBOARD_CLIPS = {\n'
        + ''.join(f'  {name}: {fmt(clips)},\n' for name, clips in manifest.items())
        + '} as const satisfies Record<string, readonly (readonly [number, number])[]>;\n'
    )
    (ROOT / 'src/ui/keyboard-sprite.ts').write_text(ts)
    print(f'wrote {wav.relative_to(ROOT)} ({wav.stat().st_size // 1024} KB, {at:.2f} s) and src/ui/keyboard-sprite.ts')


if __name__ == '__main__':
    main()
