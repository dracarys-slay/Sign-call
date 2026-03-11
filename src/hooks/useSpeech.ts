/**
 * useSpeech
 *
 * React hook for text-to-speech functionality.
 * Surfaces speak/stop actions and tracks speaking state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { speak, stopSpeaking, getAvailableVoices } from '../services/SpeechService';
import type { AppSettings } from '../types';
import * as Speech from 'expo-speech';

export function useSpeech(settings: AppSettings) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const isMounted = useRef(true);

  // Load available voices on mount
  useEffect(() => {
    isMounted.current = true;
    getAvailableVoices().then((voices) => {
      if (isMounted.current) setAvailableVoices(voices);
    });
    return () => {
      isMounted.current = false;
      stopSpeaking();
    };
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      if (!settings.ttsEnabled) return;
      setIsSpeaking(true);
      try {
        await speak(text, {
          ttsEnabled: settings.ttsEnabled,
          ttsVoice: settings.ttsVoice,
          ttsRate: settings.ttsRate,
          ttsPitch: settings.ttsPitch,
        });
      } finally {
        if (isMounted.current) setIsSpeaking(false);
      }
    },
    [settings],
  );

  const stopSpeech = useCallback(async () => {
    await stopSpeaking();
    if (isMounted.current) setIsSpeaking(false);
  }, []);

  return { speakText, stopSpeech, isSpeaking, availableVoices };
}
