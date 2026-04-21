# Implementation Plan: Legacy ElevenLabs Text-to-Speech

## Overview

This plan implements the ElevenLabs TTS integration for Legacy Mode, replacing the microphone recording flow with a text-to-speech flow. Tasks follow a bottom-up order: backend models and service first, then the backend route, followed by frontend types, translations, API client, component refactor, and finally integration wiring. Each task builds incrementally on the previous ones so there is no orphaned code.

## Tasks

- [x] 1. Add backend dependencies and Pydantic models
  - [x] 1.1 Add `elevenlabs` package to `backend/requirements.txt`
    - Append `elevenlabs>=1.0.0,<2.0.0` to the dependencies list
    - _Requirements: 8.1_

  - [x] 1.2 Add TTS request/response models to `backend/api/models.py`
    - Add `LegacyGenerateRequest` model with a `text: str` field
    - Add `LegacyGenerateResponse` model with an `audio_base64: str` field
    - Add `LegacyErrorResponse` model with an `error: str` field
    - _Requirements: 3.1, 3.3_

- [x] 2. Implement ElevenLabs client service
  - [x] 2.1 Create `backend/services/elevenlabs_client.py`
    - Define module-level constants `VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"` and `MODEL_ID = "eleven_flash_v2_5"`
    - Define `ElevenLabsConfigError` and `ElevenLabsTTSError` exception classes
    - Implement `generate_speech(text: str) -> str` that reads `ELEVENLABS_API_KEY` from env, creates an `ElevenLabs` client, calls `client.text_to_speech.convert()`, collects the audio stream into bytes, and returns base64-encoded audio
    - Raise `ElevenLabsConfigError` if the API key is not set
    - Catch SDK exceptions and wrap them as `ElevenLabsTTSError`
    - _Requirements: 3.2, 3.3, 3.4, 8.2, 8.3, 8.4, 8.5_

  - [x] 2.2 Write unit tests for `elevenlabs_client.py`
    - Test that `generate_speech` calls the SDK with the correct `voice_id` and `model_id` (mock the ElevenLabs client)
    - Test that missing `ELEVENLABS_API_KEY` raises `ElevenLabsConfigError`
    - Test that SDK exceptions are wrapped as `ElevenLabsTTSError`
    - Test that `VOICE_ID` and `MODEL_ID` constants have the expected values
    - _Requirements: 3.2, 8.3, 8.4, 8.5_

  - [x] 2.3 Write property test for base64 encoding round-trip
    - **Property 4: Audio base64 encoding round-trip**
    - Generate random byte sequences (0–10 KB), encode to base64, decode back, verify identical bytes
    - **Validates: Requirements 3.3**

- [x] 3. Implement legacy route and register it
  - [x] 3.1 Create `backend/api/legacy_routes.py`
    - Create a new `APIRouter` with `prefix="/legacy"` and `tags=["legacy"]`
    - Implement `POST /generate` endpoint that validates the request text (non-empty, ≤200 chars), calls `generate_speech`, and returns `LegacyGenerateResponse`
    - Return 400 with `LegacyErrorResponse` for empty text ("Text field is required") or text >200 chars ("Text exceeds 200 character limit")
    - Return 500 with `LegacyErrorResponse` for `ElevenLabsConfigError` ("ElevenLabs API key not configured") or `ElevenLabsTTSError` ("Voice generation failed")
    - _Requirements: 3.1, 3.5, 3.6, 6.1, 8.3_

  - [x] 3.2 Register the legacy router in `backend/main.py`
    - Import `legacy_router` from `api.legacy_routes`
    - Call `app.include_router(legacy_router)` to mount the `/legacy` routes as a separate route group
    - _Requirements: 7.3_

  - [x] 3.3 Write unit tests for the legacy route
    - Test valid text returns 200 with `audio_base64` (mock `generate_speech`)
    - Test empty text returns 400 "Text field is required"
    - Test text >200 chars returns 400 "Text exceeds 200 character limit"
    - Test `ElevenLabsConfigError` returns 500 "ElevenLabs API key not configured"
    - Test `ElevenLabsTTSError` returns 500 "Voice generation failed"
    - _Requirements: 3.1, 3.5, 3.6, 6.1, 8.3_

  - [x] 3.4 Write property test for backend text validation
    - **Property 3: Backend text validation rejects invalid input**
    - Generate random empty/whitespace-only strings and strings of length 201–1000, POST to the endpoint (mock `generate_speech`), verify 400 response with the correct error message
    - **Validates: Requirements 3.5, 3.6**

- [x] 4. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add frontend types and translations
  - [x] 5.1 Add TTS types to `frontend/src/types/index.ts`
    - Add `LegacyTTSMessage` interface with fields: `id: string`, `text: string`, `audioData: string`, `createdAt: string`, `type: 'legacy'`
    - Add `LegacyGenerateResponse` interface with field: `audio_base64: string`
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Add TTS translation keys to `frontend/src/i18n/translations.ts`
    - Add keys to the `en` locale: `legacy_tts_title`, `legacy_tts_placeholder`, `legacy_tts_submit`, `legacy_tts_loading`, `legacy_tts_success`, `legacy_tts_error`, `legacy_tts_empty`
    - Use the exact string values from the design document
    - _Requirements: 1.1, 2.2, 2.5, 6.2_

