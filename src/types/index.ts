// Hand landmark point with 3D coordinates (normalized 0–1)
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

// 21 landmarks for one detected hand
export interface HandLandmarks {
  landmarks: Landmark[];
  handedness: 'Left' | 'Right';
  score: number;
}

// A single recognized sign/gesture
export interface DetectedSign {
  sign: string;
  confidence: number;
  timestamp: number;
}

// Represents one participant in the video call
export interface CallParticipant {
  id: string;
  name: string;
  // RTCMediaStream handled at the component layer
  streamId?: string;
  isLocal: boolean;
}

// Real-time translation state
export interface TranslationState {
  currentSign: string;     // Currently displayed letter/word
  currentWord: string;     // Word being built from detected signs
  fullSentence: string;    // Accumulated sentence in this session
  confidence: number;      // Confidence 0–1
  isDetecting: boolean;    // Whether detection is running
}

// Video call state
export interface CallState {
  isInCall: boolean;
  roomId: string;
  participants: CallParticipant[];
  isMuted: boolean;
  isCameraOff: boolean;
  isConnecting: boolean;
  error: string | null;
}

// User-configurable settings
export interface AppSettings {
  signLanguage: 'ASL' | 'BSL' | 'ISL';
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  translationDisplayDuration: number; // ms
  autoSpeak: boolean;
  userName: string;
  showLandmarks: boolean;
  detectionSensitivity: number; // 0–1
}

// React Navigation route params
export type RootStackParamList = {
  Home: undefined;
  Call: { roomId: string; userName: string };
  Settings: undefined;
};

// Finger extension state (index 0 = thumb, 4 = pinky)
export type FingerState = [boolean, boolean, boolean, boolean, boolean];

// Mapping from gesture pattern key to sign label
export interface GestureEntry {
  label: string;
  pattern: FingerState;
  description?: string;
}

// Signaling message types for WebRTC
export type SignalingMessageType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'join'
  | 'leave'
  | 'peer-joined'
  | 'peer-left';

export interface SignalingMessage {
  type: SignalingMessageType;
  roomId: string;
  peerId: string;
  targetId?: string;
  payload?: RTCSessionDescriptionType | RTCIceCandidateType | string;
}

// Minimal RTCSessionDescription shape (matches react-native-webrtc)
export interface RTCSessionDescriptionType {
  type: 'offer' | 'answer';
  sdp: string;
}

// Minimal RTCIceCandidate shape
export interface RTCIceCandidateType {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}
