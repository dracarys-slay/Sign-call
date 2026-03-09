# Sign-call

Sign-call is a prototype for an accessible video-calling experience for deaf or non-verbal users. It demonstrates:
- Live video calling UI (local + mirrored remote preview for demo)
- Simulated sign-language recognition that produces captions and spoken audio
- Text-to-speech output for hearing participants

> Note: The current prototype uses a mock recognizer. Replace it with a real sign-language model or API to ship production-ready features.

## Run the demo locally
```bash
python -m http.server 8000
```
Then open http://localhost:8000 in your browser and start the call.

## How it works
1. Start the call to enable your camera (required for the video tiles).
2. Use **Simulate sign detection** to trigger a mock translation, or enable **Auto-translate** to stream simulated detections every few seconds.
3. Captions appear as text and are read aloud using the browser's speech synthesis.

## Next steps for a full build
- Replace the mock recognizer with a real sign-language detection pipeline (e.g., MediaPipe + custom gestures, TF.js, or a hosted API).
- Wire the video tiles to a real WebRTC session with signaling.
- Persist transcripts and deliver them to both call participants in real time.
