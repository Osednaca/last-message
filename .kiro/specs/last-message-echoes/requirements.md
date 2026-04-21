# Requirements Document

## Introduction

"Last Message: Echoes from the Future" is an immersive web application that lets users point their device camera at real-world objects, scan them on demand, and receive an emotional voice message from a possible future affected by climate change and human impact. The experience blends nature and sci-fi aesthetics to create an emotional, futuristic encounter. The application uses a React frontend with a Python FastAPI backend, leveraging Gemini Vision API for object classification and pre-generated ElevenLabs audio for voice playback.

## Glossary

- **App**: The "Last Message: Echoes from the Future" web application, consisting of a React frontend and a FastAPI backend
- **Camera_Preview**: The live video feed from the user's device camera displayed as a fullscreen background in the App
- **Scan_Button**: The primary UI control that initiates a single-frame image capture from the Camera_Preview
- **Image_Capturer**: The frontend module responsible for capturing a single frame from the Camera_Preview as a base64-encoded image
- **Backend**: The Python FastAPI server that receives captured images and returns classification results
- **Analyze_Endpoint**: The POST /analyze API endpoint on the Backend that accepts a base64-encoded image and returns an object label and category
- **Gemini_Vision_API**: The Google Gemini Vision API used by the Backend to classify objects in captured images
- **Object_Label**: A text string identifying a detected object (e.g., "bottle", "tree", "car")
- **Category**: One of five predefined environmental impact groups: water, air, fauna, consumption, or energy
- **Category_Mapper**: The module that maps an Object_Label to a Category using a predefined mapping table
- **Message**: A data structure containing an id, text content, and a reference to a pre-generated audio file, associated with a specific Category
- **Message_Store**: The local data structure (JSON or TypeScript object) containing all hardcoded Messages organized by Category
- **Audio_Player**: The frontend module responsible for playing pre-generated MP3 audio files
- **Overlay_System**: The UI layer displayed on top of the Camera_Preview that shows state-dependent text, animations, and visual effects
- **Collection**: The local state store that tracks which Messages a user has discovered during a session
- **Legacy_Recorder**: The frontend module that allows users to record audio messages using the device microphone
- **Legacy_Message**: A user-recorded audio message tagged as a "Human Legacy Message" and stored locally
- **Translation_Store**: The data structure holding all user-facing text strings organized by locale key, defaulting to English

## Requirements

### Requirement 1: Camera Access and Preview

**User Story:** As a user, I want to see a live camera feed when I open the app, so that I can point my camera at objects to scan.

#### Acceptance Criteria

1. WHEN the user opens the App, THE App SHALL request access to the device camera and display the Camera_Preview as a fullscreen background
2. IF the user denies camera permission, THEN THE App SHALL display a message explaining that camera access is required to use the scanning feature
3. IF the device does not have a camera, THEN THE App SHALL display a message indicating that a camera-equipped device is required
4. WHILE the Camera_Preview is active, THE App SHALL display the Scan_Button in a visible, centered position at the bottom of the screen

### Requirement 2: On-Demand Object Scanning

**User Story:** As a user, I want to tap a Scan button to capture what my camera sees, so that the app can identify the object.

#### Acceptance Criteria

1. WHEN the user taps the Scan_Button, THE Image_Capturer SHALL capture a single frame from the Camera_Preview as a base64-encoded image
2. WHEN the Image_Capturer captures a frame, THE App SHALL send the base64-encoded image to the Analyze_Endpoint via an HTTP POST request
3. WHILE the Analyze_Endpoint is processing a request, THE Overlay_System SHALL display the Scanning state with the text "Analyzing environment..."
4. WHILE the Analyze_Endpoint is processing a request, THE Scan_Button SHALL be disabled to prevent duplicate submissions

### Requirement 3: Backend Object Classification

**User Story:** As a user, I want the app to identify what object I scanned, so that I can receive a relevant message from the future.

#### Acceptance Criteria

