import { useRef, useCallback, useState } from 'react';
import { AudioManager, type SoundId } from '../audio/AudioManager';

export interface UseAudioReturn {
  play: (
    id: SoundId,
    options?: { loop?: boolean; volume?: number },
  ) => Promise<boolean>;
  stop: (id: SoundId) => void;
  stopAll: () => void;
  isPlaying: (id: SoundId) => boolean;
  init: () => void;
  initialized: boolean;
}

/**
 * Thin wrapper around AudioManager.getInstance().
 * Provides stable function references via useCallback and tracks
 * the initialized state for component reactivity.
 */
export function useAudio(): UseAudioReturn {
  const managerRef = useRef(AudioManager.getInstance());
  const [initialized, setInitialized] = useState(
    managerRef.current.isInitialized(),
  );

  const init = useCallback(() => {
    managerRef.current.init();
    setInitialized(true);
  }, []);

  const play = useCallback(
    (id: SoundId, options?: { loop?: boolean; volume?: number }) =>
      managerRef.current.play(id, options),
    [],
  );

  const stop = useCallback((id: SoundId) => {
    managerRef.current.stop(id);
  }, []);

  const stopAll = useCallback(() => {
    managerRef.current.stopAll();
  }, []);

  const isPlaying = useCallback((id: SoundId) => {
    return managerRef.current.isPlaying(id);
  }, []);

  return { play, stop, stopAll, isPlaying, init, initialized };
}
