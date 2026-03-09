/**
 * ASL Sign Dictionary
 *
 * Maps common ASL signs to their meanings for display and TTS.
 * Finger extension pattern: [thumb, index, middle, ring, pinky]
 * true = extended/open, false = folded/closed
 *
 * Reference: American Sign Language (ASL)
 */

import type { FingerState, GestureEntry } from '../types';

// ── Single-letter ASL alphabet ────────────────────────────────────────────────

export const ASL_ALPHABET: GestureEntry[] = [
  // A: closed fist, thumb rests on side of index
  { label: 'A', pattern: [true, false, false, false, false], description: 'Closed fist, thumb to side' },
  // B: all four fingers extended upward, thumb folded across palm
  { label: 'B', pattern: [false, true, true, true, true], description: 'Four fingers up, thumb folded' },
  // C: hand curves like a C (classified by partial extension — simplified rule)
  { label: 'C', pattern: [true, true, false, false, false], description: 'Curved C shape' },
  // D: index up, middle/ring/pinky curled, tip of thumb touches middle finger
  { label: 'D', pattern: [false, true, false, false, false], description: 'Index finger up' },
  // E: all fingers bent, thumb tucked
  { label: 'E', pattern: [false, false, false, false, false], description: 'All fingers bent (fist variant)' },
  // F: index and middle touch thumb; ring and pinky extended
  { label: 'F', pattern: [true, false, false, true, true], description: 'OK-like, ring & pinky out' },
  // G: index and thumb point horizontally
  { label: 'G', pattern: [true, true, false, false, false], description: 'Index & thumb horizontal' },
  // H: index and middle extended horizontally side by side
  { label: 'H', pattern: [false, true, true, false, false], description: 'Index and middle horizontal' },
  // I: pinky finger only extended upward
  { label: 'I', pattern: [false, false, false, false, true], description: 'Pinky up' },
  // K: index and middle up, thumb between them
  { label: 'K', pattern: [true, true, true, false, false], description: 'Index, middle, thumb up' },
  // L: index up, thumb out (L-shape)
  { label: 'L', pattern: [true, true, false, false, false], description: 'L shape — index up, thumb out' },
  // M: three fingers over thumb (fist-like)
  { label: 'M', pattern: [false, false, false, false, false], description: 'Three fingers over thumb' },
  // N: two fingers over thumb
  { label: 'N', pattern: [false, false, false, false, false], description: 'Two fingers over thumb' },
  // O: all fingers curved to meet thumb (O shape)
  { label: 'O', pattern: [true, false, false, false, false], description: 'O shape, all fingers curved' },
  // P: K hand pointing downward
  { label: 'P', pattern: [true, true, true, false, false], description: 'K shape pointing down' },
  // Q: G hand pointing downward
  { label: 'Q', pattern: [true, true, false, false, false], description: 'G shape pointing down' },
  // R: index and middle crossed
  { label: 'R', pattern: [false, true, true, false, false], description: 'Index and middle crossed' },
  // S: fist with thumb over fingers
  { label: 'S', pattern: [false, false, false, false, false], description: 'Fist, thumb over fingers' },
  // T: thumb between index and middle
  { label: 'T', pattern: [true, false, false, false, false], description: 'Thumb between index & middle' },
  // U: index and middle extended together
  { label: 'U', pattern: [false, true, true, false, false], description: 'Index and middle up together' },
  // V: index and middle in V shape (peace sign)
  { label: 'V', pattern: [false, true, true, false, false], description: 'Peace / Victory sign' },
  // W: index, middle, ring extended
  { label: 'W', pattern: [false, true, true, true, false], description: 'Three fingers up' },
  // X: index finger hooked/bent
  { label: 'X', pattern: [false, true, false, false, false], description: 'Index finger hooked' },
  // Y: thumb and pinky extended (shaka / hang-loose)
  { label: 'Y', pattern: [true, false, false, false, true], description: 'Thumb and pinky out' },
  // Z: index draws Z (movement — classified by initial pose)
  { label: 'Z', pattern: [false, true, false, false, false], description: 'Index pointing, draws Z' },
];

// ── Numbers ───────────────────────────────────────────────────────────────────

export const ASL_NUMBERS: GestureEntry[] = [
  { label: '1', pattern: [false, true, false, false, false], description: 'Index up' },
  { label: '2', pattern: [false, true, true, false, false], description: 'Index and middle up' },
  { label: '3', pattern: [true, true, true, false, false], description: 'Thumb, index, middle' },
  { label: '4', pattern: [false, true, true, true, true], description: 'Four fingers up' },
  { label: '5', pattern: [true, true, true, true, true], description: 'All fingers open' },
  { label: '6', pattern: [true, true, true, true, false], description: 'Pinky down' },
  { label: '7', pattern: [true, true, true, false, true], description: 'Ring down' },
  { label: '8', pattern: [true, true, false, true, true], description: 'Middle down' },
  { label: '9', pattern: [true, false, true, true, true], description: 'Index down' },
  { label: '10', pattern: [true, false, false, false, false], description: 'Thumb up' },
];

// ── Common words / phrases ────────────────────────────────────────────────────

export const COMMON_PHRASES: Record<string, string> = {
  HELLO: 'Hello',
  THANK_YOU: 'Thank you',
  YES: 'Yes',
  NO: 'No',
  PLEASE: 'Please',
  HELP: 'Help',
  LOVE: 'I love you',
  WATER: 'Water',
  FOOD: 'Food',
  HOME: 'Home',
  BATHROOM: 'Bathroom',
  MORE: 'More',
  STOP: 'Stop',
  GOOD: 'Good',
  BAD: 'Bad',
  SORRY: 'Sorry',
  UNDERSTAND: 'I understand',
  REPEAT: 'Repeat please',
  SLOW: 'Slower please',
  FAST: 'Faster please',
  NAME: "What's your name?",
  HOW: 'How are you?',
  FINE: 'I am fine',
  WHERE: 'Where',
  WHAT: 'What',
  WHEN: 'When',
  WHO: 'Who',
  WHY: 'Why',
};

// ── Two-letter sequences that spell common words ──────────────────────────────

export const WORD_SHORTCUTS: Record<string, string> = {
  HI: 'Hi',
  OK: 'Okay',
  NO: 'No',
  GO: 'Go',
  DO: 'Do',
  UP: 'Up',
  ME: 'Me',
  WE: 'We',
  MY: 'My',
};

// Pattern key encoder for lookup (converts FingerState to string key)
export function encodePattern(pattern: FingerState): string {
  return pattern.map((v) => (v ? '1' : '0')).join('');
}

// Build a lookup map from pattern key → best label
// Priority: Numbers > Alphabet
export function buildPatternLookup(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of ASL_ALPHABET) {
    const key = encodePattern(entry.pattern);
    if (!map.has(key)) {
      map.set(key, entry.label);
    }
  }
  for (const entry of ASL_NUMBERS) {
    const key = encodePattern(entry.pattern);
    map.set(key, entry.label); // numbers override letters
  }
  return map;
}
