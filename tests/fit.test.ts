import { describe, expect, it } from 'vitest';
import { fitFor } from '../src/ui/fit';

describe('layout fit', () => {
  it('sizes the layout by the room the game gets, not the screen', () => {
    // An iPhone 16 Pro in the Claude app: 874pt tall, 727pt left after the toolbar and home indicator.
    expect(fitFor(874)).toBe('roomy');
    expect(fitFor(727)).toBe('short');
    expect(fitFor(800)).toBe('short');
    expect(fitFor(801)).toBe('roomy');
  });

  it('marks tiny pages as short too, so they get both sets of trims', () => {
    expect(fitFor(640).split(' ')).toEqual(['short', 'tiny']);
    expect(fitFor(520).split(' ')).toContain('short');
  });
});
