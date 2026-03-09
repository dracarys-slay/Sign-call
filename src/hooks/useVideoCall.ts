/**
 * useVideoCall
 *
 * React hook that wraps CallService to provide video call state
 * and actions to React components.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MediaStream } from 'react-native-webrtc';
import { createCallService } from '../services/CallService';
import type { CallService } from '../services/CallService';
import type { CallState, CallParticipant } from '../types';

// ── Signaling server URL ──────────────────────────────────────────────────────
//
// Override via the EXPO_PUBLIC_SIGNALING_URL environment variable so you can
// target different servers in dev / staging / production without code changes:
//
//   # .env.local  (local development — run: node server/signaling.js)
//   EXPO_PUBLIC_SIGNALING_URL=ws://localhost:8080/ws
//
//   # .env.production
//   EXPO_PUBLIC_SIGNALING_URL=wss://signaling.your-domain.com/ws
//
// See server/signaling.js for the bundled Node.js signaling server.
// See README.md for deployment instructions.
//
// ─────────────────────────────────────────────────────────────────────────────
const SIGNALING_URL: string =
  // Expo loads variables prefixed EXPO_PUBLIC_ into process.env at build time
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SIGNALING_URL) ||
  'ws://localhost:8080/ws';

interface UseVideoCallOptions {
  /** Override the signaling server URL. Falls back to SIGNALING_URL constant. */
  signalingUrl?: string;
}

const INITIAL_STATE: CallState = {
  isInCall: false,
  roomId: '',
  participants: [],
  isMuted: false,
  isCameraOff: false,
  isConnecting: false,
  error: null,
};

export function useVideoCall(options: UseVideoCallOptions = {}) {
  const [callState, setCallState] = useState<CallState>(INITIAL_STATE);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );

  const serviceRef = useRef<CallService | null>(null);

  // ── Initialize service ──────────────────────────────────────────────────

  useEffect(() => {
    serviceRef.current = createCallService({
      signalingServerUrl: options.signalingUrl ?? SIGNALING_URL,

      onLocalStream: (stream) => {
        setLocalStream(stream);
      },

      onRemoteStream: (peerId, stream) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerId, stream);
          return next;
        });
      },

      onPeerJoined: (participant: CallParticipant) => {
        setCallState((prev) => ({
          ...prev,
          participants: [...prev.participants, participant],
        }));
      },

      onPeerLeft: (peerId: string) => {
        setCallState((prev) => ({
          ...prev,
          participants: prev.participants.filter((p) => p.id !== peerId),
        }));
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      },

      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          setCallState((prev) => ({ ...prev, isConnecting: false }));
        } else if (state === 'failed' || state === 'disconnected') {
          setCallState((prev) => ({
            ...prev,
            isConnecting: false,
            error: `Connection ${state}`,
          }));
        }
      },

      onError: (error: Error) => {
        setCallState((prev) => ({ ...prev, error: error.message, isConnecting: false }));
      },
    });

    return () => {
      serviceRef.current?.leaveRoom();
    };
  }, [options.signalingUrl]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const joinRoom = useCallback(async (roomId: string, userName: string) => {
    if (!serviceRef.current) return;
    setCallState((prev) => ({
      ...prev,
      isConnecting: true,
      isInCall: false,
      roomId,
      error: null,
      participants: [{ id: 'local', name: userName, isLocal: true }],
    }));

    try {
      await serviceRef.current.joinRoom(roomId, userName);
      setCallState((prev) => ({ ...prev, isInCall: true, isConnecting: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      setCallState((prev) => ({
        ...prev,
        isConnecting: false,
        isInCall: false,
        error: message,
      }));
    }
  }, []);

  const leaveRoom = useCallback(() => {
    serviceRef.current?.leaveRoom();
    setLocalStream(null);
    setRemoteStreams(new Map());
    setCallState(INITIAL_STATE);
  }, []);

  const toggleMute = useCallback(() => {
    serviceRef.current?.toggleMute();
    setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleCamera = useCallback(() => {
    serviceRef.current?.toggleCamera();
    setCallState((prev) => ({ ...prev, isCameraOff: !prev.isCameraOff }));
  }, []);

  return {
    callState,
    localStream,
    remoteStreams,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleCamera,
  };
}
