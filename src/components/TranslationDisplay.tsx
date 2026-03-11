/**
 * TranslationDisplay
 *
 * Shows the real-time sign translation:
 *   - Current detected sign (large letter)
 *   - Word being built
 *   - Full sentence accumulated this call
 *   - Confidence indicator
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import type { TranslationState } from '../types';

interface Props {
  translation: TranslationState;
  onClear: () => void;
  onSpeak: (text: string) => void;
  compact?: boolean;
}

export function TranslationDisplay({ translation, onClear, onSpeak, compact = false }: Props) {
  const { currentSign, currentWord, fullSentence, confidence, isDetecting } = translation;

  const confidencePct = Math.round(confidence * 100);
  const confidenceColor =
    confidence > 0.75 ? '#4ade80' : confidence > 0.45 ? '#facc15' : '#f87171';

  const speakTarget = fullSentence || currentWord || currentSign;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Current sign indicator */}
      {currentSign ? (
        <View style={styles.signBadge}>
          <Text style={styles.signLetter}>{currentSign}</Text>
          <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
        </View>
      ) : (
        <View style={styles.signBadge}>
          <Text style={styles.signLetterEmpty}>
            {isDetecting ? '…' : '✋'}
          </Text>
        </View>
      )}

      {/* Word being formed */}
      {!compact && (
        <View style={styles.wordRow}>
          <Text style={styles.wordLabel}>Word:</Text>
          <Text style={styles.wordText} numberOfLines={1}>
            {currentWord || '—'}
          </Text>
        </View>
      )}

      {/* Full sentence */}
      <View style={styles.sentenceBox}>
        <Text style={styles.sentenceText} numberOfLines={compact ? 2 : 4}>
          {fullSentence || (isDetecting ? 'Start signing…' : 'Tap detection to begin')}
        </Text>
      </View>

      {/* Action row */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.speakBtn]}
          onPress={() => onSpeak(speakTarget)}
          disabled={!speakTarget}
          accessibilityLabel="Speak translation"
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>🔊 Speak</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.clearBtn]}
          onPress={onClear}
          accessibilityLabel="Clear translation"
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>🗑 Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Confidence bar */}
      {!compact && currentSign ? (
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              { width: `${confidencePct}%` as `${number}%`, backgroundColor: confidenceColor },
            ]}
          />
          <Text style={styles.confidenceLabel}>{confidencePct}% confidence</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10, 22, 40, 0.92)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  containerCompact: {
    padding: 10,
    gap: 6,
  },
  signBadge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    position: 'relative',
  },
  signLetter: {
    fontSize: 36,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 1,
  },
  signLetterEmpty: {
    fontSize: 28,
    color: '#64748b',
  },
  confidenceDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  wordText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    flex: 1,
  },
  sentenceBox: {
    backgroundColor: 'rgba(30, 58, 95, 0.6)',
    borderRadius: 10,
    padding: 10,
    minHeight: 50,
  },
  sentenceText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  speakBtn: {
    backgroundColor: '#3b82f6',
  },
  clearBtn: {
    backgroundColor: '#374151',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  confidenceBar: {
    height: 14,
    backgroundColor: '#1e293b',
    borderRadius: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 7,
  },
  confidenceLabel: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    color: '#e2e8f0',
    fontSize: 10,
    lineHeight: 14,
  },
});
