import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HomeScreen } from './HomeScreen';

// ---------------------------------------------------------------------------
// Mock audio hooks — HomeScreen uses useHomeSound, which internally uses
// useAudio. We stub both to keep the HomeScreen tests free of audio-manager
// side effects. Ambient auto-start behaviour is covered in useHomeSound tests.
// ---------------------------------------------------------------------------

const mockInit = vi.fn();
const mockStartAmbient = vi.fn();
const mockStopAmbient = vi.fn();

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    play: vi.fn(),
    stop: vi.fn(),
    stopAll: vi.fn(),
    isPlaying: vi.fn(() => false),
    init: mockInit,
    initialized: false,
  }),
}));

vi.mock('@/hooks/useHomeSound', () => ({
  useHomeSound: () => ({
    startAmbient: mockStartAmbient,
    stopAmbient: mockStopAmbient,
  }),
}));

// Mock BackgroundVideo — replace with a simple div to keep HomeScreen tests
// isolated from video rendering logic.
vi.mock('./BackgroundVideo', () => ({
  BackgroundVideo: (props: Record<string, unknown>) => (
    <div data-testid="background-video" data-src={props.src} data-fallback={props.fallbackSrc} />
  ),
}));

// Mock HTMLAudioElement globally (AudioManager uses `new Audio()`)
vi.stubGlobal('Audio', vi.fn(() => ({
  src: '',
  preload: '',
  loop: false,
  volume: 1,
  currentTime: 0,
  paused: true,
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHomeScreen(overrides: Partial<{ onStartScanning: () => void; onLeaveMessage: () => void }> = {}) {
  const props = {
    onStartScanning: vi.fn(),
    onLeaveMessage: vi.fn(),
    ...overrides,
  };
  const result = render(<HomeScreen {...props} />);
  return { ...result, props };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockInit.mockClear();
    mockStartAmbient.mockClear();
    mockStopAmbient.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Intro overlay — Requirements 1.1, 1.3
  // -----------------------------------------------------------------------

  it('renders the title "LAST MESSAGE" and subtitle in the intro overlay', () => {
    renderHomeScreen();

    expect(screen.getByText('LAST MESSAGE')).toBeInTheDocument();
    expect(
      screen.getByText('Echoes from the future are still around you'),
    ).toBeInTheDocument();
  });

  it('renders the home-screen root element', () => {
    renderHomeScreen();
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Prompt text — Requirement 1.4
  // -----------------------------------------------------------------------

  it('shows the prompt text after the intro delay', () => {
    renderHomeScreen();

    // Initially the prompt is hidden (opacity 0)
    const prompt = screen.getByTestId('interactive-prompt');
    expect(prompt.style.opacity).toBe('0');

    // Advance past the 1500ms intro → prompted transition
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Now the prompt should be visible (opacity 1)
    expect(prompt.style.opacity).toBe('1');
    expect(screen.getByText('Tap to initialize connection')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Tapping prompt transitions to activated phase — Requirements 1.5, 1.6
  // -----------------------------------------------------------------------

  it('tapping the prompt transitions to activated phase and reveals action buttons', () => {
    renderHomeScreen();

    // Advance to prompted phase
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const prompt = screen.getByTestId('interactive-prompt');
    const actionPanel = screen.getByTestId('action-panel');

    // Action panel should be hidden before activation
    expect(actionPanel.style.opacity).toBe('0');

    // Tap the prompt
    fireEvent.click(prompt);

    // Glitch animation runs for 600ms, then phase becomes activated
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Action panel should now be visible
    expect(actionPanel.style.opacity).toBe('1');

    // Both buttons should be present
    expect(screen.getByTestId('btn-start-scanning')).toBeInTheDocument();
    expect(screen.getByTestId('btn-leave-message')).toBeInTheDocument();
    expect(screen.getByText('Start Scanning')).toBeInTheDocument();
    expect(screen.getByText('Leave a Message')).toBeInTheDocument();
  });

  it('initializes audio and starts ambient sound when prompt is tapped', () => {
    renderHomeScreen();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    fireEvent.click(screen.getByTestId('interactive-prompt'));

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockStartAmbient).toHaveBeenCalledTimes(1);
  });


  // -----------------------------------------------------------------------
  // Start Scanning button — Requirement 2.1
  // -----------------------------------------------------------------------

  it('"Start Scanning" button calls onStartScanning callback immediately on click', () => {
    const onStartScanning = vi.fn();
    renderHomeScreen({ onStartScanning });

    // Advance to prompted phase
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Tap prompt to activate
    fireEvent.click(screen.getByTestId('interactive-prompt'));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Click Start Scanning — callback fires synchronously to preserve
    // user-gesture context for mobile media APIs
    fireEvent.click(screen.getByTestId('btn-start-scanning'));

    expect(onStartScanning).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Leave a Message button — Requirement 2.2
  // -----------------------------------------------------------------------

  it('"Leave a Message" button calls onLeaveMessage callback immediately on click', () => {
    const onLeaveMessage = vi.fn();
    renderHomeScreen({ onLeaveMessage });

    // Advance to prompted phase
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Tap prompt to activate
    fireEvent.click(screen.getByTestId('interactive-prompt'));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Click Leave a Message — callback fires synchronously
    fireEvent.click(screen.getByTestId('btn-leave-message'));

    expect(onLeaveMessage).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Glitch CSS class — Requirement 3.4
  // -----------------------------------------------------------------------

  it('applies glitch CSS class during activation transition', () => {
    renderHomeScreen();

    // Advance to prompted phase
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Tap the prompt
    fireEvent.click(screen.getByTestId('interactive-prompt'));

    // The glassmorphism overlay (parent of title) should have the glitch class
    const title = screen.getByText('LAST MESSAGE');
    const overlay = title.closest('[class*="animate-glitch"]');
    expect(overlay).not.toBeNull();

    // After 600ms the glitch class should be removed
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const overlayAfter = title.closest('[class*="animate-glitch"]');
    expect(overlayAfter).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Button styling — Requirements 3.3, 4.1
  // -----------------------------------------------------------------------

  it('buttons have pill shape (rounded-full) and glow styling classes', () => {
    renderHomeScreen();

    // Advance to prompted, then activate
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    fireEvent.click(screen.getByTestId('interactive-prompt'));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const scanBtn = screen.getByTestId('btn-start-scanning');
    const messageBtn = screen.getByTestId('btn-leave-message');

    // Pill shape
    expect(scanBtn.className).toContain('rounded-full');
    expect(messageBtn.className).toContain('rounded-full');

    // Glow effect
    expect(scanBtn.className).toContain('shadow-glow-sm');
    expect(messageBtn.className).toContain('shadow-glow-sm');

    // Scale-down on press (active:scale-95)
    expect(scanBtn.className).toContain('active:scale-95');
    expect(messageBtn.className).toContain('active:scale-95');
  });

  // -----------------------------------------------------------------------
  // Exit transition applies fade + blur — Requirement 2.3
  // -----------------------------------------------------------------------

  it('applies fade and blur transition when exiting', () => {
    renderHomeScreen();

    // Advance to prompted, then activate
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    fireEvent.click(screen.getByTestId('interactive-prompt'));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const root = screen.getByTestId('home-screen');

    // Before exiting, should be fully visible
    expect(root.style.opacity).toBe('1');
    expect(root.style.filter).toBe('none');

    // Click a button to trigger exit
    fireEvent.click(screen.getByTestId('btn-start-scanning'));

    // During exit, should have fade + blur
    expect(root.style.opacity).toBe('0');
    expect(root.style.filter).toBe('blur(8px)');
  });

  it('stops ambient sound when exiting', () => {
    renderHomeScreen();

    // Advance to prompted, then activate
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    fireEvent.click(screen.getByTestId('interactive-prompt'));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Click a button to trigger exit
    fireEvent.click(screen.getByTestId('btn-start-scanning'));

    expect(mockStopAmbient).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // BackgroundVideo integration — Requirements 8.1, 8.3, 8.5
  // -----------------------------------------------------------------------

  it('renders BackgroundVideo inside the home-screen container', () => {
    renderHomeScreen();

    const homeScreen = screen.getByTestId('home-screen');
    const backgroundVideo = screen.getByTestId('background-video');

    expect(homeScreen).toContainElement(backgroundVideo);
  });
});
