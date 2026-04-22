# Requirements Document

## Introduction

This feature adds two interconnected systems to the "Last Message: Echoes from the Future" application: an **Interactive Home Experience** and a **Global Sound System**. The Home Experience serves as the entry point, immersing users in a sci-fi "system boot" sequence before they navigate to scanning or legacy mode. The Sound System provides a centralized audio manager that plays context-aware sounds (ambient, scanning, analyzing, reveal) in response to user actions, without overlapping or autoplaying before user interaction.

## Glossary

- **Home_Screen**: The fullscreen entry screen displayed when the application loads, featuring an animated background, intro overlay, interactive prompt, and navigation actions.
- **Audio_Manager**: A centralized singleton utility responsible for preloading, playing, stopping, and looping all predefined audio files across the application.
- **Intro_Overlay**: The centered overlay displayed on the Home_Screen containing the application title and subtitle.
- **Interactive_Prompt**: A text element that fades in on the Home_Screen, inviting the user to tap to initialize the experience.
- **Action_Panel**: The set of navigation buttons ("Start Scanning", "Leave a Message") revealed after the user taps the Interactive_Prompt.
- **Ambient_Sound**: The looping background audio file (`Futuristic_Ambience.mp3`) played exclusively on the Home_Screen.
- **Scan_Sound**: The one-shot audio file (`scanning.wav`) triggered when the user initiates a scan.
- **Analyzing_Sound**: The looping audio file (`analizing.wav`) played while the application processes a scan result.
- **Reveal_Sound**: The one-shot audio file (`reveal.wav`) played when a voice imprint or message processing completes.
- **Glassmorphism**: A visual style using semi-transparent backgrounds with blur effects to create a frosted-glass appearance.
- **Scan_Screen**: The existing camera-based scanning view where users analyze objects.
- **Legacy_Mode**: The existing view where users leave text or voice messages for the future.

## Requirements

### Requirement 1: Home Screen as Application Entry Point

**User Story:** As a user, I want the Home Screen to be the first view I see when opening the application, so that I feel immersed in a futuristic system interface from the start.

#### Acceptance Criteria

1. WHEN the application loads, THE Home_Screen SHALL be displayed as the initial view in fullscreen mode.
2. THE Home_Screen SHALL render a slightly animated background using a blur effect combined with a gradient or camera feed.
3. WHEN the Home_Screen loads, THE Intro_Overlay SHALL display the title "LAST MESSAGE" and the subtitle "Echoes from the future are still around you" centered on the screen.
4. WHEN the Intro_Overlay has been displayed, THE Interactive_Prompt SHALL fade in with the text "Tap to initialize connection".
5. WHEN the user taps the Interactive_Prompt, THE Home_Screen SHALL reveal the Action_Panel with an animated transition.
6. THE Action_Panel SHALL contain two buttons: "Start Scanning" and "Leave a Message".

### Requirement 2: Home Screen Navigation

**User Story:** As a user, I want to navigate from the Home Screen to scanning or legacy mode, so that I can access the core features of the application.

#### Acceptance Criteria

1. WHEN the user taps "Start Scanning" in the Action_Panel, THE Home_Screen SHALL navigate to the Scan_Screen.
2. WHEN the user taps "Leave a Message" in the Action_Panel, THE Home_Screen SHALL navigate to Legacy_Mode.
3. WHEN navigating away from the Home_Screen, THE Home_Screen SHALL apply a fade and blur transition effect.

### Requirement 3: Home Screen Visual Style

**User Story:** As a user, I want the Home Screen to match the existing sci-fi aesthetic, so that the experience feels cohesive and immersive.

#### Acceptance Criteria

