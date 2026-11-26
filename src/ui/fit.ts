/**
 * How tall a phone layout the page has room for. A media query on the viewport can't tell: the Claude
 * app pads the page by its status bar, toolbar and home indicator (about 150px on a phone), so the
 * viewport reads as a tall screen while the game gets much less. The stacked rows then outgrew the
 * page and squeezed the tmux bar off the bottom. This measures the box the game really gets instead.
 *
 * Returned as the tokens for `.app[data-fit]`: "short" trims the optional rows, "tiny" (which is
 * also short) drops more of them.
 */
export function fitFor(height: number): string {
  if (height <= 640) return 'short tiny';
  if (height <= 800) return 'short';
  return 'roomy';
}

/** Keeps `data-fit` on the layout up to date as the window or the host's insets change. */
export function watchFit(app: HTMLElement): void {
  const apply = (): void => {
    const fit = fitFor(app.clientHeight);
    if (app.dataset.fit !== fit) app.dataset.fit = fit;
  };
  apply();
  if (typeof ResizeObserver === 'function') new ResizeObserver(apply).observe(app);
  else window.addEventListener('resize', apply);
}
