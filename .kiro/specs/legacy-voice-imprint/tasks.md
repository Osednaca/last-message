# Implementation Plan: Legacy Voice Imprint

## Overview

This plan implements the Voice Imprint feature for Legacy Mode in a bottom-up order: backend service and endpoint first, then frontend types/utilities/hooks, then UI components, then the orchestrator flow, and finally integration into the app shell. Property-based tests and unit tests are interleaved close to the code they validate.

## Tasks

- [x] 1. Backend: Extend ElevenLabs client with voice cloning
  - [x] 1.1 Add `ElevenLabsVoiceCloneError` exception and `clone_voice_and_generate` function to `backend/services/elevenlabs_client.py`
    - Add `ElevenLabsVoiceCloneError` exception class
    - Implement `clone_voice_and_generate(audio_bytes, filename, text)` that:
      - Reads `ELEVENLABS_API_KEY` from environment (raises `ElevenLabsConfigError` if missing)
      - Calls `client.voices.ivc.create(name="temp-voice-imprint", files=[audio_file])` to get `voice_id`
      - In a `try/finally` block: calls `client.text_to_speech.convert(voice_id=voice_id, model_id=MODEL_ID, text=text)`, collects audio bytes, and in `finally` calls `client.voices.delete(voice_id=voice_id)`
      - Returns base64-encoded audio string
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 9.5, 11.1, 11.3, 11.4_

  - [x] 1.2 Write property test for base64 audio encoding round-trip (backend)
    - **Property 1: Base64 audio encoding round-trip**
    - Generate random byte sequences with hypothesis, encode to base64, decode back, assert equality
    - Test file: `backend/tests/test_voice_clone_property.py`
    - **Validates: Requirements 3.4**

  - [x] 1.3 Write property test for voice clone cleanup invariant (backend)
    - **Property 2: Voice clone cleanup invariant**
    - Generate random success/failure scenarios for TTS, mock ElevenLabs SDK, verify `voices.delete` is always called when a `voice_id` was obtained
    - Test file: `backend/tests/test_voice_clone_property.py`
    - **Validates: Requirements 3.8, 9.5**

  - [x] 1.4 Write unit tests for `clone_voice_and_generate`
    - Mock ElevenLabs SDK calls; verify clone → TTS → delete sequence
    - Test error paths: clone failure, TTS failure, API key missing
    - Verify cleanup: `voices.delete` called even when TTS fails
    - Test file: `backend/tests/test_voice_clone.py`
    - _Requirements: 3.2, 3.3, 3.8, 7.1, 7.2, 11.2_

- [x] 2. Backend: Add clone endpoint and response model
  - [x] 2.1 Add `LegacyCloneResponse` model to `backend/api/models.py`
    - Add `LegacyCloneResponse(BaseModel)` with `audio_base64: str` field
    - _Requirements: 3.4_

  - [x] 2.2 Add `POST /legacy/clone` route to `backend/api/legacy_routes.py`
    - Accept `multipart/form-data` with `audio: UploadFile` (required) and `text: str = Form("")` (optional)
    - Validate audio file is present and non-empty (return 400 if missing)
    - Call `clone_voice_and_generate` with audio bytes, filename, and text
    - Handle `ElevenLabsConfigError` (500), `ElevenLabsVoiceCloneError` (500), `ElevenLabsTTSError` (500)
    - Return `LegacyCloneResponse` on success
    - _Requirements: 3.1, 3.4, 3.6, 7.1, 7.2, 10.1, 11.2_

  - [x] 2.3 Write unit tests for the `/legacy/clone` endpoint
    - Test success path with mocked `clone_voice_and_generate`
    - Test 400 for missing/empty audio file
    - Test 500 for config error, clone error, TTS error
    - Verify existing `/legacy/generate` endpoint still works (regression)
    - Test file: `backend/tests/test_voice_clone_endpoint.py`
    - _Requirements: 3.1, 3.6, 7.1, 7.2, 10.4, 11.2_

