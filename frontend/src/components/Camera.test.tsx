import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Camera } from './Camera';

// Mock the useCamera hook
const mockUseCamera = vi.fn();
vi.mock('@/hooks/useCamera', () => ({
  useCamera: () => mockUseCamera(),
}));

// Mock CameraSelector to simplify testing
vi.mock('./CameraSelector', () => ({
  CameraSelector: (props: { devices: unknown[]; activeDeviceId: string | null; onSelect: (id: string) => void }) => {
    if (props.devices.length <= 1) return null;
    return <div data-testid="camera-selector">CameraSelector</div>;
  },
}));

// --- Helpers ---

function makeMockTrack(id: string = 'track-1'): MediaStreamTrack {
  return {
    id,
    stop: vi.fn(),
    kind: 'video',
    getSettings: () => ({ deviceId: id }),
  } as unknown as MediaStreamTrack;
}

function makeMockStream(deviceId: string = 'cam1'): MediaStream {
  const track = makeMockTrack(deviceId);
  return {
    id: `stream-${deviceId}`,
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
}

function defaultHookReturn(overrides: Partial<ReturnType<typeof mockUseCamera>> = {}) {
  return {
    devices: [],
    activeDeviceId: null,
    stream: null,
    error: null,
    switchCamera: vi.fn(),
    ...overrides,
  };
}

describe('Camera', () => {
  beforeEach(() => {
    mockUseCamera.mockReturnValue(defaultHookReturn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests camera and renders a video element on success', () => {
    const stream = makeMockStream('cam1');
    mockUseCamera.mockReturnValue(defaultHookReturn({ stream }));

    const ref = createRef<HTMLVideoElement>();
    render(<Camera ref={ref} />);

    const video = ref.current;
    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect(video?.srcObject).toBe(stream);
  });

  it('renders fullscreen video with object-cover styling', () => {
    const stream = makeMockStream('cam1');
    mockUseCamera.mockReturnValue(defaultHookReturn({ stream }));

    const ref = createRef<HTMLVideoElement>();
    render(<Camera ref={ref} />);

    const video = ref.current!;
    expect(video.className).toContain('fixed');
    expect(video.className).toContain('inset-0');
    expect(video.className).toContain('w-full');
    expect(video.className).toContain('h-full');
    expect(video.className).toContain('object-cover');
  });

  it('shows permission denied error when hook returns camera permission error', () => {
    mockUseCamera.mockReturnValue(
      defaultHookReturn({ error: 'Camera access is required to scan objects' }),
    );

    render(<Camera />);

    expect(
      screen.getByText('Camera access is required to scan objects'),
    ).toBeInTheDocument();
  });

  it('shows no camera error when hook returns no camera error', () => {
    mockUseCamera.mockReturnValue(
      defaultHookReturn({ error: 'A camera-equipped device is required' }),
    );

    render(<Camera />);

    expect(
      screen.getByText('A camera-equipped device is required'),
    ).toBeInTheDocument();
  });

  it('shows error as full-screen when there is no stream', () => {
    mockUseCamera.mockReturnValue(
      defaultHookReturn({ error: 'Camera access is required to scan objects', stream: null }),
    );

    render(<Camera />);

    const errorEl = screen.getByText('Camera access is required to scan objects');
    expect(errorEl.closest('div')).toHaveClass('fixed', 'inset-0');
  });

  it('shows error as inline banner when stream is still active', () => {
    const stream = makeMockStream('cam1');
    mockUseCamera.mockReturnValue(
      defaultHookReturn({
        error: 'Failed to switch camera. Using previous camera.',
        stream,
      }),
    );

    render(<Camera />);

    expect(
      screen.getByText('Failed to switch camera. Using previous camera.'),
    ).toBeInTheDocument();
    // Video should still be rendered
    expect(document.querySelector('video')).toBeInTheDocument();
  });

  it('renders aria-live polite region', () => {
    const stream = makeMockStream('cam1');
    mockUseCamera.mockReturnValue(defaultHookReturn({ stream }));

    render(<Camera />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass('sr-only');
  });

  it('renders CameraSelector when multiple devices are available', () => {
    const stream = makeMockStream('cam1');
    const devices = [
      { deviceId: 'cam1', label: 'Front Camera' },
      { deviceId: 'cam2', label: 'Back Camera' },
    ];
    mockUseCamera.mockReturnValue(
      defaultHookReturn({ stream, devices, activeDeviceId: 'cam1' }),
    );

    render(<Camera />);

    expect(screen.getByTestId('camera-selector')).toBeInTheDocument();
  });

  it('hides CameraSelector when only a single device is available', () => {
    const stream = makeMockStream('cam1');
    const devices = [{ deviceId: 'cam1', label: 'Front Camera' }];
    mockUseCamera.mockReturnValue(
      defaultHookReturn({ stream, devices, activeDeviceId: 'cam1' }),
    );

    render(<Camera />);

    expect(screen.queryByTestId('camera-selector')).not.toBeInTheDocument();
  });

  it('ARIA live region announces camera switch when activeDeviceId changes', () => {
    const stream = makeMockStream('cam1');
    const devices = [
      { deviceId: 'cam1', label: 'Front Camera' },
      { deviceId: 'cam2', label: 'Back Camera' },
    ];

    // First render with cam1 active
    mockUseCamera.mockReturnValue(
      defaultHookReturn({ stream, devices, activeDeviceId: 'cam1' }),
    );
    const { rerender } = render(<Camera />);

    // Switch to cam2
    mockUseCamera.mockReturnValue(
      defaultHookReturn({ stream, devices, activeDeviceId: 'cam2' }),
    );
    rerender(<Camera />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Switched to Back Camera');
  });

  it('displays error message on camera switch failure while keeping video', () => {
    const stream = makeMockStream('cam1');
    const devices = [
      { deviceId: 'cam1', label: 'Front Camera' },
      { deviceId: 'cam2', label: 'Back Camera' },
    ];
    mockUseCamera.mockReturnValue(
      defaultHookReturn({
        stream,
        devices,
        activeDeviceId: 'cam1',
        error: 'Failed to switch camera. Using previous camera.',
      }),
    );

    render(<Camera />);

    // Error banner is visible
    expect(
      screen.getByText('Failed to switch camera. Using previous camera.'),
    ).toBeInTheDocument();
    // Video element is still rendered (stream not lost)
    expect(document.querySelector('video')).toBeInTheDocument();
    // CameraSelector is still available for retry
    expect(screen.getByTestId('camera-selector')).toBeInTheDocument();
  });
});
