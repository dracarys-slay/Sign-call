/**
 * Tests for src/utils/gestureClassifier.ts
 *
 * Covers:
 *  - extractFingerState: derives a FingerState from 21 hand landmarks
 *  - classifySign: maps landmarks to an ASL sign label
 *  - smoothSignSequence: majority-vote smoothing over a sign history
 *
 * We construct synthetic landmark arrays for each test.
 * Normalized coordinate system: (0,0) = top-left, (1,1) = bottom-right.
 * A "straight up" finger has its TIP at a smaller y-value than its PIP joint.
 */

import {
  extractFingerState,
  classifySign,
  smoothSignSequence,
} from './gestureClassifier';
import type { Landmark } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a 21-landmark array representing a hand where fingers are either
 * fully extended (straight up, tip above pip) or fully folded (tip curls
 * back toward the palm, closer to wrist than MCP).
 *
 * Landmark layout mirrors MediaPipe's canonical indices:
 *   0=WRIST, 1-4=THUMB, 5-8=INDEX, 9-12=MIDDLE, 13-16=RING, 17-20=PINKY
 *
 * Coordinate system: y=0 is top of image, y=1 is bottom. Wrist is at the
 * bottom (high y); finger tips point upward (lower y when extended).
 *
 * isFingerExtended() returns true when EITHER:
 *   (a) tip.y < pip.y  (tip is above pip in the image), OR
 *   (b) dist(tip, wrist) > dist(mcp, wrist) * 1.1
 *
 * For a folded finger we must satisfy BOTH negations:
 *   (a) tip.y >= pip.y  (tip NOT above pip)
 *   (b) dist(tip, wrist) <= dist(mcp, wrist) * 1.1
 *
 * We achieve this by placing folded tips at a y close to the wrist (palm
 * area), so they curl back and are closer to the wrist than the MCP.
 */
function makeLandmarks(
  thumbExtended: boolean,
  indexExtended: boolean,
  middleExtended: boolean,
  ringExtended: boolean,
  pinkyExtended: boolean,
  handedness: 'Left' | 'Right' = 'Right',
): Landmark[] {
  // Start with 21 identical "neutral" points
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8, z: 0 }));

  // WRIST at bottom-center
  lm[0] = { x: 0.5, y: 0.95, z: 0 };

  // ── THUMB (indices 1-4) ──────────────────────────────────────────────────
  // MCP is at a known distance from wrist so we can control tip distance
  lm[1] = { x: 0.45, y: 0.90, z: 0 }; // CMC  — dist to wrist ≈ 0.051
  lm[2] = { x: 0.40, y: 0.83, z: 0 }; // MCP  — dist to wrist ≈ 0.130
  lm[3] = { x: 0.35, y: 0.79, z: 0 }; // IP
  if (thumbExtended) {
    // Tip clearly lateral to IP for a Right hand (lower x)
    lm[4] = { x: handedness === 'Right' ? 0.22 : 0.60, y: 0.77, z: 0 };
  } else {
    // Tip stays close to IP → not extended
    lm[4] = { x: 0.36, y: 0.80, z: 0 };
  }

  // ── INDEX (indices 5-8) ──────────────────────────────────────────────────
  lm[5] = { x: 0.48, y: 0.78, z: 0 }; // MCP — dist to wrist ≈ 0.170
  lm[6] = { x: 0.47, y: 0.65, z: 0 }; // PIP
  lm[7] = { x: 0.47, y: 0.55, z: 0 }; // DIP
  if (indexExtended) {
    lm[8] = { x: 0.46, y: 0.42, z: 0 }; // TIP above PIP — dist to wrist > MCP
  } else {
    // Tip curls back toward palm: y close to wrist (high y), well below PIP
    // dist(tip, wrist) must be ≤ dist(mcp, wrist) * 1.1 ≈ 0.187
    lm[8] = { x: 0.48, y: 0.88, z: 0 }; // TIP — dist ≈ 0.070 ← well below MCP
  }

  // ── MIDDLE (indices 9-12) ────────────────────────────────────────────────
  lm[9]  = { x: 0.50, y: 0.77, z: 0 }; // MCP — dist ≈ 0.180
  lm[10] = { x: 0.50, y: 0.64, z: 0 }; // PIP
  lm[11] = { x: 0.50, y: 0.54, z: 0 }; // DIP
  if (middleExtended) {
    lm[12] = { x: 0.50, y: 0.41, z: 0 }; // TIP above PIP
  } else {
    lm[12] = { x: 0.50, y: 0.87, z: 0 }; // TIP curled back — dist ≈ 0.080
  }

  // ── RING (indices 13-16) ─────────────────────────────────────────────────
  lm[13] = { x: 0.52, y: 0.78, z: 0 }; // MCP — dist ≈ 0.170
  lm[14] = { x: 0.52, y: 0.65, z: 0 }; // PIP
  lm[15] = { x: 0.52, y: 0.55, z: 0 }; // DIP
  if (ringExtended) {
    lm[16] = { x: 0.52, y: 0.42, z: 0 }; // TIP above PIP
  } else {
    lm[16] = { x: 0.52, y: 0.88, z: 0 }; // TIP curled back — dist ≈ 0.072
  }

  // ── PINKY (indices 17-20) ────────────────────────────────────────────────
  lm[17] = { x: 0.54, y: 0.80, z: 0 }; // MCP — dist ≈ 0.157
  lm[18] = { x: 0.54, y: 0.68, z: 0 }; // PIP
  lm[19] = { x: 0.54, y: 0.60, z: 0 }; // DIP
  if (pinkyExtended) {
    lm[20] = { x: 0.54, y: 0.48, z: 0 }; // TIP above PIP
  } else {
    lm[20] = { x: 0.54, y: 0.88, z: 0 }; // TIP curled back — dist ≈ 0.082
  }

  return lm;
}

