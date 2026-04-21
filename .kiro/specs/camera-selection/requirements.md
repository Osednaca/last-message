# Requirements Document

## Introduction

The Camera Selection feature allows users to choose which camera device to use within the app. Currently, the Camera component requests a generic video stream via `getUserMedia({ video: true })`, which defaults to a single device chosen by the browser. This feature will enumerate available video input devices and let the user switch between them (e.g., front vs. back camera on mobile, or multiple webcams on desktop). The selected camera preference will persist across sessions.

## Glossary

- **Camera_Selector**: The UI component that displays available cameras and lets the user pick one.
- **Camera_Component**: The existing `Camera` React component (`Camera.tsx`) responsible for acquiring and rendering the video stream.
- **Device_Enumerator**: The subsystem that queries `navigator.mediaDevices.enumerateDevices()` to discover available video input devices.
- **Selected_Device**: The video input device currently chosen by the user.
- **Device_ID**: The `deviceId` string returned by the MediaDevices API that uniquely identifies a camera.
- **Preference_Store**: The browser `localStorage` mechanism used to persist the user's camera choice.

## Requirements

### Requirement 1: Enumerate Available Cameras

**User Story:** As a user, I want the app to detect all available cameras on my device, so that I can see which cameras are available to choose from.

#### Acceptance Criteria

1. WHEN the Camera_Component mounts, THE Device_Enumerator SHALL query the MediaDevices API for all available video input devices.
2. WHEN the Device_Enumerator receives the device list, THE Device_Enumerator SHALL filter the list to include only devices with `kind` equal to `videoinput`.
3. IF the MediaDevices API is unavailable or returns an error, THEN THE Device_Enumerator SHALL return an empty device list and THE Camera_Component SHALL fall back to requesting a generic video stream.
4. WHEN a device is connected or disconnected, THE Device_Enumerator SHALL re-query the device list and update the available cameras.

### Requirement 2: Display Camera Selector

**User Story:** As a user, I want to see a camera selector control in the app, so that I can pick which camera to use.

#### Acceptance Criteria

1. WHILE more than one video input device is available, THE Camera_Selector SHALL be visible to the user.
2. WHILE only one video input device is available, THE Camera_Selector SHALL be hidden.
3. THE Camera_Selector SHALL display a human-readable label for each available camera device.
4. IF a device label is empty, THEN THE Camera_Selector SHALL display a fallback label in the format "Camera N" where N is the device index starting from 1.
5. THE Camera_Selector SHALL visually indicate which camera is currently active.

### Requirement 3: Switch Active Camera

**User Story:** As a user, I want to switch between cameras, so that I can use the most suitable camera for scanning.

#### Acceptance Criteria

1. WHEN the user selects a different camera from the Camera_Selector, THE Camera_Component SHALL stop the current video stream and start a new stream using the Selected_Device's Device_ID.
2. WHEN the Camera_Component switches streams, THE Camera_Component SHALL pass the `deviceId` as an exact constraint to `getUserMedia`.
3. WHILE the Camera_Component is switching streams, THE Camera_Component SHALL continue displaying the last frame from the previous stream to avoid a blank screen.
4. IF the selected camera fails to start, THEN THE Camera_Component SHALL revert to the previously active camera and display an error message to the user.

### Requirement 4: Persist Camera Preference

**User Story:** As a user, I want my camera choice to be remembered, so that I do not have to re-select it every time I open the app.

#### Acceptance Criteria

1. WHEN the user selects a camera, THE Preference_Store SHALL save the Selected_Device's Device_ID to localStorage.
2. WHEN the Camera_Component mounts, THE Camera_Component SHALL read the stored Device_ID from the Preference_Store and use it as the initial camera.
3. IF the stored Device_ID does not match any currently available device, THEN THE Camera_Component SHALL fall back to the default camera and clear the stored preference.

### Requirement 5: Accessibility

**User Story:** As a user relying on assistive technology, I want the camera selector to be accessible, so that I can operate it with a keyboard or screen reader.

#### Acceptance Criteria

1. THE Camera_Selector SHALL be operable using keyboard navigation (Tab to focus, Enter or Space to activate).
2. THE Camera_Selector SHALL include an accessible label describing its purpose (e.g., `aria-label` of "Select camera").
3. WHEN the active camera changes, THE Camera_Selector SHALL announce the change to screen readers using an ARIA live region.
