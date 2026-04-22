// Feature: legacy-elevenlabs-tts, Property 2: Submit button enabled state
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { LegacyRecorder } from './LegacyRecorder';

// --- Mock generateLegacySpeech ---
const mockGenerateLegacySpeech = vi.fn();

vi.mock('@/api/client', () => ({
  generateLegacySpeech: (...args: unknown[]) => mockGenerateLegacySpeech(...args),
}));

// --- Mock useAudioPlayer ---
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: (_options?: { onEnd?: () => void }) => {
    return {
      play: mockPlay,
      stop: mockStop,
      isPlaying: false,
      error: null,
    };
  },
}));

fc.configureGlobal({ numRuns: 100 });

describe('Property 2: Submit button enabled state', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockGenerateLegacySpeech.mockReset();
    mockPlay.mockReset().mockResolvedValue(undefined);
    mockStop.mockReset();

    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: vi.fn().mockReturnValue('test-uuid-prop'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /**
   * **Validates: Requirements 1.4, 1.6**
   *
   * For any string of length 0–300, the submit button SHALL be disabled
   * if and only if the string length is 0. For any non-empty string (1–300),
   * the submit button SHALL be enabled.
   *
   * Note: fireEvent.change bypasses the textarea's maxLength attribute,
   * so strings >200 chars are set in full. The component disables the button
   * only when text.length === 0.
   */
  it('submit button is disabled iff the input string length is 0', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 300 }),
        (input: string) => {
          const { unmount } = render(<LegacyRecorder />);

          const textarea = screen.getByPlaceholderText('Type your message...');
          fireEvent.change(textarea, { target: { value: input } });

          const submitButton = screen.getByRole('button', {
            name: /send message to the future/i,
          });

          if (input.length === 0) {
            expect(submitButton).toBeDisabled();
          } else {
            expect(submitButton).toBeEnabled();
          }

          unmount();
        },
      ),
    );
  });
});
