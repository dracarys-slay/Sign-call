/**
 * VideoView (Web version)
 *
 * Renders a single video stream using HTML5 video element
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream as unknown as globalThis.MediaStream;
    }
  }, [stream]);

  return (
    <View style={[styles.container, style]}>
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          style={{
            width: '100%',
            height: '100%',
            objectFit: objectFit,
            transform: mirror ? 'scaleX(-1)' : 'none',
          }}
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
