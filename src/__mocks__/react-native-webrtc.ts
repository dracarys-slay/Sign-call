/**
 * Mock for react-native-webrtc
 *
 * react-native-webrtc is a native module that cannot run in the Jest/Node
 * environment. This lightweight stub satisfies all import sites so tests
 * that import components using VideoView (which imports RTCView) can run
 * without a device.
 */

export const RTCView = 'RTCView';
export const RTCPeerConnection = jest.fn().mockImplementation(() => ({
  addTrack: jest.fn(),
  close: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: '' }),
  createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: '' }),
  setLocalDescription: jest.fn().mockResolvedValue(undefined),
  setRemoteDescription: jest.fn().mockResolvedValue(undefined),
  addIceCandidate: jest.fn().mockResolvedValue(undefined),
  onicecandidate: null,
  ontrack: null,
  connectionState: 'new',
}));
export const MediaStream = jest.fn().mockImplementation(() => ({
  toURL: jest.fn().mockReturnValue('mock://stream'),
  getTracks: jest.fn().mockReturnValue([]),
  addTrack: jest.fn(),
  removeTrack: jest.fn(),
}));
export const mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    toURL: jest.fn().mockReturnValue('mock://stream'),
    getTracks: jest.fn().mockReturnValue([]),
  }),
};
