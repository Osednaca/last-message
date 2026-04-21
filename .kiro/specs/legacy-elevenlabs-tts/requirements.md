# Requirements Document

## Introduction

This feature adds real-time text-to-speech voice generation using the ElevenLabs API to the Legacy Mode of the "Last Message: Echoes from the Future" web application. Currently, Legacy Mode allows users to record their own voice via the device microphone. This feature replaces the microphone recording flow with a text-to-speech flow where users write a short message (up to 200 characters), the backend generates a realistic AI voice using the ElevenLabs Text-to-Speech API, and the frontend plays the generated audio and saves it locally as a "Legacy Message." The ElevenLabs API is used exclusively within Legacy Mode and does not affect the main environmental message playback, which continues to use pre-generated audio files.

## Glossary

- **App**: The "Last Message: Echoes from the Future" web application, consisting of a React frontend and a FastAPI backend
- **Legacy_Mode**: The UI overlay screen where users compose and generate text-to-speech legacy messages
- **Legacy_Input**: The textarea element in Legacy_Mode where users type a short message (maximum 200 characters)
- **Character_Counter**: The UI element displaying the current character count and the 200-character limit for the Legacy_Input
- **Submit_Button**: The button labeled "Send message to the future" that initiates the text-to-speech generation flow
- **Legacy_Endpoint**: The POST /legacy/generate API endpoint on the Backend that accepts text and returns base64-encoded audio
- **ElevenLabs_API**: The ElevenLabs Text-to-Speech API used by the Backend to convert text into realistic AI-generated speech
- **ElevenLabs_Client**: The backend module that wraps the ElevenLabs Python SDK to call the Text-to-Speech API
- **Generated_Audio**: The base64-encoded audio data returned by the Legacy_Endpoint after successful text-to-speech conversion
- **Audio_Player**: The frontend module responsible for playing audio, reused from the existing useAudioPlayer hook
- **Legacy_Message**: A locally stored record containing the message id, original text, base64 audio data, creation timestamp, and a type field set to "legacy"
- **Legacy_Collection**: The list of all saved Legacy_Messages stored in the browser localStorage under the key "echoes-legacy-messages"
- **Loading_State**: The UI state displayed while the Legacy_Endpoint is processing, showing "📡 Transmitting to the future…"
- **Success_State**: The UI state displayed after successful audio generation, showing "Message received by the future" with an audio playback control
- **Backend**: The Python FastAPI server that hosts the Legacy_Endpoint

## Requirements

### Requirement 1: Legacy Mode Text Input Interface

**User Story:** As a user, I want to type a short message in Legacy Mode, so that I can compose a personal message to be converted into a voice recording.

#### Acceptance Criteria

1. WHEN the user opens Legacy_Mode, THE App SHALL display a title "Leave a message for the future", the Legacy_Input textarea, the Character_Counter, and the Submit_Button
2. THE Legacy_Input SHALL accept text input with a maximum length of 200 characters
3. WHILE the user types in the Legacy_Input, THE Character_Counter SHALL display the current character count out of the 200-character maximum (e.g., "42 / 200")
4. WHEN the Legacy_Input contains zero characters, THE Submit_Button SHALL be disabled
5. WHEN the Legacy_Input character count reaches 200, THE Legacy_Input SHALL prevent additional character entry
6. WHEN the Legacy_Input contains between 1 and 200 characters, THE Submit_Button SHALL be enabled

### Requirement 2: Text-to-Speech Submission Flow

**User Story:** As a user, I want to submit my message and hear it spoken in a realistic AI voice, so that my legacy message feels authentic and emotional.

#### Acceptance Criteria

1. WHEN the user taps the Submit_Button with valid text in the Legacy_Input, THE App SHALL send the text to the Legacy_Endpoint via an HTTP POST request
2. WHILE the Legacy_Endpoint is processing, THE App SHALL display the Loading_State with the text "📡 Transmitting to the future…"
3. WHILE the Legacy_Endpoint is processing, THE Submit_Button SHALL be disabled to prevent duplicate submissions
4. WHILE the Legacy_Endpoint is processing, THE Legacy_Input SHALL be read-only to prevent text modification
5. WHEN the Legacy_Endpoint returns Generated_Audio, THE App SHALL transition to the Success_State displaying "Message received by the future" and an audio playback control

### Requirement 3: Backend Text-to-Speech Endpoint

**User Story:** As a developer, I want a backend endpoint that converts text to speech using ElevenLabs, so that the frontend can generate voice messages without exposing API keys.

#### Acceptance Criteria

