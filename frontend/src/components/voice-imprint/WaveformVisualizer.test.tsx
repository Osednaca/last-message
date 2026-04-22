import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WaveformVisualizer } from './WaveformVisualizer';

// Helper to create a mock AnalyserNode
function createMockAnalyser(frequencyData: number[] = []): AnalyserNode {
  return {
    frequencyBinCount: frequencyData.length || 128,
    getByteFrequencyData: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length && i < frequencyData.length; i++) {
        array[i] = frequencyData[i];
      }
    }),
  } as unknown as AnalyserNode;
}

describe('WaveformVisualizer', () => {
  let rafCallbacks: FrameRequestCallback[];
  let rafIdCounter: number;

  beforeEach(() => {
    rafCallbacks = [];
    rafIdCounter = 0;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return ++rafIdCounter;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 32 bars', () => {
    const analyser = createMockAnalyser(new Array(128).fill(0));
    render(<WaveformVisualizer analyserNode={analyser} isActive={true} />);

    const container = screen.getByRole('img', { name: /audio waveform/i });
    expect(container.children).toHaveLength(32);
  });

  it('has accessible role and label', () => {
    render(<WaveformVisualizer analyserNode={null} isActive={false} />);

    expect(
      screen.getByRole('img', { name: 'Audio waveform visualization' }),
    ).toBeInTheDocument();
  });

  it('renders bars with minimum height when inactive', () => {
    render(<WaveformVisualizer analyserNode={null} isActive={false} />);

    const container = screen.getByRole('img', { name: /audio waveform/i });
    const bars = Array.from(container.children) as HTMLElement[];

    bars.forEach((bar) => {
      // When inactive, heights should be at minimum (4%)
      expect(bar.style.height).toBe('4%');
    });
  });

  it('updates bar heights from frequency data on animation frame', () => {
    // Create frequency data with known values
    const freqData = new Array(128).fill(0);
    // Set some high values at sampled positions (step = floor(128/32) = 4)
    freqData[0] = 255; // bar 0 → 100%
    freqData[4] = 128; // bar 1 → ~50%

    const analyser = createMockAnalyser(freqData);
    render(<WaveformVisualizer analyserNode={analyser} isActive={true} />);

    // Trigger one animation frame
    act(() => {
      if (rafCallbacks.length > 0) {
        rafCallbacks[rafCallbacks.length - 1](performance.now());
      }
    });

    const container = screen.getByRole('img', { name: /audio waveform/i });
    const bars = Array.from(container.children) as HTMLElement[];

    // First bar should be at 100%
    expect(bars[0].style.height).toBe('100%');
    // Second bar should be approximately 50%
    const secondBarHeight = parseFloat(bars[1].style.height);
    expect(secondBarHeight).toBeGreaterThan(45);
    expect(secondBarHeight).toBeLessThan(55);
  });

  it('applies green-to-cyan gradient colors across bars', () => {
    const analyser = createMockAnalyser(new Array(128).fill(200));
    render(<WaveformVisualizer analyserNode={analyser} isActive={true} />);

    // Trigger animation frame to get non-zero heights
    act(() => {
      if (rafCallbacks.length > 0) {
        rafCallbacks[rafCallbacks.length - 1](performance.now());
      }
    });

    const container = screen.getByRole('img', { name: /audio waveform/i });
    const bars = Array.from(container.children) as HTMLElement[];

    // First bar should be green-ish: rgb(0, 255, 200)
    expect(bars[0].style.backgroundColor).toBe('rgb(0, 255, 200)');
    // Last bar should be cyan-ish: rgb(0, 200, 255)
    expect(bars[31].style.backgroundColor).toBe('rgb(0, 200, 255)');
  });

  it('applies glow box-shadow when bar height exceeds threshold', () => {
    const freqData = new Array(128).fill(0);
    freqData[0] = 255; // High value → glow
    freqData[4] = 10;  // Low value → no glow

    const analyser = createMockAnalyser(freqData);
    render(<WaveformVisualizer analyserNode={analyser} isActive={true} />);

    act(() => {
      if (rafCallbacks.length > 0) {
        rafCallbacks[rafCallbacks.length - 1](performance.now());
      }
    });

    const container = screen.getByRole('img', { name: /audio waveform/i });
    const bars = Array.from(container.children) as HTMLElement[];

    // High bar should have glow
    expect(bars[0].style.boxShadow).not.toBe('none');
    expect(bars[0].style.boxShadow).toContain('0 0 6px');
  });

  it('cancels animation frame on unmount', () => {
    const analyser = createMockAnalyser(new Array(128).fill(0));
    const { unmount } = render(
      <WaveformVisualizer analyserNode={analyser} isActive={true} />,
    );

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('resets bars when isActive changes to false', () => {
    const analyser = createMockAnalyser(new Array(128).fill(200));
    const { rerender } = render(
      <WaveformVisualizer analyserNode={analyser} isActive={true} />,
    );

    // Trigger animation to get non-zero heights
    act(() => {
      if (rafCallbacks.length > 0) {
        rafCallbacks[rafCallbacks.length - 1](performance.now());
      }
    });

    // Deactivate
    rerender(<WaveformVisualizer analyserNode={analyser} isActive={false} />);

    const container = screen.getByRole('img', { name: /audio waveform/i });
    const bars = Array.from(container.children) as HTMLElement[];

    bars.forEach((bar) => {
      expect(bar.style.height).toBe('4%');
    });
  });
});
