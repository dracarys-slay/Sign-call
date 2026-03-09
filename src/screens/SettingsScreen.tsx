/**
 * SettingsScreen
 *
 * User preferences:
 *   - Display name
 *   - Sign language variant (ASL / BSL / ISL)
 *   - TTS enabled / voice / rate / pitch
 *   - Detection sensitivity
 *   - Auto-speak toggle
 *
 * Settings are read from and persisted via SettingsContext (AsyncStorage).
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import type { AppSettings, RootStackParamList } from '../types';
import { useSettings } from '../context/SettingsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SIGN_LANGUAGES: AppSettings['signLanguage'][] = ['ASL', 'BSL', 'ISL'];

export function SettingsScreen({ navigation }: Props) {
  const { settings: savedSettings, replaceSettings } = useSettings();

  // Local draft so the user can discard unsaved changes
  const [draft, setDraft] = useState<AppSettings>(savedSettings);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);

  // Keep draft in sync when navigating back to this screen
  useEffect(() => {
    setDraft(savedSettings);
  }, [savedSettings]);

  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then(setVoices)
      .catch(() => setVoices([]));
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    // replaceSettings atomically updates context state AND persists to AsyncStorage,
    // avoiding any stale-closure hazard from calling updateSetting() + saveSettings().
    await replaceSettings(draft);
    Alert.alert('Saved', 'Your settings have been saved.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  function previewTTS() {
    Speech.speak('Hello, I am using Sign Call to communicate with you.', {
      rate: draft.ttsRate,
      pitch: draft.ttsPitch,
      voice: draft.ttsVoice || undefined,
    });
  }

  const englishVoices = voices.filter((v) =>
    v.language?.toLowerCase().startsWith('en'),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>
        </View>

        {/* Profile */}
        <SettingSection title="Profile">
          <SettingRow label="Display Name">
            <TextInput
              style={styles.textInput}
              value={draft.userName}
              onChangeText={(t) => update('userName', t)}
              placeholder="Your name"
              placeholderTextColor="#475569"
              autoCapitalize="words"
              accessibilityLabel="Display name"
            />
          </SettingRow>
        </SettingSection>

        {/* Sign Language */}
        <SettingSection title="Sign Language">
          <View style={styles.segmentRow}>
            {SIGN_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.segmentBtn,
                  draft.signLanguage === lang && styles.segmentBtnActive,
                ]}
                onPress={() => update('signLanguage', lang)}
                accessibilityLabel={`Use ${lang}`}
                accessibilityState={{ selected: draft.signLanguage === lang }}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    draft.signLanguage === lang && styles.segmentBtnTextActive,
                  ]}
                >
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helperText}>
            ASL = American, BSL = British, ISL = Indian Sign Language.
            Additional language packs can be added via updates.
          </Text>
        </SettingSection>

        {/* Detection */}
        <SettingSection title="Sign Detection">
          <SettingRow label="Detection Sensitivity">
            <View style={styles.sliderRow}>
              {[0.3, 0.45, 0.6, 0.75].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.sensitivityBtn,
                    Math.abs(draft.detectionSensitivity - val) < 0.05 &&
                      styles.sensitivityBtnActive,
                  ]}
                  onPress={() => update('detectionSensitivity', val)}
                  accessibilityLabel={`Sensitivity ${Math.round(val * 100)}%`}
                >
                  <Text style={styles.sensitivityBtnText}>{Math.round(val * 100)}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>
          <SettingRow label="Show Hand Landmarks" end>
            <Switch
              value={draft.showLandmarks}
              onValueChange={(v) => update('showLandmarks', v)}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor="#fff"
              accessibilityLabel="Show hand landmarks"
            />
          </SettingRow>
        </SettingSection>

        {/* Text-to-Speech */}
        <SettingSection title="Text-to-Speech">
          <SettingRow label="Enable TTS" end>
            <Switch
              value={draft.ttsEnabled}
              onValueChange={(v) => update('ttsEnabled', v)}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor="#fff"
              accessibilityLabel="Enable text to speech"
            />
          </SettingRow>
          <SettingRow label="Auto-Speak Sentences" end>
            <Switch
              value={draft.autoSpeak}
              onValueChange={(v) => update('autoSpeak', v)}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor="#fff"
              accessibilityLabel="Auto speak sentences"
              disabled={!draft.ttsEnabled}
            />
          </SettingRow>
          <SettingRow label="Speech Rate">
            <View style={styles.sliderRow}>
              {[0.6, 0.8, 0.9, 1.0, 1.2].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.sensitivityBtn,
                    Math.abs(draft.ttsRate - val) < 0.05 && styles.sensitivityBtnActive,
                  ]}
                  onPress={() => update('ttsRate', val)}
                  accessibilityLabel={`Speech rate ${val}x`}
                >
                  <Text style={styles.sensitivityBtnText}>{val}×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>
          <SettingRow label="Pitch">
            <View style={styles.sliderRow}>
              {[0.8, 0.9, 1.0, 1.1, 1.2].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.sensitivityBtn,
                    Math.abs(draft.ttsPitch - val) < 0.05 && styles.sensitivityBtnActive,
                  ]}
                  onPress={() => update('ttsPitch', val)}
                  accessibilityLabel={`Pitch ${val}`}
                >
                  <Text style={styles.sensitivityBtnText}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>

          {englishVoices.length > 0 && (
            <SettingRow label="Voice">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voiceScroll}>
                <TouchableOpacity
                  style={[
                    styles.voiceChip,
                    !draft.ttsVoice && styles.voiceChipActive,
                  ]}
                  onPress={() => update('ttsVoice', '')}
                  accessibilityLabel="Default voice"
                >
                  <Text style={styles.voiceChipText}>Default</Text>
                </TouchableOpacity>
                {englishVoices.slice(0, 6).map((v) => (
                  <TouchableOpacity
                    key={v.identifier}
                    style={[
                      styles.voiceChip,
                      draft.ttsVoice === v.identifier && styles.voiceChipActive,
                    ]}
                    onPress={() => update('ttsVoice', v.identifier)}
                    accessibilityLabel={`Voice ${v.name}`}
                  >
                    <Text style={styles.voiceChipText}>{v.name?.split(' ')[0] ?? v.identifier}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SettingRow>
          )}

          <TouchableOpacity
            style={styles.previewBtn}
            onPress={previewTTS}
            disabled={!draft.ttsEnabled}
            accessibilityLabel="Preview voice"
          >
            <Text style={styles.previewBtnText}>▶ Preview Voice</Text>
          </TouchableOpacity>
        </SettingSection>

        {/* About */}
        <SettingSection title="About">
          <Text style={styles.aboutText}>
            Sign Call empowers deaf and non-speaking individuals to communicate
            seamlessly during video calls. Sign language gestures are detected in
            real-time, converted to text, and spoken aloud — bridging the
            communication gap for everyone.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </SettingSection>

        {/* Save */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => { void handleSave(); }}
          accessibilityLabel="Save settings"
          accessibilityRole="button"
        >
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function SettingRow({
  label,
  children,
  end = false,
}: {
  label: string;
  children: React.ReactNode;
  end?: boolean;
}) {
  return (
    <View style={[styles.row, end && styles.rowEnd]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={end ? undefined : styles.rowValue}>{children}</View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingVertical: 8,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 24,
    fontWeight: '800',
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 2,
  },
  sectionContent: {
    backgroundColor: '#0f2744',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  row: {
    padding: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  rowEnd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  rowLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  rowValue: {
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e2e8f0',
    fontSize: 15,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  segmentBtnText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 14,
  },
  segmentBtnTextActive: {
    color: '#fff',
  },
  helperText: {
    color: '#475569',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 18,
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  sensitivityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sensitivityBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  sensitivityBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  voiceScroll: {
    flexGrow: 0,
  },
  voiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  voiceChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  voiceChipText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  previewBtn: {
    margin: 14,
    marginTop: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  previewBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  aboutText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
  },
  versionText: {
    color: '#374151',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