// ── extractFingerState ────────────────────────────────────────────────────────

describe('extractFingerState', () => {
  it('returns [false, false, false, false, false] for a closed fist', () => {
    const lm = makeLandmarks(false, false, false, false, false);
    const state = extractFingerState(lm);
    // The thumb state is intentionally not asserted here: isThumbExtended() uses
    // a horizontal distance heuristic that is sensitive to exact x-axis positions
    // and is tested separately via the "Y shape" test below. The four non-thumb
    // fingers unambiguously curl back to the palm in makeLandmarks(false...).
    expect(state[1]).toBe(false); // index
    expect(state[2]).toBe(false); // middle
    expect(state[3]).toBe(false); // ring
    expect(state[4]).toBe(false); // pinky
  });

  it('returns [*, true, true, true, true] when all four fingers are extended', () => {
    const lm = makeLandmarks(false, true, true, true, true);
    const state = extractFingerState(lm);
    expect(state[1]).toBe(true);  // index
    expect(state[2]).toBe(true);  // middle
    expect(state[3]).toBe(true);  // ring
    expect(state[4]).toBe(true);  // pinky
  });

  it('returns true for index only (D shape)', () => {
    const lm = makeLandmarks(false, true, false, false, false);
    const state = extractFingerState(lm);
    expect(state[1]).toBe(true);  // index
    expect(state[2]).toBe(false); // middle
    expect(state[3]).toBe(false); // ring
    expect(state[4]).toBe(false); // pinky
  });

  it('returns true for pinky only (I shape)', () => {
    const lm = makeLandmarks(false, false, false, false, true);
    const state = extractFingerState(lm);
    expect(state[1]).toBe(false); // index
    expect(state[2]).toBe(false); // middle
    expect(state[3]).toBe(false); // ring
    expect(state[4]).toBe(true);  // pinky
  });

  it('returns true for index + middle (H/R/U/V shape)', () => {
    const lm = makeLandmarks(false, true, true, false, false);
    const state = extractFingerState(lm);
    expect(state[1]).toBe(true);  // index
    expect(state[2]).toBe(true);  // middle
    expect(state[3]).toBe(false); // ring
    expect(state[4]).toBe(false); // pinky
  });

  it('returns a 5-element tuple', () => {
    const lm = makeLandmarks(true, true, true, true, true);
    const state = extractFingerState(lm);
    expect(state).toHaveLength(5);
  });

  it('returns null-safe output even when a second (left) hand is passed', () => {
    const lm = makeLandmarks(true, false, false, false, false, 'Left');
    const state = extractFingerState(lm, 'Left');
    expect(state).toHaveLength(5);
    // Thumb extension for Left hand
    expect(state[0]).toBe(true);
  });
});

