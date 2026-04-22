import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BackgroundVideo } from './BackgroundVideo';

// ---------------------------------------------------------------------------
// Mock HTMLMediaElement methods — jsdom does not implement them
// ---------------------------------------------------------------------------

const pauseSpy = vi.fn();

beforeEach(() => {
  // Stub pause/play on HTMLMediaElement so jsdom doesn't throw
  HTMLMediaElement.prototype.pause = pauseSpy;
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Mock window.matchMedia — default: no motion preference
// ---------------------------------------------------------------------------

let matchMediaMatches = false;

beforeEach(() => {
  matchMediaMatches = false;
  pauseSpy.mockClear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matchMediaMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  src: '/video/nature.mp4',
  fallbackSrc: '/video/fallback.jpg',
};

describe('BackgroundVideo', () => {
  // -----------------------------------------------------------------------
  // Video element attributes — Requirements 2.1, 2.2, 2.3, 2.4
  // -----------------------------------------------------------------------

  it('renders a video element with autoplay, muted, loop, and playsInline attributes', () => {
    render(<BackgroundVideo {...defaultProps} />);

    const media = screen.getByTestId('bg-video-media') as HTMLVideoElement;
    expect(media.tagName).toBe('VIDEO');
    expect(media).toHaveAttribute('autoplay');
    expect(media.muted).toBe(true);
    expect(media).toHaveAttribute('loop');
    expect(media.playsInline).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Video src and poster — Requirements 1.1, 5.1
  // -----------------------------------------------------------------------

  it('renders video with correct src and poster attributes', () => {
    render(<BackgroundVideo {...defaultProps} />);

    const media = screen.getByTestId('bg-video-media') as HTMLVideoElement;
    expect(media).toHaveAttribute('src', '/video/nature.mp4');
    expect(media).toHaveAttribute('poster', '/video/fallback.jpg');
  });

  // -----------------------------------------------------------------------
  // Default visual treatment — Requirements 3.1, 3.2
  // -----------------------------------------------------------------------

  it('applies default visual treatment styles to the media element', () => {
    render(<BackgroundVideo {...defaultProps} />);

    const media = screen.getByTestId('bg-video-media');
    expect(media.style.opacity).toBe('0.4');
    expect(media.style.filter).toBe('blur(4px)');
  });

  // -----------------------------------------------------------------------
  // Dark overlay — Requirements 3.3, 3.4
  // -----------------------------------------------------------------------

  it('renders dark overlay with correct background and backdrop-filter', () => {
    render(<BackgroundVideo {...defaultProps} />);

    const overlay = screen.getByTestId('bg-video-overlay');
    expect(overlay.style.background).toBe('rgba(0, 0, 0, 0.6)');
    expect(overlay.style.backdropFilter).toBe('blur(4px)');
  });

  // -----------------------------------------------------------------------
  // Tint overlay — Requirement 4.1
  // -----------------------------------------------------------------------

  it('renders tint overlay when tintEnabled is true (default)', () => {
    render(<BackgroundVideo {...defaultProps} />);

    const tint = screen.getByTestId('bg-video-tint');
    expect(tint).toBeInTheDocument();
    expect(tint.style.opacity).toBe('0.12');
  });

  it('does not render tint overlay when tintEnabled is false', () => {
    render(<BackgroundVideo {...defaultProps} tintEnabled={false} />);

    expect(screen.queryByTestId('bg-video-tint')).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Fallback on error — Requirements 5.1, 5.3
  // -----------------------------------------------------------------------

  it('switches to fallback image on video error event', () => {
    render(<BackgroundVideo {...defaultProps} />);

    const video = screen.getByTestId('bg-video-media');
    expect(video.tagName).toBe('VIDEO');

    // Fire error on the video element
    fireEvent.error(video);

    const fallback = screen.getByTestId('bg-video-media');
    expect(fallback.tagName).toBe('IMG');
    expect(fallback).toHaveAttribute('src', '/video/fallback.jpg');
  });

  // -----------------------------------------------------------------------
  // Reduced motion — Requirement 6.5
  // -----------------------------------------------------------------------

  it('pauses the video when prefers-reduced-motion is active (shows still frame)', () => {
    matchMediaMatches = true;
    // Re-stub matchMedia with updated value
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' ? matchMediaMatches : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(<BackgroundVideo {...defaultProps} />);

    const media = screen.getByTestId('bg-video-media');
    // Video element is still rendered (not replaced with img)
    expect(media.tagName).toBe('VIDEO');
    // But pause() was called to stop playback
    expect(pauseSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Pointer events — Requirement 8.3
  // -----------------------------------------------------------------------

  it('container has pointer-events: none', () => {
    render(<BackgroundVideo {...defaultProps} />);

    const container = screen.getByTestId('background-video');
    expect(container.style.pointerEvents).toBe('none');
  });

  // -----------------------------------------------------------------------
  // Cleanup on unmount — Requirement 2.5
  // -----------------------------------------------------------------------

  it('calls pause() on the video element when unmounted', () => {
    const { unmount } = render(<BackgroundVideo {...defaultProps} />);

    const video = screen.getByTestId('bg-video-media') as HTMLVideoElement;
    expect(video.tagName).toBe('VIDEO');

    pauseSpy.mockClear();
    unmount();

    expect(pauseSpy).toHaveBeenCalled();
  });
});
