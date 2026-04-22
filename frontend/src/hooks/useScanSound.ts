import { useCallback, useRef } from 'react';
import { useAudio } from './useAudio';

export interface UseScanSoundReturn {
  playScan: () => void;
  startAnalyzing: () => void;
  stopAnalyzing: () => void;
  playReveal: () => void;
}

/**
 * Hook for managing scan-related sounds: scan trigger, analyzing loop, and reveal.
 * Uses the centralized AudioManager via useAudio().
 */
export function useScanSound(): UseScanSoundReturn {
  const { play, stop } = useAudio();
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playScan = useCallback(() => {
    play('scan');
  }, [play]);

  const startAnalyzing = useCallback(() => {
    play('analyzing', { loop: true });
  }, [play]);

  const stopAnalyzing = useCallback(() => {
    stop('analyzing');
  }, [stop]);

  const playReveal = useCallback(() => {
    // Clear any pending reveal timer
    if (revealTimerRef.current !== null) {
      clearTimeout(revealTimerRef.current);
    }

    stop('analyzing');

    revealTimerRef.current = setTimeout(() => {
      play('reveal');
      revealTimerRef.current = null;
    }, 250);
  }, [play, stop]);

  return { playScan, startAnalyzing, stopAnalyzing, playReveal };
}
