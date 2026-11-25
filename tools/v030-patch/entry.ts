// What the v0.3.0 build gets from this repo (see README.md): the save fix and the keyboard sounds.
export { connectClaudeDb } from '../../src/platform/claude';
export { SaveStore } from '../../src/platform/saves';
export { createKeySounds } from '../../src/ui/sound';

/** True for a save written by a newer save format than `version` (the build must not overwrite it). */
export function isNewerSave(text: string, version: number): boolean {
  try {
    const data: unknown = JSON.parse(text);
    return typeof data === 'object' && data !== null && typeof (data as { v?: unknown }).v === 'number' && (data as { v: number }).v > version;
  } catch {
    return false;
  }
}
