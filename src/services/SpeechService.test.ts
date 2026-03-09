/**
 * Tests for src/services/SpeechService.ts
 *
 * expo-speech is mocked by jest-expo's setup (ExpoSpeech native module stub).
 * We additionally mock the high-level 'expo-speech' JS module so we can
 * assert exactly which functions are called with which arguments.
 *
 * NOTE: jest.mock() is hoisted above const declarations by Babel, so mock
 * functions must be created via jest.fn() *inside* the factory and then
 * retrieved with jest.requireMock() rather than captured via closure.
 */

import type { AppSettings } from '../types';

// ── Mock expo-speech before importing the module under test ───────────────────

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
  getAvailableVoicesAsync: jest.fn().mockResolvedValue([]),
}));

// Import AFTER jest.mock so the module sees the mock
import { speak, stopSpeaking, getAvailableVoices, isSpeaking } from './SpeechService';

// Retrieve the mock functions from the hoisted mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockedSpeech = jest.requireMock('expo-speech') as Record<string, jest.Mock>;
const mockSpeak              = MockedSpeech.speak;
const mockStop               = MockedSpeech.stop;
const mockIsSpeakingAsync    = MockedSpeech.isSpeakingAsync;
const mockGetAvailableVoicesAsync = MockedSpeech.getAvailableVoicesAsync;

// ── Shared test settings ──────────────────────────────────────────────────────

const ENABLED_SETTINGS: Pick<AppSettings, 'ttsEnabled' | 'ttsVoice' | 'ttsRate' | 'ttsPitch'> = {
  ttsEnabled: true,
  ttsVoice: '',
  ttsRate: 1.0,
  ttsPitch: 1.0,
};

const DISABLED_SETTINGS: typeof ENABLED_SETTINGS = {
  ...ENABLED_SETTINGS,
  ttsEnabled: false,
};

// ── speak() ───────────────────────────────────────────────────────────────────

describe('speak', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSpeakingAsync.mockResolvedValue(false);
  });

  it('calls Speech.speak with correct arguments when TTS is enabled', async () => {
    await speak('Hello', ENABLED_SETTINGS);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith(
      'Hello',
      expect.objectContaining({
        language: 'en-US',
        pitch: 1.0,
        rate: 1.0,
      }),
    );
  });

  it('does not call Speech.speak when ttsEnabled is false', async () => {
    await speak('Hello', DISABLED_SETTINGS);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('does not call Speech.speak for blank text', async () => {
    await speak('   ', ENABLED_SETTINGS);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('does not call Speech.speak for empty string', async () => {
    await speak('', ENABLED_SETTINGS);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('passes the ttsVoice when set', async () => {
    await speak('TTS voice test', { ...ENABLED_SETTINGS, ttsVoice: 'com.apple.voice.compact.en-US.Samantha' });
    expect(mockSpeak).toHaveBeenCalledWith(
      'TTS voice test',
      expect.objectContaining({ voice: 'com.apple.voice.compact.en-US.Samantha' }),
    );
  });

  it('passes undefined for voice when ttsVoice is empty', async () => {
    await speak('Empty voice test', { ...ENABLED_SETTINGS, ttsVoice: '' });
    expect(mockSpeak).toHaveBeenCalledWith(
      'Empty voice test',
      expect.objectContaining({ voice: undefined }),
    );
  });

  it('trims whitespace before speaking', async () => {
    await speak('  Hello World  ', ENABLED_SETTINGS);
    expect(mockSpeak).toHaveBeenCalledWith('Hello World', expect.any(Object));
  });

  it('stops ongoing speech before starting a new utterance', async () => {
    mockIsSpeakingAsync.mockResolvedValue(true);
    await speak('New text', ENABLED_SETTINGS);
    expect(mockStop).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('suppresses duplicate text within MIN_REPEAT_INTERVAL_MS', async () => {
    await speak('Duplicate', ENABLED_SETTINGS);
    await speak('Duplicate', ENABLED_SETTINGS); // same text, immediate repeat
    // Speech.speak called only once
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('allows the same text again after MIN_REPEAT_INTERVAL_MS has elapsed', async () => {
    // Advance real Date.now() by spoofing it so the interval guard clears
    const realDateNow = Date.now.bind(Date);
    const MIN_INTERVAL = 1500; // matches SpeechService constant

    await speak('Expiry test', ENABLED_SETTINGS);
    expect(mockSpeak).toHaveBeenCalledTimes(1);

    // Simulate time passing beyond MIN_REPEAT_INTERVAL_MS
    jest.spyOn(Date, 'now').mockReturnValue(realDateNow() + MIN_INTERVAL + 1);

    await speak('Expiry test', ENABLED_SETTINGS); // same text, but after interval
    expect(mockSpeak).toHaveBeenCalledTimes(2);

    jest.restoreAllMocks();
  });
});

// ── stopSpeaking() ────────────────────────────────────────────────────────────

describe('stopSpeaking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls Speech.stop() when speech is in progress', async () => {
    mockIsSpeakingAsync.mockResolvedValue(true);
    await stopSpeaking();
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it('does NOT call Speech.stop() when nothing is speaking', async () => {
    mockIsSpeakingAsync.mockResolvedValue(false);
    await stopSpeaking();
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('does not throw if isSpeakingAsync rejects', async () => {
    mockIsSpeakingAsync.mockRejectedValue(new Error('unavailable'));
    await expect(stopSpeaking()).resolves.not.toThrow();
  });
});

// ── getAvailableVoices() ──────────────────────────────────────────────────────

describe('getAvailableVoices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the list of voices from expo-speech', async () => {
    const voices = [{ identifier: 'voice1', name: 'Voice One', language: 'en-US', quality: 1, isDefault: true }];
    mockGetAvailableVoicesAsync.mockResolvedValue(voices);
    const result = await getAvailableVoices();
    expect(result).toEqual(voices);
  });

  it('returns an empty array if getAvailableVoicesAsync rejects', async () => {
    mockGetAvailableVoicesAsync.mockRejectedValue(new Error('unavailable'));
    const result = await getAvailableVoices();
    expect(result).toEqual([]);
  });
});

// ── isSpeaking() ──────────────────────────────────────────────────────────────

describe('isSpeaking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true when speech is active', async () => {
    mockIsSpeakingAsync.mockResolvedValue(true);
    expect(await isSpeaking()).toBe(true);
  });

  it('returns false when speech is inactive', async () => {
    mockIsSpeakingAsync.mockResolvedValue(false);
    expect(await isSpeaking()).toBe(false);
  });

  it('returns false if isSpeakingAsync throws', async () => {
    mockIsSpeakingAsync.mockRejectedValue(new Error('fail'));
    expect(await isSpeaking()).toBe(false);
  });
});
