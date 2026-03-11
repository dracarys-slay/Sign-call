/**
 * CallScreen (Web version)
 *
 * Web-compatible video call screen using browser APIs:
 * - getUserMedia for camera access
 * - Canvas for frame capture
 * - Automatic sign detection on call join
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { VideoView } from '../components/VideoView';
import { SignOverlay } from '../components/SignOverlay';
import { CallControls } from '../components/CallControls';
import { TranslationDisplay } from '../components/TranslationDisplay';

import { useVideoCall } from '../hooks/useVideoCall';
import { useSignDetection } from '../hooks/useSignDetection';
import { useSpeech } from '../hooks/useSpeech';
import { useSettings } from '../context/SettingsContext';

import type { RootStackParamList } from '../types';
import type { CapturedFrame } from '../services/SignLanguageService';

type Props = NativeStackScreenProps<RootStackParamList, 'Call'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIP_WIDTH = SCREEN_WIDTH * 0.32;
const PIP_HEIGHT = PIP_WIDTH * 1.4;

export function CallScreen({ route, navigation }: Props) {
  const { roomId, userName } = route.params;

  const { settings: contextSettings } = useSettings();
  const settings = { ...contextSettings, userName };

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hooks
  const { callState, remoteStreams, joinRoom, leaveRoom, toggleMute, toggleCamera } =
    useVideoCall();

  const {
    translationState,
    startDetecting,
    stopDetecting,
    clearSentence,
    processFrame,
    isDetecting,
    lastCompletedWord,
  } = useSignDetection(settings);

  const { speakText, stopSpeech } = useSpeech(settings);

  // ── Camera setup (auto-start) ────────────────────────────────────────────

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: true,
        });
        setLocalStream(stream);
        setHasCameraPermission(true);

        // Attach to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        setHasCameraPermission(false);
      }
    }

    setupCamera();

    return () => {
      // Cleanup: stop all tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ── Join call on mount ───────────────────────────────────────────────────

  useEffect(() => {
    joinRoom(roomId, userName);
    return () => {
      leaveRoom();
      stopSpeech();
    };
  }, [roomId, userName, joinRoom, leaveRoom, stopSpeech]);

  // ── Auto-start sign detection ────────────────────────────────────────────

  useEffect(() => {
    // Automatically start detection when camera is ready
    if (hasCameraPermission && localStream && !isDetecting) {
      startDetecting();
    }
  }, [hasCameraPermission, localStream, isDetecting, startDetecting]);

  // ── Auto-speak new translations ──────────────────────────────────────────

  const autoSpeak = settings.autoSpeak;
  const ttsEnabled = settings.ttsEnabled;

  const lastSpokenWord = useRef('');
  useEffect(() => {
    // Speak only when a COMPLETE WORD is detected (not individual letters)
    if (
      autoSpeak &&
      ttsEnabled &&
      lastCompletedWord &&
      lastCompletedWord !== lastSpokenWord.current
    ) {
      lastSpokenWord.current = lastCompletedWord;
      speakText(lastCompletedWord);
    }
  }, [lastCompletedWord, autoSpeak, ttsEnabled, speakText]);

  // ── Camera frame capture loop (auto-capture for sign detection) ──────────

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isDetecting) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 JPEG
      const dataUri = canvas.toDataURL('image/jpeg', 0.4);

      const frame: CapturedFrame = {
        dataUri,
        width: canvas.width,
        height: canvas.height,
      };

      await processFrame(frame);
    } catch (err) {
      // Silently ignore frame capture errors
      console.warn('Frame capture error:', err);
    }
  }, [isDetecting, processFrame]);

  useEffect(() => {
    if (isDetecting && localStream) {
      frameTimerRef.current = setInterval(captureAndProcess, 200); // ~5 fps
    } else {
      if (frameTimerRef.current) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
    }
    return () => {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
  }, [isDetecting, localStream, captureAndProcess]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleToggleDetection = useCallback(async () => {
    if (isDetecting) {
      stopDetecting();
    } else {
      await startDetecting();
    }
  }, [isDetecting, startDetecting, stopDetecting]);

  const handleHangUp = useCallback(() => {
    stopDetecting();
    leaveRoom();

    // Stop camera
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    navigation.goBack();
  }, [stopDetecting, leaveRoom, localStream, navigation]);

  const handleSpeak = useCallback(
    (text: string) => {
      if (text) speakText(text);
    },
    [speakText],
  );

  // ── Remote streams ───────────────────────────────────────────────────────

  const remoteStreamEntries = [...remoteStreams.entries()];
  const firstRemoteStream = remoteStreamEntries[0]?.[1] ?? null;
  const firstRemotePeerId = remoteStreamEntries[0]?.[0] ?? '';

  // ── Render ───────────────────────────────────────────────────────────────

  if (hasCameraPermission === false) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionEmoji}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          Sign Call needs camera access for video calling and sign language detection.
          Please enable camera permissions in your browser.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Main video area ── */}
      <View style={styles.videoArea}>
        {/* Remote participant (full screen) */}
        <VideoView
          stream={firstRemoteStream}
          label={
            callState.participants.find((p) => p.id === firstRemotePeerId)?.name ??
            (callState.isConnecting ? 'Connecting…' : 'Waiting for participant…')
          }
          style={styles.remoteVideo}
          objectFit="cover"
        />

        {/* Local camera preview (PiP) + sign detection */}
        <View style={styles.pipContainer}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // Mirror for front camera
            }}
          />
          <View style={styles.overlayContainer}>
            <SignOverlay
              currentSign={translationState.currentSign}
              confidence={translationState.confidence}
              isDetecting={isDetecting}
            />
          </View>
        </View>

        {/* Hidden canvas for frame capture */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* Room ID banner */}
        <View style={styles.roomBanner}>
          <Text style={styles.roomBannerText}>Room: {roomId}</Text>
        </View>

        {/* Auto-detection indicator */}
        {isDetecting && (
          <View style={styles.detectionBanner}>
            <Text style={styles.detectionText}>🤟 Auto-Detecting Signs</Text>
          </View>
        )}

        {/* Connection status */}
        {callState.isConnecting && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>Connecting…</Text>
          </View>
        )}
        {callState.error && (
          <View style={[styles.statusBanner, styles.errorBanner]}>
            <Text style={styles.statusText}>{callState.error}</Text>
          </View>
        )}
      </View>

      {/* ── Translation display ── */}
      <View style={styles.translationPanel}>
        <TranslationDisplay
          translation={translationState}
          onClear={clearSentence}
          onSpeak={handleSpeak}
          compact
        />
      </View>

      {/* ── Call controls ── */}
      <CallControls
        isMuted={callState.isMuted}
        isCameraOff={callState.isCameraOff}
        isDetecting={isDetecting}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleDetection={handleToggleDetection}
        onHangUp={handleHangUp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  videoArea: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    borderRadius: 0,
  },
  pipContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  roomBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(10, 22, 40, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roomBannerText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  detectionBanner: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detectionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBanner: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  errorBanner: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  translationPanel: {
    marginHorizontal: 10,
    marginVertical: 6,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionEmoji: {
    fontSize: 60,
  },
  permissionTitle: {
    color: '#e2e8f0',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
});
