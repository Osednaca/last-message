import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NarrativeOverlay } from './NarrativeOverlay';

describe('NarrativeOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays the first narrative step text without intro', () => {
    render(<NarrativeOverlay onComplete={() => {}} />);

    expect(screen.getByRole('status')).toHaveTextContent('📡 Signal reconstructed…');
  });

  it('advances through all steps and calls onComplete', () => {
    const onComplete = vi.fn();
    render(<NarrativeOverlay onComplete={onComplete} />);

    // Step 1: "📡 Signal reconstructed…" — 2s
    expect(screen.getByRole('status')).toHaveTextContent('📡 Signal reconstructed…');

    // Advance past step 1
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Step 2: "Voice imprint detected…" — 2s
    expect(screen.getByRole('status')).toHaveTextContent('Voice imprint detected…');

    // Advance past step 2
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Step 3: "Playing message from the future…" — 1.5s
    expect(screen.getByRole('status')).toHaveTextContent('Playing message from the future…');

    // Advance past step 3
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows typewriter intro when showIntro is true', () => {
    render(<NarrativeOverlay onComplete={() => {}} showIntro />);

    const status = screen.getByRole('status');
    // Initially the typewriter text should be empty or just starting
    // After some time, characters should appear
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Some characters should have appeared by now
    expect(status.textContent!.length).toBeGreaterThan(0);
  });

  it('completes full sequence with intro in correct total time', () => {
    const onComplete = vi.fn();
    render(<NarrativeOverlay onComplete={onComplete} showIntro />);

    // Intro: 3s
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Signal: 2s
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Detected: 2s
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Playing: 1.5s
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete before the sequence finishes', () => {
    const onComplete = vi.fn();
    render(<NarrativeOverlay onComplete={onComplete} />);

    // Advance only partway through the sequence (3s of 5.5s total)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('applies glitch effect styling', () => {
    render(<NarrativeOverlay onComplete={() => {}} />);

    const status = screen.getByRole('status');
    expect(status.className).toContain('animate-glitch-loop');
  });

  it('has accessible status role with aria-live', () => {
    render(<NarrativeOverlay onComplete={() => {}} />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
