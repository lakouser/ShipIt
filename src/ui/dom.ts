export function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

/** Sets text only when it changed, so per-frame updates don't touch the DOM needlessly. */
export function setText(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** True when the device asks for reduced motion or the player turned it on in settings (html.rm). */
export const prefersReducedMotion = (): boolean =>
  document.documentElement.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