1. THE Legacy_Endpoint SHALL accept HTTP POST requests at the path /legacy/generate with a JSON body containing a "text" field (string)
2. WHEN the Legacy_Endpoint receives a valid text string, THE ElevenLabs_Client SHALL call the ElevenLabs_API using the `client.text_to_speech.convert()` method with a predefined voice ID and the model ID "eleven_flash_v2_5"
3. WHEN the ElevenLabs_API returns an audio stream, THE Legacy_Endpoint SHALL collect the stream into bytes, encode the bytes as base64, and return a JSON response containing an "audio_base64" field
4. THE ElevenLabs_Client SHALL authenticate with the ElevenLabs_API using an API key read from the ELEVENLABS_API_KEY environment variable
5. IF the "text" field is missing or empty, THEN THE Legacy_Endpoint SHALL return an HTTP 400 response with an error message "Text field is required"
6. IF the "text" field exceeds 200 characters, THEN THE Legacy_Endpoint SHALL return an HTTP 400 response with an error message "Text exceeds 200 character limit"

### Requirement 4: Audio Playback of Generated Speech

**User Story:** As a user, I want to hear my generated message played back immediately, so that I can experience the result right away.

#### Acceptance Criteria

1. WHEN the App receives Generated_Audio from the Legacy_Endpoint, THE Audio_Player SHALL convert the base64 audio data to a playable audio URL and begin playback automatically
2. WHILE the Audio_Player is playing Generated_Audio, THE App SHALL display a visible audio playback control in the Success_State
3. WHEN audio playback completes, THE App SHALL keep the audio playback control visible so the user can replay the message
4. WHEN the user taps the replay control, THE Audio_Player SHALL play the Generated_Audio again from the beginning

### Requirement 5: Local Storage of Legacy Messages

**User Story:** As a user, I want my generated messages saved locally, so that I can revisit and replay them later.

#### Acceptance Criteria

1. WHEN the App receives Generated_Audio from the Legacy_Endpoint, THE App SHALL create a Legacy_Message record containing a unique id, the original text, the base64 audio data, a creation timestamp in ISO 8601 format, and a type field set to "legacy"
2. WHEN a Legacy_Message is created, THE App SHALL persist the Legacy_Message to the Legacy_Collection in browser localStorage
3. WHEN the user opens Legacy_Mode, THE App SHALL load and display all previously saved Legacy_Messages from the Legacy_Collection
4. WHEN the user selects a saved Legacy_Message, THE Audio_Player SHALL play the stored base64 audio data
5. FOR ALL Legacy_Messages added to the Legacy_Collection, storing a Legacy_Message to localStorage then retrieving it SHALL produce an equivalent Legacy_Message record (round-trip property)

### Requirement 6: Error Handling and Recovery

**User Story:** As a user, I want clear feedback when something goes wrong, so that I can understand the issue and try again.

#### Acceptance Criteria

1. IF the ElevenLabs_API returns an error or is unreachable, THEN THE Legacy_Endpoint SHALL return an HTTP 500 response with the error message "Voice generation failed"
2. IF the Legacy_Endpoint returns an error response, THEN THE App SHALL display the message "Transmission failed… try again" and re-enable the Submit_Button and Legacy_Input
3. IF the Legacy_Endpoint does not respond within 10 seconds, THEN THE App SHALL abort the request, display the message "Transmission failed… try again", and re-enable the Submit_Button and Legacy_Input
4. IF an error occurs during audio playback of Generated_Audio, THEN THE App SHALL display the original message text as a fallback
5. IF localStorage is full when saving a Legacy_Message, THEN THE App SHALL silently degrade without crashing the UI

### Requirement 7: Scope Isolation

**User Story:** As a developer, I want the ElevenLabs integration isolated to Legacy Mode, so that the main scanning experience remains unaffected.

#### Acceptance Criteria

1. THE App SHALL use the ElevenLabs_API exclusively within the Legacy_Endpoint and Legacy_Mode components
2. THE App SHALL continue to use pre-generated audio files for all environmental Messages played during the scanning experience
3. THE Legacy_Endpoint SHALL be registered on the Backend as a separate route group from the existing /analyze endpoint
4. THE Legacy_Mode frontend components SHALL not import or depend on the scanning or environmental message modules

### Requirement 8: Backend Configuration and Dependencies

**User Story:** As a developer, I want the ElevenLabs integration properly configured, so that the backend can authenticate and communicate with the API.

#### Acceptance Criteria

1. THE Backend SHALL include the `elevenlabs` Python package in the project dependencies (requirements.txt)
2. THE ElevenLabs_Client SHALL read the API key from the ELEVENLABS_API_KEY environment variable at initialization
3. IF the ELEVENLABS_API_KEY environment variable is not set, THEN THE Legacy_Endpoint SHALL return an HTTP 500 response with the error message "ElevenLabs API key not configured"
4. THE ElevenLabs_Client SHALL use a predefined voice ID configured as a constant in the backend service module
5. THE ElevenLabs_Client SHALL use the "eleven_flash_v2_5" model ID for low-latency generation
