import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LegacyRecorder } from './LegacyRecorder';

// --- Mock generateLegacySpeech ---
const mockGenerateLegacySpeech = vi.fn();

vi.mock('@/api/client', () => ({
  generateLegacySpeech: (...args: unknown[]) => mockGenerateLegacySpeech(...args),
}));

// --- Mock useAudioPlayer ---
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();
let mockIsPlaying = false;
let mockAudioError: string | null = null;
let capturedOnEnd: (() => void) | undefined;

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: (options?: { onEnd?: () => void }) => {
    capturedOnEnd = options?.onEnd;
    return {
      play: mockPlay,
      stop: mockStop,
      isPlaying: mockIsPlaying,
      error: mockAudioError,
    };
  },
}));

const STORAGE_KEY = 'echoes-legacy-messages';

describe('LegacyRecorder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockGenerateLegacySpeech.mockReset();
    mockPlay.mockReset().mockResolvedValue(undefined);
    mockStop.mockReset();
    mockIsPlaying = false;
    mockAudioError = null;
    capturedOnEnd = undefined;

    // Stub crypto.randomUUID for deterministic IDs
    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
  });

  // Test 1: Component renders title, textarea, counter, and submit button on mount
  it('renders title, textarea, counter, and submit button on mount', () => {
    render(<LegacyRecorder />);

    expect(screen.getByText('Leave a message for the future')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByTestId('char-counter')).toHaveTextContent('0 / 200');
    expect(screen.getByText('Send message to the future')).toBeInTheDocument();
    // Empty state text when no messages
    expect(
      screen.getByText('Write your first message to leave your mark on the future.'),
    ).toBeInTheDocument();
  });

  // Test 2: Submit button is disabled when textarea is empty
  it('submit button is disabled when textarea is empty', () => {
    render(<LegacyRecorder />);

    const submitButton = screen.getByText('Send message to the future');
    expect(submitButton).toBeDisabled();
  });

  // Test 3: Submitting valid text calls generateLegacySpeech with correct payload
  it('submitting valid text calls generateLegacySpeech with correct payload', async () => {
    mockGenerateLegacySpeech.mockResolvedValue({ audio_base64: 'dGVzdA==' });

    render(<LegacyRecorder />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByText('Send message to the future');

    fireEvent.change(textarea, { target: { value: 'Hello future' } });
    expect(submitButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockGenerateLegacySpeech).toHaveBeenCalledTimes(1);
      expect(mockGenerateLegacySpeech).toHaveBeenCalledWith('Hello future', expect.any(AbortSignal));
    });
  });

  // Test 4: Loading state shows transmitting text and disables controls
  it('loading state shows transmitting text and disables controls', async () => {
    // Never resolve so we stay in loading state
    mockGenerateLegacySpeech.mockReturnValue(new Promise(() => {}));

    render(<LegacyRecorder />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByText('Send message to the future');

    fireEvent.change(textarea, { target: { value: 'Hello future' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Loading text should be visible
    expect(screen.getByText('📡 Transmitting to the future…')).toBeInTheDocument();

    // Submit button should be disabled during loading
    expect(submitButton).toBeDisabled();

    // Textarea should be read-only during loading
    expect(textarea).toHaveAttribute('readonly');
  });

  // Test 5: Success state shows confirmation and audio control
  it('success state shows confirmation and audio control', async () => {
    mockGenerateLegacySpeech.mockResolvedValue({ audio_base64: 'dGVzdA==' });

    render(<LegacyRecorder />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByText('Send message to the future');

    fireEvent.change(textarea, { target: { value: 'Hello future' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Message received by the future')).toBeInTheDocument();
    });

    // Audio should have been played with the correct data URL
    expect(mockPlay).toHaveBeenCalledWith('data:audio/mpeg;base64,dGVzdA==');

    // A saved message should appear with a play button
    expect(screen.getByLabelText('Play recording')).toBeInTheDocument();
  });

  // Test 6: Error state shows error message and re-enables controls
  it('error state shows error message and re-enables controls', async () => {
    mockGenerateLegacySpeech.mockRejectedValue(new Error('API error'));

    render(<LegacyRecorder />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByText('Send message to the future');

    fireEvent.change(textarea, { target: { value: 'Hello future' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Transmission failed… try again')).toBeInTheDocument();
    });

    // Error should be in an alert role
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Textarea should not be read-only
    expect(textarea).not.toHaveAttribute('readonly');
  });

  // Test 7: 10-second timeout aborts request and shows error
  it('10-second timeout aborts request and shows error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock that rejects when aborted
    mockGenerateLegacySpeech.mockImplementation(
      (_text: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    render(<LegacyRecorder />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByText('Send message to the future');

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Hello future' } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Loading state should be active
    expect(screen.getByText('📡 Transmitting to the future…')).toBeInTheDocument();

    // Advance timers by 10 seconds to trigger the timeout
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    await waitFor(() => {
      expect(screen.getByText('Transmission failed… try again')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  // Test 8: Saved messages load from localStorage on mount
  it('saved messages load from localStorage on mount', () => {
    const savedMessages = [
      {
        id: 'msg-1',
        text: 'Hello from the past',
        audioData: 'data:audio/mpeg;base64,abc123',
        createdAt: '2025-07-15T10:30:00.000Z',
        type: 'legacy',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMessages));

    render(<LegacyRecorder />);

    // The saved message text should be displayed
    expect(screen.getByText('Hello from the past')).toBeInTheDocument();

    // The empty state text should NOT be displayed
    expect(
      screen.queryByText('Write your first message to leave your mark on the future.'),
    ).not.toBeInTheDocument();
  });

  // Test 9: Clicking a saved message plays its audio
  it('clicking a saved message plays its audio', async () => {
    const savedMessages = [
      {
        id: 'msg-1',
        text: 'Hello from the past',
        audioData: 'data:audio/mpeg;base64,abc123',
        createdAt: '2025-07-15T10:30:00.000Z',
        type: 'legacy',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMessages));

    render(<LegacyRecorder />);

    const playButton = screen.getByLabelText('Play recording');

    await act(async () => {
      fireEvent.click(playButton);
    });

    expect(mockPlay).toHaveBeenCalledWith('data:audio/mpeg;base64,abc123');
  });

  // Test 10: Audio playback error shows original text as fallback
  it('audio playback error shows original text as fallback', async () => {
    const savedMessages = [
      {
        id: 'msg-1',
        text: 'Hello from the past',
        audioData: 'data:audio/mpeg;base64,abc123',
        createdAt: '2025-07-15T10:30:00.000Z',
        type: 'legacy',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMessages));

    // Simulate audio error state
    mockAudioError = 'Playback failed';
    mockIsPlaying = false;

    // Render with the error state active and a playing ID
    const { rerender } = render(<LegacyRecorder />);

    // Click play to set the playingId
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Play recording'));
    });

    // The original text should be visible as fallback
    expect(screen.getByText('Hello from the past')).toBeInTheDocument();

    // Rerender to ensure the text is still displayed as fallback
    rerender(<LegacyRecorder />);
    expect(screen.getByText('Hello from the past')).toBeInTheDocument();
  });
});
