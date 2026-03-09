/**
 * useSignDetection
 *
 * React hook that manages real-time sign language detection from
 * camera frames.
 *
 * Returns:
 *   - translationState: current detected sign, word, sentence
 *   - startDetection / stopDetection
 *   - clearSentence
 *   - isDetecting
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranslationState } from '../types';
import * as SignLanguageService from '../services/SignLanguageService';
import type { CapturedFrame } from '../services/SignLanguageService';

// Time (ms) a sign must remain stable before being committed to the word
const COMMIT_STABLE_MS = 600;
// Space sign: thumb + index extended while all others folded = space bar
const SPACE_SIGN = ' ';
// Clear sign pattern: all 5 fingers extended = clear
const CLEAR_SIGN = '5';

const INITIAL_STATE: TranslationState = {
  currentSign: '',
  currentWord: '',
  fullSentence: '',
  confidence: 0,
  isDetecting: false,
};

export function useSignDetection(
  settings: { ttsEnabled: boolean; autoSpeak: boolean; detectionSensitivity: number },
) {
  const [state, setState] = useState<TranslationState>(INITIAL_STATE);

  // Internal tracking refs (don't trigger re-renders)
  const lastSignRef = useRef('');
  const stableStartRef = useRef(0);
  const committedLettersRef = useRef<string[]>([]);
  const wordRef = useRef('');
  const sentenceRef = useRef('');

  const handleDetectedSign = useCallback(
    (detected: { sign: string; confidence: number; timestamp: number }) => {
      if (detected.confidence < settings.detectionSensitivity) return;

      const sign = detected.sign;

      setState((prev) => ({
        ...prev,
        currentSign: sign,
        confidence: detected.confidence,
      }));

      const now = Date.now();

      if (sign !== lastSignRef.current) {
        lastSignRef.current = sign;
        stableStartRef.current = now;
        return;
      }

      // Sign is stable — commit if held long enough
      if (now - stableStartRef.current < COMMIT_STABLE_MS) return;

      // Reset the stable timer so we don't double-commit
      stableStartRef.current = now + COMMIT_STABLE_MS * 10;

      if (sign === SPACE_SIGN || sign === ' ') {
        // Commit current word to sentence
        if (wordRef.current.trim()) {
          sentenceRef.current = (sentenceRef.current + ' ' + wordRef.current).trim();
          wordRef.current = '';
          committedLettersRef.current = [];
          setState((prev) => ({
            ...prev,
            currentWord: '',
            fullSentence: sentenceRef.current,
          }));
        }
      } else if (sign === CLEAR_SIGN) {
        // Clear everything
        wordRef.current = '';
        sentenceRef.current = '';
        committedLettersRef.current = [];
        setState((prev) => ({
          ...prev,
          currentWord: '',
          fullSentence: '',
        }));
      } else if (/^[A-Z0-9]$/.test(sign)) {
        // Append letter to word
        wordRef.current += sign;
        committedLettersRef.current.push(sign);
        setState((prev) => ({
          ...prev,
          currentWord: wordRef.current,
        }));
      }
    },
    [settings.detectionSensitivity],
  );

  const startDetecting = useCallback(async () => {
    setState((prev) => ({ ...prev, isDetecting: true }));
    await SignLanguageService.startDetection(handleDetectedSign);
  }, [handleDetectedSign]);

  const stopDetecting = useCallback(() => {
    SignLanguageService.stopDetection();
    setState((prev) => ({ ...prev, isDetecting: false, currentSign: '' }));
  }, []);

  const clearSentence = useCallback(() => {
    wordRef.current = '';
    sentenceRef.current = '';
    committedLettersRef.current = [];
    setState((prev) => ({
      ...prev,
      currentSign: '',
      currentWord: '',
      fullSentence: '',
      confidence: 0,
    }));
  }, []);

  /** Feed a captured camera frame to the detection pipeline */
  const processFrame = useCallback(async (frame: CapturedFrame) => {
    await SignLanguageService.processFrame(frame);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      SignLanguageService.stopDetection();
    };
  }, []);

  return {
    translationState: state,
    startDetecting,
    stopDetecting,
    clearSentence,
    processFrame,
    isDetecting: state.isDetecting,
  };
}
