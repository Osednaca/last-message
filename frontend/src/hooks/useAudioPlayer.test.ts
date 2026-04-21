import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from './useAudioPlayer';

// --- Mock Audio class ---
type AudioEventHandler = () => void;

let mockPlayImpl: () => Promise<void>;
let mockAudioInstances: MockAudioInstance[];

class MockAudioInstance {
  src: string;
  currentTime = 0;
  error: MediaError | null = null;

  private listeners: Record<string, AudioEventHandler[]> = {};

  constructor(src?: string) {
    this.src = src ?? '';
    mockAudioInstances.push(this);
  }

  play(): Promise<void> {
    return mockPlayImpl();
  }

  pause = vi.fn();
  load = vi.fn();

  addEventListener(event: string, handler: AudioEventHandler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: AudioEventHandler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
    }
  }

  removeAttribute(attr: string) {
    if (attr === 'src') {
      this.src = '';
    }
  }

  // Helper to trigger events in tests
  trigger(event: string) {
    this.listeners[event]?.forEach((h) => h());
  }
}

describe('useAudioPlayer', () => {
  beforeEach(() => {
    mockAudioInstances = [];
    mockPlayImpl = () => Promise.resolve();
    vi.stubGlobal('Audio', MockAudioInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('play() sets isPlaying to true', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.play('/audio/test.mp3');
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockAudioInstances).toHaveLength(1);
  });

  it('stop() sets isPlaying to false', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.play('/audio/test.mp3');
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(mockAudioInstances[0].pause).toHaveBeenCalled();
    expect(mockAudioInstances[0].currentTime).toBe(0);
  });

  it('onEnd callback fires when ended event triggers', async () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() => useAudioPlayer({ onEnd }));

    await act(async () => {
      await result.current.play('/audio/test.mp3');
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      mockAudioInstances[0].trigger('ended');
    });

    expect(result.current.isPlaying).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('error state is set when play() rejects', async () => {
    mockPlayImpl = () => Promise.reject(new Error('Playback not allowed'));

    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.play('/audio/test.mp3');
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toBe('Playback not allowed');
  });
});
