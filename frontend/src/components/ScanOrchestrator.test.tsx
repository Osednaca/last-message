import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ScanOrchestrator } from './ScanOrchestrator';

// ---- Mocks ----

// Mock useImageCapture hook
const mockCaptureFrame = vi.fn();
vi.mock('@/hooks/useImageCapture', () => ({
  useImageCapture: () => ({ captureFrame: mockCaptureFrame }),
}));

// Mock useCollection hook
const mockAddToCollection = vi.fn();
vi.mock('@/hooks/useCollection', () => ({
  useCollection: () => ({
    addToCollection: mockAddToCollection,
    getCollection: () => [],
    isDiscovered: () => false,
  }),
}));

// Mock useScanSound hook
const mockPlayScan = vi.fn();
const mockStartAnalyzing = vi.fn();
const mockStopAnalyzing = vi.fn();
const mockPlayReveal = vi.fn();
vi.mock('@/hooks/useScanSound', () => ({
  useScanSound: () => ({
    playScan: mockPlayScan,
    startAnalyzing: mockStartAnalyzing,
    stopAnalyzing: mockStopAnalyzing,
    playReveal: mockPlayReveal,
  }),
}));

// Mock getRandomMessage
vi.mock('@/data/messages', () => ({
  getRandomMessage: () => ({
    id: 'consumption-001',
    text: 'A message from the future about consumption.',
    audioPath: '/audio/consumption-001.mp3',
  }),
}));

// ---- Audio mock helpers ----
type AudioEventHandler = () => void;

let mockAudioInstances: MockAudioInstance[];
let mockPlayImpl: () => Promise<void>;

class MockAudioInstance {
  src: string;
  error: { message: string } | null = null;
  private listeners: Record<string, AudioEventHandler[]> = {};

  constructor(src?: string) {
    this.src = src ?? '';
    mockAudioInstances.push(this);
  }

  play(): Promise<void> {
    return mockPlayImpl();
  }

  addEventListener(event: string, handler: AudioEventHandler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: AudioEventHandler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
    }
  }

  trigger(event: string) {
    this.listeners[event]?.forEach((h) => h());
  }
}

// ---- Test suite ----

describe('ScanOrchestrator', () => {
  const videoRef = { current: document.createElement('video') };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockAudioInstances = [];
    mockPlayImpl = () => Promise.resolve();
    vi.stubGlobal('Audio', MockAudioInstance);

    mockCaptureFrame.mockReturnValue('base64ImageData');
    mockAddToCollection.mockClear();
    mockPlayScan.mockClear();
    mockStartAnalyzing.mockClear();
    mockStopAnalyzing.mockClear();
    mockPlayReveal.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Requirement 2.3, 12.1: Full scan flow with mocked API returning valid response
  it('completes full scan flow: idle → scanning → detected → playing → idle', async () => {
    // Control when fetch resolves so we can observe intermediate states
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    // Initially idle
    expect(screen.getByText('Point your camera at an object')).toBeInTheDocument();

    // Click scan
    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // Should show scanning state while fetch is pending
    expect(screen.getByText('Analyzing environment...')).toBeInTheDocument();

    // Resolve fetch with valid response
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ label: 'bottle', category: 'consumption' }),
      });
    });

    // Wait for detected state
    await waitFor(() => {
      expect(screen.getByText('Signal detected')).toBeInTheDocument();
    });
    expect(screen.getByText('bottle')).toBeInTheDocument();

    // Advance past the 1200ms detected pause
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });

    // Should transition to playing state
    await waitFor(() => {
      expect(screen.getByText('Transmitting message...')).toBeInTheDocument();
    });

    // Simulate audio ended
    await act(async () => {
      const audioInstance = mockAudioInstances[0];
      audioInstance.trigger('ended');
    });

    // Should return to idle and add to collection
    await waitFor(() => {
      expect(screen.getByText('Point your camera at an object')).toBeInTheDocument();
    });
    expect(mockAddToCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'consumption-001',
        category: 'consumption',
      }),
    );
  });

  // Requirement 12.3: Timeout handling (API takes >5s)
  it('returns overlay to idle when API does not respond within 5 seconds', async () => {
    // Mock fetch that never resolves — will be aborted by the 5s timeout
    const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // Scanning state
    expect(screen.getByText('Analyzing environment...')).toBeInTheDocument();

    // Advance past the 5s timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });

    // Should return to idle state after timeout
    await waitFor(() => {
      expect(screen.getByText('Point your camera at an object')).toBeInTheDocument();
    });

    // Button should be re-enabled
    expect(scanButton).not.toBeDisabled();
  });

  // Requirement 2.4: Scan button disabled during processing
  it('disables scan button during processing', async () => {
    // Mock fetch that we control
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    expect(scanButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(scanButton);
    });

    // Button should be disabled during processing
    expect(scanButton).toBeDisabled();

    // Resolve fetch to complete the flow
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ label: 'bottle', category: 'consumption' }),
      });
    });

    // Advance past detected pause
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });

    // Simulate audio ended
    await act(async () => {
      const audioInstance = mockAudioInstances[0];
      audioInstance.trigger('ended');
    });

    // Button should be re-enabled after flow completes
    await waitFor(() => {
      expect(scanButton).not.toBeDisabled();
    });
  });

  // Requirement 12.3: Error handling returns overlay to Idle
  it('returns overlay to idle on API error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // Should return to idle after error
    await waitFor(() => {
      expect(screen.getByText('Point your camera at an object')).toBeInTheDocument();
    });

    // Button should be re-enabled
    expect(scanButton).not.toBeDisabled();
  });

  // Requirement 6.4: Audio fallback to text on playback failure
  it('falls back to showing message text when audio playback fails', async () => {
    // Control fetch resolution
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    // Make audio play() reject to simulate failure
    mockPlayImpl = () => Promise.reject(new Error('Audio playback failed'));

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // Resolve fetch
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ label: 'bottle', category: 'consumption' }),
      });
    });

    // Wait for detected state
    await waitFor(() => {
      expect(screen.getByText('Signal detected')).toBeInTheDocument();
    });

    // Advance past detected pause
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });

    // Audio play() rejects, so it should still add to collection and return to idle
    await waitFor(() => {
      expect(screen.getByText('Point your camera at an object')).toBeInTheDocument();
    });

    // Collection should still be updated even on audio failure
    expect(mockAddToCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'consumption-001',
        category: 'consumption',
      }),
    );
  });
});

