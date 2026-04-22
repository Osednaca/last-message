# Requirements Document

## Introduction

This feature adds two floating circular icon buttons to the Home Screen of "Last Message: Echoes from the Future" — a **Help** button and a **Contact** button. These buttons provide quick access to a dedicated Help page and a Contact modal without disrupting the existing futuristic interface. The buttons use icon-only design (no text labels), match the dark theme with neon green accents, and are optimized for mobile touch targets. A reusable `FloatingIconButton` component encapsulates the shared visual style and interaction behavior.

## Glossary

- **Home_Screen**: The fullscreen entry screen displayed when the application loads, featuring an animated background, interactive prompt, and navigation actions.
- **Floating_Icon_Button**: A reusable circular button component rendered at a fixed position on screen, displaying only an icon with no text label.
- **Help_Button**: A Floating_Icon_Button positioned at the bottom-left of the Home_Screen, using a help-circle or info icon, that navigates to the Help_Page.
- **Contact_Button**: A Floating_Icon_Button positioned at the bottom-right of the Home_Screen, using a mail or user icon, that opens the Contact_Modal.
- **Help_Page**: A full-screen view at the `/help` route containing informational content sections styled with the application's dark theme and glass card design.
- **Contact_Modal**: A centered overlay dialog displaying contact information for Oscar Navas at Navium, with a clickable email link and close controls.
- **Glass_Effect**: A visual style combining a semi-transparent dark background, backdrop blur, and a subtle neon green border to create a frosted-glass appearance.
- **Neon_Glow**: A box-shadow effect using green/teal RGBA values to create a soft luminous border around interactive elements.
- **Lucide_React**: The icon library (`lucide-react`) already installed in the project, used to render SVG icons inside buttons and UI elements.

## Requirements

### Requirement 1: Floating Icon Buttons on Home Screen

**User Story:** As a user, I want to see two circular icon buttons on the Home Screen, so that I can quickly access help information and contact details.

#### Acceptance Criteria

1. WHEN the Home_Screen is displayed, THE Home_Screen SHALL render the Help_Button at the bottom-left and the Contact_Button at the bottom-right of the viewport.
2. THE Help_Button SHALL display a help-circle or info icon from Lucide_React, centered inside the button, with no text label.
3. THE Contact_Button SHALL display a mail or user icon from Lucide_React, centered inside the button, with no text label.
4. THE Help_Button and Contact_Button SHALL have a fixed position so they remain visible regardless of scroll state.
5. THE Help_Button and Contact_Button SHALL use a z-index that keeps them above background layers but below any active modals or overlays.

### Requirement 2: Floating Icon Button Visual Style

**User Story:** As a user, I want the floating buttons to match the futuristic dark theme, so that they feel like a natural part of the interface.

#### Acceptance Criteria

1. THE Floating_Icon_Button SHALL render as a perfect circle with a diameter between 44px and 56px to meet mobile touch target guidelines.
2. THE Floating_Icon_Button SHALL apply the Glass_Effect: a semi-transparent dark background (`rgba(0, 0, 0, 0.4)` or equivalent), backdrop blur of at least 8px, and a border using the primary green color at reduced opacity.
3. THE Floating_Icon_Button SHALL display a Neon_Glow box-shadow using green/teal RGBA values with a blur radius of at least 10px.
4. THE Floating_Icon_Button SHALL render the icon in the neon green primary color at a size between 20px and 24px.
5. THE Floating_Icon_Button SHALL use the existing design tokens (colors, shadows, fonts) defined in the project's CSS theme.

### Requirement 3: Floating Icon Button Interactions

**User Story:** As a user, I want the floating buttons to respond to my taps with smooth animations, so that the interface feels responsive and polished.

#### Acceptance Criteria

1. WHEN the user taps a Floating_Icon_Button, THE Floating_Icon_Button SHALL apply a scale-down animation to 0.95 of its original size.
2. WHEN the user hovers over or taps a Floating_Icon_Button, THE Floating_Icon_Button SHALL increase the Neon_Glow intensity.
3. THE Floating_Icon_Button SHALL apply all transition animations with a duration of approximately 150 milliseconds.
4. THE Floating_Icon_Button SHALL be keyboard-accessible, responding to Enter and Space key presses.

### Requirement 4: Reusable Floating Icon Button Component

**User Story:** As a developer, I want a reusable FloatingIconButton component, so that I can consistently render styled icon buttons at configurable positions.

#### Acceptance Criteria

1. THE Floating_Icon_Button component SHALL accept the following props: an icon element, an onClick handler, and a position value (left or right).
2. WHEN the position prop is set to "left", THE Floating_Icon_Button SHALL render at the bottom-left of the viewport.
3. WHEN the position prop is set to "right", THE Floating_Icon_Button SHALL render at the bottom-right of the viewport.
4. THE Floating_Icon_Button component SHALL render a semantic button element with an accessible `aria-label` attribute.

### Requirement 5: Help Button Navigation

**User Story:** As a user, I want tapping the Help button to take me to a Help page, so that I can learn about the application.

