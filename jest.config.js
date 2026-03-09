/**
 * jest.config.js
 *
 * Test configuration for Sign Call.
 *
 * Uses jest-expo preset which:
 *  - Configures babel-jest with babel-preset-expo
 *  - Sets up transformIgnorePatterns for RN/Expo packages
 *  - Provides mocks for native Expo modules (Camera, Speech, etc.)
 *
 * Module name mappings handle native-only packages (react-native-webrtc,
 * expo-camera/CameraView) that cannot run in Node/jsdom.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  // Only pick up .test.ts(x) files inside src/
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],

  // Resolve TypeScript path aliases (@/* → src/*)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',

    // react-native-webrtc is a native module — replace with a lightweight mock
    '^react-native-webrtc$': '<rootDir>/src/__mocks__/react-native-webrtc.ts',

    // expo-camera's CameraView is native-only — replace with a stub
    '^expo-camera$': '<rootDir>/src/__mocks__/expo-camera.ts',
  },

  // File extensions Jest will look at
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Collect coverage from all source files (not just tested ones)
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
};