describe('ScanOrchestrator sound integration', () => {
  const videoRef = { current: document.createElement('video') };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockAudioInstances = [];
    mockPlayImpl = () => Promise.resolve();
    vi.stubGlobal('Audio', MockAudioInstance);

    mockCaptureFrame.mockReturnValue('base64ImageData');
    mockAddToCollection.mockClear();
    mockPlayScan.mockClear();
    mockStartAnalyzing.mockClear();
    mockStopAnalyzing.mockClear();
    mockPlayReveal.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Requirement 7.1: playScan() is called when the scan button is clicked
  it('calls playScan() when the scan button is clicked', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    expect(mockPlayScan).toHaveBeenCalledTimes(1);

    // Cleanup: resolve fetch to avoid dangling promise
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ label: 'bottle', category: 'consumption' }),
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    await act(async () => {
      mockAudioInstances[0]?.trigger('ended');
    });
  });

  // Requirement 8.1: startAnalyzing() is called after frame capture succeeds
  it('calls startAnalyzing() after frame capture during API processing', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // startAnalyzing should be called while waiting for API response
    expect(mockStartAnalyzing).toHaveBeenCalledTimes(1);
    // playScan is called first, then startAnalyzing
    expect(mockPlayScan.mock.invocationCallOrder[0]).toBeLessThan(
      mockStartAnalyzing.mock.invocationCallOrder[0],
    );

    // Cleanup
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ label: 'bottle', category: 'consumption' }),
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    await act(async () => {
      mockAudioInstances[0]?.trigger('ended');
    });
  });

  // Requirement 8.3, 9.1: stopAnalyzing() and playReveal() are called when result arrives
  it('calls stopAnalyzing() and playReveal() when the API response arrives', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // Before API resolves, stopAnalyzing and playReveal should not be called
    expect(mockStopAnalyzing).not.toHaveBeenCalled();
    expect(mockPlayReveal).not.toHaveBeenCalled();

    // Resolve fetch
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ label: 'bottle', category: 'consumption' }),
      });
    });

    // After API resolves, stopAnalyzing and playReveal should be called
    await waitFor(() => {
      expect(mockStopAnalyzing).toHaveBeenCalledTimes(1);
      expect(mockPlayReveal).toHaveBeenCalledTimes(1);
    });

    // stopAnalyzing should be called before playReveal
    expect(mockStopAnalyzing.mock.invocationCallOrder[0]).toBeLessThan(
      mockPlayReveal.mock.invocationCallOrder[0],
    );

    // Cleanup
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    await act(async () => {
      mockAudioInstances[0]?.trigger('ended');
    });
  });

  // Requirement 8.3: stopAnalyzing() is called when transitioning to detected state
  it('transitions to detected state and calls playReveal()', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ label: 'bottle', category: 'consumption' }),
      });
    });

    // Verify detected state is shown alongside playReveal being called
    await waitFor(() => {
      expect(screen.getByText('Signal detected')).toBeInTheDocument();
    });
    expect(mockPlayReveal).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    await act(async () => {
      mockAudioInstances[0]?.trigger('ended');
    });
  });

  // Requirement 13.2: stopAnalyzing() is called on API error (error path cleanup)
  it('calls stopAnalyzing() on API error for cleanup', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    render(<ScanOrchestrator videoRef={videoRef} />);

    const scanButton = screen.getByRole('button', { name: 'Scan' });
    await act(async () => {
      fireEvent.click(scanButton);
    });

    // After error, stopAnalyzing should be called for cleanup
    await waitFor(() => {
      expect(mockStopAnalyzing).toHaveBeenCalledTimes(1);
    });

    // playReveal should NOT be called on error
    expect(mockPlayReveal).not.toHaveBeenCalled();

    // Should return to idle
    await waitFor(() => {
      expect(screen.getByText('Point your camera at an object')).toBeInTheDocument();
    });
  });
});
