import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock hooks used by HomeScreen
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({ play: vi.fn(), stop: vi.fn(), init: vi.fn() }),
}));

vi.mock('@/hooks/useHomeSound', () => ({
  useHomeSound: () => ({ startAmbient: vi.fn(), stopAmbient: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock BackgroundVideo used by HomeScreen
// ---------------------------------------------------------------------------

vi.mock('./BackgroundVideo', () => ({
  BackgroundVideo: () => <div data-testid="background-video" />,
}));

// ---------------------------------------------------------------------------
// Mock heavy components that aren't relevant to navigation tests
// ---------------------------------------------------------------------------

vi.mock('./Camera', () => ({
  Camera: vi.fn().mockReturnValue(<div data-testid="camera" />),
}));

vi.mock('./ScanOrchestrator', () => ({
  ScanOrchestrator: () => <div data-testid="scan-orchestrator" />,
}));

vi.mock('./CollectionView', () => ({
  CollectionView: () => <div data-testid="collection-view" />,
}));

vi.mock('./LegacyRecorder', () => ({
  LegacyRecorder: () => <div data-testid="legacy-recorder" />,
}));

vi.mock('./VoiceImprintFlow', () => ({
  VoiceImprintFlow: () => <div data-testid="voice-imprint-flow" />,
}));

// ---------------------------------------------------------------------------
// Mock translations
// ---------------------------------------------------------------------------

vi.mock('@/i18n/translations', () => ({
  t: (key: string) => key,
}));

// ---------------------------------------------------------------------------
// Import App after all mocks are set up
// ---------------------------------------------------------------------------

import App from '../App';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('App navigation – Help & Contact integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Requirement 1.1 – Help and Contact buttons render on Home Screen
  // -----------------------------------------------------------------------

  it('renders Help and Contact floating buttons on the Home Screen', () => {
    render(<App />);

    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact' })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requirement 5.1 – Clicking Help navigates to Help page
  // -----------------------------------------------------------------------

  it('clicking Help button navigates to Help page and hides Home Screen', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(screen.getByTestId('help-page')).toBeInTheDocument();
    expect(screen.queryByTestId('home-screen')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requirement 6.5 – Clicking back on Help page returns to Home Screen
  // -----------------------------------------------------------------------

  it('clicking back on Help page returns to Home Screen', () => {
    render(<App />);

    // Navigate to Help
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByTestId('help-page')).toBeInTheDocument();

    // Click back
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('help-page')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requirement 7.1 – Clicking Contact opens modal over Home Screen
  // -----------------------------------------------------------------------

  it('clicking Contact button opens Contact modal over Home Screen', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));

    // Modal is open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Home Screen is still visible behind the modal
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requirement 9.2 – Closing Contact modal returns to Home Screen
  // -----------------------------------------------------------------------

  it('closing Contact modal returns to Home Screen', () => {
    render(<App />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close modal via close button
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    // Wait for the 200ms close animation timeout
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requirement 5.3 – Floating buttons hidden when Help page is shown
  // -----------------------------------------------------------------------

  it('floating buttons are hidden when Help page is shown', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(screen.getByTestId('help-page')).toBeInTheDocument();
    // The Help and Contact floating buttons from the Home Screen should not be present
    expect(screen.queryByRole('button', { name: 'Help' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contact' })).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Requirement 7.3 – Floating buttons remain visible when Contact modal is open
  // -----------------------------------------------------------------------

  it('floating buttons remain visible when Contact modal is open', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact' })).toBeInTheDocument();
  });
});
