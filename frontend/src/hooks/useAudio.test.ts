import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AudioManager } from '../audio/AudioManager';
import { useAudio } from './useAudio';
import { useHomeSound } from './useHomeSound';
import { useScanSound } from './useScanSound';

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

/** Reset the AudioManager singleton between tests */
function resetAudioManager(): void {
  (AudioManager as unknown as { instance: AudioManager | null }).instance = null;
}

// ---------------------------------------------------------------------------
// useAudio tests
// ---------------------------------------------------------------------------

describe('useAudio', () => {
  beforeEach(() => {
    resetAudioManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the correct interface shape', () => {
    const { result } = renderHook(() => useAudio());

    expect(result.current).toHaveProperty('play');
    expect(result.current).toHaveProperty('stop');
    expect(result.current).toHaveProperty('stopAll');
    expect(result.current).toHaveProperty('isPlaying');
    expect(result.current).toHaveProperty('init');
    expect(result.current).toHaveProperty('initialized');

    expect(typeof result.current.play).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.stopAll).toBe('function');
    expect(typeof result.current.isPlaying).toBe('function');
    expect(typeof result.current.init).toBe('function');
    expect(typeof result.current.initialized).toBe('boolean');
  });

  it('initialized is false before init() is called', () => {
    const { result } = renderHook(() => useAudio());
    expect(result.current.initialized).toBe(false);
  });

  it('init() calls AudioManager.init() and sets initialized to true', () => {
    const mgr = AudioManager.getInstance();
    const initSpy = vi.spyOn(mgr, 'init');

    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.init();
    });

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(result.current.initialized).toBe(true);
  });

  it('play() delegates to AudioManager.play()', () => {
    const mgr = AudioManager.getInstance();
    mgr.init();
    const playSpy = vi.spyOn(mgr, 'play');

    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.play('scan');
    });

    expect(playSpy).toHaveBeenCalledWith('scan', undefined);
  });

  it('play() passes options to AudioManager.play()', () => {
    const mgr = AudioManager.getInstance();
    mgr.init();
    const playSpy = vi.spyOn(mgr, 'play');

    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.play('ambient', { loop: true, volume: 0.25 });
    });

    expect(playSpy).toHaveBeenCalledWith('ambient', { loop: true, volume: 0.25 });
  });

  it('stop() delegates to AudioManager.stop()', () => {
    const mgr = AudioManager.getInstance();
    mgr.init();
    const stopSpy = vi.spyOn(mgr, 'stop');

    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.stop('ambient');
    });

    expect(stopSpy).toHaveBeenCalledWith('ambient');
  });

  it('stopAll() delegates to AudioManager.stopAll()', () => {
    const mgr = AudioManager.getInstance();
    mgr.init();
    const stopAllSpy = vi.spyOn(mgr, 'stopAll');

    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.stopAll();
    });

    expect(stopAllSpy).toHaveBeenCalledTimes(1);
  });

  it('isPlaying() delegates to AudioManager.isPlaying()', () => {
    const mgr = AudioManager.getInstance();
    mgr.init();
    const isPlayingSpy = vi.spyOn(mgr, 'isPlaying');

    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.isPlaying('scan');
    });

    expect(isPlayingSpy).toHaveBeenCalledWith('scan');
  });
});

// ---------------------------------------------------------------------------
// useHomeSound tests
// ---------------------------------------------------------------------------

describe('useHomeSound', () => {
  beforeEach(() => {
    resetAudioManager();
    // Pre-initialize so play/stop calls go through
    AudioManager.getInstance().init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('startAmbient() calls play with ambient, loop, and volume 0.25', () => {
    const mgr = AudioManager.getInstance();
    const playSpy = vi.spyOn(mgr, 'play');

    const { result } = renderHook(() => useHomeSound());

    act(() => {
      result.current.startAmbient();
    });

    expect(playSpy).toHaveBeenCalledWith('ambient', { loop: true, volume: 0.25 });
  });

  it('stopAmbient() calls stop with ambient', () => {
    const mgr = AudioManager.getInstance();
    const stopSpy = vi.spyOn(mgr, 'stop');

    const { result } = renderHook(() => useHomeSound());

    act(() => {
      result.current.stopAmbient();
    });

    expect(stopSpy).toHaveBeenCalledWith('ambient');
  });

  it('stops ambient on unmount', () => {
    const mgr = AudioManager.getInstance();
    const stopSpy = vi.spyOn(mgr, 'stop');

    const { unmount } = renderHook(() => useHomeSound());

    unmount();

    expect(stopSpy).toHaveBeenCalledWith('ambient');
  });
});

// ---------------------------------------------------------------------------
// useScanSound tests
// ---------------------------------------------------------------------------

describe('useScanSound', () => {
  beforeEach(() => {
    resetAudioManager();
    AudioManager.getInstance().init();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('playScan() calls play with scan', () => {
    const mgr = AudioManager.getInstance();
    const playSpy = vi.spyOn(mgr, 'play');

    const { result } = renderHook(() => useScanSound());

    act(() => {
      result.current.playScan();
    });

    expect(playSpy).toHaveBeenCalledWith('scan', undefined);
  });

  it('startAnalyzing() calls play with analyzing and loop option', () => {
    const mgr = AudioManager.getInstance();
    const playSpy = vi.spyOn(mgr, 'play');

    const { result } = renderHook(() => useScanSound());

    act(() => {
      result.current.startAnalyzing();
    });

    expect(playSpy).toHaveBeenCalledWith('analyzing', { loop: true });
  });

  it('stopAnalyzing() calls stop with analyzing', () => {
    const mgr = AudioManager.getInstance();
    const stopSpy = vi.spyOn(mgr, 'stop');

    const { result } = renderHook(() => useScanSound());

    act(() => {
      result.current.stopAnalyzing();
    });

    expect(stopSpy).toHaveBeenCalledWith('analyzing');
  });

  it('playReveal() stops analyzing then plays reveal after ~250ms delay', () => {
    const mgr = AudioManager.getInstance();
    const playSpy = vi.spyOn(mgr, 'play');
    const stopSpy = vi.spyOn(mgr, 'stop');

    const { result } = renderHook(() => useScanSound());

    act(() => {
      result.current.playReveal();
    });

    // stop('analyzing') should be called immediately
    expect(stopSpy).toHaveBeenCalledWith('analyzing');

    // play('reveal') should NOT have been called yet
    expect(playSpy).not.toHaveBeenCalledWith('reveal', undefined);

    // Advance timers by 250ms
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Now play('reveal') should have been called
    expect(playSpy).toHaveBeenCalledWith('reveal', undefined);
  });

  it('playReveal() does not play reveal before the delay elapses', () => {
    const mgr = AudioManager.getInstance();
    const playSpy = vi.spyOn(mgr, 'play');

    const { result } = renderHook(() => useScanSound());

    act(() => {
      result.current.playReveal();
    });

    // Advance only 100ms — not enough
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(playSpy).not.toHaveBeenCalledWith('reveal', undefined);

    // Advance the remaining 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(playSpy).toHaveBeenCalledWith('reveal', undefined);
  });
});
