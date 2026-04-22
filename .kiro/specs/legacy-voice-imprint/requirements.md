# Requirements Document

## Introduction

This feature upgrades Legacy Mode in the "Last Message: Echoes from the Future" application to support full voice cloning using the ElevenLabs API. Currently, Legacy Mode allows users to type a text message that is converted to speech using a predefined ElevenLabs voice. This feature adds a new "Voice Imprint" flow where users record a short sample of their own voice (5–10 seconds), the backend creates a temporary voice clone via the ElevenLabs voice cloning API, generates a message using that cloned voice, and returns the synthesized audio for immersive playback. The experience is framed as "preserving a human voice as a signal from the past to the future," with a narrative-driven UI featuring cinematic overlays, waveform animations, and glitch effects. The cloned voice is ephemeral and not persisted. The resulting audio is saved locally as a "Legacy Voice Imprint" record.

## Glossary

- **App**: The "Last Message: Echoes from the Future" web application, consisting of a React frontend and a FastAPI backend
- **Legacy_Mode**: The UI overlay screen where users interact with legacy message features, accessible via the "Legacy Mode" navigation button
- **Voice_Imprint_Flow**: The multi-step user flow within Legacy_Mode for recording voice, cloning, generating a message, and playing back the result
- **Entry_Screen**: The initial screen of the Voice_Imprint_Flow displaying the title "Leave your voice in the future", subtitle "Your voice can outlive you", and a "Start Recording" call-to-action button
- **Voice_Recorder**: The frontend component that captures audio from the user's microphone using the MediaRecorder API
- **Recording_Timer**: The UI element displaying elapsed recording time in seconds during voice capture
- **Waveform_Animation**: The animated visual element displayed during voice recording that responds to audio input levels
- **Voice_Sample**: The audio blob captured by the Voice_Recorder, between 5 and 10 seconds in duration, in WAV or WebM format
- **Clone_Endpoint**: The POST /legacy/clone API endpoint on the Backend that accepts an audio file and returns base64-encoded synthesized speech
- **ElevenLabs_Clone_API**: The ElevenLabs voice cloning API used by the Backend to create a temporary voice from a Voice_Sample
- **ElevenLabs_TTS_API**: The ElevenLabs text-to-speech API used by the Backend to generate speech using a cloned voice
- **Voice_Clone**: The temporary voice profile created by the ElevenLabs_Clone_API from a Voice_Sample, identified by a voice_id
- **Message_Text**: The text content used to generate the final spoken message, either from a predefined set or user-provided input
- **Generated_Audio**: The base64-encoded audio data returned by the Clone_Endpoint after voice cloning and text-to-speech synthesis
- **Narrative_Overlay**: The sequence of cinematic text overlays displayed before and during audio playback (e.g., "📡 Signal reconstructed…", "Voice imprint detected…", "Playing message from the future…")
- **Playback_Screen**: The UI screen that plays the Generated_Audio with the Narrative_Overlay and provides a replay button
- **Voice_Imprint_Record**: A locally stored record containing the message id, type "legacy_voice", message text, base64 audio data, and creation timestamp
- **Imprint_Collection**: The list of all saved Voice_Imprint_Records stored in the browser localStorage
- **Audio_Player**: The frontend module responsible for playing audio, reused from the existing useAudioPlayer hook
- **Backend**: The Python FastAPI server that hosts the Clone_Endpoint
- **ElevenLabs_Client**: The backend module that wraps the ElevenLabs Python SDK for voice cloning and text-to-speech operations

## Requirements

### Requirement 1: Voice Imprint Entry Screen

**User Story:** As a user, I want to see an emotionally compelling entry screen for the voice imprint feature, so that I understand the purpose and feel motivated to record my voice.

#### Acceptance Criteria

1. WHEN the user activates the Voice_Imprint_Flow, THE App SHALL display the Entry_Screen with the title "Leave your voice in the future"
2. WHEN the user activates the Voice_Imprint_Flow, THE App SHALL display the subtitle "Your voice can outlive you" below the title on the Entry_Screen
3. THE Entry_Screen SHALL display a "Start Recording" button as the primary call-to-action
4. WHEN the user taps the "Start Recording" button, THE App SHALL request microphone access from the browser and transition to the voice recording screen
5. IF the browser denies microphone access, THEN THE App SHALL display the message "Microphone access is required for voice imprint" and keep the "Start Recording" button enabled for retry

### Requirement 2: Voice Recording

**User Story:** As a user, I want to record a short sample of my voice, so that the system can create a clone of my voice for the legacy message.

#### Acceptance Criteria

