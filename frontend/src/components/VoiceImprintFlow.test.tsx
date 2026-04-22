import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// --- Captured prop callbacks from mocked sub-components ---

let capturedEntryOnStart: (() => void) | undefined;
let capturedRecorderOnComplete: ((blob: Blob) => void) | undefined;
let capturedMessageOnConfirm: ((text: string) => void) | undefined;
let capturedPlaybackProps:
  | {
      audioData: string;
      messageText: string;
      onReplay: () => void;
      onSave: () => void;
      onRetry: () => void;
      showSave: boolean;
    }
  | undefined;

const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();

// --- Mock sub-components ---

vi.mock('./voice-imprint/EntryScreen', () => ({
  EntryScreen: ({ onStart }: { onStart: () => void }) => {
    capturedEntryOnStart = onStart;
    return <div data-testid="entry-screen">Entry</div>;
  },
}));

vi.mock('./voice-imprint/VoiceRecorderStep', () => ({
  VoiceRecorderStep: () => <div data-testid="recorder-step">Recorder</div>,
}));

// Mock useVoiceRecorder so we can capture onComplete and simulate a completed
// recording from tests, and verify that startRecording is invoked as part of
// the user gesture (the EntryScreen onStart / PlaybackScreen onRetry flows).
vi.mock('@/hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: (options: {
    minDuration?: number;
    maxDuration?: number;
    onComplete: (blob: Blob) => void;
  }) => {
    capturedRecorderOnComplete = options.onComplete;
    return {
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
      isRecording: false,
      elapsedSeconds: 0,
      analyserNode: null,
      error: null,
    };
  },
}));

vi.mock('./voice-imprint/MessageStep', () => ({
  MessageStep: ({ onConfirm }: { onConfirm: (text: string) => void }) => {
    capturedMessageOnConfirm = onConfirm;
    return <div data-testid="message-step">Message</div>;
  },
}));

vi.mock('./voice-imprint/PlaybackScreen', () => ({
  PlaybackScreen: (props: {
    audioData: string;
    messageText: string;
    onReplay: () => void;
    onSave: () => void;
    onRetry: () => void;
    showSave: boolean;
  }) => {
    capturedPlaybackProps = props;
    return <div data-testid="playback-screen">Playback</div>;
  },
}));

// --- Mock API client ---

const mockCloneVoice = vi.fn();
const mockGenerateLegacySpeech = vi.fn();

vi.mock('@/api/client', () => ({
  cloneVoice: (...args: unknown[]) => mockCloneVoice(...args),
  generateLegacySpeech: (...args: unknown[]) =>
    mockGenerateLegacySpeech(...args),
}));

// --- Mock useAudioPlayer ---

const mockPlay = vi.fn();
const mockStop = vi.fn();

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    play: mockPlay,
    stop: mockStop,
    isPlaying: false,
    error: null,
  }),
}));

// --- Mock crypto.randomUUID ---

vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234',
});

// --- Import component under test (after mocks) ---

import { VoiceImprintFlow } from './VoiceImprintFlow';

// --- Helpers ---

function resetCapturedCallbacks() {
  capturedEntryOnStart = undefined;
  capturedRecorderOnComplete = undefined;
  capturedMessageOnConfirm = undefined;
  capturedPlaybackProps = undefined;
}

