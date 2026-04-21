import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAudioPlayerReturn {
  play: (src: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  error: string | null;
}

export interface UseAudioPlayerOptions {
  onEnd?: () => void;
}

/**
 * Custom hook wrapping the HTML5 Audio API for playing pre-generated audio files.
 *
 * @param options - Optional configuration including an onEnd callback fired when playback completes
 * @returns Controls and state for audio playback
 */
export function useAudioPlayer(
  options?: UseAudioPlayerOptions,
): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndRef = useRef(options?.onEnd);

  // Keep the onEnd ref in sync so the event listener always calls the latest callback
  useEffect(() => {
    onEndRef.current = options?.onEnd;
  }, [options?.onEnd]);

  const play = useCallback(async (src: string): Promise<void> => {
    setError(null);

    // Stop any current playback before starting new audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }

    const audio = new Audio(src);
    audioRef.current = audio;

    const handleEnded = () => {
      setIsPlaying(false);
      onEndRef.current?.();
    };

    const handleError = () => {
      const mediaError = audio.error;
      const message =
        mediaError?.message || 'An error occurred during audio playback';
      setError(message);
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to play audio';
      setError(message);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  return { play, stop, isPlaying, error };
}
