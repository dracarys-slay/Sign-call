/**
 * SignLanguageService
 *
 * Orchestrates hand-pose detection and gesture classification.
 *
 * Architecture:
 *   Camera frame
 *     → Hand-pose-detection model (MediaPipe Hands)
 *     → extractFingerState()
 *     → classifySign()
 *     → smoothSignSequence()
 *     → DetectedSign callback
 *
 * The model is loaded lazily on the first call to startDetection().
 *
 * ── Enabling on-device ML ─────────────────────────────────────────────────────
 * To enable real-time on-device detection, install:
 *   npm install @tensorflow/tfjs @tensorflow-models/hand-pose-detection
 *
 * Then add a compatible TF.js React Native back-end. Once installed,
 * uncomment the TF.js import block in loadModel() below.
 *
 * Until then, the service runs in demo mode, cycling through a sample
 * phrase to demonstrate the full UI pipeline.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DetectedSign, Landmark } from '../types';
import { classifySign, smoothSignSequence } from '../utils/gestureClassifier';

// Detection callback type
export type SignDetectionCallback = (sign: DetectedSign) => void;

// Acceptable frame sources
export interface CapturedFrame {
  /** Base64-encoded JPEG/PNG image data (data URL) */
  dataUri: string;
  width: number;
  height: number;
}

// ── Internal state ─────────────────────────────────────────────────────────────

let isRunning = false;
let detectionCallback: SignDetectionCallback | null = null;
const signHistory: string[] = [];
const HISTORY_LIMIT = 20;

// ── ML model types (mirrored from @tensorflow-models/hand-pose-detection) ────

type HandDetector = {
  estimateHands: (input: { uri: string } | ImageData) => Promise<HandPoseResult[]>;
  dispose: () => void;
};

type HandPoseResult = {
  keypoints: Array<{ x: number; y: number; z?: number }>;
  handedness: string;
  score: number;
};

let detector: HandDetector | null = null;
let modelLoading = false;

/**
 * Attempt to load the hand-pose-detection model.
 *
 * This uses dynamic imports so that the app still bundles and runs
 * without ML packages installed. When the packages are unavailable,
 * the catch block silently falls through to demo mode.
 */
async function loadModel(): Promise<void> {
  if (detector || modelLoading) return;
  modelLoading = true;

  try {
    /*
     * ── Uncomment the block below once you have installed:
     *    npm install @tensorflow/tfjs @tensorflow-models/hand-pose-detection
     *    plus a compatible React Native / WASM TF.js back-end.
     * ──────────────────────────────────────────────────────────────────
     *
     * const tf = await import('@tensorflow/tfjs');
     * await tf.ready();
     *
     * const handPoseDetection = await import('@tensorflow-models/hand-pose-detection');
     * const model = handPoseDetection.SupportedModels.MediaPipeHands;
     * detector = await handPoseDetection.createDetector(model, {
     *   runtime: 'tfjs',
     *   solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
     *   modelType: 'full',
     * }) as unknown as HandDetector;
     *
     * console.log('[SignLanguageService] Model loaded');
     * ──────────────────────────────────────────────────────────────────
     */
    console.log('[SignLanguageService] ML packages not installed — using demo mode.');
  } catch (err) {
    console.warn('[SignLanguageService] Could not load ML model:', err);
  } finally {
    modelLoading = false;
  }
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

/**
 * When the real model is unavailable (emulator, Expo Go, etc.) we cycle
 * through a pre-defined phrase letter-by-letter to demonstrate the UI.
 */
const DEMO_SEQUENCE = ['H', 'E', 'L', 'L', 'O', ' ', 'W', 'O', 'R', 'L', 'D'];
let demoIndex = 0;
let lastDemoTick = 0;
const DEMO_INTERVAL_MS = 800;

function getDemoSign(): DetectedSign | null {
  const now = Date.now();
  if (now - lastDemoTick < DEMO_INTERVAL_MS) return null;
  lastDemoTick = now;

  const sign = DEMO_SEQUENCE[demoIndex % DEMO_SEQUENCE.length];
  demoIndex++;
  return { sign, confidence: 0.9, timestamp: now };
}

// ── Core detection ────────────────────────────────────────────────────────────

/**
 * Attempt to detect hands and classify the sign in a captured frame.
 * Falls back to demo mode if the model is not available.
 */
export async function detectFromFrame(frame: CapturedFrame): Promise<DetectedSign | null> {
  // Real model path
  if (detector) {
    try {
      const hands = await detector.estimateHands({ uri: frame.dataUri });
      if (!hands || hands.length === 0) return null;

      const best = hands.reduce<HandPoseResult | null>((acc, h) =>
        acc === null || h.score > acc.score ? h : acc, null);

      if (!best || best.score < 0.5) return null;

      const landmarks: Landmark[] = best.keypoints.map((kp) => ({
        x: kp.x / frame.width,
        y: kp.y / frame.height,
        z: (kp.z ?? 0) / frame.width,
      }));

      const handedness = best.handedness === 'Left' ? 'Left' : 'Right';
      const result = classifySign(landmarks, handedness);
      if (!result) return null;

      // Push to history and smooth
      signHistory.push(result.sign);
      if (signHistory.length > HISTORY_LIMIT) signHistory.shift();
      const smoothed = smoothSignSequence(signHistory);

      return smoothed
        ? { sign: smoothed, confidence: result.confidence, timestamp: Date.now() }
        : null;
    } catch (err) {
      console.warn('[SignLanguageService] Detection error:', err);
    }
  }

  // Demo mode fallback
  return getDemoSign();
}

// ── Public start/stop API ─────────────────────────────────────────────────────

export async function startDetection(callback: SignDetectionCallback): Promise<void> {
  detectionCallback = callback;
  isRunning = true;
  signHistory.length = 0;
  demoIndex = 0;
  await loadModel();
}

export function stopDetection(): void {
  isRunning = false;
  detectionCallback = null;
}

export function isDetectionRunning(): boolean {
  return isRunning;
}

export function isModelReady(): boolean {
  return detector !== null;
}

/** Called by the camera frame processor with each new frame */
export async function processFrame(frame: CapturedFrame): Promise<void> {
  if (!isRunning || !detectionCallback) return;
  const sign = await detectFromFrame(frame);
  if (sign) {
    detectionCallback(sign);
  }
}

/** Release model resources */
export function dispose(): void {
  detector?.dispose();
  detector = null;
  isRunning = false;
}
