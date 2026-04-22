# Implementation Plan: Interactive Home Sound System

## Overview

This plan implements two interconnected systems: an **AudioManager singleton** for centralized sound control, and an **Interactive Home Screen** as the application's new entry point. Implementation follows a bottom-up order — core audio engine first, then React hooks, then UI components, then integration into existing screens. Property-based tests and unit tests are interleaved close to the code they validate.

## Tasks

- [x] 1. Implement AudioManager singleton class
  - [x] 1.1 Create `frontend/src/audio/AudioManager.ts` with the `SoundId` type, `SOUND_REGISTRY` constant, and `AudioManager` class
    - Define `SoundId = 'ambient' | 'scan' | 'analyzing' | 'reveal'`
    - Define `SOUND_REGISTRY` mapping each SoundId to its `/audio/` file path
    - Implement private constructor with `sounds` Map, `initialized` boolean, `currentNonAmbient` tracker
    - Implement `getInstance()` static method (singleton pattern)
    - Implement `init()` — creates `HTMLAudioElement` for each entry in `SOUND_REGISTRY`, sets `preload = 'auto'`, stores in `sounds` map, sets `initialized = true`
    - Implement `play(id, options?)` — if not initialized, no-op; for non-ambient sounds, stop current non-ambient first; if same sound is already playing, restart from `currentTime = 0`; set `loop` and `volume` from options; call `audio.play()` wrapped in try/catch
    - Implement `stop(id)` — pause and reset `currentTime = 0`; clear `currentNonAmbient` if it matches
    - Implement `stopAll()` — stop all sounds in the map
    - Implement `isPlaying(id)` — return `!audio.paused` for the given sound
    - Implement `isInitialized()` — return `initialized` flag
    - Export `AudioManager` class and `SoundId` type
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.1, 11.2, 11.3, 12.2, 12.3_

  - [x] 1.2 Write property test: Non-overlapping non-ambient sounds (Property 1)
    - **Property 1: Non-overlapping non-ambient sounds**
    - **Validates: Requirements 5.3, 9.2**
    - Create `frontend/src/audio/AudioManager.property.test.ts`
    - Mock `HTMLAudioElement` globally (mock `play()`, `pause()`, `paused` getter)
    - Use `fast-check` to generate random sequences of `play()` calls with sound IDs drawn from `['scan', 'analyzing', 'reveal']`
    - After each `play(id)` call, assert at most one non-ambient sound reports `isPlaying() === true`
    - Minimum 100 iterations

  - [x] 1.3 Write property test: Audio file allowlist (Property 2)
    - **Property 2: Audio file allowlist**
    - **Validates: Requirements 11.1, 11.2**
    - In the same test file `frontend/src/audio/AudioManager.property.test.ts`
    - Use `fast-check` to generate arbitrary strings as sound IDs
    - Assert that only the 4 predefined `SoundId` values resolve to valid audio elements
    - Assert that invalid IDs do not create or play any audio
    - Minimum 100 iterations

  - [x] 1.4 Write property test: Graceful error degradation (Property 3)
    - **Property 3: Graceful error degradation**
    - **Validates: Requirements 12.3**
    - In the same test file `frontend/src/audio/AudioManager.property.test.ts`
    - Use `fast-check` to generate random error scenarios (mock `audio.play()` to reject with random error types)
    - Assert that `AudioManager.play()` never throws
    - Assert that internal state remains consistent (`currentNonAmbient` is cleared on error, `isPlaying()` returns false)
    - Assert that subsequent `play()` calls still function after errors
    - Minimum 100 iterations