1. WHEN the user begins recording, THE Voice_Recorder SHALL capture audio from the device microphone using the MediaRecorder API
2. WHILE the Voice_Recorder is recording, THE App SHALL display the Waveform_Animation and the Recording_Timer showing elapsed seconds
3. WHEN the Recording_Timer reaches 10 seconds, THE Voice_Recorder SHALL stop recording automatically
4. WHEN the user taps the stop button after at least 5 seconds of recording, THE Voice_Recorder SHALL stop recording and produce a Voice_Sample
5. WHILE the Recording_Timer is below 5 seconds, THE App SHALL disable the stop button to enforce the minimum recording duration
6. WHEN recording stops, THE Voice_Recorder SHALL produce a Voice_Sample as a Blob in WAV or WebM format
7. WHEN a valid Voice_Sample is produced, THE App SHALL display the message "Processing voice imprint…" and transition to the cloning step

### Requirement 3: Voice Cloning Backend Endpoint

**User Story:** As a developer, I want a backend endpoint that accepts a voice recording, clones the voice, generates a message, and returns synthesized audio, so that the frontend can deliver the full voice imprint experience without exposing API keys.

#### Acceptance Criteria

1. THE Clone_Endpoint SHALL accept HTTP POST requests at the path /legacy/clone with a multipart/form-data body containing an audio file field
2. WHEN the Clone_Endpoint receives a valid audio file, THE ElevenLabs_Client SHALL call the ElevenLabs_Clone_API to create a temporary Voice_Clone from the uploaded audio
3. WHEN the ElevenLabs_Clone_API returns a voice_id, THE ElevenLabs_Client SHALL call the ElevenLabs_TTS_API using the cloned voice_id to generate speech from the Message_Text
4. WHEN the ElevenLabs_TTS_API returns an audio stream, THE Clone_Endpoint SHALL collect the stream into bytes, encode the bytes as base64, and return a JSON response containing an "audio_base64" field
5. THE ElevenLabs_Client SHALL authenticate with the ElevenLabs_Clone_API and ElevenLabs_TTS_API using an API key read from the ELEVENLABS_API_KEY environment variable
6. IF the uploaded audio file is missing or empty, THEN THE Clone_Endpoint SHALL return an HTTP 400 response with the error message "Audio file is required"
7. THE Clone_Endpoint SHALL store the voice_id only in memory for the duration of the request and not persist the Voice_Clone to any database or file system
8. WHEN the text-to-speech generation completes, THE ElevenLabs_Client SHALL delete the temporary Voice_Clone from ElevenLabs to avoid resource accumulation

### Requirement 4: Message Text Selection

**User Story:** As a user, I want to provide or receive a message to be spoken in my cloned voice, so that the voice imprint carries meaningful content.

#### Acceptance Criteria

1. WHEN the Voice_Imprint_Flow reaches the message step, THE App SHALL allow the user to type a custom message of up to 200 characters
2. THE App SHALL provide a default message text if the user does not enter custom text, selected from a predefined set of legacy-themed messages
3. WHEN the user confirms the message or accepts the default, THE App SHALL send the Voice_Sample and Message_Text to the Clone_Endpoint

### Requirement 5: Immersive Playback Experience

**User Story:** As a user, I want the playback of my voice imprint to feel cinematic and emotionally resonant, so that the experience feels like reconstructing a lost transmission from the future.

#### Acceptance Criteria

1. WHEN the App receives Generated_Audio from the Clone_Endpoint, THE App SHALL display the Narrative_Overlay sequence before starting audio playback
2. THE Narrative_Overlay SHALL display the following messages in sequence with timed transitions: "📡 Signal reconstructed…", "Voice imprint detected…", "Playing message from the future…"
3. WHEN the Narrative_Overlay sequence completes, THE Audio_Player SHALL begin playback of the Generated_Audio automatically
4. WHILE the Audio_Player is playing Generated_Audio, THE Playback_Screen SHALL display a dark background with green and cyan glow effects and a pulsing animation
5. WHEN audio playback completes, THE Playback_Screen SHALL display a "Replay" button and a "Save Imprint" button
6. WHEN the user taps the "Replay" button, THE Audio_Player SHALL play the Generated_Audio again from the beginning with the Narrative_Overlay sequence

### Requirement 6: Local Storage of Voice Imprints

**User Story:** As a user, I want my voice imprints saved locally, so that I can revisit and replay them later.

#### Acceptance Criteria

1. WHEN the user taps the "Save Imprint" button on the Playback_Screen, THE App SHALL create a Voice_Imprint_Record containing a unique id, the type "legacy_voice", the Message_Text, the base64 audio data, and a creation timestamp in ISO 8601 format
2. WHEN a Voice_Imprint_Record is created, THE App SHALL persist the Voice_Imprint_Record to the Imprint_Collection in browser localStorage
3. WHEN the user opens Legacy_Mode, THE App SHALL load and display all previously saved Voice_Imprint_Records from the Imprint_Collection
4. WHEN the user selects a saved Voice_Imprint_Record, THE Audio_Player SHALL play the stored base64 audio data
5. FOR ALL Voice_Imprint_Records added to the Imprint_Collection, storing a record to localStorage then retrieving it SHALL produce an equivalent Voice_Imprint_Record (round-trip property)
6. WHEN the user taps the delete button on a saved Voice_Imprint_Record, THE App SHALL remove the record from the Imprint_Collection and update the display