1. WHEN the Analyze_Endpoint receives a base64-encoded image, THE Backend SHALL send the image to the Gemini_Vision_API for classification
2. WHEN the Gemini_Vision_API returns a result, THE Backend SHALL extract the Object_Label from the response
3. WHEN the Backend obtains an Object_Label, THE Category_Mapper SHALL map the Object_Label to a Category using the predefined mapping table
4. IF the Object_Label does not match any entry in the predefined mapping table, THEN THE Category_Mapper SHALL assign the "consumption" Category as a default
5. WHEN classification is complete, THE Analyze_Endpoint SHALL return a JSON response containing the Object_Label and the assigned Category
6. IF the Gemini_Vision_API returns an error or fails to classify the image, THEN THE Analyze_Endpoint SHALL return an appropriate error response with a descriptive error message

### Requirement 4: Category Mapping System

**User Story:** As a developer, I want detected objects mapped to environmental categories, so that the app can select thematically appropriate messages.

#### Acceptance Criteria

1. THE Category_Mapper SHALL support exactly five Categories: water, air, fauna, consumption, and energy
2. THE Category_Mapper SHALL map known objects to Categories according to the predefined mapping (e.g., "bottle" to consumption, "tree" to fauna, "car" to energy, "sky" to air)
3. WHEN the Category_Mapper receives an Object_Label not present in the mapping table, THE Category_Mapper SHALL return "consumption" as the default Category
4. FOR ALL valid Object_Labels in the mapping table, mapping then looking up the Category SHALL produce the same Category consistently (round-trip property)

### Requirement 5: Message Selection and Storage

**User Story:** As a user, I want to receive a unique voice message related to the object I scanned, so that the experience feels personal and varied.

#### Acceptance Criteria

1. THE Message_Store SHALL contain between 3 and 5 Messages for each of the five Categories
2. THE Message_Store SHALL store each Message with the following fields: id (string), text (string), and audio file path (string)
3. WHEN the App receives a Category from the Analyze_Endpoint, THE App SHALL select a random Message from the Message_Store for that Category
4. WHEN a Message is selected, THE App SHALL provide the Message text and audio file path to the Overlay_System and Audio_Player respectively
5. FOR ALL Categories in the Message_Store, serializing a Message to JSON then deserializing it SHALL produce an equivalent Message object (round-trip property)

### Requirement 6: Voice Playback

**User Story:** As a user, I want to hear the message spoken aloud automatically, so that the experience feels immersive and emotional.

#### Acceptance Criteria

1. WHEN a Message is selected after object detection, THE Audio_Player SHALL automatically begin playing the associated MP3 audio file
2. WHILE the Audio_Player is playing audio, THE Overlay_System SHALL display synchronized visual feedback in the form of a pulsing glow animation
3. WHEN the audio playback completes, THE Overlay_System SHALL transition back to the Idle state
4. IF the audio file fails to load or play, THEN THE Audio_Player SHALL display the Message text as a fallback and transition the Overlay_System back to the Idle state

### Requirement 7: UI Overlay State Management

**User Story:** As a user, I want clear visual feedback at every stage of the scanning process, so that I understand what the app is doing.

#### Acceptance Criteria

1. THE Overlay_System SHALL support exactly four states: Idle, Scanning, Detected, and Playing
2. WHILE in the Idle state, THE Overlay_System SHALL display the text "Point your camera at an object"
3. WHILE in the Scanning state, THE Overlay_System SHALL display the text "Analyzing environment..." with a scanning animation
4. WHEN the App receives a successful classification response, THE Overlay_System SHALL transition to the Detected state and display "Signal detected", the recognized Object_Label, and "Message from the future available"
5. WHILE in the Playing state, THE Overlay_System SHALL display the text "Transmitting message..." with the Message text visible
6. WHEN transitioning between states, THE Overlay_System SHALL apply a fade-in animation to the new state content

### Requirement 8: Visual Effects

**User Story:** As a user, I want the app to feel futuristic and immersive through visual effects, so that the experience creates an emotional impact.

#### Acceptance Criteria

1. WHEN the Overlay_System transitions to the Detected state, THE App SHALL apply a subtle glitch effect for a brief duration
2. WHILE in the Playing state, THE App SHALL apply a background blur effect to the Camera_Preview
3. WHILE in the Playing state, THE App SHALL display a pulsing gradient animation using green and cyan colors
4. WHEN the Overlay_System transitions between states, THE App SHALL apply a fade-in effect to overlay content