- [x] 2. Implement React audio hooks
  - [x] 2.1 Create `frontend/src/hooks/useAudio.ts`
    - Import `AudioManager` singleton
    - Return object with `play`, `stop`, `stopAll`, `isPlaying`, `init`, and `initialized` properties
    - Use `useRef` to hold the singleton instance and `useCallback` for stable function references
    - Track `initialized` state with `useState` updated after `init()` call
    - _Requirements: 10.1, 5.4_

  - [x] 2.2 Create `frontend/src/hooks/useHomeSound.ts`
    - Import `useAudio` hook
    - Implement `startAmbient()` — calls `play('ambient', { loop: true, volume: 0.25 })`
    - Implement `stopAmbient()` — calls `stop('ambient')`
    - Add `useEffect` cleanup that calls `stopAmbient()` on unmount
    - Return `{ startAmbient, stopAmbient }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.2_

  - [x] 2.3 Create `frontend/src/hooks/useScanSound.ts`
    - Import `useAudio` hook
    - Implement `playScan()` — calls `play('scan')`
    - Implement `startAnalyzing()` — calls `play('analyzing', { loop: true })`
    - Implement `stopAnalyzing()` — calls `stop('analyzing')`
    - Implement `playReveal()` — calls `stop('analyzing')`, then uses `setTimeout` (200–300ms delay) to call `play('reveal')`
    - Return `{ playScan, startAnalyzing, stopAnalyzing, playReveal }`
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 9.1, 9.2, 10.3_

  - [x] 2.4 Write unit tests for audio hooks
    - Create `frontend/src/hooks/useAudio.test.ts`
    - Test `useAudio` returns correct interface and delegates to AudioManager
    - Test `useHomeSound` starts ambient on call, stops on unmount
    - Test `useScanSound` triggers correct AudioManager methods for each function
    - Test `playReveal` stops analyzing before playing reveal with delay
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement HomeScreen component
  - [x] 4.1 Create `frontend/src/components/HomeScreen.tsx` with the 4-phase state machine and visual layout
    - Define `HomeScreenProps` interface with `onStartScanning` and `onLeaveMessage` callbacks
    - Define `HomeScreenPhase` type: `'intro' | 'prompted' | 'activated' | 'exiting'`
    - Implement `useState<HomeScreenPhase>('intro')` for phase tracking
    - **Intro phase**: Render fullscreen animated background (CSS gradient with subtle movement using existing theme tokens), glassmorphism overlay (`backdrop-filter: blur(16px)` + semi-transparent bg), title "LAST MESSAGE", subtitle "Echoes from the future are still around you"
    - **Prompted phase**: After ~1.5s delay (`setTimeout` in `useEffect`), transition to `prompted` — fade in "Tap to initialize connection" text with opacity animation
    - **Activated phase**: On tap of prompt, call `useAudio().init()` and `useHomeSound().startAmbient()`, apply `.animate-glitch` CSS class briefly, transition to `activated` — reveal Action Panel with two pill-shaped buttons ("Start Scanning", "Leave a Message") using `rounded-full` and `shadow-glow-sm`
    - **Exiting phase**: On button tap, apply scale-down animation to button, transition to `exiting` — apply fade + blur transition (`opacity` + `filter: blur()` with `transition-all duration-500`), call `stopAmbient()`, then fire the appropriate callback (`onStartScanning` or `onLeaveMessage`)
    - Use existing design tokens from `index.css` (primary palette, glow shadows, glassmorphism)
    - Buttons use neon green accent color (`primary-600`) with glow effect
    - All element appearances/disappearances use smooth opacity animations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.2, 6.1_

  - [x] 4.2 Write unit tests for HomeScreen component
    - Create `frontend/src/components/HomeScreen.test.tsx`
    - Test intro overlay renders title "LAST MESSAGE" and subtitle
    - Test prompt text appears (after delay or by advancing timers)
    - Test tapping prompt transitions to activated phase and reveals action buttons
    - Test "Start Scanning" button calls `onStartScanning` callback
    - Test "Leave a Message" button calls `onLeaveMessage` callback
    - Test glitch CSS class is applied during activation transition
    - Test buttons have pill shape and glow styling classes
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.4, 4.1_

- [x] 5. Integrate HomeScreen into App.tsx
  - [x] 5.1 Modify `frontend/src/App.tsx` to add `showHome` state and HomeScreen rendering
    - Add `const [showHome, setShowHome] = useState(true)`
    - Import `HomeScreen` component
    - When `showHome` is `true`, render only `<HomeScreen>` with callbacks:
      - `onStartScanning` → `setShowHome(false)`
      - `onLeaveMessage` → `setShowHome(false); setShowLegacy(true)`
    - When `showHome` is `false`, render existing Camera + ScanOrchestrator + nav buttons as before
    - Add a "Home" button to the existing nav bar (visible when `showHome` is false) that sets `showHome = true`, `showCollection = false`, `showLegacy = false`
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 13.1_

- [x] 6. Integrate scan sounds into ScanOrchestrator
  - [x] 6.1 Modify `frontend/src/components/ScanOrchestrator.tsx` to use `useScanSound()` hook
    - Import and call `useScanSound()` at the top of the component
    - In `handleScan`, call `playScan()` right when scan starts (after `setOverlayState('scanning')`)
    - Call `startAnalyzing()` after the API call begins (after `captureFrame()` succeeds, before `await analyzeImage()`)
    - Call `stopAnalyzing()` when the API response arrives (after `clearTimeout`)
    - Call `playReveal()` when transitioning to the `detected` state (after `setOverlayState('detected')`)
    - Keep existing `playAudio()` function unchanged — it handles category message playback separately
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 9.1, 9.2, 13.2_

  - [x] 6.2 Write unit tests for ScanOrchestrator sound integration
    - Add tests to existing `frontend/src/components/ScanOrchestrator.test.tsx` or create new file
    - Mock `useScanSound` hook
    - Test `playScan()` is called when scan button is pressed
    - Test `startAnalyzing()` is called during API processing
    - Test `stopAnalyzing()` and `playReveal()` are called when result arrives
    - _Requirements: 7.1, 8.1, 8.3, 9.1, 13.2_

- [x] 7. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The AudioManager singleton is tested independently before hook and component integration
- All audio files already exist in `frontend/public/audio/`
- Vitest and fast-check are already installed in the project
