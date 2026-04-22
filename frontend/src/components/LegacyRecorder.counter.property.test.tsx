// Feature: legacy-elevenlabs-tts, Property 1: Character counter accuracy
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

describe('Property 1: Character counter accuracy', () => {
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
   * **Validates: Requirements 1.2, 1.3**
   *
   * For any string of length 0–200, typing that string into the textarea
   * SHALL result in the character counter displaying exactly "{length} / 200"
   * and the textarea containing the full input string.
   */
  it('counter displays "{length} / 200" and textarea contains the full input for any string of length 0–200', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (input: string) => {
          const { unmount } = render(<LegacyRecorder />);

          const textarea = screen.getByPlaceholderText('Type your message...');
          fireEvent.change(textarea, { target: { value: input } });

          const counter = screen.getByTestId('char-counter');
          expect(counter).toHaveTextContent(`${input.length} / 200`);
          expect(textarea).toHaveValue(input);

          unmount();
        },
      ),
    );
  });
});