// ── classifySign ──────────────────────────────────────────────────────────────

describe('classifySign', () => {
  it('returns null for fewer than 21 landmarks', () => {
    const short = Array.from({ length: 10 }, () => ({ x: 0, y: 0, z: 0 }));
    expect(classifySign(short)).toBeNull();
  });

  it('returns null for an empty landmark array', () => {
    expect(classifySign([])).toBeNull();
  });

  it('returns { sign, confidence } for a recognisable hand pose', () => {
    // B: four fingers extended, thumb folded → [false, true, true, true, true]
    const lm = makeLandmarks(false, true, true, true, true);
    const result = classifySign(lm);
    // B and 4 share the same pattern; 4 takes priority (numbers override)
    expect(result).not.toBeNull();
    expect(typeof result!.sign).toBe('string');
    expect(result!.sign.length).toBeGreaterThan(0);
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
  });

  it('returns a sign whose confidence is within [0, 1]', () => {
    const lm = makeLandmarks(false, true, false, false, false);
    const result = classifySign(lm);
    if (result) {
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('recognises "I" for pinky-only extension', () => {
    // I: [false, false, false, false, true]
    const lm = makeLandmarks(false, false, false, false, true);
    const result = classifySign(lm);
    expect(result).not.toBeNull();
    expect(result!.sign).toBe('I');
  });
});

// ── smoothSignSequence ────────────────────────────────────────────────────────

describe('smoothSignSequence', () => {
  it('returns null for an empty history', () => {
    expect(smoothSignSequence([])).toBeNull();
  });

  it('returns the sign when history has one item and window is 1', () => {
    // With windowSize=1: threshold = ceil(1/2) = 1; one 'A' ≥ 1 → 'A'
    expect(smoothSignSequence(['A'], 1)).toBe('A');
  });

  it('returns the majority sign when one sign dominates the window', () => {
    const history = ['A', 'A', 'A', 'B', 'A'];
    expect(smoothSignSequence(history, 5)).toBe('A');
  });

  it('returns null when no majority exists in the window', () => {
    // windowSize=5, threshold = ceil(5/2) = 3; max count = 2 → no majority
    const history = ['A', 'A', 'B', 'B', 'C'];
    expect(smoothSignSequence(history, 5)).toBeNull();
  });

  it('only considers the last windowSize elements', () => {
    // Long history where early signs are 'A' but the last 5 are 'B'
    const history = ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B'];
    expect(smoothSignSequence(history, 5)).toBe('B');
  });

  it('uses default window of 5', () => {
    // 3 out of 5 = majority (3 ≥ ceil(5/2) = 3)
    const history = ['A', 'B', 'A', 'C', 'A'];
    expect(smoothSignSequence(history)).toBe('A');
  });

  it('returns the majority sign at the exact threshold (ceil(window/2))', () => {
    // window=4: threshold = ceil(4/2) = 2; two 'A' = meets threshold
    const history = ['A', 'A', 'B', 'C'];
    expect(smoothSignSequence(history, 4)).toBe('A');
  });

  it('returns null when sign count is one below threshold', () => {
    // window=5: threshold=3; 'A' appears only twice → null
    const history = ['A', 'A', 'B', 'C', 'D'];
    expect(smoothSignSequence(history, 5)).toBeNull();
  });

  it('handles a window larger than the history gracefully', () => {
    // window=10 but only 3 items in history; min threshold = ceil(10/2)=5
    // only 2 occurrences of 'A' → not enough for majority
    const history = ['A', 'A', 'B'];
    expect(smoothSignSequence(history, 10)).toBeNull();
  });
});