describe('VoiceImprintFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetCapturedCallbacks();
    mockCloneVoice.mockReset();
    mockGenerateLegacySpeech.mockReset();
    mockStartRecording.mockReset();
    mockStopRecording.mockReset();
  });

  // --- Requirement 7.3: Initial state renders EntryScreen ---

  it('renders EntryScreen in initial state', () => {
    render(<VoiceImprintFlow />);
    expect(screen.getByTestId('entry-screen')).toBeInTheDocument();
  });

  // --- Requirement 7.3: Entry → Recording transition ---

  it('transitions from entry to recording when onStart is called', () => {
    render(<VoiceImprintFlow />);
    expect(screen.getByTestId('entry-screen')).toBeInTheDocument();

    act(() => {
      capturedEntryOnStart?.();
    });

    expect(screen.queryByTestId('entry-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('recorder-step')).toBeInTheDocument();
  });

  // --- Mobile gesture fix: EntryScreen click must trigger startRecording
  // synchronously so getUserMedia() runs inside the user gesture. ---

  it('invokes startRecording synchronously from the EntryScreen onStart handler', () => {
    render(<VoiceImprintFlow />);

    act(() => {
      capturedEntryOnStart?.();
    });

    expect(mockStartRecording).toHaveBeenCalledTimes(1);
  });

  // --- Requirement 7.3: Recording → Message transition ---

  it('transitions from recording to message when onComplete is called with a blob', () => {
    render(<VoiceImprintFlow />);

    act(() => {
      capturedEntryOnStart?.();
    });
    expect(screen.getByTestId('recorder-step')).toBeInTheDocument();

    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });

    expect(screen.queryByTestId('recorder-step')).not.toBeInTheDocument();
    expect(screen.getByTestId('message-step')).toBeInTheDocument();
  });

  // --- Requirement 7.3: Message → Processing transition ---

  it('transitions from message to processing when onConfirm is called', async () => {
    // Make cloneVoice hang so we stay in processing
    mockCloneVoice.mockReturnValue(new Promise(() => {}));

    render(<VoiceImprintFlow />);

    // Entry → Recording
    act(() => {
      capturedEntryOnStart?.();
    });

    // Recording → Message
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });

    // Message → Processing
    act(() => {
      capturedMessageOnConfirm?.('Hello future');
    });

    expect(screen.queryByTestId('message-step')).not.toBeInTheDocument();
    // Processing shows the processing text
    expect(screen.getByText('Processing voice imprint…')).toBeInTheDocument();
  });

  // --- Requirement 7.3, 7.4: Processing → Playback transition ---

  it('transitions from processing to playback when cloneVoice resolves', async () => {
    mockCloneVoice.mockResolvedValue({ audio_base64: 'dGVzdA==' });

    render(<VoiceImprintFlow />);

    // Navigate to processing
    act(() => {
      capturedEntryOnStart?.();
    });
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });

    await act(async () => {
      capturedMessageOnConfirm?.('Hello future');
    });

    expect(screen.getByTestId('playback-screen')).toBeInTheDocument();
    expect(capturedPlaybackProps?.audioData).toBe(
      'data:audio/mpeg;base64,dGVzdA==',
    );
    expect(capturedPlaybackProps?.messageText).toBe('Hello future');
  });

  // --- Requirement 7.4: Error → Retry returns to recording ---

  it('returns to recording step on first cloneVoice failure', async () => {
    mockCloneVoice.mockRejectedValue(new Error('Clone failed'));

    render(<VoiceImprintFlow />);

    // Navigate to processing
    act(() => {
      capturedEntryOnStart?.();
    });
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });

    await act(async () => {
      capturedMessageOnConfirm?.('Hello future');
    });

    // Should go back to recording for retry
    expect(screen.getByTestId('recorder-step')).toBeInTheDocument();
  });

  // --- Requirement 7.5: Retry → Fallback to default voice ---

  it('falls back to generateLegacySpeech on second cloneVoice failure', async () => {
    // First call fails
    mockCloneVoice.mockRejectedValueOnce(new Error('Clone failed'));
    // Second call also fails (retry)
    mockCloneVoice.mockRejectedValueOnce(new Error('Clone failed again'));
    // Fallback succeeds
    mockGenerateLegacySpeech.mockResolvedValue({
      audio_base64: 'ZmFsbGJhY2s=',
    });

    render(<VoiceImprintFlow />);

    // First attempt: Entry → Recording → Message → Processing (fails) → Recording
    act(() => {
      capturedEntryOnStart?.();
    });
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });
    await act(async () => {
      capturedMessageOnConfirm?.('Hello future');
    });

    // Should be back at recording after first failure
    expect(screen.getByTestId('recorder-step')).toBeInTheDocument();

    // Second attempt: Recording → Message → Processing (clone fails, fallback succeeds)
    const blob2 = new Blob(['audio-data-2'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob2);
    });
    await act(async () => {
      capturedMessageOnConfirm?.('Hello future');
    });

    // Should reach playback via fallback
    expect(screen.getByTestId('playback-screen')).toBeInTheDocument();
    expect(capturedPlaybackProps?.audioData).toBe(
      'data:audio/mpeg;base64,ZmFsbGJhY2s=',
    );
    expect(mockGenerateLegacySpeech).toHaveBeenCalledWith('Hello future');
  });

  // --- Requirement 7.5: Fallback also fails → back to recording ---

  it('returns to recording when both clone and fallback fail', async () => {
    mockCloneVoice.mockRejectedValueOnce(new Error('Clone failed'));
    mockCloneVoice.mockRejectedValueOnce(new Error('Clone failed again'));
    mockGenerateLegacySpeech.mockRejectedValue(new Error('Fallback failed'));

    render(<VoiceImprintFlow />);

    // First attempt fails
    act(() => {
      capturedEntryOnStart?.();
    });
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });
    await act(async () => {
      capturedMessageOnConfirm?.('Hello future');
    });

    // Back at recording after first failure
    expect(screen.getByTestId('recorder-step')).toBeInTheDocument();

    // Second attempt: clone fails, fallback also fails
    const blob2 = new Blob(['audio-data-2'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob2);
    });
    await act(async () => {
      capturedMessageOnConfirm?.('Hello future');
    });

    // Should be back at recording
    expect(screen.getByTestId('recorder-step')).toBeInTheDocument();
  });

  // --- Requirement 7.6: Save creates correct VoiceImprintRecord in localStorage ---

  it('saves a VoiceImprintRecord to localStorage when onSave is called', async () => {
    mockCloneVoice.mockResolvedValue({ audio_base64: 'dGVzdA==' });

    render(<VoiceImprintFlow />);

    // Navigate to playback
    act(() => {
      capturedEntryOnStart?.();
    });
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });
    await act(async () => {
      capturedMessageOnConfirm?.('My legacy message');
    });

    expect(screen.getByTestId('playback-screen')).toBeInTheDocument();

    // Trigger save
    act(() => {
      capturedPlaybackProps?.onSave();
    });

    // Verify localStorage
    const stored = JSON.parse(
      localStorage.getItem('echoes-voice-imprints') ?? '[]',
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: 'test-uuid-1234',
      type: 'legacy_voice',
      text: 'My legacy message',
      audioData: 'data:audio/mpeg;base64,dGVzdA==',
    });
    expect(stored[0].createdAt).toBeDefined();
    // Verify it's a valid ISO 8601 timestamp
    expect(new Date(stored[0].createdAt).toISOString()).toBe(
      stored[0].createdAt,
    );
  });

  // --- Requirement 7.6: showSave becomes false after saving ---

  it('sets showSave to false after saving', async () => {
    mockCloneVoice.mockResolvedValue({ audio_base64: 'dGVzdA==' });

    render(<VoiceImprintFlow />);

    // Navigate to playback
    act(() => {
      capturedEntryOnStart?.();
    });
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });
    await act(async () => {
      capturedMessageOnConfirm?.('My legacy message');
    });

    expect(capturedPlaybackProps?.showSave).toBe(true);

    // Save
    act(() => {
      capturedPlaybackProps?.onSave();
    });

    expect(capturedPlaybackProps?.showSave).toBe(false);
  });

  // --- Requirement 7.7: Storage full shows error message ---

  it('shows storage error when localStorage.setItem throws', async () => {
    mockCloneVoice.mockResolvedValue({ audio_base64: 'dGVzdA==' });

    render(<VoiceImprintFlow />);

    // Navigate to playback
    act(() => {
      capturedEntryOnStart?.();
    });
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });
    act(() => {
      capturedRecorderOnComplete?.(blob);
    });
    await act(async () => {
      capturedMessageOnConfirm?.('My legacy message');
    });

    // Make localStorage.setItem throw
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

    act(() => {
      capturedPlaybackProps?.onSave();
    });

    expect(
      screen.getByText('Storage full — imprint played but not saved'),
    ).toBeInTheDocument();

    setItemSpy.mockRestore();
  });

  // --- Requirement 7.3: Loads saved imprints from localStorage on mount ---

  it('loads and displays saved imprints from localStorage on mount', () => {
    const existingRecords = [
      {
        id: 'existing-1',
        type: 'legacy_voice',
        text: 'Existing message',
        audioData: 'data:audio/mpeg;base64,abc',
        createdAt: '2025-01-15T10:30:00.000Z',
      },
    ];
    localStorage.setItem(
      'echoes-voice-imprints',
      JSON.stringify(existingRecords),
    );

    render(<VoiceImprintFlow />);

    expect(screen.getByText('Existing message')).toBeInTheDocument();
    expect(screen.getByText('Saved Imprints')).toBeInTheDocument();
  });
});
