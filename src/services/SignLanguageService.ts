/**
 * SignLanguageService
 *
 * Orchestrates hand-pose detection and gesture classification.
 *
 * Architecture:
 *   Camera frame (JPEG, base64)
 *     → jpeg-js decode → RGBA pixel array
 *     → tf.Tensor3D (RGB, shape [H,W,3])
 *     → MediaPipe Hands model (TF.js / CPU backend)
 *     → 21 hand keypoints (normalized 0–1)
 *     → extractFingerState() → FingerState
 *     → classifySign() + smoothSignSequence()
 *     → DetectedSign callback
 *
 * The model is loaded lazily on the first call to startDetection().
 *
 * On-device ML packages are bundled:
 *   @tensorflow/tfjs-core + @tensorflow/tfjs-backend-cpu
 *   @tensorflow-models/hand-pose-detection
 *   jpeg-js   (JPEG frame decoder — pure JS, no native deps)
 *
 * Falls back to demo mode automatically if model loading fails (e.g.
 * network error on first launch, Expo Go without networking, etc.).
 */

import type { DetectedSign, Landmark } from '../types';
import { classifySign, smoothSignSequence } from '../utils/gestureClassifier';

// Detection callback type
export type SignDetectionCallback = (sign: DetectedSign) => void;

// Acceptable frame sources
export interface CapturedFrame {
  /** Base64-encoded JPEG image data URL (data:image/jpeg;base64,...) */
  dataUri: string;
  width: number;
  height: number;
}

// ── Internal state ─────────────────────────────────────────────────────────────

let isRunning = false;
let detectionCallback: SignDetectionCallback | null = null;
const signHistory: string[] = [];
const HISTORY_LIMIT = 20;

// ── ML model types ─────────────────────────────────────────────────────────────

/**
 * Minimal interface for the hand pose detector returned by
 * @tensorflow-models/hand-pose-detection's createDetector().
 */
type HandDetector = {
  estimateHands: (input: unknown) => Promise<HandPoseResult[]>;
  dispose: () => void;
};

type HandPoseResult = {
  keypoints: Array<{ x: number; y: number; z?: number }>;
  handedness: string;
  score: number;
};

let detector: HandDetector | null = null;
let modelLoading = false;

// ── Model loading ──────────────────────────────────────────────────────────────

/**
 * Load the MediaPipe Hands model using the TF.js CPU backend.
 *
 * Uses dynamic imports so that the bundler can tree-shake and the app
 * still starts even if the model server is unreachable. Falls back to
 * demo mode on any error.
 *
 * The CPU backend is used because it has zero native dependencies and
 * works in all React Native environments (Expo Go, EAS builds, simulators).
 * For better performance on a custom native build, swap to the
 * @tensorflow/tfjs-react-native GL backend.
 */
async function loadModel(): Promise<void> {
  if (detector || modelLoading) return;
  modelLoading = true;

  try {
    // Register the CPU backend and wait for TF.js to be ready.
    await import('@tensorflow/tfjs-backend-cpu');
    const tf = await import('@tensorflow/tfjs-core');
    await tf.setBackend('cpu');
    await tf.ready();

    // Load the MediaPipe Hands model with the TF.js runtime.
    // 'lite' variant is faster and smaller — sufficient for ASL fingerspelling.
    const handPoseDetection = await import('@tensorflow-models/hand-pose-detection');
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    detector = await handPoseDetection.createDetector(model, {
      runtime: 'tfjs' as const,
      modelType: 'lite' as const,
      maxHands: 1,
    }) as unknown as HandDetector;

    console.log('[SignLanguageService] MediaPipe Hands model loaded (CPU backend)');
  } catch (err) {
    console.warn('[SignLanguageService] Model load failed — falling back to demo mode:', err);
    detector = null;
  } finally {
    modelLoading = false;
  }
}

// ── Frame-to-tensor conversion ─────────────────────────────────────────────────

// Minimal interface for a disposable TF.js tensor — avoids importing the full
// @tensorflow/tfjs-core type bundle into the module scope.
interface DisposableTensor {
  dispose(): void;
}

