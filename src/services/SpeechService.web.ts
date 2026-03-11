/**
 * SpeechService (Web version)
 *
 * Uses browser's Web Speech Synthesis API for high-quality text-to-speech.
 * Automatically selects the best quality voice available.
 */

import type { AppSettings } from '../types';

// ── Internal state ────────────────────────────────────────────────────────────

let lastSpoken = '';
let lastSpokenAt = 0;
const MIN_REPEAT_INTERVAL_MS = 1500;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Voice cache
let voicesLoaded = false;
let preferredVoice: SpeechSynthesisVoice | null = null;

// ── Voice Selection ───────────────────────────────────────────────────────────

/**
 * Select the best quality English voice available.
 * Priority:
 * 1. Google UK/US English voices (highest quality)
 * 2. Microsoft/Apple high-quality voices
 * 3. Any local English voice
 * 4. Default voice
 */
function selectBestVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Prioritize quality voices
  const qualityPriority = [
    'Google UK English Female',
    'Google UK English Male',
    'Google US English Female',
    'Google US English Male',
    'Microsoft David - English (United States)',
    'Microsoft Zira - English (United States)',
    'Samantha', // Apple US English
    'Daniel', // Apple UK English
    'Alex', // Apple US English
  ];

  // Try to find a priority voice
  for (const name of qualityPriority) {
    const voice = voices.find(v => v.name === name);
    if (voice) return voice;
  }

  // Fall back to any English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en-'));
  if (englishVoice) return englishVoice;

  // Last resort: default voice
  return voices[0] || null;
}

// Load voices when available
function loadVoices() {
  if (voicesLoaded) return;

  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      preferredVoice = selectBestVoice();
      voicesLoaded = true;
    }
  }
}

// Initialize voice loading
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Speak text using browser's Web Speech API with high-quality voice.
 */
export async function speak(
  text: string,
  settings: Pick<AppSettings, 'ttsEnabled' | 'ttsVoice' | 'ttsRate' | 'ttsPitch'>,
): Promise<void> {
  const trimmed = text.trim();
  if (!settings.ttsEnabled || !trimmed) return;

  if (!('speechSynthesis' in window)) {
    console.warn('[SpeechService] Web Speech API not supported');
    return;
  }

  const now = Date.now();
  if (trimmed === lastSpoken && now - lastSpokenAt < MIN_REPEAT_INTERVAL_MS) {
    return; // suppress duplicate
  }

  lastSpoken = trimmed;
  lastSpokenAt = now;

  try {
    // Stop any ongoing speech
    await stopSpeaking();

    // Ensure voices are loaded
    loadVoices();

    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(trimmed);

    // Set voice (use best quality voice)
    if (preferredVoice) {
      currentUtterance.voice = preferredVoice;
    }

    // Voice settings for clarity
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = settings.ttsRate || 0.9; // Slightly slower for clarity
    currentUtterance.pitch = settings.ttsPitch || 1.0;
    currentUtterance.volume = 1.0; // Full volume

    // Error handling
    currentUtterance.onerror = (event) => {
      console.warn('[SpeechService] Speech error:', event);
    };

    // Speak
    window.speechSynthesis.speak(currentUtterance);
  } catch (err) {
    console.warn('[SpeechService] speak() error:', err);
  }
}

/** Stop any currently playing speech */
export async function stopSpeaking(): Promise<void> {
  if (!('speechSynthesis' in window)) return;

  try {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    currentUtterance = null;
  } catch (err) {
    console.warn('[SpeechService] stopSpeaking() error:', err);
  }
}

/** Returns available voice identifiers on web */
export async function getAvailableVoices(): Promise<any[]> {
  if (!('speechSynthesis' in window)) return [];

  try {
    loadVoices();
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

/** Returns true if TTS is currently active */
export async function isSpeaking(): Promise<boolean> {
  if (!('speechSynthesis' in window)) return false;

  try {
    return window.speechSynthesis.speaking;
  } catch {
    return false;
  }
}
