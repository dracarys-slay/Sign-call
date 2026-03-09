/**
 * HomeScreen
 *
 * Landing screen where users:
 *   1. Enter their display name
 *   2. Create a new room or join an existing one by entering a room ID
 *   3. Navigate to Settings
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * Generate a cryptographically random room ID in the format ABC-123.
 * Uses crypto.getRandomValues (Web Crypto API, available in Hermes/JSC).
 */
function generateRoomId(): string {
  const letterBytes = new Uint8Array(3);
  const digitBytes = new Uint8Array(2);
  crypto.getRandomValues(letterBytes);
  crypto.getRandomValues(digitBytes);

  // Map each byte to a letter A–Z (26 letters, modulo 26)
  const letters = Array.from(letterBytes, (b) =>
    String.fromCharCode(65 + (b % 26)),
  ).join('');

  // Map 2 bytes to a 3-digit number 100–999
  const digits = (100 + ((digitBytes[0] << 8 | digitBytes[1]) % 900)).toString();

  return `${letters}-${digits}`;
}

export function HomeScreen({ navigation }: Props) {
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [nameError, setNameError] = useState('');
  const [roomError, setRoomError] = useState('');

  function validateAndJoin(id: string) {
    let valid = true;
    if (!userName.trim()) {
      setNameError('Please enter your name');
      valid = false;
    } else {
      setNameError('');
    }
    if (!id.trim()) {
      setRoomError('Please enter a room ID');
      valid = false;
    } else {
      setRoomError('');
    }
    if (!valid) return;
    navigation.navigate('Call', { roomId: id.trim(), userName: userName.trim() });
  }

  function handleCreate() {
    if (!userName.trim()) {
      setNameError('Please enter your name');
      return;
    }
    setNameError('');
    const newRoom = generateRoomId();
    navigation.navigate('Call', { roomId: newRoom, userName: userName.trim() });
  }

  function handleJoin() {
    validateAndJoin(roomId);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🤟</Text>
            <Text style={styles.title}>Sign Call</Text>
            <Text style={styles.subtitle}>
              Video calling with real-time sign language translation
            </Text>
          </View>

          {/* Feature list */}
          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name input */}
            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="Enter your display name"
              placeholderTextColor="#475569"
              value={userName}
              onChangeText={(t) => { setUserName(t); setNameError(''); }}
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel="Your display name"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Create or join</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Create new room */}
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleCreate}
              accessibilityLabel="Create a new call"
              accessibilityRole="button"
            >
              <Text style={styles.createBtnText}>📞 Create New Call</Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <Text style={styles.orText}>— or join existing —</Text>
            </View>

            {/* Room ID input */}
            <Text style={styles.inputLabel}>Room ID</Text>
            <TextInput
              style={[styles.input, roomError ? styles.inputError : null]}
              placeholder="e.g. ABC-123"
              placeholderTextColor="#475569"
              value={roomId}
              onChangeText={(t) => { setRoomId(t.toUpperCase()); setRoomError(''); }}
              autoCapitalize="characters"
              returnKeyType="go"
              onSubmitEditing={handleJoin}
              accessibilityLabel="Room ID"
            />
            {roomError ? <Text style={styles.errorText}>{roomError}</Text> : null}

            <TouchableOpacity
              style={styles.joinBtn}
              onPress={handleJoin}
              accessibilityLabel="Join existing call"
              accessibilityRole="button"
            >
              <Text style={styles.joinBtnText}>🔗 Join Call</Text>
            </TouchableOpacity>
          </View>

          {/* Settings link */}
          <TouchableOpacity
            style={styles.settingsLink}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Text style={styles.settingsLinkText}>⚙️ Settings & Preferences</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const FEATURES = [
  {
    icon: '🤟',
    label: 'Sign Language Recognition',
    desc: 'Real-time ASL detection during video calls',
  },
  {
    icon: '📝',
    label: 'Text Conversion',
    desc: 'Signs are instantly converted to readable text',
  },
  {
    icon: '🔊',
    label: 'Audio Conversion',
    desc: 'Text is spoken aloud so everyone can understand',
  },
  {
    icon: '🌐',
    label: 'Accessible Communication',
    desc: 'Bridging the gap for deaf & non-speaking individuals',
  },
];

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    gap: 8,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: 'rgba(30, 58, 95, 0.4)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  featureIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  featureDesc: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    gap: 10,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#e2e8f0',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  dividerText: {
    color: '#475569',
    fontSize: 12,
  },
  createBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  orRow: {
    alignItems: 'center',
    marginVertical: 2,
  },
  orText: {
    color: '#475569',
    fontSize: 12,
  },
  joinBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  joinBtnText: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '700',
  },
  settingsLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsLinkText: {
    color: '#475569',
    fontSize: 14,
  },
});
