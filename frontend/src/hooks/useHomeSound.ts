import { useCallback, useEffect } from 'react';
import { useAudio } from './useAudio';

export interface UseHomeSoundReturn {
  startAmbient: () => void;
  stopAmbient: () => void;
}

/**
 * Event types we listen for to detect the "first user gesture" on the page.
 *
 * Mobile browsers — iOS Safari especially — enforce that `audio.play()` be
 * called inside a live user gesture. Different devices / input methods
 * surface different events first (pointer events, touch events, plain
 * clicks, keyboard), so we listen to all of them in the capture phase to
 * guarantee we run BEFORE any stopPropagation in the tree consumes them.
 */
const GESTURE_EVENTS = [
  'pointerdown',
  'touchstart',
  'touchend',
  'mousedown',
  'click',
  'keydown',
] as const;

/**
 * Hook for managing the Home Screen ambient sound.
 *
 * Auto-starts the ambient loop at low volume on mount. Because browsers
 * block audio playback until a user gesture, we optimistically call play()
 * on mount AND register one-shot, capture-phase listeners for the first
 * user interaction — so the sound starts immediately on desktop where
 * autoplay is permitted, or the instant the user first touches / taps /
 * types on mobile. Stops the sound on unmount.
 */
export function useHomeSound(): UseHomeSoundReturn {
  const { play, stop, init, isPlaying } = useAudio();

  const startAmbient = useCallback((): Promise<boolean> => {
    init();
    return play('ambient', { loop: true, volume: 0.25 });
  }, [init, play]);

  const stopAmbient = useCallback(() => {
    stop('ambient');
  }, [stop]);

  useEffect(() => {
    // Optimistic attempt. No-op if autoplay is blocked — the gesture
    // listeners below will retry once the user actually interacts.
    void startAmbient();

    // We keep the listeners armed until playback REALLY starts. On mobile
    // the first attempt can still reject (e.g. audio buffer not ready yet)
    // even though the call itself happens inside a user gesture; when that
    // happens we need to retry on the next gesture rather than giving up.
    const cleanupListeners = () => {
      for (const evt of GESTURE_EVENTS) {
        document.removeEventListener(evt, onInteraction, true);
      }
    };

    const onInteraction = () => {
      // If some concurrent attempt already started playback, just clean up.
      if (isPlaying('ambient')) {
        cleanupListeners();
        return;
      }
      void startAmbient().then((ok) => {
        if (ok) cleanupListeners();
      });
    };

    for (const evt of GESTURE_EVENTS) {
      // Capture phase + passive so we fire before any descendant handlers
      // and never block touch/scroll gestures.
      document.addEventListener(evt, onInteraction, { capture: true, passive: true });
    }

    return () => {
      cleanupListeners();
      stop('ambient');
    };
  }, [startAmbient, stop, isPlaying]);

  return {
    startAmbient: () => void startAmbient(),
    stopAmbient,
  };
}
