import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlaybackScreen } from './PlaybackScreen';

// --- Mock useAudioPlayer ---
let capturedOnEnd: (() => void) | undefined;
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();
let mockIsPlaying = false;
let mockAudioError: string | null = null;

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

// --- Mock NarrativeOverlay ---
let capturedNarrativeOnComplete: (() => void) | undefined;

vi.mock('./NarrativeOverlay', () => ({
  NarrativeOverlay: ({ onComplete }: { onComplete: () => void }) => {
    capturedNarrativeOnComplete = onComplete;
    return <div data-testid="narrative-overlay">Narrative</div>;
  },
}));

const defaultProps = {
  audioData: 'data:audio/mpeg;base64,dGVzdA==',
  messageText: 'I was here. Remember my voice.',
  onReplay: vi.fn(),
  onSave: vi.fn(),
  onRetry: vi.fn(),
  showSave: true,
};

describe('PlaybackScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaying = false;
    mockAudioError = null;
    capturedOnEnd = undefined;
    capturedNarrativeOnComplete = undefined;
  });

  it('starts in narrative phase showing NarrativeOverlay', () => {
    render(<PlaybackScreen {...defaultProps} />);

    expect(screen.getByTestId('narrative-overlay')).toBeInTheDocument();
    expect(screen.queryByText('Replay')).not.toBeInTheDocument();
    expect(screen.queryByText('Save Imprint')).not.toBeInTheDocument();
  });

  it('transitions to playing phase and calls audioPlayer.play when narrative completes', () => {
    render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });

    expect(mockPlay).toHaveBeenCalledWith(defaultProps.audioData);
    expect(screen.queryByTestId('narrative-overlay')).not.toBeInTheDocument();
  });

  it('shows playing status text during playing phase', () => {
    render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });

    expect(screen.getByRole('status')).toHaveTextContent('Playing message from the future…');
  });

  it('transitions to done phase and shows buttons when audio ends', () => {
    render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });

    act(() => {
      capturedOnEnd?.();
    });

    expect(screen.getByText('Replay')).toBeInTheDocument();
    expect(screen.getByText('Save Imprint')).toBeInTheDocument();
  });

  it('calls onReplay when Replay button is clicked', () => {
    render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });
    act(() => {
      capturedOnEnd?.();
    });

    fireEvent.click(screen.getByText('Replay'));
    expect(defaultProps.onReplay).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when Save Imprint button is clicked', () => {
    render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });
    act(() => {
      capturedOnEnd?.();
    });

    fireEvent.click(screen.getByText('Save Imprint'));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('hides Save Imprint button when showSave is false', () => {
    render(<PlaybackScreen {...defaultProps} showSave={false} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });
    act(() => {
      capturedOnEnd?.();
    });

    expect(screen.getByText('Replay')).toBeInTheDocument();
    expect(screen.queryByText('Save Imprint')).not.toBeInTheDocument();
  });

  it('displays messageText as fallback when audio playback errors', () => {
    mockAudioError = 'Playback failed';

    render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });

    expect(screen.getByText(defaultProps.messageText)).toBeInTheDocument();
  });

  it('shows retry button on audio error', () => {
    mockAudioError = 'Playback failed';

    render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });

    fireEvent.click(screen.getByText('Retry'));
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('applies pulsing animation class during playing phase', () => {
    const { container } = render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('animate-pulse-glow');
  });

  it('does not apply pulsing animation in narrative phase', () => {
    const { container } = render(<PlaybackScreen {...defaultProps} />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).not.toContain('animate-pulse-glow');
  });

  it('does not apply pulsing animation in done phase', () => {
    const { container } = render(<PlaybackScreen {...defaultProps} />);

    act(() => {
      capturedNarrativeOnComplete?.();
    });
    act(() => {
      capturedOnEnd?.();
    });

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).not.toContain('animate-pulse-glow');
  });
});
