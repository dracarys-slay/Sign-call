/**
 * SettingsContext
 *
 * Provides app-wide user settings via React Context.
 * Settings are persisted to AsyncStorage so they survive app restarts.
 *
 * Usage:
 *   // In a component:
 *   const { settings, updateSetting, saveSettings } = useSettings();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '../types';

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  signLanguage: 'ASL',
  ttsEnabled: true,
  ttsVoice: '',
  ttsRate: 0.9,
  ttsPitch: 1.0,
  translationDisplayDuration: 3000,
  autoSpeak: true,
  userName: '',
  showLandmarks: false,
  detectionSensitivity: 0.45,
};

const STORAGE_KEY = '@sign_call_settings';

// ── Context shape ──────────────────────────────────────────────────────────────

interface SettingsContextValue {
  /** Current settings (merged defaults + persisted overrides) */
  settings: AppSettings;
  /** True while the initial load from AsyncStorage is in progress */
  isLoading: boolean;
  /** Update a single setting in memory (does NOT persist until saveSettings) */
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  /** Atomically replace all settings in memory AND persist to AsyncStorage */
  replaceSettings: (next: AppSettings) => Promise<void>;
  /** Persist the current in-memory settings to AsyncStorage */
  saveSettings: () => Promise<void>;
  /** Reset settings to factory defaults and persist */
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  updateSetting: () => undefined,
  replaceSettings: async () => undefined,
  saveSettings: async () => undefined,
  resetSettings: async () => undefined,
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref always in sync with the latest settings so callbacks
  // that have no settings in their dep array still write the freshest value.
  const settingsRef = React.useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load persisted settings once on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<AppSettings>;
            // Merge with defaults so new keys added in future versions are present
            setSettings((prev) => ({ ...prev, ...parsed }));
          } catch {
            // Corrupt data — fall back to defaults silently
          }
        }
      })
      .catch(() => {
        // Storage not available (e.g. Jest) — use in-memory defaults
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /**
   * Atomically replace all settings in memory AND persist.
   * Use this for bulk updates (e.g. saving the full SettingsScreen draft)
   * to avoid the stale-closure problem of calling updateSetting() n times
   * then saveSettings() — which would persist the pre-update value.
   */
  const replaceSettings = useCallback(async (next: AppSettings) => {
    setSettings(next);
    settingsRef.current = next;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('[SettingsContext] Failed to persist settings:', err);
    }
  }, []);

  /**
   * Persist the current in-memory settings.
   * Reads from settingsRef so it always captures the latest state even
   * when called in the same render cycle as state updates.
   */
  const saveSettings = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsRef.current));
    } catch (err) {
      console.warn('[SettingsContext] Failed to persist settings:', err);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    settingsRef.current = DEFAULT_SETTINGS;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (err) {
      console.warn('[SettingsContext] Failed to reset settings:', err);
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, isLoading, updateSetting, replaceSettings, saveSettings, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