- [x] 3. Checkpoint — Verify backend
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 4. Frontend: Add types, translations, and API client
  - [x] 4.1 Add `VoiceImprintRecord` and `LegacyCloneResponse` types to `frontend/src/types/index.ts`
    - Add `VoiceImprintRecord` interface with `id`, `type: 'legacy_voice'`, `text`, `audioData`, `createdAt` fields
    - Add `LegacyCloneResponse` interface with `audio_base64` field
    - _Requirements: 6.1_

  - [x] 4.2 Add voice imprint translation keys to `frontend/src/i18n/translations.ts`
    - Add keys for: entry screen title/subtitle, start recording, stop recording, processing, signal lost, retry, save imprint, replay, storage full, mic permission error, narrative overlay texts
    - _Requirements: 1.1, 1.2, 1.5, 2.7, 5.2, 7.3, 7.4, 7.6, 7.7_

  - [x] 4.3 Add `cloneVoice` function to `frontend/src/api/client.ts`
    - Implement `cloneVoice(audioBlob: Blob, text: string, signal?: AbortSignal)` that sends `multipart/form-data` POST to `/legacy/clone`
    - Append audio blob as `'audio'` field and text as `'text'` field to FormData
    - Parse and return `LegacyCloneResponse` on success, throw on error
    - _Requirements: 4.3_

- [x] 5. Frontend: Implement useVoiceRecorder hook
  - [x] 5.1 Create `frontend/src/hooks/useVoiceRecorder.ts`
    - Implement hook with `startRecording`, `stopRecording`, `isRecording`, `elapsedSeconds`, `analyserNode`, `error` return values
    - Create `AudioContext` + `AnalyserNode` for real-time frequency data
    - Use `MediaRecorder` with `mimeType: 'audio/webm;codecs=opus'` (fallback to `'audio/webm'` then `'audio/wav'`)
    - Implement timer via `setInterval` with 1-second ticks
    - Auto-stop at `maxDuration` (default 10s), enforce `minDuration` (default 5s)
    - Clean up all tracks on `MediaStream` when unmounting
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1, 9.3_

  - [x] 5.2 Write unit tests for useVoiceRecorder hook
    - Test start/stop recording, elapsed time tracking, blob production
    - Test auto-stop at max duration
    - Test min duration enforcement
    - Test file: `frontend/src/hooks/useVoiceRecorder.test.ts`
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [x] 6. Frontend: Implement voice imprint sub-components
  - [x] 6.1 Create `frontend/src/components/voice-imprint/EntryScreen.tsx`
    - Display title "Leave your voice in the future", subtitle "Your voice can outlive you"
    - Render "Start Recording" button that calls `onStart` prop
    - Use dark background with green/cyan glow effects
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2_

  - [x] 6.2 Create `frontend/src/components/voice-imprint/WaveformVisualizer.tsx`
    - Accept `analyserNode` and `isActive` props
    - Render animated bars driven by frequency data from `AnalyserNode`
    - Use `requestAnimationFrame` for smooth updates
    - Apply green/cyan glow colors consistent with app theme
    - _Requirements: 2.2, 8.3_

  - [x] 6.3 Create `frontend/src/components/voice-imprint/VoiceRecorderStep.tsx`
    - Accept `onComplete: (audioBlob: Blob) => void` prop
    - Use `useVoiceRecorder` hook for recording logic
    - Display `WaveformVisualizer`, `Recording_Timer`, and stop button
    - Disable stop button until 5 seconds elapsed
    - Call `onComplete` with the produced blob when recording stops
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.3, 8.5_

  - [x] 6.4 Create `frontend/src/components/voice-imprint/MessageStep.tsx`
    - Accept `onConfirm: (text: string) => void` prop
    - Render textarea (max 200 chars) with character counter
    - Provide default message from predefined set if user submits empty
    - Include `DEFAULT_MESSAGES` array with 5 legacy-themed messages
    - _Requirements: 4.1, 4.2_

  - [x] 6.5 Create `frontend/src/components/voice-imprint/NarrativeOverlay.tsx`
    - Accept `onComplete` and optional `showIntro` props
    - Display timed text sequence: optional typewriter intro (3s), "📡 Signal reconstructed…" (2s), "Voice imprint detected…" (2s), "Playing message from the future…" (1.5s)
    - Call `onComplete` when sequence finishes
    - Apply glitch effect styling on text
    - _Requirements: 5.1, 5.2, 8.4, 12.1, 12.2, 12.3_

  - [x] 6.6 Create `frontend/src/components/voice-imprint/PlaybackScreen.tsx`
    - Accept `audioData`, `messageText`, `onReplay`, `onSave`, `onRetry`, `showSave` props
    - Orchestrate `NarrativeOverlay` → audio playback via `useAudioPlayer`
    - Show "Replay" and "Save Imprint" buttons after playback completes
    - Display `messageText` as visual fallback on audio playback error
    - Apply dark background with green/cyan glow and pulsing animation during playback
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 7.6, 8.1, 8.2_

