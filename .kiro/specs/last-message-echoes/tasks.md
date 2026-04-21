# Implementation Plan: Last Message - Echoes from the Future

## Overview

This plan implements an immersive web app where users scan real-world objects via their camera and receive emotional voice messages from a climate-affected future. The frontend is React + Vite with Tailwind CSS and shadcn/ui. The backend is Python FastAPI with Gemini Vision API integration. Implementation proceeds bottom-up: data models and utilities first, then backend API, then frontend components, wiring everything together at the end.

## Tasks

- [x] 1. Set up project structure and shared data models
  - [x] 1.1 Initialize frontend project with React, Vite, Tailwind CSS, and shadcn/ui; install dependencies including fast-check for testing
    - Create Vite React TypeScript project scaffold
    - Configure Tailwind CSS with dark theme and green/teal/cyan color palette
    - Install shadcn/ui and configure component library
    - Install fast-check and vitest as dev dependencies
    - _Requirements: 13.5_

  - [x] 1.2 Initialize backend project with FastAPI; install dependencies including hypothesis for testing
    - Create Python project with FastAPI, uvicorn, httpx, pydantic
    - Install pytest and hypothesis as dev dependencies
    - Set up project structure: `api/`, `services/`, `tests/`
    - _Requirements: 3.1_

  - [x] 1.3 Define frontend TypeScript types and interfaces
    - Create `Category`, `Message`, `MessageStore`, `CollectionRecord`, `LegacyMessage`, `OverlayState`, `AnalyzeResponse`, `AnalyzeError`, and `TranslationStore` types as specified in the design
    - _Requirements: 4.1, 5.2, 7.1, 9.1, 10.4, 11.3_

  - [x] 1.4 Define backend Pydantic models
    - Create `AnalyzeRequest`, `AnalyzeResponse`, and `AnalyzeErrorResponse` models as specified in the design
    - _Requirements: 3.5, 3.6_

- [x] 2. Implement backend category mapper and Gemini client
  - [x] 2.1 Implement the Category Mapper module (`services/category_mapper.py`)
    - Implement `map_to_category(label: str) -> str` as a pure function
    - Define `CATEGORY_MAP` dictionary with known object-to-category mappings
    - Define `VALID_CATEGORIES` set with the five categories: water, air, fauna, consumption, energy
    - Return `"consumption"` as default for unknown labels
    - Handle case insensitivity and whitespace trimming on input labels
    - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3_

  - [x] 2.2 Write property test for Category Mapper
    - **Property 1: Category mapping correctness**
    - Generate random known labels from the mapping table and verify correct category is returned; generate random unknown strings and verify "consumption" default; verify idempotence by calling multiple times with the same label
    - **Validates: Requirements 3.3, 3.4, 4.2, 4.3, 4.4**

  - [x] 2.3 Write unit tests for Category Mapper
    - Test specific known mappings (bottle→consumption, tree→fauna, car→energy, sky→air, river→water)
    - Test case insensitivity ("Bottle" vs "bottle")
    - Test whitespace trimming (" bottle " → "consumption")
    - Test unknown label returns "consumption"
    - _Requirements: 4.2, 4.3_

  - [x] 2.4 Implement the Gemini Vision Client (`services/gemini_client.py`)
    - Create async function to send base64 image to Gemini Vision API with a prompt for single-object identification
    - Extract and return the object label string from the API response
    - Raise typed exceptions on API errors, timeouts, and empty results
    - _Requirements: 3.1, 3.2, 3.6_

  - [x] 2.5 Write unit tests for Gemini Vision Client
    - Test successful classification with mocked API response
    - Test API error handling (raises exception)
    - Test timeout handling
    - Test empty/null result handling
    - _Requirements: 3.1, 3.2, 3.6_

