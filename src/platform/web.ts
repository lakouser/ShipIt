import { connectClaudeDb } from './claude';
import type { KeyValueStore, Platform } from './types';

/** localStorage can be missing or throw (private mode, sandboxed frames), so every call is guarded. */
const storage: KeyValueStore = {
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage full or unavailable: the game keeps running unsaved */
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  async probe() {
    try {
      const key = 'shipit.probe';
      localStorage.setItem(key, '1');
      const ok = localStorage.getItem(key) === '1';
      localStorage.removeItem(key);
      return ok;
    } catch {
      return false;
    }
  },
};

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const webPlatform: Platform = {
  id: 'web',
  storage,
  cloud: () => connectClaudeDb('shipit'),
  haptics: {
    supported: canVibrate,
    tap: () => {
      if (canVibrate) navigator.vibrate(6);
    },
    success: () => {
      if (canVibrate) navigator.vibrate([12, 40, 18]);
    },
  },
  onHide(listener) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) listener();
    });
    window.addEventListener('pagehide', listener);
  },
  isVisible: () => !document.hidden,
};
