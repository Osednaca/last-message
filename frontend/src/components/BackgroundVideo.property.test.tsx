// Feature: home-background-video, Property 1: Visual treatment prop fidelity
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { BackgroundVideo } from './BackgroundVideo';

// ---------------------------------------------------------------------------
// Mock HTMLMediaElement methods — jsdom does not implement them
// ---------------------------------------------------------------------------

beforeEach(() => {
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
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

fc.configureGlobal({ numRuns: 100 });

describe('Property 1: Visual treatment prop fidelity', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1**
   *
   * For any valid combination of opacity (0–1), blurPx (integer 0–20),
   * overlayBlurPx (integer 0–20), tintEnabled (boolean), and tintOpacity
   * (float 0–0.15), the rendered BackgroundVideo component SHALL apply
   * those exact values to the corresponding DOM elements' inline styles.
   */
  it('applies generated visual treatment props to the correct DOM elements', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        fc.double({ min: 0, max: 0.15, noNaN: true, noDefaultInfinity: true }),
        (
          opacity: number,
          blurPx: number,
          overlayBlurPx: number,
          tintEnabled: boolean,
          tintOpacity: number,
        ) => {
          const { unmount } = render(
            <BackgroundVideo
              src="/video/nature.mp4"
              fallbackSrc="/video/fallback.jpg"
              opacity={opacity}
              blurPx={blurPx}
              overlayBlurPx={overlayBlurPx}
              tintEnabled={tintEnabled}
              tintOpacity={tintOpacity}
            />,
          );

          // Media element: opacity and blur filter
          const media = screen.getByTestId('bg-video-media');
          expect(media.style.opacity).toBe(String(opacity));
          expect(media.style.filter).toBe(`blur(${blurPx}px)`);

          // Overlay: backdrop-filter
          const overlay = screen.getByTestId('bg-video-overlay');
          expect(overlay.style.backdropFilter).toBe(`blur(${overlayBlurPx}px)`);

          // Tint overlay: presence/absence and opacity
          const tint = screen.queryByTestId('bg-video-tint');
          if (tintEnabled) {
            expect(tint).not.toBeNull();
            expect(tint!.style.opacity).toBe(String(tintOpacity));
          } else {
            expect(tint).toBeNull();
          }

          unmount();
        },
      ),
    );
  });
});


describe('Property 2: Fallback visual treatment equivalence', () => {
  /**
   * **Validates: Requirements 5.1, 5.3, 5.4**
   *
   * For any set of visual treatment props, when the video element fires an
   * error event and the fallback image is displayed, the visual treatment
   * styles applied to the fallback image and its overlay layers SHALL be
   * identical to those that would be applied to the video element — same
   * opacity, same blur filter, same dark overlay, same tint overlay.
   */
  it('applies identical visual treatment styles in video mode and fallback mode', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        fc.double({ min: 0, max: 0.15, noNaN: true, noDefaultInfinity: true }),
        (
          opacity: number,
          blurPx: number,
          overlayBlurPx: number,
          tintEnabled: boolean,
          tintOpacity: number,
        ) => {
          const props = {
            src: '/video/nature.mp4',
            fallbackSrc: '/video/fallback.jpg',
            opacity,
            blurPx,
            overlayBlurPx,
            tintEnabled,
            tintOpacity,
          };

          // --- Render in normal (video) mode and collect styles ---
          const { unmount: unmountVideo } = render(<BackgroundVideo {...props} />);

          const videoMedia = screen.getByTestId('bg-video-media');
          const videoOverlay = screen.getByTestId('bg-video-overlay');
          const videoTint = screen.queryByTestId('bg-video-tint');

          const videoStyles = {
            mediaOpacity: videoMedia.style.opacity,
            mediaFilter: videoMedia.style.filter,
            overlayBackground: videoOverlay.style.background,
            overlayBackdropFilter: videoOverlay.style.backdropFilter,
            tintPresent: videoTint !== null,
            tintOpacity: videoTint?.style.opacity ?? null,
          };

          unmountVideo();

          // --- Render again and trigger fallback via error event ---
          const { unmount: unmountFallback } = render(<BackgroundVideo {...props} />);

          // Fire error on the video element to trigger fallback
          const videoEl = screen.getByTestId('bg-video-media');
          expect(videoEl.tagName).toBe('VIDEO'); // Confirm it's still a video before error
          fireEvent.error(videoEl);

          const fallbackMedia = screen.getByTestId('bg-video-media');
          const fallbackOverlay = screen.getByTestId('bg-video-overlay');
          const fallbackTint = screen.queryByTestId('bg-video-tint');

          const fallbackStyles = {
            mediaOpacity: fallbackMedia.style.opacity,
            mediaFilter: fallbackMedia.style.filter,
            overlayBackground: fallbackOverlay.style.background,
            overlayBackdropFilter: fallbackOverlay.style.backdropFilter,
            tintPresent: fallbackTint !== null,
            tintOpacity: fallbackTint?.style.opacity ?? null,
          };

          // --- Assert visual treatment is identical ---
          expect(fallbackStyles.mediaOpacity).toBe(videoStyles.mediaOpacity);
          expect(fallbackStyles.mediaFilter).toBe(videoStyles.mediaFilter);
          expect(fallbackStyles.overlayBackground).toBe(videoStyles.overlayBackground);
          expect(fallbackStyles.overlayBackdropFilter).toBe(videoStyles.overlayBackdropFilter);
          expect(fallbackStyles.tintPresent).toBe(videoStyles.tintPresent);
          expect(fallbackStyles.tintOpacity).toBe(videoStyles.tintOpacity);

          // Also verify the fallback is actually an image (not a video)
          expect(fallbackMedia.tagName).toBe('IMG');

          unmountFallback();
        },
      ),
    );
  });
});
