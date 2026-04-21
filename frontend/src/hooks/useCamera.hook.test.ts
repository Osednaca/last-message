import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCamera } from '@/hooks/useCamera';

// --- Helpers ---

function makeDevice(
  kind: MediaDeviceKind,
  deviceId: string,
  label: string = '',
): MediaDeviceInfo {
  return {
    kind,
    deviceId,
    groupId: '',
    label,
    toJSON: () => ({}),
  };
}

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

// --- Test suite ---

describe('useCamera hook', () => {
  let enumerateDevicesMock: ReturnType<typeof vi.fn>;
  let getUserMediaMock: ReturnType<typeof vi.fn>;
  let addEventListenerMock: ReturnType<typeof vi.fn>;
  let removeEventListenerMock: ReturnType<typeof vi.fn>;
  let deviceChangeHandler: (() => void) | null;

  const defaultDevices = [
    makeDevice('videoinput', 'cam1', 'Front Camera'),
    makeDevice('videoinput', 'cam2', 'Back Camera'),
    makeDevice('audioinput', 'mic1', 'Microphone'),
  ];

  beforeEach(() => {
    localStorage.clear();
    deviceChangeHandler = null;

    enumerateDevicesMock = vi.fn().mockResolvedValue(defaultDevices);
    getUserMediaMock = vi.fn().mockImplementation(
      (constraints: MediaStreamConstraints) => {
        const videoConstraint = constraints.video;
        let deviceId = 'default';
        if (
          typeof videoConstraint === 'object' &&
          videoConstraint !== null &&
          'deviceId' in videoConstraint
        ) {
          const deviceIdConstraint = videoConstraint.deviceId;
          if (
            typeof deviceIdConstraint === 'object' &&
            deviceIdConstraint !== null &&
            'exact' in deviceIdConstraint
          ) {
            deviceId = (deviceIdConstraint as { exact: string }).exact;
          }
        }
        return Promise.resolve(makeMockStream(deviceId));
      },
    );

    addEventListenerMock = vi.fn().mockImplementation(
      (event: string, handler: () => void) => {
        if (event === 'devicechange') {
          deviceChangeHandler = handler;
        }
      },
    );
    removeEventListenerMock = vi.fn();

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: enumerateDevicesMock,
        getUserMedia: getUserMediaMock,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Requirement 1.1: enumerateDevices called on mount ---

  it('calls enumerateDevices on mount', async () => {
    renderHook(() => useCamera());

    await waitFor(() => {
      expect(enumerateDevicesMock).toHaveBeenCalledTimes(1);
    });
  });

  it('populates devices with only video input devices after mount', async () => {
    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.devices).toHaveLength(2);
    });

    expect(result.current.devices).toEqual([
      { deviceId: 'cam1', label: 'Front Camera' },
      { deviceId: 'cam2', label: 'Back Camera' },
    ]);
  });

  // --- Requirement 4.2: stored preference used as initial device ---

  it('uses stored preference as initial device when it matches available devices', async () => {
    localStorage.setItem('echoes-camera-preference', 'cam2');

    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    // getUserMedia should have been called with exact constraint for cam2
    expect(getUserMediaMock).toHaveBeenCalledWith({
      video: { deviceId: { exact: 'cam2' } },
    });
  });

  // --- Requirement 4.3: fallback to default when stored preference doesn't match ---

  it('falls back to default when stored preference device is not available', async () => {
    localStorage.setItem('echoes-camera-preference', 'nonexistent-cam');

    // First call with exact constraint fails, second with generic succeeds
    getUserMediaMock
      .mockRejectedValueOnce(new Error('Device not found'))
      .mockImplementation(() => Promise.resolve(makeMockStream('default')));

    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    // Should have tried exact first, then fallen back to generic
    expect(getUserMediaMock).toHaveBeenCalledWith({
      video: { deviceId: { exact: 'nonexistent-cam' } },
    });
    expect(getUserMediaMock).toHaveBeenCalledWith({ video: true });
    // Stale preference should be cleared
    expect(localStorage.getItem('echoes-camera-preference')).toBeNull();
  });

  // --- Requirement 1.4: devicechange event triggers re-enumeration ---

  it('re-enumerates devices when devicechange event fires', async () => {
    renderHook(() => useCamera());

    await waitFor(() => {
      expect(enumerateDevicesMock).toHaveBeenCalledTimes(1);
    });

    // Simulate a new device being connected
    const updatedDevices = [
      ...defaultDevices,
      makeDevice('videoinput', 'cam3', 'USB Camera'),
    ];
    enumerateDevicesMock.mockResolvedValue(updatedDevices);

    // Fire the devicechange event
    await act(async () => {
      deviceChangeHandler?.();
    });

    await waitFor(() => {
      expect(enumerateDevicesMock).toHaveBeenCalledTimes(2);
    });
  });

  it('registers devicechange event listener on mount', async () => {
    renderHook(() => useCamera());

    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function),
      );
    });
  });

  // --- Requirement 3.1, 3.2: switchCamera stops old tracks and acquires new stream ---

  it('switchCamera stops old tracks before acquiring new stream', async () => {
    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    const oldStream = result.current.stream!;
    const oldTracks = oldStream.getTracks();

    await act(async () => {
      await result.current.switchCamera('cam2');
    });

    // Old tracks should be stopped (before new stream acquired)
    for (const track of oldTracks) {
      expect(track.stop).toHaveBeenCalled();
    }

    // getUserMedia should have been called with exact constraint
    expect(getUserMediaMock).toHaveBeenCalledWith({
      video: { deviceId: { exact: 'cam2' } },
    });

    // Active device should be updated
    expect(result.current.activeDeviceId).toBe('cam2');
    // Preference should be saved
    expect(localStorage.getItem('echoes-camera-preference')).toBe('cam2');
  });

  // --- Requirement 3.4: switchCamera failure preserves previous stream and sets error ---

  it('switchCamera failure attempts fallback and sets error', async () => {
    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    // Make the next getUserMedia call fail, but allow fallback to succeed
    getUserMediaMock
      .mockRejectedValueOnce(new Error('Camera not available'))
      .mockImplementation(() => Promise.resolve(makeMockStream('default')));

    await act(async () => {
      await result.current.switchCamera('bad-cam');
    });

    // Should have a stream (fallback recovered)
    expect(result.current.stream).not.toBeNull();
    // Error should be set
    expect(result.current.error).toBe(
      'Failed to switch camera. Using previous camera.',
    );
  });

  // --- Cleanup on unmount ---

  it('stops tracks and removes devicechange listener on unmount', async () => {
    const { result, unmount } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    const stream = result.current.stream!;
    const tracks = stream.getTracks();

    unmount();

    // Tracks should be stopped
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalled();
    }

    // Event listener should be removed
    expect(removeEventListenerMock).toHaveBeenCalledWith(
      'devicechange',
      expect.any(Function),
    );
  });

  // --- Requirement 1.3: fallback to generic getUserMedia when enumerateDevices fails ---

  it('still acquires stream and shows empty device list when enumerateDevices fails', async () => {
    enumerateDevicesMock.mockRejectedValue(new Error('enumerateDevices failed'));

    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    // Stream should still be acquired even if enumeration fails
    expect(getUserMediaMock).toHaveBeenCalledWith({ video: true });
    // Device list should be empty since enumeration failed
    expect(result.current.devices).toEqual([]);
  });

  // --- Additional edge cases ---

  it('acquires initial stream with generic constraint when no preference is stored', async () => {
    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    // First getUserMedia call should be generic (no stored preference)
    expect(getUserMediaMock).toHaveBeenCalledWith({ video: true });
  });

  it('clears error on subsequent successful switchCamera', async () => {
    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.stream).not.toBeNull();
    });

    // First switch fails
    getUserMediaMock.mockRejectedValueOnce(new Error('fail'));

    await act(async () => {
      await result.current.switchCamera('bad-cam');
    });

    expect(result.current.error).toBe(
      'Failed to switch camera. Using previous camera.',
    );

    // Second switch succeeds
    await act(async () => {
      await result.current.switchCamera('cam2');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.activeDeviceId).toBe('cam2');
  });
});
