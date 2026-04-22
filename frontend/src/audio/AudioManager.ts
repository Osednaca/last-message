/**
 * Centralized audio manager for the Last Message application.
 * Singleton pattern ensures a single audio context across all components.
 */

export type SoundId = 'ambient' | 'scan' | 'analyzing' | 'reveal';

export const SOUND_REGISTRY: Record<SoundId, string> = {
  ambient: '/audio/Futuristic_Ambience.mp3',
  scan: '/audio/scanning.wav',
  analyzing: '/audio/analizing.wav',
  reveal: '/audio/reveal.wav',
};

export class AudioManager {
  private static instance: AudioManager | null = null;
  private sounds: Map<SoundId, HTMLAudioElement>;
  private initialized: boolean;
  private currentNonAmbient: SoundId | null;

  private constructor() {
    this.sounds = new Map();
    this.initialized = false;
    this.currentNonAmbient = null;
  }

  /** Get or create the singleton instance */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** Initialize audio after first user interaction. Preloads all 4 files. */
  init(): void {
    if (this.initialized) return;

    for (const [id, path] of Object.entries(SOUND_REGISTRY)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      // iOS Safari does not always honour `preload='auto'` on its own; an
      // explicit load() kicks off buffering so the first play() inside a
      // user gesture has data ready and is less likely to be rejected.
      try {
        audio.load();
      } catch {
        // Some environments (jsdom in particular) may not implement load();
        // it's purely an optimisation, so swallow failures silently.
      }
      this.sounds.set(id as SoundId, audio);
    }

    this.initialized = true;
  }

  /**
   * Play a sound. Options: loop (boolean), volume (number 0-1).
   *
   * Returns a Promise that resolves to `true` when playback actually
   * started, or `false` if the browser rejected the request (e.g. autoplay
   * blocked, buffer not ready). Callers that need to retry on the next
   * user gesture (see `useHomeSound`) can await this.
   */
  play(id: SoundId, options?: { loop?: boolean; volume?: number }): Promise<boolean> {
    if (!this.initialized) return Promise.resolve(false);

    const audio = this.sounds.get(id);
    if (!audio) return Promise.resolve(false);

    // For non-ambient sounds, stop any currently playing non-ambient sound first
    if (id !== 'ambient' && this.currentNonAmbient && this.currentNonAmbient !== id) {
      this.stop(this.currentNonAmbient);
    }

    // If the same sound is already playing, restart from the beginning
    if (!audio.paused) {
      audio.currentTime = 0;
    }

    // Set loop and volume from options
    audio.loop = options?.loop ?? false;
    audio.volume = options?.volume ?? 1;

    // Track non-ambient sounds
    if (id !== 'ambient') {
      this.currentNonAmbient = id;
    }

    try {
      const result = audio.play();
      // Older browsers returned undefined from play(); treat as success.
      if (!result || typeof result.then !== 'function') {
        return Promise.resolve(true);
      }
      return result
        .then(() => true)
        .catch(() => {
          // Clear tracking on playback failure
          if (id !== 'ambient' && this.currentNonAmbient === id) {
            this.currentNonAmbient = null;
          }
          return false;
        });
    } catch {
      // Synchronous error
      if (id !== 'ambient' && this.currentNonAmbient === id) {
        this.currentNonAmbient = null;
      }
      return Promise.resolve(false);
    }
  }

  /** Stop a specific sound */
  stop(id: SoundId): void {
    const audio = this.sounds.get(id);
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;

    if (this.currentNonAmbient === id) {
      this.currentNonAmbient = null;
    }
  }

  /** Stop all currently playing sounds */
  stopAll(): void {
    for (const [id, audio] of this.sounds.entries()) {
      audio.pause();
      audio.currentTime = 0;
      if (this.currentNonAmbient === id) {
        this.currentNonAmbient = null;
      }
    }
  }

  /** Check if a specific sound is currently playing */
  isPlaying(id: SoundId): boolean {
    const audio = this.sounds.get(id);
    if (!audio) return false;
    return !audio.paused;
  }

  /** Check if the manager has been initialized */
  isInitialized(): boolean {
    return this.initialized;
  }
}
