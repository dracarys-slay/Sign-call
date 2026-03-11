/**
 * SignGuideScreen
 *
 * Visual reference guide for ASL (American Sign Language) fingerspelling.
 * Shows all 26 letters A-Z with detailed descriptions of hand positions.
 *
 * This guide helps:
 * - Deaf people learn and reference ASL signs
 * - People who cannot speak communicate using sign language
 * - Anyone wanting to learn sign language for video calls
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignGuide'>;

// ASL Fingerspelling Guide Data
const ASL_SIGNS = [
  { letter: 'A', emoji: '✊', description: 'Make a fist with thumb along the side of your index finger' },
  { letter: 'B', emoji: '🖐️', description: 'Hold fingers together pointing up, thumb crossed in front of palm' },
  { letter: 'C', emoji: '🌙', description: 'Curve all fingers and thumb to form a C shape' },
  { letter: 'D', emoji: '👌', description: 'Touch thumb and middle finger, point index finger up, fold other fingers' },
  { letter: 'E', emoji: '✊', description: 'Curl all fingers down over thumb' },
  { letter: 'F', emoji: '👌', description: 'Touch thumb and index finger, extend other three fingers' },
  { letter: 'G', emoji: '👈', description: 'Point index and thumb horizontally, fold other fingers' },
  { letter: 'H', emoji: '✌️', description: 'Extend index and middle fingers horizontally, fold others' },
  { letter: 'I', emoji: '🤙', description: 'Extend pinky finger up, fold all other fingers' },
  { letter: 'J', emoji: '🤙', description: 'Make I shape and draw a J in the air' },
  { letter: 'K', emoji: '✌️', description: 'Extend index and middle fingers up in V shape, thumb between them' },
  { letter: 'L', emoji: '👍', description: 'Extend index finger and thumb to form L shape' },
  { letter: 'M', emoji: '✊', description: 'Make fist with thumb under first three fingers' },
  { letter: 'N', emoji: '✊', description: 'Make fist with thumb under first two fingers' },
  { letter: 'O', emoji: '👌', description: 'Touch all fingertips to thumb forming O shape' },
  { letter: 'P', emoji: '👇', description: 'Point index down with middle finger extended, thumb between them' },
  { letter: 'Q', emoji: '👇', description: 'Point index and thumb down' },
  { letter: 'R', emoji: '🤞', description: 'Cross index and middle fingers, fold others' },
  { letter: 'S', emoji: '✊', description: 'Make fist with thumb in front of fingers' },
  { letter: 'T', emoji: '✊', description: 'Make fist with thumb between index and middle' },
  { letter: 'U', emoji: '✌️', description: 'Extend index and middle fingers together pointing up' },
  { letter: 'V', emoji: '✌️', description: 'Extend index and middle fingers in V shape' },
  { letter: 'W', emoji: '🖖', description: 'Extend index, middle, and ring fingers' },
  { letter: 'X', emoji: '☝️', description: 'Bend index finger into hook shape' },
  { letter: 'Y', emoji: '🤙', description: 'Extend thumb and pinky, fold other fingers' },
  { letter: 'Z', emoji: '👈', description: 'Point index finger and draw Z shape in the air' },
];

// Common signs and gestures
const COMMON_SIGNS = [
  { sign: 'Hello', emoji: '👋', description: 'Wave your hand side to side' },
  { sign: 'Thank You', emoji: '🙏', description: 'Touch fingers to chin and move hand forward' },
  { sign: 'Please', emoji: '🫱', description: 'Rub hand in circular motion on chest' },
  { sign: 'Yes', emoji: '✊', description: 'Make fist and nod it like a head nodding' },
  { sign: 'No', emoji: '👎', description: 'Tap index and middle finger with thumb (like mouth closing)' },
  { sign: 'Sorry', emoji: '✊', description: 'Make fist and rub in circles on chest' },
  { sign: 'Help', emoji: '🤝', description: 'Place flat hand under fist and lift both up' },
  { sign: 'I Love You', emoji: '🤟', description: 'Extend thumb, index, and pinky' },
  { sign: 'Goodbye', emoji: '👋', description: 'Open and close hand with palm facing out' },
  { sign: 'Welcome', emoji: '🙌', description: 'Move both hands from outside toward body' },
];

// Numbers 0-10
const NUMBERS = [
  { number: '0', emoji: '⭕', description: 'Form O shape with all fingers touching thumb' },
  { number: '1', emoji: '☝️', description: 'Extend index finger up, fold others' },
  { number: '2', emoji: '✌️', description: 'Extend index and middle fingers in V' },
  { number: '3', emoji: '🤟', description: 'Extend thumb, index, and middle fingers' },
  { number: '4', emoji: '🖖', description: 'Extend all fingers except thumb' },
  { number: '5', emoji: '🖐️', description: 'Open hand with all five fingers spread' },
  { number: '6', emoji: '🤙', description: 'Thumb touches pinky, other fingers up' },
  { number: '7', emoji: '✌️', description: 'Thumb touches ring finger, others up' },
  { number: '8', emoji: '🤘', description: 'Thumb touches middle finger, others up' },
  { number: '9', emoji: '☝️', description: 'Thumb touches index finger, others up' },
  { number: '10', emoji: '👊', description: 'Shake fist with thumb up' },
];

// Questions
const QUESTIONS = [
  { sign: 'What?', emoji: '🤷', description: 'Shake both hands with palms up' },
  { sign: 'Where?', emoji: '👈', description: 'Point index finger and shake it side to side' },
  { sign: 'When?', emoji: '⏰', description: 'Tap wrist (watch area) with index finger' },
  { sign: 'Who?', emoji: '👤', description: 'Make circle motion around your mouth with index finger' },
  { sign: 'Why?', emoji: '🤔', description: 'Touch forehead then shake hand in front' },
  { sign: 'How?', emoji: '🙏', description: 'Put hands together then roll them forward' },
];

// Emotions
const EMOTIONS = [
  { sign: 'Happy', emoji: '😊', description: 'Brush hands up your chest twice' },
  { sign: 'Sad', emoji: '😢', description: 'Drag both hands down your face' },
  { sign: 'Angry', emoji: '😠', description: 'Claw hand at face and pull away' },
  { sign: 'Scared', emoji: '😱', description: 'Hands at chest, fingers spread, move apart' },
  { sign: 'Excited', emoji: '🤩', description: 'Brush middle fingers up chest alternating' },
  { sign: 'Tired', emoji: '😴', description: 'Drag relaxed hands down chest' },
];

// Daily Activities
const ACTIVITIES = [
  { sign: 'Eat', emoji: '🍽️', description: 'Bring fingertips to mouth repeatedly' },
  { sign: 'Drink', emoji: '🥤', description: 'Make C-hand and tip toward mouth' },
  { sign: 'Sleep', emoji: '😴', description: 'Draw hand down face and rest on shoulder' },
  { sign: 'Work', emoji: '💼', description: 'Tap fist on top of other fist twice' },
  { sign: 'Study', emoji: '📚', description: 'Wiggle fingers from book position to forehead' },
  { sign: 'Play', emoji: '🎮', description: 'Rotate Y-hands back and forth' },
];

// Emergency & Important
const EMERGENCY = [
  { sign: 'Emergency', emoji: '🚨', description: 'Rotate E-hand near shoulder urgently' },
  { sign: 'Call 911', emoji: '📞', description: 'Make phone sign with 9-1-1 fingerspelling' },
  { sign: 'Doctor', emoji: '👨‍⚕️', description: 'Tap wrist pulse point with fingertips' },
  { sign: 'Hospital', emoji: '🏥', description: 'Draw cross on upper arm' },
  { sign: 'Pain/Hurt', emoji: '🤕', description: 'Twist index fingers toward each other at pain area' },
  { sign: 'Stop', emoji: '✋', description: 'Chop flat hand down sharply' },
];

// Family
const FAMILY = [
  { sign: 'Mother', emoji: '👩', description: 'Tap thumb to chin twice' },
  { sign: 'Father', emoji: '👨', description: 'Tap thumb to forehead twice' },
  { sign: 'Sister', emoji: '👭', description: 'Girl sign then same-hand shape moves down' },
  { sign: 'Brother', emoji: '👬', description: 'Boy sign then same-hand shape moves down' },
  { sign: 'Baby', emoji: '👶', description: 'Rock arms side to side' },
  { sign: 'Friend', emoji: '🤝', description: 'Interlock index fingers, then reverse' },
];

export function SignGuideScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🤟</Text>
          <Text style={styles.title}>Sign Language Guide</Text>
          <Text style={styles.subtitle}>
            Learn ASL (American Sign Language) fingerspelling and common signs
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🌍 Universal Communication</Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📚 How to Use This Guide</Text>
          <Text style={styles.infoText}>
            • Study each hand position carefully{'\n'}
            • Practice in front of a mirror{'\n'}
            • Use during video calls for real-time translation{'\n'}
            • The app automatically detects and translates your signs
          </Text>
        </View>

        {/* ASL Alphabet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔤 ASL Alphabet (A-Z)</Text>
          <Text style={styles.sectionDesc}>
            Fingerspelling for letters and spelling words
          </Text>
          <View style={styles.grid}>
            {ASL_SIGNS.map((item) => (
              <View key={item.letter} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={styles.cardLetter}>{item.letter}</Text>
                </View>
                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Common Signs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Common Signs & Phrases</Text>
          <Text style={styles.sectionDesc}>
            Frequently used signs for everyday communication
          </Text>
          {COMMON_SIGNS.map((item) => (
            <View key={item.sign} style={styles.commonCard}>
              <View style={styles.commonHeader}>
                <Text style={styles.commonEmoji}>{item.emoji}</Text>
                <Text style={styles.commonSign}>{item.sign}</Text>
              </View>
              <Text style={styles.commonDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Numbers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔢 Numbers (0-10)</Text>
          <Text style={styles.sectionDesc}>
            Basic counting in sign language
          </Text>
          <View style={styles.grid}>
            {NUMBERS.map((item) => (
              <View key={item.number} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={styles.cardLetter}>{item.number}</Text>
                </View>
                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Questions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Questions</Text>
          <Text style={styles.sectionDesc}>
            Essential question words for conversations
          </Text>
          {QUESTIONS.map((item) => (
            <View key={item.sign} style={styles.commonCard}>
              <View style={styles.commonHeader}>
                <Text style={styles.commonEmoji}>{item.emoji}</Text>
                <Text style={styles.commonSign}>{item.sign}</Text>
              </View>
              <Text style={styles.commonDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Emotions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>😊 Emotions & Feelings</Text>
          <Text style={styles.sectionDesc}>
            Express how you feel
          </Text>
          {EMOTIONS.map((item) => (
            <View key={item.sign} style={styles.commonCard}>
              <View style={styles.commonHeader}>
                <Text style={styles.commonEmoji}>{item.emoji}</Text>
                <Text style={styles.commonSign}>{item.sign}</Text>
              </View>
              <Text style={styles.commonDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Daily Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏃 Daily Activities</Text>
          <Text style={styles.sectionDesc}>
            Common activities and actions
          </Text>
          {ACTIVITIES.map((item) => (
            <View key={item.sign} style={styles.commonCard}>
              <View style={styles.commonHeader}>
                <Text style={styles.commonEmoji}>{item.emoji}</Text>
                <Text style={styles.commonSign}>{item.sign}</Text>
              </View>
              <Text style={styles.commonDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Emergency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Emergency & Important</Text>
          <Text style={styles.sectionDesc}>
            Critical signs for urgent situations
          </Text>
          {EMERGENCY.map((item) => (
            <View key={item.sign} style={[styles.commonCard, styles.emergencyCard]}>
              <View style={styles.commonHeader}>
                <Text style={styles.commonEmoji}>{item.emoji}</Text>
                <Text style={styles.commonSign}>{item.sign}</Text>
              </View>
              <Text style={styles.commonDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Family */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Family Members</Text>
          <Text style={styles.sectionDesc}>
            Talk about your loved ones
          </Text>
          {FAMILY.map((item) => (
            <View key={item.sign} style={styles.commonCard}>
              <View style={styles.commonHeader}>
                <Text style={styles.commonEmoji}>{item.emoji}</Text>
                <Text style={styles.commonSign}>{item.sign}</Text>
              </View>
              <Text style={styles.commonDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Try It Now */}
        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>🎥 Ready to Try?</Text>
          <Text style={styles.ctaText}>
            Start a video call and use these signs. The app will automatically detect
            and convert them to text and speech!
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Home')}
            accessibilityRole="button"
            accessibilityLabel="Go to home screen"
          >
            <Text style={styles.ctaButtonText}>Start Video Call</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🌐 ASL is used internationally and understood worldwide{'\n'}
            ♿ Accessible communication for everyone
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  headerEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginTop: 8,
  },
  badgeText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  infoTitle: {
    color: '#6ee7b7',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  sectionDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: 'rgba(30, 58, 95, 0.4)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3b82f6',
  },
  cardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  commonCard: {
    backgroundColor: 'rgba(30, 58, 95, 0.4)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    gap: 8,
  },
  commonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commonEmoji: {
    fontSize: 28,
  },
  commonSign: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  commonDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
  },
  emergencyCard: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: 'rgba(220, 38, 38, 0.4)',
  },
  ctaBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  ctaText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
});
