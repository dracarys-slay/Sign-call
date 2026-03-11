/**
 * Tests for src/utils/signDictionary.ts
 *
 * Covers:
 *  - encodePattern: converts a FingerState to a 5-char binary string
 *  - buildPatternLookup: builds the pattern → label map with correct priority
 *  - ASL_ALPHABET / ASL_NUMBERS: data integrity checks
 *  - COMMON_PHRASES / WORD_SHORTCUTS: key/value presence checks
 */

import {
  ASL_ALPHABET,
  ASL_NUMBERS,
  COMMON_PHRASES,
  WORD_SHORTCUTS,
  buildPatternLookup,
  encodePattern,
} from './signDictionary';
import type { FingerState } from '../types';

// ── encodePattern ─────────────────────────────────────────────────────────────

describe('encodePattern', () => {
  it('encodes all-false pattern as "00000"', () => {
    const pattern: FingerState = [false, false, false, false, false];
    expect(encodePattern(pattern)).toBe('00000');
  });

  it('encodes all-true pattern as "11111"', () => {
    const pattern: FingerState = [true, true, true, true, true];
    expect(encodePattern(pattern)).toBe('11111');
  });

  it('encodes mixed pattern correctly (thumb + pinky)', () => {
    const pattern: FingerState = [true, false, false, false, true];
    expect(encodePattern(pattern)).toBe('10001');
  });

  it('encodes index-only pattern as "01000"', () => {
    const pattern: FingerState = [false, true, false, false, false];
    expect(encodePattern(pattern)).toBe('01000');
  });

  it('produces a 5-character string for every valid FingerState', () => {
    // All 32 possible 5-bit combinations
    for (let i = 0; i < 32; i++) {
      const pattern = [
        Boolean(i & 16),
        Boolean(i & 8),
        Boolean(i & 4),
        Boolean(i & 2),
        Boolean(i & 1),
      ] as FingerState;
      expect(encodePattern(pattern)).toHaveLength(5);
    }
  });
});

// ── ASL_ALPHABET ──────────────────────────────────────────────────────────────

describe('ASL_ALPHABET', () => {
  it('contains 25 entries (only J excluded — it requires motion)', () => {
    // J requires a drawing motion and cannot be represented by a static finger
    // extension pattern alone. All other 25 letters (including W) have entries.
    expect(ASL_ALPHABET.length).toBe(25);
  });

  it('every entry has a non-empty label, a 5-element pattern, and unique label', () => {
    const labels = new Set<string>();
    for (const entry of ASL_ALPHABET) {
      expect(entry.label).toBeTruthy();
      expect(entry.pattern).toHaveLength(5);
      expect(labels.has(entry.label)).toBe(false);
      labels.add(entry.label);
    }
  });

  it('pattern values are strictly boolean', () => {
    for (const entry of ASL_ALPHABET) {
      for (const bit of entry.pattern) {
        expect(typeof bit).toBe('boolean');
      }
    }
  });

  it('contains well-known canonical signs', () => {
    const labels = ASL_ALPHABET.map((e) => e.label);
    // A: closed fist (thumb only)
    const a = ASL_ALPHABET.find((e) => e.label === 'A');
    expect(a).toBeDefined();
    expect(a!.pattern).toEqual([true, false, false, false, false]);

    // B: four fingers up
    const b = ASL_ALPHABET.find((e) => e.label === 'B');
    expect(b).toBeDefined();
    expect(b!.pattern).toEqual([false, true, true, true, true]);

    // I: pinky only
    const i = ASL_ALPHABET.find((e) => e.label === 'I');
    expect(i).toBeDefined();
    expect(i!.pattern).toEqual([false, false, false, false, true]);

    // Y: thumb + pinky
    const y = ASL_ALPHABET.find((e) => e.label === 'Y');
    expect(y).toBeDefined();
    expect(y!.pattern).toEqual([true, false, false, false, true]);

    expect(labels).toContain('A');
    expect(labels).toContain('B');
    expect(labels).toContain('Y');
  });
});

