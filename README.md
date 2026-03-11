# Sign Call 🤟

A mobile video calling app that empowers **deaf** and **non-speaking** individuals to communicate through sign language. During a video call, the app detects ASL (American Sign Language) signs in real time, converts them to **on-screen text**, and speaks them aloud so every participant can understand.

---

## Features

| Feature | Details |
|---|---|
| 📞 Video calling | Peer-to-peer via WebRTC (`react-native-webrtc`) |
| 🤟 Sign detection | On-device MediaPipe Hands (TF.js CPU backend) — works offline after first model download |
| 📝 Text translation | Live sign → letter → word → sentence accumulation |
| 🔊 Audio output | Text-to-speech via `expo-speech` so hearing participants understand |
| 🔐 Secure peer IDs | Generated with `crypto.getRandomValues` |
| ⚙️ Configurable | ASL / BSL / ISL variants, TTS voice, rate, pitch, detection sensitivity |

---

## Quick Start

### 1 — Install dependencies

```bash
npm install
```

### 2 — Start the signaling server (local development)

```bash
cd server
npm install        # installs the ws package
node signaling.js  # starts on ws://localhost:8080/ws
```

### 3 — Configure the signaling URL

Create a `.env.local` file in the project root:

```
EXPO_PUBLIC_SIGNALING_URL=ws://localhost:8080/ws
```

> The app falls back to `ws://localhost:8080/ws` automatically, so this step is optional during local development.

### 4 — Start the Expo app

```bash
npm run android   # Android device / emulator
npm run ios       # iOS device / simulator (requires macOS)
```

---

## Sign Language Detection

Sign detection uses **MediaPipe Hands via the TF.js CPU backend** — no native modules, no platform-specific compilation.

**How it works:**

1. The CallScreen captures camera frames at ~5 fps using `CameraView.takePictureAsync()`
2. Each JPEG frame is decoded to raw pixels by `jpeg-js` (pure JavaScript)
3. A `tf.Tensor3D` is created and passed to MediaPipe Hands (`@tensorflow-models/hand-pose-detection`)
4. The model returns 21 hand keypoints
5. `gestureClassifier.ts` converts keypoints → finger extension state → ASL sign label
6. A majority-vote smoother reduces flickering across frames

**Demo mode** activates automatically if the model can't be loaded (e.g. network error, offline first launch). It cycles through "HELLO WORLD" to demonstrate the full translation UI.

**Improving accuracy:**

- Use a device with a dedicated GPU and switch to the WebGL backend (`@tensorflow/tfjs-react-native`) for 5–10× faster inference
- Increase `detectionSensitivity` in Settings for stricter matching
- Extend `src/utils/signDictionary.ts` with additional gesture patterns

---

## Signaling Server

The bundled signaling server (`server/signaling.js`) is a minimal Node.js WebSocket relay that manages rooms and forwards WebRTC offer/answer/ICE messages between peers.

### Running locally

```bash
cd server && npm install && node signaling.js
# Listening on ws://0.0.0.0:8080/ws
# Health: http://localhost:8080/health
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port to listen on |
| `MAX_PEERS` | `10` | Maximum peers per room |

### Deploying to production

Any Node.js host works. The server has **one dependency** (`ws`) and requires **Node.js ≥ 18**.

**Recommended platforms (free tier available):**

| Platform | Command / Config |
|---|---|
| [Railway](https://railway.app) | Add the `server/` directory as root; auto-detects `package.json` |
| [Render](https://render.com) | Web Service → Node → `node signaling.js` |
| [Fly.io](https://fly.io) | `fly launch` from `server/` |

After deployment, set the production URL in `.env.production`:

```
EXPO_PUBLIC_SIGNALING_URL=wss://your-server.railway.app/ws
```

Then rebuild the app:

```bash
npx eas build --platform android --profile production
```

### Protocol

All messages are JSON. Clients connect with:

```
ws://<host>/ws?roomId=ABC-123&peerId=<id>&userName=Alice
```

See the [protocol documentation](server/signaling.js) at the top of `server/signaling.js` for the full message schema.

---

## Project Structure

```
├── App.tsx                     Navigation root (React Navigation)
├── index.ts                    Expo entry point
├── app.json                    Expo app config
├── server/
│   ├── signaling.js            WebSocket signaling server
│   └── package.json
└── src/
    ├── types/index.ts          Shared TypeScript types
    ├── utils/
    │   ├── signDictionary.ts   ASL alphabet, numbers, phrase lookup
    │   └── gestureClassifier.ts  21-landmark → finger state → sign label
    ├── services/
    │   ├── SignLanguageService.ts  ML pipeline (MediaPipe Hands + TF.js CPU)
    │   ├── CallService.ts          WebRTC PeerConnection + WebSocket signaling
    │   └── SpeechService.ts        expo-speech TTS wrapper
    ├── hooks/
    │   ├── useSignDetection.ts  Frame → sign → word → sentence
    │   ├── useVideoCall.ts      WebRTC call state hook
    │   └── useSpeech.ts         TTS hook
    ├── components/
    │   ├── VideoView.tsx        RTCView with mute / camera-off states
    │   ├── SignOverlay.tsx      Animated detection overlay on local PiP
    │   ├── CallControls.tsx     Mute / Camera / Sign detection / Hang up
    │   └── TranslationDisplay.tsx  Live sign → word → sentence + Speak button
    └── screens/
        ├── HomeScreen.tsx       Create or join a room
        ├── CallScreen.tsx       Main call UI (video + translation)
        └── SettingsScreen.tsx   ASL/BSL/ISL, TTS config, sensitivity
```

---

## Permissions

| Permission | Why |
|---|---|
| Camera | Video calling + sign language detection |
| Microphone | Audio during calls |
| Internet | WebRTC data channel + signaling |
