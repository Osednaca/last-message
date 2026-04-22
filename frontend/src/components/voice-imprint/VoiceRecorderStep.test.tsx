import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceRecorderStep } from './VoiceRecorderStep';

// Mock WaveformVisualizer to simplify tests
vi.mock('./WaveformVisualizer', () => ({
  WaveformVisualizer: ({ isActive }: { isActive: boolean }) => (
    <div data-testid="waveform-visualizer" data-active={isActive} />
  ),
}));

const MIN_DURATION = 5;
const MAX_DURATION = 10;

type StepProps = ComponentProps<typeof VoiceRecorderStep>;

function renderStep(overrides: Partial<StepProps> = {}) {
  const defaults: StepProps = {
    isRecording: false,
    elapsedSeconds: 0,
    analyserNode: null,
    error: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    minDuration: MIN_DURATION,
    maxDuration: MAX_DURATION,
  };
  const props = { ...defaults, ...overrides };
  const result = render(<VoiceRecorderStep {...props} />);
  return { ...result, props };
}

describe('VoiceRecorderStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the WaveformVisualizer reflecting the isRecording prop', () => {
    renderStep({ isRecording: true });

    const visualizer = screen.getByTestId('waveform-visualizer');
    expect(visualizer).toBeInTheDocument();
    expect(visualizer.dataset.active).toBe('true');
  });

  it('displays the recording timer with elapsed and max duration', () => {
    renderStep({ elapsedSeconds: 3 });

    expect(screen.getByText('3 / 10s')).toBeInTheDocument();
  });

  it('renders the stop button with correct text once recording has started', () => {
    renderStep({ isRecording: true, elapsedSeconds: 1 });

    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    expect(stopButton).toBeInTheDocument();
  });

  it('renders a "Start Recording" fallback button before recording has started', () => {
    // Default state: not recording, no elapsed seconds — the hook may not
    // have fired yet (e.g. mobile browser dropped the first gesture).
    renderStep();

    const startButton = screen.getByRole('button', { name: /start recording/i });
    expect(startButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument();
  });

  it('calls startRecording when the fallback start button is clicked', () => {
    const startRecording = vi.fn();
    renderStep({ startRecording });

    const startButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(startButton);

    expect(startRecording).toHaveBeenCalledTimes(1);
  });

  it('disables the stop button when elapsed seconds is below the minimum', () => {
    renderStep({ elapsedSeconds: 3 });

    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    expect(stopButton).toBeDisabled();
  });

  it('enables the stop button when elapsed seconds reaches the minimum', () => {
    renderStep({ elapsedSeconds: MIN_DURATION });

    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    expect(stopButton).toBeEnabled();
  });

  it('enables the stop button when elapsed seconds exceeds the minimum', () => {
    renderStep({ elapsedSeconds: MIN_DURATION + 3 });

    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    expect(stopButton).toBeEnabled();
  });

  it('calls stopRecording when the stop button is clicked', () => {
    const stopRecording = vi.fn();
    renderStep({ elapsedSeconds: MIN_DURATION + 1, stopRecording });

    const stopButton = screen.getByRole('button', { name: /stop recording/i });
    fireEvent.click(stopButton);

    expect(stopRecording).toHaveBeenCalledTimes(1);
  });

  it('displays an error message when error is set', () => {
    renderStep({ error: 'Microphone access denied' });

    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Microphone access denied');
  });

  it('does not display an error message when error is null', () => {
    renderStep({ error: null });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
