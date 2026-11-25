import type { IconId } from '../core/content';

const PATHS: Record<IconId, string> = {
  kb: '<rect x="2.5" y="7" width="19" height="10" rx="2"/><path stroke-width="2.6" d="M6.5 10.5h.01M9.5 10.5h.01M12.5 10.5h.01M15.5 10.5h.01M18 10.5h.01"/><path d="M7.5 14h9"/>',
  vim: '<path d="M4.5 5h4l3.5 9 3.5-9h4L13.6 19h-3.2z"/>',
  mon: '<rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M9 20h6M12 16v4"/><path stroke="#ff9a84" d="M7 8.5h5M7 11.5h8"/>',
  snip: '<path d="M8.5 4C6.5 4 6 5 6 7v2c0 1.3-.7 2.2-2 2.9 1.3.7 2 1.6 2 2.9v2c0 2 .5 3 2.5 3M15.5 4c2 0 2.5 1 2.5 3v2c0 1.3.7 2.2 2 2.9-1.3.7-2 1.6-2 2.9v2c0 2-.5 3-2.5 3"/>',
  duck: '<circle cx="9.5" cy="7.6" r="3.3" fill="#f5c84b" stroke="none"/><path fill="#f5c84b" stroke="none" d="M3.6 14.3c0-2 1.5-3.2 3.6-3.2h8.6c2.4 0 4.3-1.2 5-3 .8 5-1.8 11-9.6 11-4.6 0-7.6-2-7.6-4.8z"/><path fill="#ff6a3d" stroke="none" d="M6.4 7.2 3.2 8.1l3.2.9z"/><circle cx="9" cy="6.9" r=".8" fill="#0c1915" stroke="none"/>',
  intern: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/><path stroke="#7fd3e6" d="M8.6 6.4c1-1.8 5.8-1.8 6.8 0"/>',
  lint: '<path d="M12 3l7 3v5c0 5-3 8.2-7 10-4-1.8-7-5-7-10V6z"/><path stroke="#86dba8" d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
  ci: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  pair: '<circle cx="8" cy="9" r="2.8"/><circle cx="16" cy="9" r="2.8"/><path d="M3 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5M11 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5"/>',
  gen: '<path d="M4 7h7M4 12h9M4 17h6"/><path stroke="#ffd27a" d="M15 8.5l4.5 3.5-4.5 3.5"/>',
};

export const icon = (id: IconId): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[id]}</svg>`;

/** Top-down beetle walking right; the leg group wiggles via CSS. */
export const BUG_SVG =
  '<svg viewBox="0 0 34 28" aria-hidden="true"><g class="legs" stroke="#2a0f0a" stroke-width="2" stroke-linecap="round"><path d="M12 8l-2-5M17 7V2M22 8l2-5M12 20l-2 5M17 21v5M22 20l2 5"/></g><ellipse cx="17" cy="14" rx="9.5" ry="7.5" fill="#ff5a4f"/><path d="M8 14h18" stroke="#2a0f0a" stroke-width="1.6"/><circle cx="13" cy="10.6" r="1.5" fill="#2a0f0a"/><circle cx="20" cy="17.6" r="1.5" fill="#2a0f0a"/><circle cx="27.5" cy="14" r="4" fill="#2a0f0a"/><path d="M30 11l3-4M30 17l3 4" stroke="#2a0f0a" stroke-width="1.6" stroke-linecap="round"/></svg>';
