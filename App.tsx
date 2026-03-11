/**
 * App.tsx — Sign Call
 *
 * Root component. Sets up:
 *   - Error boundary (catch unhandled React errors gracefully)
 *   - Settings context (shared + persisted user preferences)
 *   - Safe area provider
 *   - React Navigation with a native stack
 *   - Dark status bar
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { HomeScreen } from './src/screens/HomeScreen';
import { CallScreen } from './src/screens/CallScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SignGuideScreen } from './src/screens/SignGuideScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SettingsProvider } from './src/context/SettingsContext';
import type { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const DARK_THEME = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: '#0a1628',
    card: '#0f2744',
    text: '#e2e8f0',
    border: 'rgba(59, 130, 246, 0.2)',
    primary: '#3b82f6',
    notification: '#3b82f6',
  },
};

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor="#0a1628" />
          <NavigationContainer theme={DARK_THEME}>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: { backgroundColor: '#0f2744' },
                headerTintColor: '#e2e8f0',
                headerTitleStyle: { fontWeight: '700', fontSize: 18 },
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: '#0a1628' },
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Call"
                component={CallScreen}
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings', headerBackTitle: 'Back' }}
              />
              <Stack.Screen
                name="SignGuide"
                component={SignGuideScreen}
                options={{ title: 'Sign Language Guide', headerBackTitle: 'Back' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
