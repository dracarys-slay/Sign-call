/**
 * Gesture Classifier
 *
 * Converts MediaPipe hand landmarks (21 points per hand) into a
 * finger-extension state and maps it to the nearest ASL sign.
 *
 * Landmark indices (MediaPipe canonical):
 *   WRIST = 0
 *   THUMB  = 1,2,3,4        (CMC, MCP, IP, TIP)
 *   INDEX  = 5,6,7,8        (MCP, PIP, DIP, TIP)
 *   MIDDLE = 9,10,11,12
 *   RING   = 13,14,15,16
 *   PINKY  = 17,18,19,20
 */

import type { Landmark, FingerState } from '../types';
import { buildPatternLookup, encodePattern } from './signDictionary';

// Build the lookup map once at module load time
const PATTERN_LOOKUP = buildPatternLookup();

// ── Landmark index constants ──────────────────────────────────────────────────

const WRIST = 0;

// Thumb
const THUMB_MCP = 2;
const THUMB_IP  = 3;
const THUMB_TIP = 4;

// Index finger
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;

// Middle finger
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;

// Ring finger
const RING_MCP = 13;
const RING_PIP = 14;
const RING_TIP = 16;

// Pinky
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Euclidean distance between two 2D landmarks */
function dist2d(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Is a non-thumb finger extended?
 *
 * A finger is considered extended when its TIP is closer to the WRIST
 * than the MCP is (i.e., the finger is reaching out), OR when the TIP
 * y-coordinate is less than the PIP y-coordinate in normalized image
 * space (0 = top, 1 = bottom for portrait orientation).
 */
function isFingerExtended(
  landmarks: Landmark[],
  tipIdx: number,
  pipIdx: number,
  mcpIdx: number,
): boolean {
  // Primary test: tip is above (lower y) than the PIP joint
  const tipAbovePip = landmarks[tipIdx].y < landmarks[pipIdx].y;

  // Secondary test: tip is farther from the wrist than the MCP
  const tipFromWrist = dist2d(landmarks[tipIdx], landmarks[WRIST]);
  const mcpFromWrist = dist2d(landmarks[mcpIdx], landmarks[WRIST]);
  const tipFarther = tipFromWrist > mcpFromWrist * 1.1;

  return tipAbovePip || tipFarther;
}

/**
 * Is the thumb extended (abducted)?
 *
 * For the thumb we compare the TIP position to the IP joint along
 * the x-axis (the thumb extends horizontally for right hands).
 */
function isThumbExtended(landmarks: Landmark[], handedness: 'Left' | 'Right'): boolean {
  const tip = landmarks[THUMB_TIP];
  const ip  = landmarks[THUMB_IP];
  const mcp = landmarks[THUMB_MCP];

  // Distance test: thumb tip is far from the thumb MCP
  const tipFromMcp = dist2d(tip, mcp);
  const ipFromMcp  = dist2d(ip, mcp);
  if (tipFromMcp > ipFromMcp * 1.2) return true;

  // Direction test: thumb tip is more to the left/right than IP
  if (handedness === 'Right') {
    return tip.x < ip.x; // right hand thumb extends leftward in image
  } else {
    return tip.x > ip.x; // left hand thumb extends rightward
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract a 5-bit finger extension state from 21 hand landmarks.
 * Index 0 = thumb, 4 = pinky.
 */
export function extractFingerState(
  landmarks: Landmark[],
  handedness: 'Left' | 'Right' = 'Right',
): FingerState {
  const thumb  = isThumbExtended(landmarks, handedness);
  const index  = isFingerExtended(landmarks, INDEX_TIP,  INDEX_PIP,  INDEX_MCP);
  const middle = isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const ring   = isFingerExtended(landmarks, RING_TIP,   RING_PIP,   RING_MCP);
  const pinky  = isFingerExtended(landmarks, PINKY_TIP,  PINKY_PIP,  PINKY_MCP);
  return [thumb, index, middle, ring, pinky];
}

/**
 * Classify a set of hand landmarks into an ASL sign label.
 * Returns null if no match is found.
 */
export function classifySign(
  landmarks: Landmark[],
  handedness: 'Left' | 'Right' = 'Right',
): { sign: string; confidence: number } | null {
  if (landmarks.length < 21) return null;

  const fingerState = extractFingerState(landmarks, handedness);
  const key = encodePattern(fingerState);
  const label = PATTERN_LOOKUP.get(key);

  if (!label) return null;

  // Confidence is a rough measure based on how clearly fingers are bent/extended
  const confidence = computeConfidence(landmarks, fingerState);
  return { sign: label, confidence };
}

/**
 * Compute a rough confidence score based on how unambiguously each
 * finger is in its detected state.
 */
function computeConfidence(landmarks: Landmark[], state: FingerState): number {
  const specs = [
    // [tip, pip, mcp] for fingers 1-4
    [INDEX_TIP,  INDEX_PIP,  INDEX_MCP],
    [MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP],
    [RING_TIP,   RING_PIP,   RING_MCP],
    [PINKY_TIP,  PINKY_PIP,  PINKY_MCP],
  ] as const;

  let totalScore = 0;
  for (let i = 0; i < specs.length; i++) {
    const [tipIdx, pipIdx] = specs[i];
    const yDiff = landmarks[pipIdx].y - landmarks[tipIdx].y;
    // Positive yDiff = tip above pip = extended; negative = folded
    const extended = state[i + 1]; // state[0] is thumb
    const score = extended ? Math.max(0, yDiff) : Math.max(0, -yDiff);
    totalScore += Math.min(score * 5, 1); // normalize to 0–1
  }

  return Math.min(totalScore / 4, 1);
}

/**
 * Smooth a sequence of detected sign labels using a simple majority vote
 * over the last N frames to reduce flickering.
 */
export function smoothSignSequence(
  history: string[],
  windowSize = 5,
): string | null {
  if (history.length === 0) return null;

  const recent = history.slice(-windowSize);
  const counts: Record<string, number> = {};
  for (const sign of recent) {
    counts[sign] = (counts[sign] ?? 0) + 1;
  }

  let bestSign = '';
  let bestCount = 0;
  for (const [sign, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      bestSign = sign;
    }
  }

  // Require majority to reduce noise
  return bestCount >= Math.ceil(windowSize / 2) ? bestSign : null;
}