- [x] 3. Implement backend /analyze endpoint
  - [x] 3.1 Implement the POST /analyze endpoint (`api/routes.py`)
    - Accept `AnalyzeRequest` with base64-encoded image
    - Call Gemini Vision Client to classify the image
    - Call Category Mapper to map the label to a category
    - Return `AnalyzeResponse` with label and category on success
    - Return `AnalyzeErrorResponse` with appropriate status codes (400, 500) on failure
    - Validate request body (missing/empty image field returns 400)
    - Handle invalid base64 encoding (returns 400)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Write unit tests for /analyze endpoint
    - Test valid request returns label and category (mock Gemini client)
    - Test missing image field returns 400
    - Test invalid base64 returns 400
    - Test Gemini API error returns 500
    - Test Gemini timeout returns 500
    - Test Gemini returns no label returns 500
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [x] 4. Checkpoint - Backend complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 5. Implement frontend data layer and utilities
  - [x] 5.1 Implement the Translation Store (`i18n/translations.ts`)
    - Create `TranslationStore` as `Record<string, Record<string, string>>` with `"en"` as default locale
    - Include all user-facing text strings: scan button label, overlay state texts ("Point your camera at an object", "Analyzing environment...", "Signal detected", "Transmitting message..."), error messages, collection labels, legacy mode labels
    - Implement `t(key: string, locale?: string): string` helper function
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 5.2 Write property test for Translation Store serialization
    - **Property 7: Translation store serialization round-trip**
    - Generate random TranslationStore objects → JSON.stringify → JSON.parse → verify deep equality
    - **Validates: Requirements 11.5**

  - [x] 5.3 Write property test for Translation lookup correctness
    - **Property 6: Translation lookup correctness**
    - Generate random valid keys from the store → call `t(key)` → verify returned value matches stored value
    - **Validates: Requirements 11.4**

  - [x] 5.4 Implement the Message Store (`data/messages.ts`)
    - Create static message data with 3-5 messages per category (water, air, fauna, consumption, energy)
    - Each message has `id`, `text`, and `audioPath` fields
    - Implement `getRandomMessage(category: Category): Message` function that returns a random message from the given category's list
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.5 Write property test for Message selection
    - **Property 2: Message selection returns correct category**
    - Generate random valid categories → call `getRandomMessage` → verify returned message exists in that category's message list
    - **Validates: Requirements 5.3**

  - [x] 5.6 Write property test for Message serialization
    - **Property 3: Message serialization round-trip**
    - Generate random Message objects → JSON.stringify → JSON.parse → verify deep equality of id, text, and audioPath fields
    - **Validates: Requirements 5.5**

  - [x] 5.7 Implement the Collection Manager (`hooks/useCollection.ts`)
    - Create custom React hook managing discovered messages in localStorage (key: `"echoes-collection"`)
    - Store records as `CollectionRecord` with `messageId`, `category`, and `discoveredAt` (ISO 8601)
    - Prevent duplicate entries by checking `messageId` before adding
    - Expose `addToCollection(record)`, `getCollection()`, `isDiscovered(messageId): boolean`
    - Handle `QuotaExceededError` gracefully
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 5.8 Write property test for Collection no-duplicate invariant
    - **Property 4: Collection no-duplicate invariant**
    - Generate random message IDs and random repeat counts → add same ID multiple times → verify exactly one entry per ID
    - **Validates: Requirements 9.5**

  - [x] 5.9 Write property test for Collection record round-trip
    - **Property 5: Collection record round-trip**
    - Generate random CollectionRecord objects → store to mock localStorage → retrieve → verify deep equality
    - **Validates: Requirements 9.6**

- [x] 6. Implement frontend camera and capture modules
  - [x] 6.1 Implement the Camera Module (`components/Camera.tsx`)
    - Request camera permission via `navigator.mediaDevices.getUserMedia`
    - Render `<video>` element as fullscreen background with object-cover styling
    - Expose a ref for frame capture by the Image Capturer
    - Handle `NotAllowedError` (permission denied) with user-facing message
    - Handle `NotFoundError` (no camera) with user-facing message
    - _Requirements: 1.1, 1.2, 1.3, 13.1_

  - [x] 6.2 Implement the Image Capturer hook (`hooks/useImageCapture.ts`)
    - Create custom hook that takes a video element ref
    - Draw current video frame to an offscreen `<canvas>`
    - Return base64-encoded JPEG string via `canvas.toDataURL('image/jpeg')`
    - Expose `captureFrame(): string` function
    - _Requirements: 2.1_

  - [x] 6.3 Implement the Audio Player hook (`hooks/useAudioPlayer.ts`)
    - Create custom hook wrapping HTML5 `Audio` API
    - Expose `play(src: string): Promise<void>`, `stop(): void`, `isPlaying: boolean`, `error: string | null`
    - Fire `onEnd` callback when playback completes
    - Handle load/play errors by setting error state
    - _Requirements: 6.1, 6.4_

  - [x] 6.4 Write unit tests for Audio Player hook
    - Test play starts playback
    - Test stop halts playback
    - Test onEnd callback fires on completion
    - Test error state set on playback failure
    - _Requirements: 6.1, 6.4_

