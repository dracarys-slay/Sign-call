/**
 * Tests for src/context/SettingsContext.tsx
 *
 * AsyncStorage is mocked with an in-memory store so tests run without a
 * native environment. The module is mocked before any imports so all
 * SettingsContext calls see the mock.
 *
 * NOTE: jest.mock() is hoisted above const declarations by Babel, so mock
 * functions must be created via jest.fn() *inside* the factory and then
 * retrieved via jest.requireMock() — not captured via closure from outer scope.
 *
 * Tests verify:
 *  - DEFAULT_SETTINGS are used when AsyncStorage is empty
 *  - Persisted settings are loaded and merged with defaults on mount
 *  - updateSetting: updates a single key in memory
 *  - replaceSettings: atomically updates memory and persists to AsyncStorage
 *  - saveSettings: persists current memory settings
 *  - resetSettings: reverts to defaults and persists
 *  - Corrupt AsyncStorage data is silently ignored
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

// ── AsyncStorage mock ─────────────────────────────────────────────────────────
// An in-memory store that satisfies the SettingsContext requirements.
// Functions are created inside the factory so jest.mock hoisting doesn't
// cause them to be undefined when the factory runs.

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      asyncStorageStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete asyncStorageStore[key];
      return Promise.resolve();
    }),
  },
}));

// Retrieve mock functions after hoisting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockedAsyncStorage = jest.requireMock('@react-native-async-storage/async-storage').default as Record<string, jest.Mock>;
const mockGetItem    = MockedAsyncStorage.getItem;
const mockSetItem    = MockedAsyncStorage.setItem;

// ── Import module under test (after mock) ─────────────────────────────────────
import { SettingsProvider, useSettings, DEFAULT_SETTINGS } from './SettingsContext';
import type { AppSettings } from '../types';

// ── Helper ────────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

const STORAGE_KEY = '@sign_call_settings';

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Clear in-memory store before each test
  Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
});

describe('SettingsProvider — initial load', () => {
  it('starts with DEFAULT_SETTINGS when AsyncStorage is empty', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    // Wait for async storage load
    await act(async () => {});
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.isLoading).toBe(false);
  });

  it('merges persisted settings over defaults when AsyncStorage has data', async () => {
    const partial: Partial<AppSettings> = { signLanguage: 'BSL', ttsRate: 1.2, userName: 'Alice' };
    asyncStorageStore[STORAGE_KEY] = JSON.stringify(partial);

    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    expect(result.current.settings.signLanguage).toBe('BSL');
    expect(result.current.settings.ttsRate).toBe(1.2);
    expect(result.current.settings.userName).toBe('Alice');
    // Keys not in partial stay at default
    expect(result.current.settings.ttsEnabled).toBe(DEFAULT_SETTINGS.ttsEnabled);
  });

  it('falls back to defaults and does not throw on corrupt AsyncStorage data', async () => {
    asyncStorageStore[STORAGE_KEY] = 'NOT_VALID_JSON{{{';

    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets isLoading=false even when AsyncStorage rejects', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage unavailable'));

    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('updateSetting', () => {
  it('updates a single string setting in memory', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.updateSetting('userName', 'Bob');
    });

    expect(result.current.settings.userName).toBe('Bob');
  });

  it('updates a boolean setting in memory', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.updateSetting('ttsEnabled', false);
    });

    expect(result.current.settings.ttsEnabled).toBe(false);
  });

  it('updates a numeric setting in memory', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.updateSetting('ttsRate', 1.5);
    });

    expect(result.current.settings.ttsRate).toBe(1.5);
  });

  it('does NOT persist to AsyncStorage immediately', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    mockSetItem.mockClear();
    act(() => {
      result.current.updateSetting('ttsPitch', 0.8);
    });

    // No persistence without an explicit save
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('persists the updated value when saveSettings is called after updateSetting', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.updateSetting('signLanguage', 'BSL');
    });

    mockSetItem.mockClear();
    await act(async () => {
      await result.current.saveSettings();
    });

    // The persisted JSON must contain the updated value
    expect(mockSetItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"signLanguage":"BSL"'),
    );
  });
});

describe('replaceSettings', () => {
  it('atomically replaces all settings in memory', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    const next: AppSettings = { ...DEFAULT_SETTINGS, userName: 'Carol', ttsRate: 0.6, signLanguage: 'ISL' };

    await act(async () => {
      await result.current.replaceSettings(next);
    });

    expect(result.current.settings).toEqual(next);
  });

  it('persists the full new settings object to AsyncStorage', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    const next: AppSettings = { ...DEFAULT_SETTINGS, userName: 'Dave' };
    await act(async () => {
      await result.current.replaceSettings(next);
    });

    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(next));
  });

  it('subsequent read from storage reflects the replaced settings', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    const next: AppSettings = { ...DEFAULT_SETTINGS, ttsVoice: 'en-US-neural' };
    await act(async () => {
      await result.current.replaceSettings(next);
    });

    // Simulate app restart by reading what was written
    const stored = JSON.parse(asyncStorageStore[STORAGE_KEY]);
    expect(stored.ttsVoice).toBe('en-US-neural');
  });
});

describe('saveSettings', () => {
  it('persists in-memory settings to AsyncStorage', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.updateSetting('detectionSensitivity', 0.7);
    });

    mockSetItem.mockClear();
    await act(async () => {
      await result.current.saveSettings();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"detectionSensitivity":0.7'),
    );
  });

  it('does not throw when AsyncStorage.setItem rejects', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('quota exceeded'));
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.saveSettings();
      }),
    ).resolves.not.toThrow();
  });
});

describe('resetSettings', () => {
  it('reverts all in-memory settings to DEFAULT_SETTINGS', async () => {
    // Pre-load some custom settings
    asyncStorageStore[STORAGE_KEY] = JSON.stringify({ ...DEFAULT_SETTINGS, userName: 'Eve', ttsRate: 1.5 });

    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    // Confirm non-default values were loaded
    expect(result.current.settings.userName).toBe('Eve');

    await act(async () => {
      await result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('persists DEFAULT_SETTINGS to AsyncStorage', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    mockSetItem.mockClear();
    await act(async () => {
      await result.current.resetSettings();
    });

    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  });

  it('does not throw when AsyncStorage.setItem rejects during reset', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('unavailable'));
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.resetSettings();
      }),
    ).resolves.not.toThrow();
  });
});
