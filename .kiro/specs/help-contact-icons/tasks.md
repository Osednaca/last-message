# Implementation Plan: Help & Contact Icons

## Overview

Add two floating icon buttons (Help and Contact) to the Home Screen, a dedicated Help page, and a Contact modal. Implementation follows the existing state-based navigation pattern in `App.tsx` using `useState` flags. All new components are additive — existing components remain untouched. A shared `FloatingIconButton` primitive provides consistent circular glass-effect button styling.

## Tasks

- [x] 1. Create the FloatingIconButton reusable component
  - [x] 1.1 Create `frontend/src/components/FloatingIconButton.tsx`
    - Implement the `FloatingIconButtonProps` interface: `icon`, `onClick`, `position` ('left' | 'right'), `ariaLabel`, optional `className`
    - Render a semantic `<button>` element with `aria-label` attribute
    - Apply fixed positioning: bottom-left (24px from bottom, 24px from left) when `position="left"`, bottom-right (24px from bottom, 24px from right) when `position="right"`
    - Apply glass effect: 48px diameter circle, `rgba(0,0,0,0.4)` background, `backdrop-filter: blur(12px)`, 1px border using `--color-border-glow`
    - Apply neon glow box-shadow using `--shadow-glow-sm`, hover/active `--shadow-glow-md`
    - Apply `active:scale-95` tap animation with 150ms ease transition on transform and box-shadow
    - Render icon in `--color-primary-400` at 22px size
    - Set `z-index: 40`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 11.1, 11.2_

  - [x] 1.2 Write unit tests for FloatingIconButton (`frontend/src/components/FloatingIconButton.test.tsx`)
    - Test renders a `<button>` element with the provided icon
    - Test applies fixed positioning styles
    - Test renders at bottom-left when `position="left"`
    - Test renders at bottom-right when `position="right"`
    - Test applies glass effect classes (backdrop-blur, semi-transparent bg, border)
    - Test applies neon glow shadow class
    - Test has `active:scale-95` class for tap animation
    - Test calls `onClick` when clicked
    - Test calls `onClick` on Enter and Space key press
    - Test renders with the provided `aria-label`
    - Test has no visible text content (icon-only)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.4, 4.1, 4.2, 4.3, 4.4_

  - [x] 1.3 Write property test for FloatingIconButton aria-label passthrough (`frontend/src/components/FloatingIconButton.property.test.tsx`)
    - **Property 1: Aria-label passthrough**
    - Use `fast-check` with `fc.string()` generator, minimum 100 iterations
    - Assert that for any string passed as `ariaLabel`, the rendered `<button>` element's `aria-label` attribute equals that exact string
    - **Validates: Requirement 4.4**

- [x] 2. Create the HelpPage component
  - [x] 2.1 Create `frontend/src/components/HelpPage.tsx`
    - Implement the `HelpPageProps` interface: `onBack` callback
    - Render a full-screen scrollable container (`overflow-y: auto`) with dark background
    - Render four content sections: "What is this", "How to use", "Legacy Mode", "Tips"
    - Render each section inside a glass-styled card: `--color-background-card` with opacity, `backdrop-filter: blur(12px)`, 1px border `--color-border`, `border-radius: 12px`
    - Use `--color-primary-400` for section headings
    - Render a back button in the top-left using `FloatingIconButton` with `position="left"` and `ArrowLeft` icon from lucide-react
    - Add padding to avoid overlap with the back button
    - Wire `onBack` to the back button's `onClick`
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 11.4, 12.2, 12.3, 12.4_

  - [x] 2.2 Write unit tests for HelpPage (`frontend/src/components/HelpPage.test.tsx`)
    - Test renders all four content sections: "What is this", "How to use", "Legacy Mode", "Tips"
    - Test each section is inside a glass-styled card
    - Test renders a back button with ArrowLeft icon
    - Test calls `onBack` when back button is clicked
    - Test page container has scrollable overflow
    - Test uses dark background and neon green accent colors
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.4_