/**
 * Decode a base64-JPEG data URL into an int32 RGB tf.Tensor3D (shape [H,W,3]).
 *
 * Values are left in the [0, 255] range because the MediaPipe Hands TF.js
 * detector internally calls shiftImageValue([0,255] → [0,1]) before feeding
 * the model — it normalizes the input itself (see constants.ts in the package).
 *
 * Returns null when the data URI cannot be decoded (malformed, not JPEG, etc.).
 * The caller is responsible for calling `.dispose()` on the returned tensor.
 */
async function decodeJpegToTensor(dataUri: string): Promise<DisposableTensor | null> {
  try {
    const jpeg = await import('jpeg-js');
    const tf = await import('@tensorflow/tfjs-core');

    // Strip the "data:image/jpeg;base64," prefix
    const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    // atob is available in React Native (Hermes / JSC)
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode JPEG to RGBA using pure-JS jpeg-js
    const rawImage = jpeg.decode(bytes, { useTArray: true });
    const { width, height, data: rgbaData } = rawImage;

    // Convert RGBA → RGB (tf.Tensor3D expects shape [H, W, 3])
    const pixelCount = width * height;
    const rgbData = new Uint8Array(pixelCount * 3);
    for (let i = 0; i < pixelCount; i++) {
      rgbData[i * 3]     = rgbaData[i * 4];
      rgbData[i * 3 + 1] = rgbaData[i * 4 + 1];
      rgbData[i * 3 + 2] = rgbaData[i * 4 + 2];
    }

    // int32 [0, 255] — shiftImageValue inside the model handles normalisation
    return tf.tensor3d(rgbData, [height, width, 3], 'int32') as unknown as DisposableTensor;
  } catch {
    return null;
  }
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

/**
 * When the real model is unavailable (model load failure, offline device,
 * first launch without network) cycle through a sample phrase to demonstrate
 * the full UI pipeline.
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
 * Detect the hand sign in a captured camera frame.
 *
 * Flow:
 *   1. Decode JPEG to a tf.Tensor3D via jpeg-js (pure JS, no native deps)
 *   2. Run MediaPipe Hands estimateHands() with the CPU backend
 *   3. Normalize keypoints → classifySign() → smoothSignSequence()
 *   4. Return the smoothed DetectedSign, or null if no sign is found
 *
 * Falls back to demo mode if the model is not loaded.
 */
export async function detectFromFrame(frame: CapturedFrame): Promise<DetectedSign | null> {
  if (detector) {
    let imageTensor: DisposableTensor | null = null;
    try {
      imageTensor = await decodeJpegToTensor(frame.dataUri);
      if (!imageTensor) return getDemoSign();

      const hands = await detector.estimateHands(imageTensor);

      // Dispose immediately — before any async gap — to avoid memory leaks
      imageTensor.dispose();
      imageTensor = null;

      if (!hands || hands.length === 0) return null;

      // Pick the highest-confidence hand
      const best = hands.reduce<HandPoseResult | null>(
        (acc, h) => (acc === null || h.score > acc.score ? h : acc),
        null,
      );
      if (!best || best.score < 0.5) return null;

      // Normalize keypoints from pixel coordinates to [0, 1]
      const landmarks: Landmark[] = best.keypoints.map((kp) => ({
        x: kp.x / frame.width,
        y: kp.y / frame.height,
        z: (kp.z ?? 0) / frame.width,
      }));

      const handedness = best.handedness === 'Left' ? 'Left' : 'Right';
      const result = classifySign(landmarks, handedness);
      if (!result) return null;

      // Smooth sign history to reduce flickering
      signHistory.push(result.sign);
      if (signHistory.length > HISTORY_LIMIT) signHistory.shift();
      const smoothed = smoothSignSequence(signHistory);

      return smoothed
        ? { sign: smoothed, confidence: result.confidence, timestamp: Date.now() }
        : null;
    } catch (err) {
      // Dispose tensor on error path to avoid memory leaks
      imageTensor?.dispose();
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