1. THE Home_Screen SHALL use the neon green accent color (#00ff9f or the project's primary palette equivalent) for interactive elements.
2. THE Home_Screen SHALL apply Glassmorphism styling with blur overlays to card and overlay elements.
3. THE Home_Screen SHALL render buttons in a pill-style (fully rounded) shape with a soft glow effect.
4. WHEN the user taps the Interactive_Prompt, THE Home_Screen SHALL apply a slight glitch effect during the transition to the Action_Panel.

### Requirement 4: Home Screen Transition Micro-Interactions

**User Story:** As a user, I want smooth micro-interactions on the Home Screen, so that the interface feels responsive and polished.

#### Acceptance Criteria

1. WHEN a button in the Action_Panel is pressed, THE Home_Screen SHALL apply a slight scale-down animation to the button.
2. WHEN transitioning between screens, THE Home_Screen SHALL use fade and blur animations without additional sound effects.
3. THE Home_Screen SHALL use smooth opacity animations for all element appearances and disappearances.

### Requirement 5: Audio Manager Initialization

**User Story:** As a developer, I want a centralized Audio Manager that initializes only after user interaction, so that audio playback complies with mobile browser autoplay restrictions.

#### Acceptance Criteria

1. THE Audio_Manager SHALL preload all four predefined audio files (Futuristic_Ambience.mp3, scanning.wav, analizing.wav, reveal.wav) after initialization.
2. THE Audio_Manager SHALL initialize audio playback capabilities only after the first user interaction event (tap or click).
3. THE Audio_Manager SHALL prevent multiple sounds from overlapping by stopping any currently playing non-ambient sound before starting a new one.
4. THE Audio_Manager SHALL expose a global interface accessible from any component via React context or a singleton pattern.

### Requirement 6: Home Ambient Sound

**User Story:** As a user, I want ambient background audio on the Home Screen, so that the experience feels immersive from the moment I interact.

#### Acceptance Criteria

1. WHEN the user performs the first interaction on the Home_Screen, THE Audio_Manager SHALL begin playing the Ambient_Sound in a loop at a volume between 0.2 and 0.3.
2. WHILE the user is on the Home_Screen, THE Audio_Manager SHALL continue looping the Ambient_Sound.
3. WHEN the user navigates away from the Home_Screen, THE Audio_Manager SHALL stop the Ambient_Sound.
4. WHEN the user returns to the Home_Screen, THE Audio_Manager SHALL resume playing the Ambient_Sound.

### Requirement 7: Scan Sound

**User Story:** As a user, I want to hear a scanning sound when I press the scan button, so that I get auditory feedback confirming my action.

#### Acceptance Criteria

1. WHEN the user presses the "Scan" button on the Scan_Screen, THE Audio_Manager SHALL play the Scan_Sound once.
2. IF the Scan_Sound is already playing when the user presses "Scan" again, THEN THE Audio_Manager SHALL restart the Scan_Sound from the beginning.

### Requirement 8: Analyzing Sound

**User Story:** As a user, I want to hear a looping sound while the system processes my scan, so that I know the application is actively working.

#### Acceptance Criteria

1. WHEN scan processing begins, THE Audio_Manager SHALL play the Analyzing_Sound in a loop.
2. WHILE scan processing is in progress, THE Audio_Manager SHALL continue looping the Analyzing_Sound.
3. WHEN scan processing completes (result is ready), THE Audio_Manager SHALL stop the Analyzing_Sound immediately.

### Requirement 9: Reveal Sound

**User Story:** As a user, I want to hear a reveal sound when my result is ready, so that I get a satisfying auditory cue that the process is complete.

#### Acceptance Criteria

1. WHEN a voice imprint or message processing result is ready, THE Audio_Manager SHALL play the Reveal_Sound once after a delay of 200 to 300 milliseconds following the UI reveal.
2. THE Audio_Manager SHALL stop the Analyzing_Sound before playing the Reveal_Sound.

### Requirement 10: Audio Hook API

**User Story:** As a developer, I want dedicated React hooks for audio control, so that components can trigger sounds without managing audio state directly.

#### Acceptance Criteria

1. THE Audio_Manager SHALL provide a `useAudio()` hook that exposes play, stop, and preload controls for any registered sound.
2. THE Audio_Manager SHALL provide a `useHomeSound()` hook that manages Ambient_Sound lifecycle (start on mount, stop on unmount).
3. THE Audio_Manager SHALL provide a `useScanSound()` hook that exposes a trigger function for the Scan_Sound, Analyzing_Sound, and Reveal_Sound.

### Requirement 11: Audio File Constraints

**User Story:** As a developer, I want the sound system to use only the predefined audio files, so that no new audio assets need to be generated or fetched.

#### Acceptance Criteria

1. THE Audio_Manager SHALL use only the following audio files located in `public/audio/`: Futuristic_Ambience.mp3, scanning.wav, analizing.wav, reveal.wav.
2. THE Audio_Manager SHALL NOT generate, fetch, or use any audio files beyond the four predefined files for UI sounds.
3. THE Audio_Manager SHALL NOT use ElevenLabs or any external text-to-speech service for UI sound effects.

### Requirement 12: Performance and Compatibility

**User Story:** As a user, I want the Home Screen and sound system to perform smoothly on mobile devices, so that the experience is not degraded on lower-powered hardware.

#### Acceptance Criteria

1. THE Home_Screen SHALL render and animate smoothly on mobile devices without frame drops during transitions.
2. THE Audio_Manager SHALL handle audio playback without causing UI thread blocking.
3. IF audio playback fails on a device, THEN THE Audio_Manager SHALL degrade gracefully without crashing the application or blocking user interaction.

### Requirement 13: Non-Destructive UI Integration

**User Story:** As a developer, I want the Home Screen and sound system to extend the existing UI without replacing or breaking current screens, so that all existing functionality is preserved.

#### Acceptance Criteria

1. THE Home_Screen SHALL be added as a new entry point without modifying the existing Scan_Screen or Legacy_Mode components.
2. THE Audio_Manager SHALL integrate with the existing ScanOrchestrator component for scan, analyzing, and reveal sounds without replacing the current audio playback logic in that component.
3. THE Home_Screen SHALL reuse the existing design tokens (colors, shadows, fonts) defined in the project's CSS theme.
