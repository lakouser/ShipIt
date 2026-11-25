/**
 * Everything the game needs from the device. The web build implements it with
 * browser APIs; a Capacitor (iOS/Android) or Tauri (desktop) build adds its own
 * implementation without touching game or UI code.
 */
export interface Platform {
  readonly id: 'web' | 'ios' | 'android' | 'desktop';
  readonly storage: KeyValueStore;
  readonly haptics: Haptics;
  /** Called when the app goes to the background or the tab is hidden: the moment to save. */
  onHide(listener: () => void): void;
  /** True while the game is on screen. */
  isVisible(): boolean;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Haptics {
  readonly supported: boolean;
  /** A light tick for each key press. */
  tap(): void;
  /** A stronger pulse for rewards (bug squashed, sprint merged). */
  success(): void;
}
