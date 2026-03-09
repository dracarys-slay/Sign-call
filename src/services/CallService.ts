/**
 * CallService
 *
 * WebRTC peer-to-peer video calling service.
 *
 * Architecture:
 *   - Each client creates an RTCPeerConnection.
 *   - Signaling messages (offer/answer/ICE) are exchanged via a
 *     WebSocket signaling server.
 *   - The signaling server URL is configurable (default: demo server).
 *
 * Usage:
 *   const service = createCallService({ ... });
 *   await service.joinRoom(roomId, userName);
 *   // later:
 *   service.leaveRoom();
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';
import type { CallParticipant, SignalingMessage } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CallServiceConfig {
  signalingServerUrl: string;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onPeerJoined: (participant: CallParticipant) => void;
  onPeerLeft: (peerId: string) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onError: (error: Error) => void;
}

export interface CallService {
  joinRoom: (roomId: string, userName: string) => Promise<void>;
  leaveRoom: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  getLocalStream: () => MediaStream | null;
  isMuted: () => boolean;
  isCameraOff: () => boolean;
}

// ── ICE server configuration ──────────────────────────────────────────────────

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── Factory ───────────────────────────────────────────────────────────────────

export function createCallService(config: CallServiceConfig): CallService {
  let localStream: MediaStream | null = null;
  let peerConnection: RTCPeerConnection | null = null;
  let signalingSocket: WebSocket | null = null;
  const myPeerId: string = generateId();
  let currentRoomId = '';
  let mutedAudio = false;
  let cameraDisabled = false;

  // ── Signaling ─────────────────────────────────────────────────────────────

  function connectSignaling(roomId: string, userName: string): void {
    const url = `${config.signalingServerUrl}?roomId=${encodeURIComponent(
      roomId,
    )}&peerId=${encodeURIComponent(myPeerId)}&userName=${encodeURIComponent(userName)}`;

    try {
      signalingSocket = new WebSocket(url);

      signalingSocket.onopen = () => {
        sendSignaling({ type: 'join', roomId, peerId: myPeerId, payload: userName });
      };

      signalingSocket.onmessage = async (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data as string);
          await handleSignalingMessage(message);
        } catch (err) {
          console.warn('[CallService] Failed to parse signaling message:', err);
        }
      };

      signalingSocket.onerror = (event) => {
        console.warn('[CallService] Signaling socket error:', event);
        config.onError(new Error('Signaling connection error'));
      };

      signalingSocket.onclose = () => {
        console.log('[CallService] Signaling socket closed');
      };
    } catch (err) {
      console.warn('[CallService] Could not connect to signaling server:', err);
      // In demo mode, set up a mock local-only call
    }
  }

  function sendSignaling(message: SignalingMessage): void {
    if (signalingSocket?.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify(message));
    }
  }

  // ── Signaling message handler ─────────────────────────────────────────────

  async function handleSignalingMessage(message: SignalingMessage): Promise<void> {
    const { type, peerId, payload } = message;

    switch (type) {
      case 'peer-joined':
        config.onPeerJoined({ id: peerId, name: String(payload ?? peerId), isLocal: false });
        await createOffer(peerId);
        break;

      case 'offer': {
        await ensurePeerConnection(peerId);
        const offer = payload as { type: 'offer'; sdp: string };
        await peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection!.createAnswer();
        await peerConnection!.setLocalDescription(answer);
        sendSignaling({
          type: 'answer',
          roomId: currentRoomId,
          peerId: myPeerId,
          targetId: peerId,
          payload: answer as unknown as { type: 'answer'; sdp: string },
        });
        break;
      }

      case 'answer': {
        const answer = payload as { type: 'answer'; sdp: string };
        await peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
        break;
      }

      case 'ice-candidate': {
        const candidate = payload as { candidate: string; sdpMLineIndex: number; sdpMid: string };
        if (candidate?.candidate) {
          await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
        }
        break;
      }

      case 'peer-left':
        config.onPeerLeft(peerId);
        break;
    }
  }

  // ── Peer connection ───────────────────────────────────────────────────────

  async function ensurePeerConnection(remotePeerId: string): Promise<void> {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    localStream?.getTracks().forEach((track) => {
      peerConnection!.addTrack(track, localStream!);
    });

    // react-native-webrtc uses EventTarget from event-target-shim.
    // Cast to access addEventListener which is present at runtime.
    const pc = peerConnection as unknown as EventTarget;

    // Handle incoming remote tracks
    pc.addEventListener('track', (event) => {
      // react-native-webrtc RTCTrackEvent carries streams array
      const trackEvent = event as unknown as { streams: MediaStream[] };
      const [remoteStream] = trackEvent.streams ?? [];
      if (remoteStream) {
        config.onRemoteStream(remotePeerId, remoteStream);
      }
    });

    // ICE candidate handler
    pc.addEventListener('icecandidate', (event) => {
      const iceCandidateEvent = event as unknown as { candidate: RTCIceCandidate | null };
      if (iceCandidateEvent.candidate) {
        sendSignaling({
          type: 'ice-candidate',
          roomId: currentRoomId,
          peerId: myPeerId,
          targetId: remotePeerId,
          payload: iceCandidateEvent.candidate as unknown as SignalingMessage['payload'],
        });
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      if (peerConnection) {
        config.onConnectionStateChange(
          peerConnection.connectionState as RTCPeerConnectionState,
        );
      }
    });
  }

  async function createOffer(remotePeerId: string): Promise<void> {
    await ensurePeerConnection(remotePeerId);
    const offer = await peerConnection!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peerConnection!.setLocalDescription(offer);
    sendSignaling({
      type: 'offer',
      roomId: currentRoomId,
      peerId: myPeerId,
      targetId: remotePeerId,
      payload: offer as unknown as SignalingMessage['payload'],
    });
  }

  // ── Local media ───────────────────────────────────────────────────────────

  async function captureLocalMedia(): Promise<void> {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    localStream = stream;
    config.onLocalStream(stream);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    async joinRoom(roomId: string, userName: string): Promise<void> {
      currentRoomId = roomId;
      await captureLocalMedia();
      connectSignaling(roomId, userName);
    },

    leaveRoom(): void {
      sendSignaling({
        type: 'leave',
        roomId: currentRoomId,
        peerId: myPeerId,
      });

      // Stop all local tracks
      localStream?.getTracks().forEach((t) => t.stop());
      localStream = null;

      peerConnection?.close();
      peerConnection = null;

      signalingSocket?.close();
      signalingSocket = null;
    },

    toggleMute(): void {
      mutedAudio = !mutedAudio;
      localStream?.getAudioTracks().forEach((track) => {
        track.enabled = !mutedAudio;
      });
    },

    toggleCamera(): void {
      cameraDisabled = !cameraDisabled;
      localStream?.getVideoTracks().forEach((track) => {
        track.enabled = !cameraDisabled;
      });
    },

    getLocalStream(): MediaStream | null {
      return localStream;
    },

    isMuted(): boolean {
      return mutedAudio;
    },

    isCameraOff(): boolean {
      return cameraDisabled;
    },
  };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random 8-character peer ID.
 * Uses the Web Crypto API available in React Native (JSC / Hermes).
 */
function generateId(): string {
  const bytes = new Uint8Array(6);
  // crypto.getRandomValues is available in React Native via JSC/Hermes
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: combine timestamp with Math.random for non-secure environments
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${ts}${rand}`.slice(-12);
}