- [x] 7. Implement UI overlay system and visual effects
  - [x] 7.1 Implement the Overlay System (`components/Overlay.tsx`)
    - Accept `state: OverlayState`, `objectLabel?: string`, `messageText?: string` as props
    - Render Idle state: "Point your camera at an object" text
    - Render Scanning state: "Analyzing environment..." text with scanning animation
    - Render Detected state: "Signal detected", object label, "Message from the future available"
    - Render Playing state: "Transmitting message..." with message text visible
    - Apply CSS fade-in transitions between state changes
    - Use Translation Store for all user-facing text
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.2 Implement visual effects
    - Add subtle glitch effect on transition to Detected state
    - Add background blur effect to Camera Preview during Playing state
    - Add pulsing gradient animation with green/cyan colors during Playing state
    - Add pulsing glow animation synchronized with audio playback
    - Apply fade-in effect on all overlay state transitions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 6.2_

  - [x] 7.3 Write unit tests for Overlay System
    - Test correct text rendered for each of the four states
    - Test correct CSS classes applied per state
    - Test fade-in class applied on state transitions
    - Test glitch, blur, and gradient classes applied in correct states
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3_

- [x] 8. Implement scan orchestrator and main app layout
  - [x] 8.1 Implement the Scan Orchestrator (`components/ScanOrchestrator.tsx`)
    - Coordinate the full scan flow: capture frame → POST /analyze → select message → play audio
    - Manage overlay state transitions: Idle → Scanning → Detected → Playing → Idle
    - Disable Scan Button during processing and re-enable on completion or error
    - Implement 5-second timeout with `AbortController` on the fetch call
    - Handle API errors and timeout by displaying error message and returning to Idle
    - Add discovered message to Collection after playback
    - Fall back to displaying message text if audio fails
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.3, 5.4, 6.1, 6.3, 6.4, 9.1, 12.1, 12.2, 12.3_

  - [x] 8.2 Implement the main App layout and navigation (`App.tsx`)
    - Render Camera Preview as fullscreen background
    - Display Scan Button centered at bottom of screen
    - Add Collection button and Legacy Mode button as navigation controls
    - Toggle Collection view as overlay on Collection button tap
    - Toggle Legacy Mode interface as overlay on Legacy Mode button tap
    - Apply dark color scheme with green/teal primary colors, cyan accent glows, near-black background
    - _Requirements: 1.4, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 8.3 Write unit tests for Scan Orchestrator
    - Test full scan flow with mocked API returning valid response
    - Test timeout handling (API takes >5s)
    - Test scan button disabled during processing
    - Test error handling returns overlay to Idle
    - Test audio fallback to text on playback failure
    - _Requirements: 2.3, 2.4, 6.4, 12.1, 12.3_

- [x] 9. Implement Collection view and Legacy Recorder
  - [x] 9.1 Implement the Collection View (`components/CollectionView.tsx`)
    - Display all discovered messages in a grid layout with category and discovery timestamp
    - Show undiscovered messages as locked items to indicate remaining content
    - Style with dark theme consistent with app aesthetic
    - _Requirements: 9.3, 9.4_

  - [x] 9.2 Implement the Legacy Recorder (`components/LegacyRecorder.tsx`)
    - Request microphone permission via `navigator.mediaDevices.getUserMedia`
    - Use `MediaRecorder` API to capture audio
    - Provide start/stop recording controls
    - Save recordings as blobs in localStorage with "Human Legacy Message" tag
    - Display saved Legacy Messages in a dedicated section of the Collection view
    - Allow playback of saved Legacy Messages via Audio Player
    - Handle microphone permission denied with user-facing message
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 9.3 Write unit tests for Collection View
    - Test grid rendering of discovered messages
    - Test locked items displayed for undiscovered messages
    - _Requirements: 9.3, 9.4_

  - [x] 9.4 Write unit tests for Legacy Recorder
    - Test start/stop recording flow
    - Test save with correct "Human Legacy Message" tag
    - Test microphone permission denied handling
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integration and final wiring
  - [x] 11.1 Wire frontend to backend API
    - Create API client module with `analyzeImage(base64: string): Promise<AnalyzeResponse>` function
    - Configure base URL for backend (environment variable)
    - Connect Scan Orchestrator to use the API client
    - Verify end-to-end flow: scan → classify → message → audio
    - _Requirements: 2.2, 3.5, 12.1_

  - [x] 11.2 Configure CORS on backend for frontend origin
    - Add CORS middleware to FastAPI app allowing frontend origin
    - _Requirements: 2.2_

  - [x] 11.3 Write integration tests
    - Test POST /analyze end-to-end with mocked Gemini client
    - Test frontend scan flow integration with mocked backend
    - Test localStorage persistence survives component re-mount
    - _Requirements: 2.2, 3.5, 9.2_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of backend and frontend independently
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples, edge cases, and error conditions
- Audio files are pre-generated and bundled as static assets — no runtime TTS needed
- All user-facing text goes through the Translation Store for future i18n support