#### Acceptance Criteria

1. WHEN the user taps the Help_Button, THE application SHALL navigate to the Help_Page view.
2. THE application SHALL render the Help_Page as a distinct view or route (`/help` or equivalent state-based navigation).
3. WHEN the Help_Page is displayed, THE Home_Screen floating buttons SHALL be hidden.

### Requirement 6: Help Page Content and Layout

**User Story:** As a user, I want the Help page to explain the application clearly, so that I understand how to use it.

#### Acceptance Criteria

1. THE Help_Page SHALL display the following content sections: "What is this", "How to use", "Legacy Mode", and "Tips".
2. THE Help_Page SHALL render each content section inside a glass-styled card using the Glass_Effect.
3. THE Help_Page SHALL use the application's dark background color and neon green accent color for headings and highlights.
4. THE Help_Page SHALL display a back button in the top-left corner as a circular icon button with an arrow-left icon, styled identically to the Floating_Icon_Button.
5. WHEN the user taps the back button on the Help_Page, THE application SHALL navigate back to the Home_Screen.

### Requirement 7: Contact Button Opens Modal

**User Story:** As a user, I want tapping the Contact button to open a modal with contact details, so that I can reach the creator without leaving the Home Screen.

#### Acceptance Criteria

1. WHEN the user taps the Contact_Button, THE application SHALL open the Contact_Modal as a centered overlay.
2. WHEN the Contact_Modal is open, THE Contact_Modal SHALL display above all other content with a semi-transparent backdrop.
3. WHEN the Contact_Modal is open, THE Home_Screen floating buttons SHALL remain visible behind the backdrop.

### Requirement 8: Contact Modal Content

**User Story:** As a user, I want the Contact modal to show the creator's details with a clickable email, so that I can easily get in touch.

#### Acceptance Criteria

1. THE Contact_Modal SHALL display the title "Contact" as a heading.
2. THE Contact_Modal SHALL display the name "Oscar Navas".
3. THE Contact_Modal SHALL display the company name "Navium".
4. THE Contact_Modal SHALL display the email address "on.navas@gmail.com" as a clickable `mailto:` link styled in the neon green primary color.
5. THE Contact_Modal SHALL render all content inside a glass-styled container using the Glass_Effect with rounded corners and a neon green border.

### Requirement 9: Contact Modal Close Behavior

**User Story:** As a user, I want to close the Contact modal easily, so that I can return to the Home Screen without friction.

#### Acceptance Criteria

1. THE Contact_Modal SHALL display a close button in the top-right corner using an X icon from Lucide_React.
2. WHEN the user taps the close button, THE Contact_Modal SHALL close.
3. WHEN the user taps outside the Contact_Modal content area (on the backdrop), THE Contact_Modal SHALL close.
4. WHEN the user presses the Escape key, THE Contact_Modal SHALL close.
5. THE Contact_Modal SHALL apply a fade and scale animation when opening and closing.

### Requirement 10: Contact Modal Accessibility

**User Story:** As a user relying on assistive technology, I want the Contact modal to be accessible, so that I can interact with it using a keyboard or screen reader.

#### Acceptance Criteria

1. WHEN the Contact_Modal opens, THE Contact_Modal SHALL trap keyboard focus within the modal content.
2. WHEN the Contact_Modal opens, THE Contact_Modal SHALL set focus to the close button or the first interactive element.
3. THE Contact_Modal SHALL use appropriate ARIA attributes: `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` referencing the title element.
4. WHEN the Contact_Modal closes, THE Contact_Modal SHALL return focus to the Contact_Button that triggered the modal.

### Requirement 11: Mobile Usability

**User Story:** As a mobile user, I want the floating buttons, Help page, and Contact modal to work well on small screens, so that I can use them comfortably on my phone.

#### Acceptance Criteria

1. THE Floating_Icon_Button SHALL maintain a minimum touch target size of 44px by 44px on all screen sizes.
2. THE Help_Button and Contact_Button SHALL be positioned with sufficient margin from screen edges (at least 16px) to avoid accidental taps.
3. THE Contact_Modal SHALL be responsive, occupying no more than 90% of the viewport width on mobile screens.
4. THE Help_Page SHALL be scrollable when content exceeds the viewport height.
5. THE Floating_Icon_Button placement SHALL NOT overlap with or obscure the existing Action_Panel buttons on the Home_Screen.

### Requirement 12: Non-Destructive Integration

**User Story:** As a developer, I want the Help and Contact features to extend the existing UI without modifying or breaking current components, so that all existing functionality is preserved.

#### Acceptance Criteria

1. THE Help_Button and Contact_Button SHALL be added to the Home_Screen without modifying the existing HomeScreen component's layout or behavior for the Intro_Overlay, Interactive_Prompt, or Action_Panel.
2. THE Help_Page and Contact_Modal SHALL be implemented as new components without altering existing components.
3. THE application SHALL reuse the existing design tokens (colors, shadows, fonts) defined in the project's CSS theme.
4. THE application SHALL use the existing Lucide_React library already installed in the project for all icons.
