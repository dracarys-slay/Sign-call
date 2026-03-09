/**
 * CallControls
 *
 * Bottom control bar for the video call screen.
 * Provides: mute, camera toggle, sign detection toggle, hang up.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';

interface Props {
  isMuted: boolean;
  isCameraOff: boolean;
  isDetecting: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleDetection: () => void;
  onHangUp: () => void;
}

export function CallControls({
  isMuted,
  isCameraOff,
  isDetecting,
  onToggleMute,
  onToggleCamera,
  onToggleDetection,
  onHangUp,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Mute / Unmute */}
      <ControlButton
        icon={isMuted ? '🔇' : '🎙️'}
        label={isMuted ? 'Unmute' : 'Mute'}
        onPress={onToggleMute}
        active={isMuted}
        accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      />

      {/* Camera on/off */}
      <ControlButton
        icon={isCameraOff ? '📵' : '📷'}
        label={isCameraOff ? 'Cam Off' : 'Camera'}
        onPress={onToggleCamera}
        active={isCameraOff}
        accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
      />

      {/* Sign detection */}
      <ControlButton
        icon="🤟"
        label={isDetecting ? 'Stop Sign' : 'Detect'}
        onPress={onToggleDetection}
        active={isDetecting}
        highlight={isDetecting}
        accessibilityLabel={isDetecting ? 'Stop sign detection' : 'Start sign detection'}
      />

      {/* Hang up */}
      <TouchableOpacity
        style={styles.hangUpBtn}
        onPress={onHangUp}
        accessibilityLabel="End call"
        accessibilityRole="button"
      >
        <Text style={styles.hangUpIcon}>📵</Text>
        <Text style={styles.hangUpLabel}>End</Text>
      </TouchableOpacity>
    </View>
  );
}

interface ControlButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  highlight?: boolean;
  accessibilityLabel?: string;
}

function ControlButton({
  icon,
  label,
  onPress,
  active = false,
  highlight = false,
  accessibilityLabel,
}: ControlButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.controlBtn,
        active && styles.controlBtnActive,
        highlight && styles.controlBtnHighlight,
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={styles.controlIcon}>{icon}</Text>
      <Text style={[styles.controlLabel, active && styles.controlLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(10, 22, 40, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.2)',
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e3a5f',
    gap: 2,
  },
  controlBtnActive: {
    backgroundColor: '#374151',
  },
  controlBtnHighlight: {
    backgroundColor: '#1d4ed8',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  controlIcon: {
    fontSize: 22,
  },
  controlLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  controlLabelActive: {
    color: '#e2e8f0',
  },
  hangUpBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dc2626',
    gap: 2,
  },
  hangUpIcon: {
    fontSize: 22,
  },
  hangUpLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