// ── ASL_NUMBERS ───────────────────────────────────────────────────────────────

describe('ASL_NUMBERS', () => {
  it('contains exactly 10 entries (1–10)', () => {
    expect(ASL_NUMBERS).toHaveLength(10);
  });

  it('contains labels 1 through 10', () => {
    const labels = ASL_NUMBERS.map((e) => e.label);
    for (let n = 1; n <= 10; n++) {
      expect(labels).toContain(String(n));
    }
  });

  it('5 (open hand) pattern is all-true', () => {
    const five = ASL_NUMBERS.find((e) => e.label === '5');
    expect(five!.pattern).toEqual([true, true, true, true, true]);
  });

  it('1 (index up) has correct pattern', () => {
    const one = ASL_NUMBERS.find((e) => e.label === '1');
    expect(one!.pattern).toEqual([false, true, false, false, false]);
  });
});

// ── buildPatternLookup ────────────────────────────────────────────────────────

describe('buildPatternLookup', () => {
  let lookup: Map<string, string>;

  beforeEach(() => {
    lookup = buildPatternLookup();
  });

  it('returns a Map', () => {
    expect(lookup).toBeInstanceOf(Map);
  });

  it('maps "00001" (pinky only) to "I"', () => {
    expect(lookup.get('00001')).toBe('I');
  });

  it('maps "01111" to "4" — numbers override alphabet (B shares this pattern)', () => {
    // B and number 4 both have pattern [false, true, true, true, true].
    // Numbers take priority in buildPatternLookup so the result must be '4'.
    expect(lookup.get('01111')).toBe('4');
  });

  it('maps "01000" (index only) to "1" (numbers override letters)', () => {
    // Both D, X, Z and number 1 share the [false, true, false, false, false] pattern.
    // Numbers take priority in buildPatternLookup.
    expect(lookup.get('01000')).toBe('1');
  });

  it('maps "11111" (all fingers open) to "5"', () => {
    expect(lookup.get('11111')).toBe('5');
  });

  it('maps "10000" (thumb only) to "10" (number overrides A/O/T)', () => {
    // A, O, T all share [true, false, false, false, false] with number 10
    expect(lookup.get('10000')).toBe('10');
  });

  it('maps "00001" to "I" without being overridden by any number', () => {
    // No number shares the pinky-only pattern
    expect(lookup.get('00001')).toBe('I');
  });

  it('contains entries for all ASL_NUMBERS', () => {
    for (const entry of ASL_NUMBERS) {
      const key = encodePattern(entry.pattern);
      // Numbers override alphabet, so the value should be the number label
      expect(lookup.get(key)).toBe(entry.label);
    }
  });

  it('does not exceed 32 entries (5-bit patterns)', () => {
    expect(lookup.size).toBeLessThanOrEqual(32);
  });
});

// ── COMMON_PHRASES ────────────────────────────────────────────────────────────

describe('COMMON_PHRASES', () => {
  it('contains essential phrases', () => {
    expect(COMMON_PHRASES['HELLO']).toBe('Hello');
    expect(COMMON_PHRASES['THANK_YOU']).toBe('Thank you');
    expect(COMMON_PHRASES['YES']).toBe('Yes');
    expect(COMMON_PHRASES['NO']).toBe('No');
    expect(COMMON_PHRASES['HELP']).toBe('Help');
    expect(COMMON_PHRASES['STOP']).toBe('Stop');
    expect(COMMON_PHRASES['SORRY']).toBe('Sorry');
  });

  it('all values are non-empty strings', () => {
    for (const value of Object.values(COMMON_PHRASES)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

// ── WORD_SHORTCUTS ────────────────────────────────────────────────────────────

describe('WORD_SHORTCUTS', () => {
  it('contains common shortcuts', () => {
    expect(WORD_SHORTCUTS['HI']).toBe('Hi');
    expect(WORD_SHORTCUTS['OK']).toBe('Okay');
  });

  it('all keys are 2 characters', () => {
    for (const key of Object.keys(WORD_SHORTCUTS)) {
      expect(key).toHaveLength(2);
    }
  });
});
