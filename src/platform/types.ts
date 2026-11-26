/**
 * Everything the game needs from the device. The web build implements it with
 * browser APIs; a Capacitor (iOS/Android) or Tauri (desktop) build adds its own
 * implementation without touching game or UI code.
 */
export interface Platform {
  readonly id: 'web' | 'ios' | 'android' | 'desktop';
  readonly storage: KeyValueStore;
  /** A copy of the save kept outside this device (the player's account), or null where there is none. */
  cloud(): Promise<CloudDoc | null>;
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
  /** True if values written now can be read back (false in some private or embedded views). */
  probe(): Promise<boolean>;
}

/** One document in the player's own storage. Rejections carry a { code } (see saves.ts). */
export interface CloudDoc {
  /** The document as the store confirms it (null when there is none). May take a while; never a cached guess. */
  get(): Promise<Record<string, unknown> | null>;
  set(data: Record<string, unknown>): Promise<void>;
  /**
   * Every confirmed change after the first read: this game's own writes coming back, and those of the
   * game open in other tabs or on other devices, which write the same document.
   */
  watch?(listener: (data: Record<string, unknown> | null) => void): void;
}

export interface Haptics {
  readonly supported: boolean;
  /** A light tick for each key press. */
  tap(): void;
  /** A stronger pulse for rewards (bug squashed, sprint merged). */
  success(): void;
}
