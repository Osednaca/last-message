import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AudioManager, SOUND_REGISTRY, type SoundId } from './AudioManager';

/**
 * Property-based tests for AudioManager.
 *
 * HTMLAudioElement is mocked globally so that play()/pause()/paused
 * behave synchronously — the mock tracks an internal `_paused` flag
 * that is flipped by play() and pause().
 */

// ---------------------------------------------------------------------------
// Mock HTMLAudioElement
// ---------------------------------------------------------------------------

class MockAudioElement {
  src = '';
  preload = '';
  loop = false;
  volume = 1;
  currentTime = 0;
  private _paused = true;

  get paused(): boolean {
    return this._paused;
  }

  play(): Promise<void> {
    this._paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this._paused = true;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
}

// Replace the global Audio constructor with our mock.
// Must use a function declaration so it can be called with `new`.
vi.stubGlobal(
  'Audio',
  function MockAudio(this: MockAudioElement, src?: string) {
    const el = new MockAudioElement();
    if (src) el.src = src;
    return el;
  } as unknown as typeof Audio,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NON_AMBIENT_IDS: SoundId[] = ['scan', 'analyzing', 'reveal'];

/** Reset the AudioManager singleton between tests */
function resetAudioManager(): AudioManager {
  // Access the private static field to clear the singleton
  (AudioManager as unknown as { instance: AudioManager | null }).instance = null;
  const mgr = AudioManager.getInstance();
  mgr.init();
  return mgr;
}

// ---------------------------------------------------------------------------
// Property 1: Non-overlapping non-ambient sounds
// ---------------------------------------------------------------------------

describe('AudioManager property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 5.3, 9.2**
   *
   * Property 1: Non-overlapping non-ambient sounds
   *
   * For any sequence of play() calls with non-ambient sound IDs,
   * at most one non-ambient sound shall be in the "playing" state
   * at any point in time. After each play(id) call, only `id`
   * should report isPlaying() === true among all non-ambient sounds.
   */
  it('Property 1: at most one non-ambient sound is playing after any sequence of play() calls', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty array of non-ambient sound IDs
        fc.array(fc.constantFrom(...NON_AMBIENT_IDS), { minLength: 1, maxLength: 50 }),
        (playSequence: SoundId[]) => {
          const mgr = resetAudioManager();

          for (const id of playSequence) {
            mgr.play(id);

            // Count how many non-ambient sounds report isPlaying === true
            const playingIds = NON_AMBIENT_IDS.filter((sid) => mgr.isPlaying(sid));

            // At most one non-ambient sound should be playing
            expect(playingIds.length).toBeLessThanOrEqual(1);

            // The one that IS playing should be the one we just called play() on
            if (playingIds.length === 1) {
              expect(playingIds[0]).toBe(id);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 2: Audio file allowlist
  // ---------------------------------------------------------------------------

  /**
   * **Validates: Requirements 11.1, 11.2**
   *
   * Property 2: Audio file allowlist
   *
   * The SOUND_REGISTRY shall contain exactly the 4 predefined audio file paths
   * and no others. For any arbitrary string used as a sound ID, only the 4
   * valid SoundId values ('ambient', 'scan', 'analyzing', 'reveal') resolve
   * to audio elements. Invalid IDs do not create or play any audio.
   */
  it('Property 2: SOUND_REGISTRY contains exactly the 4 allowed audio paths', () => {
    const ALLOWED_PATHS = new Set([
      '/audio/Futuristic_Ambience.mp3',
      '/audio/scanning.wav',
      '/audio/analizing.wav',
      '/audio/reveal.wav',
    ]);

    const VALID_IDS: SoundId[] = ['ambient', 'scan', 'analyzing', 'reveal'];

    // Static check: registry has exactly 4 entries with the allowed paths
    const registryKeys = Object.keys(SOUND_REGISTRY);
    expect(registryKeys).toHaveLength(4);
    expect(new Set(registryKeys)).toEqual(new Set(VALID_IDS));

    for (const path of Object.values(SOUND_REGISTRY)) {
      expect(ALLOWED_PATHS.has(path)).toBe(true);
    }
  });

  it('Property 2: only valid SoundId values resolve to playable audio; arbitrary strings do not', () => {
    const VALID_IDS: SoundId[] = ['ambient', 'scan', 'analyzing', 'reveal'];

    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        (arbitraryId: string) => {
          const mgr = resetAudioManager();

          const isValidId = (VALID_IDS as string[]).includes(arbitraryId);

          if (isValidId) {
            // Valid IDs should be playable — play and verify isPlaying
            mgr.play(arbitraryId as SoundId);
            expect(mgr.isPlaying(arbitraryId as SoundId)).toBe(true);

            // The resolved path must be one of the allowed paths
            expect(SOUND_REGISTRY[arbitraryId as SoundId]).toBeDefined();
          } else {
            // Invalid IDs: play() should be a no-op (TypeScript prevents this
            // at compile time, but we verify runtime behavior via the internal map)
            // The sounds map should NOT contain this arbitrary key
            // We verify by checking isPlaying returns false for any non-registered ID
            expect(mgr.isPlaying(arbitraryId as SoundId)).toBe(false);

            // Verify the SOUND_REGISTRY does not have this as an own property
            expect(Object.prototype.hasOwnProperty.call(SOUND_REGISTRY, arbitraryId)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 3: Graceful error degradation
  // ---------------------------------------------------------------------------

  /**
   * **Validates: Requirements 12.3**
   *
   * Property 3: Graceful error degradation
   *
   * For any audio playback error (network failure, decode error, not-supported,
   * not-allowed), the AudioManager SHALL catch the error without throwing, and
   * the application SHALL remain interactive. After any error during play(),
   * the AudioManager's state shall be consistent (no phantom "playing" states)
   * and subsequent play() calls shall still function.
   */
  it('Property 3: play() never throws regardless of error type, state stays consistent, and recovery works', async () => {
    // Error type names matching real DOMException / MediaError scenarios
    const errorTypes = [
      'NotAllowedError',
      'NotSupportedError',
      'AbortError',
      'NetworkError',
      'MEDIA_ERR_ABORTED',
      'MEDIA_ERR_NETWORK',
      'MEDIA_ERR_DECODE',
      'MEDIA_ERR_SRC_NOT_SUPPORTED',
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        // Pick a non-ambient sound to test (ambient doesn't track currentNonAmbient)
        fc.constantFrom(...NON_AMBIENT_IDS),
        // Pick a random error type
        fc.constantFrom(...errorTypes),
        // Generate a random error message
        fc.string({ minLength: 1, maxLength: 50 }),
        async (soundId: SoundId, errorName: string, errorMessage: string) => {
          const mgr = resetAudioManager();

          // Get the internal audio element for this sound and make play() reject
          const audioEl = (mgr as unknown as { sounds: Map<SoundId, MockAudioElement> }).sounds.get(soundId)!;
          const error = new DOMException(errorMessage, errorName);
          const originalPlay = audioEl.play.bind(audioEl);
          audioEl.play = () => {
            // Don't flip _paused — the play failed, audio stays paused
            return Promise.reject(error);
          };

          // 1. play() must never throw synchronously
          expect(() => mgr.play(soundId)).not.toThrow();

          // 2. Flush the microtask queue so the .catch() handler runs
          await new Promise<void>((r) => queueMicrotask(r));

          // 3. State must be consistent: no phantom "playing" state
          //    Since play() rejected, the audio element is still paused
          expect(mgr.isPlaying(soundId)).toBe(false);

          // 4. currentNonAmbient should be cleared (no phantom tracking)
          const currentNonAmbient = (mgr as unknown as { currentNonAmbient: SoundId | null }).currentNonAmbient;
          expect(currentNonAmbient).toBeNull();

          // 5. Restore normal play() and verify recovery — subsequent play() still works
          audioEl.play = originalPlay;
          mgr.play(soundId);
          expect(mgr.isPlaying(soundId)).toBe(true);

          // Clean up
          mgr.stopAll();
        },
      ),
      { numRuns: 100 },
    );
  });
});