- [x] 3. Create the ContactModal component
  - [x] 3.1 Create `frontend/src/components/ContactModal.tsx`
    - Implement the `ContactModalProps` interface: `isOpen`, `onClose`
    - Render nothing when `isOpen` is `false`
    - When open, render a centered overlay with `rgba(0,0,0,0.6)` backdrop and backdrop-filter blur
    - Display "Contact" heading (`<h2>` with `id="contact-modal-title"`)
    - Display "Oscar Navas", "Navium", and email "on.navas@gmail.com" as a `mailto:` link styled in `--color-primary-400`
    - Render close button in top-right corner with `X` icon from lucide-react
    - Apply glass effect styling with rounded corners and neon green border
    - Set `role="dialog"`, `aria-modal="true"`, `aria-labelledby="contact-modal-title"`
    - Implement focus trap: Tab/Shift+Tab cycles within modal, focus moves to close button on open
    - Close on Escape key press, backdrop click (`e.target === e.currentTarget`), and close button click
    - Apply fade + scale animation on open (opacity 0→1, scale 0.95→1, 200ms ease) and reverse on close
    - Responsive: max-width 90vw on mobile, 400px on larger screens
    - Clean up keydown listener on unmount
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 11.3, 12.2, 12.3, 12.4_

  - [x] 3.2 Write unit tests for ContactModal (`frontend/src/components/ContactModal.test.tsx`)
    - Test does not render when `isOpen` is `false`
    - Test renders when `isOpen` is `true`
    - Test displays "Contact" heading
    - Test displays "Oscar Navas"
    - Test displays "Navium"
    - Test displays email as a `mailto:` link with correct href
    - Test email link uses neon green color
    - Test has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
    - Test close button with X icon is present
    - Test calls `onClose` when close button is clicked
    - Test calls `onClose` when backdrop is clicked
    - Test calls `onClose` when Escape key is pressed
    - Test does not call `onClose` when clicking inside modal content
    - Test glass effect styling on modal container
    - Test max-width constraint for responsive layout
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 10.3, 11.3_

- [x] 4. Checkpoint - Verify all components build and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate into App.tsx
  - [x] 5.1 Wire Help & Contact buttons and navigation state into `App.tsx`
    - Add `showHelp` and `contactOpen` state variables (both default `false`)
    - Import `FloatingIconButton`, `HelpPage`, `ContactModal`, and icons (`HelpCircle`, `Mail`, `ArrowLeft`, `X`) from lucide-react
    - When `showHome` is `true`: render `HomeScreen` alongside two `FloatingIconButton` instances — Help (bottom-left, `HelpCircle` icon) and Contact (bottom-right, `Mail` icon)
    - Help button `onClick`: set `showHome=false`, `showHelp=true`
    - Contact button `onClick`: set `contactOpen=true` (keep `showHome=true`)
    - When `showHelp` is `true`: render `HelpPage` with `onBack` that sets `showHelp=false`, `showHome=true`
    - When `contactOpen` is `true`: render `ContactModal` with `onClose` that sets `contactOpen=false`
    - Ensure mutually exclusive states: Help page hides Home Screen and floating buttons; Contact modal overlays Home Screen
    - Do NOT modify the `HomeScreen` component itself
    - _Requirements: 1.1, 1.4, 1.5, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3, 9.2, 10.4, 12.1, 12.2_

  - [x] 5.2 Write integration tests for App navigation (`frontend/src/components/App.integration.test.tsx`)
    - Test Help and Contact buttons render on Home Screen
    - Test clicking Help button navigates to Help page (Home Screen hidden)
    - Test clicking back on Help page returns to Home Screen
    - Test clicking Contact button opens Contact modal over Home Screen
    - Test closing Contact modal returns to Home Screen
    - Test floating buttons are hidden when Help page is shown
    - Test floating buttons remain visible when Contact modal is open
    - _Requirements: 1.1, 5.1, 5.3, 7.1, 7.3, 12.1_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The project uses TypeScript, React 18, Tailwind CSS v4, Vitest, React Testing Library, and fast-check
- All icons come from `lucide-react` (already installed)
- `fast-check` is already installed as a dev dependency
- No new dependencies are needed
- The `HomeScreen` component is NOT modified — floating buttons are rendered as siblings in `App.tsx`