### Requirement 7: Error Handling and Recovery

**User Story:** As a user, I want clear feedback when something goes wrong during the voice imprint process, so that I can understand the issue and try again.

#### Acceptance Criteria

1. IF the ElevenLabs_Clone_API returns an error or is unreachable, THEN THE Clone_Endpoint SHALL return an HTTP 500 response with the error message "Voice cloning failed"
2. IF the ElevenLabs_TTS_API returns an error after successful cloning, THEN THE Clone_Endpoint SHALL return an HTTP 500 response with the error message "Voice generation failed"
3. IF the Clone_Endpoint returns an error response, THEN THE App SHALL display the message "Signal lost… try again" and provide a "Retry" button that returns the user to the recording step
4. IF the Clone_Endpoint does not respond within 15 seconds, THEN THE App SHALL abort the request, display the message "Signal lost… try again", and provide a "Retry" button
5. IF voice cloning fails and a retry is attempted, THEN THE App SHALL use a default ElevenLabs voice as a fallback for text-to-speech generation instead of cloning
6. IF an error occurs during audio playback of Generated_Audio, THEN THE App SHALL display the Message_Text as a visual fallback
7. IF localStorage is full when saving a Voice_Imprint_Record, THEN THE App SHALL display the message "Storage full — imprint played but not saved" without crashing the UI

### Requirement 8: Immersive UI Styling

**User Story:** As a user, I want the voice imprint interface to feel futuristic and emotionally evocative, so that the experience matches the narrative of preserving a voice for the future.

#### Acceptance Criteria

1. THE Voice_Imprint_Flow screens SHALL use a dark background consistent with the existing App theme
2. THE Voice_Imprint_Flow screens SHALL apply green and cyan glow effects to primary interactive elements and text highlights
3. WHILE the Voice_Recorder is recording, THE Waveform_Animation SHALL display animated bars or wave patterns that respond to audio input levels
4. WHILE the Audio_Player is playing on the Playback_Screen, THE App SHALL display a subtle glitch effect on the Narrative_Overlay text
5. THE Entry_Screen, recording screen, and Playback_Screen SHALL use smooth fade transitions when moving between steps

### Requirement 9: Performance and Constraints

**User Story:** As a user, I want the voice imprint process to complete quickly, so that the experience feels responsive and immersive.

#### Acceptance Criteria

1. THE Voice_Recorder SHALL limit audio recording to a maximum duration of 10 seconds
2. THE Clone_Endpoint SHALL complete the full voice cloning and text-to-speech pipeline and return a response within 15 seconds under normal network conditions
3. THE Clone_Endpoint SHALL accept audio files in WAV and WebM formats
4. THE App SHALL not require user authentication to access the Voice_Imprint_Flow
5. THE Backend SHALL not persist Voice_Clone data beyond the lifetime of a single Clone_Endpoint request

### Requirement 10: Scope Isolation

**User Story:** As a developer, I want the voice imprint feature isolated from existing features, so that the main scanning experience and existing Legacy TTS flow remain unaffected.

#### Acceptance Criteria

1. THE Clone_Endpoint SHALL be registered on the Backend as a separate route within the existing legacy route group, distinct from the /legacy/generate endpoint
2. THE App SHALL continue to use pre-generated audio files for all environmental messages played during the scanning experience
3. THE Voice_Imprint_Flow frontend components SHALL not import or depend on the scanning or environmental message modules
4. THE existing /legacy/generate text-to-speech endpoint SHALL continue to function without modification

### Requirement 11: Backend Configuration and Dependencies

**User Story:** As a developer, I want the voice cloning integration properly configured, so that the backend can authenticate and communicate with the ElevenLabs voice cloning API.

#### Acceptance Criteria

1. THE ElevenLabs_Client SHALL read the API key from the ELEVENLABS_API_KEY environment variable for voice cloning operations
2. IF the ELEVENLABS_API_KEY environment variable is not set, THEN THE Clone_Endpoint SHALL return an HTTP 500 response with the error message "ElevenLabs API key not configured"
3. THE ElevenLabs_Client SHALL use the ElevenLabs Python SDK for voice cloning and text-to-speech API calls
4. THE Backend SHALL reuse the existing `elevenlabs` Python package dependency already listed in requirements.txt

### Requirement 12: Narrative Injection Layer

**User Story:** As a user, I want an optional narrative introduction before my voice imprint plays, so that the experience feels like recovering a lost transmission.

#### Acceptance Criteria

1. BEFORE the Generated_Audio plays on the Playback_Screen, THE App SHALL optionally display the narrative text "We recovered this voice… It belongs to someone from your time…"
2. THE narrative text SHALL appear with a typewriter-style animation over 3 seconds before the Narrative_Overlay sequence begins
3. WHEN the narrative text animation completes, THE App SHALL proceed to the standard Narrative_Overlay sequence and audio playback
