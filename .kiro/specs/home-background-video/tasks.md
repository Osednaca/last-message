# Implementation Plan: Home Background Video

## Overview

This plan implements a `BackgroundVideo` component and integrates it into the existing `HomeScreen`. Implementation follows a bottom-up order: component first, then property tests, then integration into HomeScreen, then unit tests for the integration. The video asset (`nature.mp4`) and public directory already exist.

## Tasks

- [x] 1. Implement BackgroundVideo component
  - [x] 1.1 Create `frontend/src/components/BackgroundVideo.tsx` with video rendering, fallback handling, and visual treatment
    - Define `BackgroundVideoProps` interface with `src`, `fallbackSrc`, `opacity` (default 0.4), `blurPx` (default 4), `overlayColor` (default `rgba(0, 0, 0, 0.6)`), `overlayBlurPx` (default 4), `tintEnabled` (default true), `tintOpacity` (default 0.12)
    - Implement `videoFailed` state (`useState<boolean>(false)`) to track playback errors
    - Check `window.matchMedia('(prefers-reduced-motion: reduce)')` on mount — if matched, set `videoFailed = true` to skip video and render fallback image directly
    - Render `<video>` element with `autoPlay`, `muted`, `loop`, `playsInline` attributes, `poster={fallbackSrc}`, `src={src}`, and `object-fit: cover` styling
    - Attach `onError` handler that sets `videoFailed = true`
    - When `videoFailed` is true, render `<img>` element with `src={fallbackSrc}` and identical `object-fit: cover` styling instead of `<video>`
    - Apply `opacity` and `filter: blur({blurPx}px)` styles to the media element (video or img)
    - Render dark overlay `<div>` with `background: {overlayColor}` and `backdrop-filter: blur({overlayBlurPx}px)`
    - Conditionally render tint overlay `<div>` (when `tintEnabled`) with a green/cyan gradient using `--color-primary-800` and `--color-teal-800` at `opacity: {tintOpacity}`
    - Set `pointer-events: none` on the root container to avoid intercepting clicks
    - Add `data-testid="background-video"` to the root container, `data-testid="bg-video-media"` to the video/img element, `data-testid="bg-video-overlay"` to the dark overlay, `data-testid="bg-video-tint"` to the tint overlay
    - Implement `useEffect` cleanup: on unmount, pause the video element via ref and set `src = ''` to release resources
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 5.2, 5.3, 5.4, 6.4, 6.5, 7.1, 8.3_

  - [x] 1.2 Write unit tests for BackgroundVideo component
    - Create `frontend/src/components/BackgroundVideo.test.tsx`
    - Mock `HTMLVideoElement` with `play()`, `pause()`, `src`, `poster` properties
    - Mock `window.matchMedia` to control `prefers-reduced-motion` behavior
    - Test: video element renders with `autoplay`, `muted`, `loop`, `playsInline` attributes
    - Test: video element has correct `src` and `poster` attributes
    - Test: default visual treatment styles are applied (opacity 0.4, blur 4px, overlay rgba(0,0,0,0.6), backdrop-blur 4px)
    - Test: dark overlay div is rendered with correct background and backdrop-filter
    - Test: tint overlay renders when `tintEnabled=true` and does not render when `tintEnabled=false`
    - Test: on video error event, switches to `<img>` fallback with correct src
    - Test: when `prefers-reduced-motion: reduce` is active, renders fallback image instead of video
    - Test: container has `pointer-events: none`
    - Test: on unmount, `pause()` is called on the video element
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 5.3, 6.5, 7.1, 8.3_

  - [x] 1.3 Write property test: Visual treatment prop fidelity (Property 1)
    - **Property 1: Visual treatment prop fidelity**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1**
    - Create `frontend/src/components/BackgroundVideo.property.test.tsx`
    - Use `fast-check` to generate random `opacity` (float 0–1), `blurPx` (integer 0–20), `overlayBlurPx` (integer 0–20), `tintEnabled` (boolean), `tintOpacity` (float 0–0.15)
    - Render `BackgroundVideo` with generated props
    - Assert the media element's inline style `opacity` matches the generated opacity
    - Assert the media element's inline style `filter` contains `blur({blurPx}px)`
    - Assert the overlay div's inline style `backdrop-filter` contains `blur({overlayBlurPx}px)`
    - Assert the tint overlay is present/absent based on `tintEnabled`
    - When tint is present, assert its inline style `opacity` matches `tintOpacity`
    - Minimum 100 iterations
    - Tag: **Feature: home-background-video, Property 1: Visual treatment prop fidelity**

  - [x] 1.4 Write property test: Fallback visual treatment equivalence (Property 2)
    - **Property 2: Fallback visual treatment equivalence**
    - **Validates: Requirements 5.1, 5.3, 5.4**
    - In the same file `frontend/src/components/BackgroundVideo.property.test.tsx`
    - Use `fast-check` to generate random visual treatment props (same generators as Property 1)
    - Render `BackgroundVideo` in normal mode (video), collect styles from media element, overlay, and tint
    - Render `BackgroundVideo` and fire an error event on the video to trigger fallback mode, collect styles from media element, overlay, and tint
    - Assert the visual treatment styles (opacity, filter, overlay background, overlay backdrop-filter, tint opacity) are identical between both renders
    - Minimum 100 iterations
    - Tag: **Feature: home-background-video, Property 2: Fallback visual treatment equivalence**

- [x] 2. Integrate BackgroundVideo into HomeScreen
  - [x] 2.1 Modify `frontend/src/components/HomeScreen.tsx` to include BackgroundVideo
    - Import `BackgroundVideo` from `./BackgroundVideo`
    - Insert `<BackgroundVideo src="/video/nature.mp4" fallbackSrc="/video/fallback.jpg" />` as the first child inside the root `<div>` (before the existing gradient background div)
    - Reduce the existing gradient background div's opacity to 0.3 by adding `opacity: 0.3` to its inline style, so the video shows through while preserving the gradient's color contribution
    - Do NOT modify any other existing elements, state, props, event handlers, or styles
    - _Requirements: 1.1, 1.2, 1.4, 8.1, 8.2, 8.4, 8.5, 9.1, 9.2_

  - [x] 2.2 Update HomeScreen unit tests to account for BackgroundVideo
    - Update `frontend/src/components/HomeScreen.test.tsx`
    - Add a mock for the `BackgroundVideo` component (mock it as a simple div with `data-testid="background-video"`) to keep HomeScreen tests isolated
    - Verify existing tests still pass — the BackgroundVideo mock should not interfere with any existing assertions
    - Add one new test: verify `BackgroundVideo` is rendered inside the home-screen container
    - _Requirements: 8.1, 8.3, 8.5_

- [x] 3. Final verification
  - Run all frontend tests (`npm run test` in frontend directory) and verify everything passes
  - Verify no TypeScript compilation errors (`tsc -b` via `npm run build`)
