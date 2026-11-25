import type { Platform } from './types';
import { webPlatform } from './web';

export type { Platform } from './types';

/**
 * Picks the platform implementation. Today there is only the web one.
 * When the game is wrapped with Capacitor, add a capacitor.ts implementation
 * (Preferences for storage, Haptics plugin, App state events) and return it here
 * when Capacitor.isNativePlatform() is true.
 */
export function getPlatform(): Platform {
  return webPlatform;
}
