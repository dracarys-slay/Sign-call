/**
 * Web-specific WebRTC exports
 * Uses native browser WebRTC APIs
 */

export const RTCPeerConnection = window.RTCPeerConnection;
export const RTCIceCandidate = window.RTCIceCandidate;
export const RTCSessionDescription = window.RTCSessionDescription;
export const MediaStream = window.MediaStream;
export const mediaDevices = navigator.mediaDevices;

export type { RTCPeerConnectionState } from './webrtc.types';
