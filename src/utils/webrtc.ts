/**
 * Native (iOS/Android) WebRTC exports
 * Uses react-native-webrtc package
 */

export {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';

export type { RTCPeerConnectionState } from './webrtc.types';
