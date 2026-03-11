/**
 * Mock for expo-camera
 *
 * CameraView is a native component that cannot run in Jest/Node.
 * This stub exports the same API surface used by CallScreen so the
 * component tree can be rendered in tests.
 */

import React from 'react';
import { View } from 'react-native';

export const CameraView = React.forwardRef<
  { takePictureAsync: () => Promise<null> },
  React.ComponentPropsWithoutRef<typeof View>
>((props, _ref) => React.createElement(View, props));
CameraView.displayName = 'CameraView';

export const Camera = {
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
};
