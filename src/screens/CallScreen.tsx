/**
 * CallScreen
 *
 * Main video call screen with:
 *   - Remote participant video (full screen)
 *   - Local camera preview (picture-in-picture)
 *   - Sign language detection overlay on local view
 *   - Translation display panel (text output)
 *   - Call controls (mute, camera, detection, hang up)
 *   - Text-to-speech for recognized signs
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
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

  // Live settings from context — respects user preferences set in SettingsScreen
  const { settings: contextSettings } = useSettings();
  const settings = { ...contextSettings, userName };

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const cameraRef = useRef<CameraView>(null);
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
  } = useSignDetection(settings);

  const { speakText, stopSpeech } = useSpeech(settings);

  // ── Permissions ──────────────────────────────────────────────────────────

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasCameraPermission(status === 'granted');
    });
  }, []);

  // ── Join call on mount ───────────────────────────────────────────────────

  useEffect(() => {
    joinRoom(roomId, userName);
    return () => {
      leaveRoom();
      stopSpeech();
    };
    // joinRoom/leaveRoom/stopSpeech are stable useCallback references;
    // roomId and userName are the params that determine which call to join.
  }, [roomId, userName, joinRoom, leaveRoom, stopSpeech]);

  // ── Auto-speak new translations ──────────────────────────────────────────

  // Extracted primitives to allow exhaustive deps without object churn
  const autoSpeak = settings.autoSpeak;
  const ttsEnabled = settings.ttsEnabled;

  const lastSpokenSentence = useRef('');
  useEffect(() => {
    const { fullSentence } = translationState;
    if (
      autoSpeak &&
      ttsEnabled &&
      fullSentence &&
      fullSentence !== lastSpokenSentence.current
    ) {
      lastSpokenSentence.current = fullSentence;
      speakText(fullSentence);
    }
  }, [translationState.fullSentence, autoSpeak, ttsEnabled, speakText]);

  // ── Camera frame capture loop ────────────────────────────────────────────

  const captureAndProcess = useCallback(async () => {
    if (!cameraRef.current || !isDetecting) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: true,
        skipProcessing: true,
      });
      if (photo?.base64) {
        const frame: CapturedFrame = {
          dataUri: `data:image/jpeg;base64,${photo.base64}`,
          width: photo.width,
          height: photo.height,
        };
        await processFrame(frame);
      }
    } catch {
      // frame capture can fail sporadically — silently ignore
    }
  }, [isDetecting, processFrame]);

  useEffect(() => {
    if (isDetecting) {
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
  }, [isDetecting, captureAndProcess]);

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
    navigation.goBack();
  }, [stopDetecting, leaveRoom, navigation]);

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
          Please enable camera permissions in your device settings.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />

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
          <CameraView
            ref={cameraRef}
            style={styles.pip}
            facing="front"
          >
            <SignOverlay
              currentSign={translationState.currentSign}
              confidence={translationState.confidence}
              isDetecting={isDetecting}
            />
          </CameraView>
        </View>

        {/* Room ID banner */}
        <View style={styles.roomBanner}>
          <Text style={styles.roomBannerText}>Room: {roomId}</Text>
        </View>

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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  pip: {
    width: '100%',
    height: '100%',
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