- [x] 6. Add API client function for legacy TTS
  - [x] 6.1 Add `generateLegacySpeech` to `frontend/src/api/client.ts`
    - Implement `generateLegacySpeech(text: string, signal?: AbortSignal): Promise<LegacyGenerateResponse>` following the same pattern as `analyzeImage`
    - POST to `${API_URL}/legacy/generate` with `{ text }` body
    - Parse error responses and throw with the error message
    - _Requirements: 2.1, 3.1_

- [x] 7. Refactor LegacyRecorder component from microphone to TTS
  - [x] 7.1 Refactor `frontend/src/components/LegacyRecorder.tsx`
    - Remove all `MediaRecorder`, `getUserMedia`, `blobToBase64`, and microphone-related logic
    - Update `StoredLegacyMessage` interface to include `text: string` and `type: 'legacy'` (replacing `tag`)
    - Add component state machine: `idle`, `loading`, `success`, `error`
    - Add `<textarea>` with `maxLength={200}` and character counter displaying `"{count} / 200"`
    - Add submit button labeled with `t('legacy_tts_submit')`, disabled when text is empty or state is `loading`
    - Make textarea read-only during `loading` state
    - Show loading text `t('legacy_tts_loading')` during API call
    - On success: show `t('legacy_tts_success')`, auto-play audio via `useAudioPlayer`, create and save `StoredLegacyMessage` to localStorage
    - On error: show `t('legacy_tts_error')`, re-enable textarea and submit button
    - Implement 10-second timeout via `AbortController` on the fetch call
    - Keep saved messages list with playback and delete functionality
    - Display original message text in saved message cards
    - Show `t('legacy_tts_empty')` when no messages exist
    - Handle audio playback errors by showing original text as fallback
    - Handle localStorage `QuotaExceededError` silently
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.2, 6.3, 6.4, 6.5, 7.1, 7.4_

  - [x] 7.2 Write unit tests for the refactored LegacyRecorder
    - Test component renders title, textarea, counter, and submit button on mount
    - Test submit button is disabled when textarea is empty
    - Test submitting valid text calls `generateLegacySpeech` with correct payload
    - Test loading state shows transmitting text and disables controls
    - Test success state shows confirmation and audio control
    - Test error state shows error message and re-enables controls
    - Test 10-second timeout aborts request and shows error
    - Test saved messages load from localStorage on mount
    - Test clicking a saved message plays its audio
    - Test audio playback error shows original text as fallback
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.5, 4.1, 5.3, 5.4, 6.2, 6.3, 6.4_

  - [x] 7.3 Write property test for character counter accuracy
    - **Property 1: Character counter accuracy**
    - Generate random strings of length 0–200, simulate typing into the textarea, verify the counter displays exactly `"{length} / 200"` and the textarea contains the full input string
    - **Validates: Requirements 1.2, 1.3**

  - [x] 7.4 Write property test for submit button enabled state
    - **Property 2: Submit button enabled state**
    - Generate random strings of length 0–300, simulate typing, verify the submit button is enabled if and only if the string length is between 1 and 200 inclusive
    - **Validates: Requirements 1.4, 1.6**

  - [x] 7.5 Write property test for localStorage round-trip
    - **Property 5: Legacy message localStorage round-trip**
    - Generate random `LegacyTTSMessage` objects (random id, text 1–200 chars, random audioData, random ISO timestamp, type "legacy"), serialize to JSON, store in localStorage, retrieve and parse, verify deep equality
    - **Validates: Requirements 5.1, 5.2, 5.5**

- [x] 8. Checkpoint — Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integration wiring and final verification
  - [x] 9.1 Verify end-to-end wiring
    - Confirm `LegacyRecorder` imports `generateLegacySpeech` from the API client
    - Confirm `LegacyRecorder` uses `useAudioPlayer` for playback
    - Confirm `LegacyRecorder` uses translation keys from `translations.ts`
    - Confirm the legacy router is mounted in `main.py` as a separate route group from `/analyze`
    - Confirm `LegacyRecorder` does not import from scanning or environmental message modules
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Write integration tests
    - Test full TTS flow: type text → submit → receive audio → playback → localStorage save (mock backend)
    - Test localStorage persistence: store messages, re-mount component, verify messages display
    - Test POST /legacy/generate end-to-end with mocked ElevenLabs SDK
    - _Requirements: 2.1, 2.5, 4.1, 5.1, 5.3_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at backend and frontend boundaries
- Property tests validate the 5 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend uses Python (FastAPI + ElevenLabs SDK) and the frontend uses TypeScript (React + Vite)
