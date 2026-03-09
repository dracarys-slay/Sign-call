/**
 * SpeechService
 *
 * Wraps expo-speech to provide text-to-speech for translated signs.
 * Supports:
 *   - Speaking individual letters / words
 *   - Speaking full sentences
 *   - Voice configuration (rate, pitch, voice identifier)
 *   - De-duplicating rapid consecutive identical calls
 */

import * as Speech from 'expo-speech';
import type { AppSettings } from '../types';

// ── Internal state ────────────────────────────────────────────────────────────

let lastSpoken = '';
let lastSpokenAt = 0;
const MIN_REPEAT_INTERVAL_MS = 1500; // don't repeat same text faster than this

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Speak text using the current settings.
 * Silently no-ops if ttsEnabled is false or text is blank.
 */
export async function speak(
  text: string,
  settings: Pick<AppSettings, 'ttsEnabled' | 'ttsVoice' | 'ttsRate' | 'ttsPitch'>,
): Promise<void> {
  const trimmed = text.trim();
  if (!settings.ttsEnabled || !trimmed) return;

  const now = Date.now();
  if (trimmed === lastSpoken && now - lastSpokenAt < MIN_REPEAT_INTERVAL_MS) {
    return; // suppress duplicate
  }

  lastSpoken = trimmed;
  lastSpokenAt = now;

  try {
    // Stop any ongoing speech before starting new
    await stopSpeaking();

    Speech.speak(trimmed, {
      language: 'en-US',
      pitch: settings.ttsPitch,
      rate: settings.ttsRate,
      voice: settings.ttsVoice || undefined,
      onError: (err) => {
        console.warn('[SpeechService] Speech error:', err);
      },
    });
  } catch (err) {
    console.warn('[SpeechService] speak() error:', err);
  }
}

/** Stop any currently playing speech */
export async function stopSpeaking(): Promise<void> {
  try {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      Speech.stop();
    }
  } catch {
    // ignore
  }
}

/** Returns available voice identifiers on this device */
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  try {
    return await Speech.getAvailableVoicesAsync();
  } catch {
    return [];
  }
}

/** Returns true if TTS is currently active */
export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