- [x] 7. Checkpoint — Verify frontend sub-components
  - Ensure all frontend tests pass, ask the user if questions arise.

- [x] 8. Frontend: Implement VoiceImprintFlow orchestrator
  - [x] 8.1 Create `frontend/src/components/VoiceImprintFlow.tsx`
    - Manage flow state machine: `entry` → `recording` → `message` → `processing` → `playback`
    - Store `audioBlob`, `messageText`, and `generatedAudio` in component state
    - On `processing` step: call `cloneVoice` API with 15s timeout via `AbortController`
    - On API error: show retry option returning to `recording` step
    - On retry failure: fall back to `generateLegacySpeech` with default voice
    - On `playback` save: create `VoiceImprintRecord`, persist to localStorage under `echoes-voice-imprints` key
    - Implement localStorage load/save/delete helpers for `VoiceImprintRecord` collection
    - Display saved imprints list with play and delete buttons
    - Use smooth fade transitions between steps
    - _Requirements: 1.4, 1.5, 2.7, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.3, 7.4, 7.5, 7.7, 8.5, 9.4_

  - [x] 8.2 Write property test for voice imprint record structure (frontend)
    - **Property 3: Voice imprint record structure**
    - Generate random text and audio data with fast-check, create a `VoiceImprintRecord`, verify all required fields exist with correct types
    - Test file: `frontend/src/components/VoiceImprintFlow.property.test.ts`
    - **Validates: Requirements 6.1**

  - [x] 8.3 Write property test for voice imprint localStorage round-trip (frontend)
    - **Property 4: Voice imprint localStorage round-trip**
    - Generate random `VoiceImprintRecord` objects, store to localStorage, retrieve, assert deep equality
    - Test file: `frontend/src/components/VoiceImprintFlow.property.test.ts`
    - **Validates: Requirements 6.2, 6.5**

  - [x] 8.4 Write property test for deletion removes exactly one record (frontend)
    - **Property 5: Deletion removes exactly one record**
    - Generate random arrays of `VoiceImprintRecord` objects, pick a random record to delete, verify collection shrinks by 1 and no longer contains the deleted ID
    - Test file: `frontend/src/components/VoiceImprintFlow.property.test.ts`
    - **Validates: Requirements 6.6**

  - [x] 8.5 Write unit tests for VoiceImprintFlow
    - Test step transitions (entry → recording → message → processing → playback)
    - Test save creates correct `VoiceImprintRecord` in localStorage
    - Test error handling shows retry option
    - Test fallback to default voice on retry failure
    - Test file: `frontend/src/components/VoiceImprintFlow.test.tsx`
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 9. Frontend: Integrate VoiceImprintFlow into App.tsx
  - [x] 9.1 Add tab/toggle in Legacy Mode overlay to switch between "Text Message" and "Voice Imprint"
    - Import `VoiceImprintFlow` in `frontend/src/App.tsx`
    - Add a toggle or tab UI within the Legacy overlay to switch between `LegacyRecorder` (existing) and `VoiceImprintFlow` (new)
    - Ensure both flows share the same overlay container and styling
    - Add translation keys for tab labels if needed
    - _Requirements: 10.2, 10.3, 10.4_

- [x] 10. Final checkpoint — Full verification
  - Ensure all backend and frontend tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The ElevenLabs Kiro Power should be activated for correct API integration patterns during implementation
