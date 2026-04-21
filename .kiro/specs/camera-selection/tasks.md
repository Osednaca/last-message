# Implementation Plan: Camera Selection

## Overview

This plan adds camera device selection to the app. Users can enumerate available cameras, pick one from a dropdown, switch the active stream, and have their preference persisted across sessions. Implementation proceeds bottom-up: pure utility functions first, then the `useCamera` hook, then the `CameraSelector` UI component, and finally wiring into the existing `Camera` component.

## Tasks

- [x] 1. Implement camera preference utilities and device helpers
  - [x] 1.1 Add new translation keys for camera selection
    - Add `camera_select_label`, `camera_switch_error`, and `camera_switched` keys to the `en` locale in `frontend/src/i18n/translations.ts`
    - _Requirements: 2.3, 5.2, 5.3_

  - [x] 1.2 Implement pure camera utility functions in `frontend/src/hooks/useCamera.ts`
    - Implement `filterVideoInputs(devices: MediaDeviceInfo[]): MediaDeviceInfo[]` — filters to `kind === 'videoinput'`
    - Implement `buildDeviceList(devices: MediaDeviceInfo[]): CameraDevice[]` — maps to `{ deviceId, label }` with fallback labels "Camera N" for empty labels
    - Implement `loadCameraPreference(): string | null` — reads from localStorage key `echoes-camera-preference`
    - Implement `saveCameraPreference(deviceId: string): void` — writes to localStorage
    - Implement `clearCameraPreference(): void` — removes from localStorage
    - Export the `CameraDevice` interface
    - _Requirements: 1.2, 2.3, 2.4, 4.1_

  - [x] 1.3 Write property test for device filtering (Property 1)
    - Create `frontend/src/hooks/useCamera.filter.property.test.ts`
    - Generate random arrays of device-like objects with mixed `kind` values (`videoinput`, `audioinput`, `audiooutput`)
    - Apply `filterVideoInputs` and verify only `videoinput` devices remain and none are lost
    - Tag: `// Feature: camera-selection, Property 1: Device filtering preserves only video inputs`
    - Minimum 100 iterations
    - **Validates: Requirements 1.2**

  - [x] 1.4 Write property test for label generation (Property 2)
    - Create `frontend/src/hooks/useCamera.labels.property.test.ts`
    - Generate random arrays of `{ deviceId, label }` device objects where some labels are empty strings
    - Apply `buildDeviceList` and verify non-empty labels are preserved unchanged and empty labels become "Camera N" with correct 1-based index
    - Tag: `// Feature: camera-selection, Property 2: Label generation correctness`
    - Minimum 100 iterations
    - **Validates: Requirements 2.3, 2.4**

  - [x] 1.5 Write property test for preference round-trip (Property 3)
    - Create `frontend/src/hooks/useCamera.preference.property.test.ts`
    - Generate random non-empty strings, call `saveCameraPreference`, then `loadCameraPreference`, verify equality
    - Also test `clearCameraPreference` then `loadCameraPreference` returns `null`
    - Tag: `// Feature: camera-selection, Property 3: Camera preference persistence round-trip`
    - Minimum 100 iterations
    - **Validates: Requirements 4.1**

  - [x] 1.6 Write unit tests for camera utility functions
    - Create `frontend/src/hooks/useCamera.test.ts`
    - Test `filterVideoInputs` with specific device lists (mixed kinds, empty list, all videoinput)
    - Test `buildDeviceList` with specific cases: all labels present, some empty, all empty
    - Test `loadCameraPreference` returns null when key missing, returns stored value when present
    - Test `saveCameraPreference` writes to localStorage
    - Test `clearCameraPreference` removes from localStorage
    - _Requirements: 1.2, 2.3, 2.4, 4.1_

- [x] 2. Implement useCamera hook
  - [x] 2.1 Implement the `useCamera` React hook in `frontend/src/hooks/useCamera.ts`
    - On mount: call `enumerateDevices`, filter to video inputs, build device list
    - On mount: read stored preference via `loadCameraPreference`, use as initial deviceId if it matches an available device
    - On mount: if stored preference doesn't match any device, fall back to default and call `clearCameraPreference`
    - On mount: acquire initial stream via `getUserMedia` with exact deviceId constraint (or generic `{ video: true }` for default)
    - Listen to `navigator.mediaDevices.devicechange` event and re-enumerate on change
    - Implement `switchCamera(deviceId)`: acquire new stream with `{ video: { deviceId: { exact: deviceId } } }`, stop old tracks, update state, save preference
    - On `switchCamera` failure: keep previous stream, set error message
    - Cleanup on unmount: stop all tracks, remove `devicechange` listener
    - Return `{ devices, activeDeviceId, stream, error, switchCamera }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

  - [x] 2.2 Write unit tests for useCamera hook
    - Test enumerateDevices called on mount
    - Test stored preference used as initial device when it matches available devices
    - Test fallback to default when stored preference doesn't match
    - Test `devicechange` event triggers re-enumeration
    - Test `switchCamera` stops old tracks and acquires new stream with exact constraint
    - Test `switchCamera` failure preserves previous stream and sets error
    - Test cleanup on unmount stops tracks and removes listener
    - Test fallback to generic `getUserMedia({ video: true })` when enumerateDevices fails
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3_

- [x] 3. Implement CameraSelector component
  - [x] 3.1 Implement `CameraSelector` component in `frontend/src/components/CameraSelector.tsx`
    - Accept `devices`, `activeDeviceId`, and `onSelect` props
    - Return `null` when `devices.length <= 1`
    - Render a `<select>` element with `aria-label="Select camera"`
    - Render one `<option>` per device with `value={device.deviceId}` and label as text
    - Set `value={activeDeviceId}` to indicate active camera
    - Call `onSelect(deviceId)` on change event
    - Style consistently with the app's dark theme (positioned at top-right of screen)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2_

  - [x] 3.2 Write unit tests for CameraSelector component
    - Test renders nothing when 0 devices
    - Test renders nothing when 1 device
    - Test renders select with options when 2+ devices
    - Test active device shown as selected value
    - Test onSelect called with correct deviceId on change
    - Test aria-label is "Select camera"
    - Test fallback labels displayed for devices with empty labels
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2_

- [x] 4. Update Camera component and add ARIA live region
  - [x] 4.1 Update `Camera` component to use `useCamera` hook and render `CameraSelector`
    - Replace inline `useEffect` with `useCamera` hook
    - Assign `stream` from hook to video element's `srcObject`
    - Render `CameraSelector` with `devices`, `activeDeviceId`, and `switchCamera` from hook
    - Add `aria-live="polite"` region that announces camera switches (e.g., "Switched to {label}")
    - Display error from hook (camera switch failure) alongside existing error handling
    - _Requirements: 1.1, 2.1, 3.1, 3.3, 5.3_

  - [x] 4.2 Update Camera component tests
    - Update existing tests in `frontend/src/components/Camera.test.tsx` to work with the new `useCamera` hook
    - Add test: CameraSelector rendered when multiple devices available
    - Add test: CameraSelector hidden when single device
    - Add test: ARIA live region announces camera switch
    - Add test: error message displayed on switch failure
    - _Requirements: 2.1, 2.2, 3.4, 5.3_

- [x] 5. Final verification
  - [x] 5.1 Run all tests and verify everything passes
    - Run `npm run test` in the frontend directory
    - Verify all existing tests still pass (no regressions)
    - Verify all new property tests pass with 100+ iterations
    - Verify all new unit tests pass
    - _Requirements: all_
