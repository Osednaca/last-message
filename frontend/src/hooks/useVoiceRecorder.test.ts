import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder } from './useVoiceRecorder';

// --- Mock helpers ---

function createMockTrack() {
  return { stop: vi.fn(), kind: 'audio' } as unknown as MediaStreamTrack;
}

function createMockStream() {
  const track = createMockTrack();
  return {
    getTracks: () => [track],
    getAudioTracks: () => [track],
    _track: track,
  } as unknown as MediaStream & { _track: MediaStreamTrack };
}

let mockMediaRecorderInstances: MockMediaRecorder[] = [];

class MockMediaRecorder {
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  stream: MediaStream;
  mimeType: string;

  static isTypeSupported = vi.fn().mockReturnValue(true);

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.mimeType = options?.mimeType ?? '';
    mockMediaRecorderInstances.push(this);
  }

  start = vi.fn().mockImplementation(() => {
    this.state = 'recording';
  });

  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive';
    // Simulate data available then stop
    if (this.ondataavailable) {
      this.ondataavailable({
        data: new Blob(['audio-data'], { type: 'audio/webm' }),
      } as BlobEvent);
    }
    if (this.onstop) {
      this.onstop();
    }
  });

  pause = vi.fn();
  resume = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn().mockReturnValue(true);
}

let latestMockAudioCtx: ReturnType<typeof createMockAudioContext>;

function createMockAnalyserNode() {
  return {
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AnalyserNode;
}

function createMockAudioContext() {
  const analyser = createMockAnalyserNode();
  const source = { connect: vi.fn() };
  return {
    createAnalyser: vi.fn().mockReturnValue(analyser),
    createMediaStreamSource: vi.fn().mockReturnValue(source),
    close: vi.fn().mockResolvedValue(undefined),
    _analyser: analyser,
    _source: source,
  };
}

// A proper class mock for AudioContext so `new AudioContext()` works
class MockAudioContext {
  createAnalyser: ReturnType<typeof vi.fn>;
  createMediaStreamSource: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;

  constructor() {
    const ctx = createMockAudioContext();
    latestMockAudioCtx = ctx;
    this.createAnalyser = ctx.createAnalyser;
    this.createMediaStreamSource = ctx.createMediaStreamSource;
    this.close = ctx.close;
  }
}

// --- Test suite ---

describe('useVoiceRecorder', () => {
  let mockStream: ReturnType<typeof createMockStream>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockMediaRecorderInstances = [];
    mockStream = createMockStream();

    // Mock getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    // Mock MediaRecorder as a global class
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);

    // Mock AudioContext as a global class
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns correct initial state', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    expect(result.current.isRecording).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.analyserNode).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.startRecording).toBe('function');
    expect(typeof result.current.stopRecording).toBe('function');
  });

  it('starts recording and sets isRecording to true with analyserNode', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.analyserNode).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it('stops recording and calls onComplete with a blob', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('tracks elapsed seconds while recording', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsedSeconds).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsedSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsedSeconds).toBe(3);
  });

  it('auto-stops recording at maxDuration (default 10s)', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ maxDuration: 10, onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    // Advance to 10 seconds — should auto-stop
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.isRecording).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('auto-stops at custom maxDuration', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ maxDuration: 5, onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    // Advance 4 seconds — still recording
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.isRecording).toBe(true);

    // Advance to 5 seconds — should auto-stop
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isRecording).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('sets error when getUserMedia fails', async () => {
    const errorMessage = 'Permission denied';
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error(errorMessage),
    );

    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe(`${errorMessage} (Code: Error)`);
    expect(result.current.isRecording).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('cleans up stream tracks when recording stops', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    // The stream track's stop() should have been called during onstop cleanup
    expect(mockStream._track.stop).toHaveBeenCalled();
  });

  it('closes AudioContext when recording stops', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const audioCtx = latestMockAudioCtx;

    act(() => {
      result.current.stopRecording();
    });

    expect(audioCtx.close).toHaveBeenCalled();
  });

  it('resets elapsed seconds when starting a new recording', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    // First recording
    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsedSeconds).toBe(3);

    act(() => {
      result.current.stopRecording();
    });

    // Re-create mock stream for second recording
    mockStream = createMockStream();
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(mockStream);

    // Second recording — elapsed should reset
    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('clears error when starting a new recording', async () => {
    const onComplete = vi.fn();

    // First attempt fails
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Permission denied'),
    );

    const { result } = renderHook(() =>
      useVoiceRecorder({ onComplete }),
    );

    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.error).toBe('Permission denied (Code: Error)');

    // Second attempt succeeds — error should clear
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.error).toBeNull();
  });
});
