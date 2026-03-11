/**
 * VideoView
 *
 * Renders a single video stream (local or remote) with an optional
 * label and muted state indicator.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from '../utils/webrtc';

interface Props {
  stream: MediaStream | null;
  label?: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  style?: object;
  objectFit?: 'cover' | 'contain';
  mirror?: boolean;
}

export function VideoView({
  stream,
  label,
  isMuted = false,
  isCameraOff = false,
  style,
  objectFit = 'cover',
  mirror = false,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {stream && !isCameraOff ? (
        <RTCView
          streamURL={stream.toURL()}
          style={styles.video}
          objectFit={objectFit}
          mirror={mirror}
          zOrder={0}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>{isCameraOff ? '📵' : '📷'}</Text>
          <Text style={styles.placeholderText}>
            {isCameraOff ? 'Camera Off' : 'No Video'}
          </Text>
        </View>
      )}

      {/* Labels */}
      <View style={styles.labelRow}>
        {label ? (
          <View style={styles.labelBadge}>
            <Text style={styles.labelText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
        {isMuted ? (
          <View style={styles.mutedBadge}>
            <Text style={styles.mutedIcon}>🔇</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 40,
  },
  placeholderText: {
    color: '#475569',
    fontSize: 14,
  },
  labelRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  labelBadge: {
    backgroundColor: 'rgba(10, 22, 40, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 120,
  },
  labelText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  mutedBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedIcon: {
    fontSize: 12,
  },
});