### Requirement 9: Message Collection System

**User Story:** As a user, I want to see a collection of all the messages I have discovered, so that I can revisit them and feel a sense of progress.

#### Acceptance Criteria

1. WHEN a Message is played for the first time, THE Collection SHALL store a record containing the Message id, Category, and a discovered_at timestamp
2. THE Collection SHALL persist discovered Messages in the browser local storage so they survive page refreshes
3. WHEN the user opens the Collection view, THE App SHALL display all discovered Messages in a grid layout with their Category and discovery timestamp
4. WHILE displaying the Collection, THE App SHALL show undiscovered Messages as locked items to indicate remaining content to explore
5. THE Collection SHALL not store duplicate entries for the same Message id
6. FOR ALL Messages added to the Collection, storing then retrieving a Message record SHALL produce an equivalent record (round-trip property)

### Requirement 10: Legacy Mode - User Recording

**User Story:** As a user, I want to record my own voice message as a "Human Legacy Message", so that I can contribute my own emotional response to the experience.

#### Acceptance Criteria

1. WHEN the user activates Legacy Mode, THE App SHALL request access to the device microphone
2. IF the user denies microphone permission, THEN THE App SHALL display a message explaining that microphone access is required for recording
3. WHEN the user starts recording in Legacy Mode, THE Legacy_Recorder SHALL capture audio from the device microphone
4. WHEN the user stops recording, THE Legacy_Recorder SHALL save the audio locally and tag it as a "Human Legacy Message"
5. WHEN a Legacy_Message is saved, THE App SHALL display the Legacy_Message in a dedicated section of the Collection view
6. WHEN the user selects a saved Legacy_Message, THE Audio_Player SHALL play the recorded audio

### Requirement 11: Multi-Language Architecture

**User Story:** As a developer, I want all user-facing text stored in a translation structure, so that additional languages can be added in the future without code changes.

#### Acceptance Criteria

1. THE App SHALL store all user-facing text strings in the Translation_Store organized by locale key
2. THE App SHALL use English ("en") as the default language
3. THE Translation_Store SHALL follow the structure: locale key mapping to a flat object of string key-value pairs (e.g., { "en": { "scan": "Scan", "analyzing": "Analyzing environment..." } })
4. WHEN rendering user-facing text, THE App SHALL retrieve the text from the Translation_Store using the current locale and the string key
5. FOR ALL text entries in the Translation_Store, serializing the Translation_Store to JSON then deserializing it SHALL produce an equivalent Translation_Store object (round-trip property)

### Requirement 12: Performance and Responsiveness

**User Story:** As a user, I want the scanning and message delivery to feel fast and seamless, so that the experience maintains its emotional impact.

#### Acceptance Criteria

1. WHEN the user taps the Scan_Button, THE App SHALL deliver a Message to the user within 3 seconds under normal network conditions
2. WHILE the Backend is processing, THE Overlay_System SHALL provide continuous visual feedback so the user perceives responsiveness
3. IF the Analyze_Endpoint does not respond within 5 seconds, THEN THE App SHALL display a timeout error message and return the Overlay_System to the Idle state

### Requirement 13: Application Layout and Navigation

**User Story:** As a user, I want a minimal and intuitive interface, so that I can focus on the scanning experience without distraction.

#### Acceptance Criteria

1. THE App SHALL display the Camera_Preview as a fullscreen background at all times during the scanning experience
2. THE App SHALL provide exactly three primary navigation controls: the Scan_Button, a Collection button, and a Legacy Mode button
3. WHEN the user taps the Collection button, THE App SHALL display the Collection view as an overlay on top of the Camera_Preview
4. WHEN the user taps the Legacy Mode button, THE App SHALL display the Legacy Mode recording interface as an overlay on top of the Camera_Preview
5. THE App SHALL use a dark color scheme with primary green/teal colors, cyan accent glows, and a near-black background consistent with the nature-meets-sci-fi aesthetic
