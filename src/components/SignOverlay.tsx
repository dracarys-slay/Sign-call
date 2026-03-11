/**
 * SignOverlay
 *
 * Animated overlay that appears on the local camera view when a sign
 * is detected. Shows:
 *   - The recognized sign (letter / number)
 *   - A pulsing border animation while detecting
 *   - Confidence level
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface Props {
  currentSign: string;
  confidence: number;
  isDetecting: boolean;
}

export function SignOverlay({ currentSign, confidence, isDetecting }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation while detecting
  useEffect(() => {
    if (isDetecting) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isDetecting, pulseAnim]);

  // Fade in / out sign badge when sign changes
  useEffect(() => {
    if (currentSign) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [currentSign, fadeAnim]);

  const borderColor = isDetecting
    ? confidence > 0.7
      ? 'rgba(74, 222, 128, 0.7)'
      : 'rgba(59, 130, 246, 0.5)'
    : 'transparent';

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          borderColor,
          transform: [{ scale: pulseAnim }],
        },
      ]}
      pointerEvents="none"
    >
      {/* Detecting indicator */}
      {isDetecting && (
        <View style={styles.detectingBadge}>
          <View style={styles.detectingDot} />
          <Text style={styles.detectingText}>Detecting</Text>
        </View>
      )}

      {/* Sign badge */}
      {currentSign ? (
        <Animated.View style={[styles.signBadge, { opacity: fadeAnim }]}>
          <Text style={styles.signText}>{currentSign}</Text>
          <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 12,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 10,
  },
  detectingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 22, 40, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detectingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  detectingText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  signBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  signText: {
    color: '#e2e8f0',
    fontSize: 30,
    fontWeight: '800',
  },
  confidenceText: {
    color: '#94a3b8',
    fontSize: 10,
  },
});
