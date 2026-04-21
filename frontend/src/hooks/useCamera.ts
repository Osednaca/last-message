import { useState, useCallback, useEffect, useRef } from 'react';
import { t } from '@/i18n/translations';

// --- Camera device types ---

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface UseCameraReturn {
  devices: CameraDevice[];
  activeDeviceId: string | null;
  stream: MediaStream | null;
  error: string | null;
  switchCamera: (deviceId: string) => Promise<void>;
}

// --- Constants ---

const CAMERA_PREFERENCE_KEY = 'echoes-camera-preference';

// --- Pure utility functions (testable without React) ---

/**
 * Filters a list of media devices to include only video input devices.
 */
export function filterVideoInputs(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
  return devices.filter((device) => device.kind === 'videoinput');
}

/**
 * Maps MediaDeviceInfo objects to CameraDevice objects.
 * Devices with empty labels get a fallback label "Camera N" where N is the 1-based index.
 */
export function buildDeviceList(devices: MediaDeviceInfo[]): CameraDevice[] {
  return devices.map((device, index) => ({
    deviceId: device.deviceId,
    label: device.label || `Camera ${index + 1}`,
  }));
}

/**
 * Reads the stored camera preference from localStorage.
 * Returns null if no preference is stored.
 */
export function loadCameraPreference(): string | null {
  try {
    return localStorage.getItem(CAMERA_PREFERENCE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves the selected camera deviceId to localStorage.
 * Silently fails on QuotaExceededError or other storage errors.
 */
export function saveCameraPreference(deviceId: string): void {
  try {
    localStorage.setItem(CAMERA_PREFERENCE_KEY, deviceId);
  } catch {
    // Gracefully handle QuotaExceededError and other storage errors
  }
}

/**
 * Removes the stored camera preference from localStorage.
 */
export function clearCameraPreference(): void {
  try {
    localStorage.removeItem(CAMERA_PREFERENCE_KEY);
  } catch {
    // Gracefully handle storage errors
  }
}

// --- Helper to stop all tracks on a stream ---

function stopStreamTracks(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

// --- Error mapping helper ---

function mapCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return t('error_camera_permission');
    }
    if (err.name === 'NotFoundError') {
      return t('error_no_camera');
    }
  }
  // Fallback: check by name property for environments where instanceof may not match
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name: string }).name;
    if (name === 'NotAllowedError') {
      return t('error_camera_permission');
    }
    if (name === 'NotFoundError') {
      return t('error_no_camera');
    }
  }
  return t('error_generic');
}

// --- useCamera React hook ---

/**
 * Custom hook managing camera device enumeration, stream acquisition,
 * switching, and preference persistence.
 */
export function useCamera(): UseCameraReturn {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs to track current stream and mounted state for async safety
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // Enumerate devices and build the device list
  const enumerateAndSetDevices = useCallback(async (): Promise<CameraDevice[]> => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = filterVideoInputs(allDevices);
      const deviceList = buildDeviceList(videoDevices);
      console.log('[useCamera] enumerateDevices found', allDevices.length, 'total,', videoDevices.length, 'video inputs:', deviceList);
      if (mountedRef.current) {
        setDevices(deviceList);
      }
      return deviceList;
    } catch (err) {
      console.error('[useCamera] enumerateDevices failed:', err);
      if (mountedRef.current) {
        setDevices([]);
      }
      return [];
    }
  }, []);

  // Acquire a stream for a specific deviceId, or generic video if null
  const acquireStream = useCallback(async (deviceId: string | null): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = deviceId
      ? { video: { deviceId: { exact: deviceId } } }
      : { video: true };
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Guard: if mediaDevices API is unavailable, bail out
    if (!navigator.mediaDevices) {
      return;
    }

    // Reset mounted flag on every effect run. React StrictMode runs the
    // effect, cleanup, then effect again; without this reset the flag
    // would stay false after the first cleanup and block state updates
    // (e.g. setDevices), causing CameraSelector to never appear.
    mountedRef.current = true;

    let cancelled = false;

    async function init() {
      // Step 1: Acquire an initial stream first.
      // Browsers require an active getUserMedia grant before enumerateDevices()
      // returns full device info (labels and real deviceIds). On mobile especially,
      // calling enumerateDevices before getUserMedia returns incomplete results.
      let initialStream: MediaStream;
      try {
        // Try stored preference first
        const storedPreference = loadCameraPreference();
        if (storedPreference) {
          try {
            initialStream = await acquireStream(storedPreference);
          } catch {
            // Stored preference device not available — fall back to default
            clearCameraPreference();
            initialStream = await acquireStream(null);
          }
        } else {
          initialStream = await acquireStream(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(mapCameraError(err));
        }
        return;
      }

      if (cancelled) {
        stopStreamTracks(initialStream);
        return;
      }

      streamRef.current = initialStream;
      setStream(initialStream);
      const videoTrack = initialStream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      setActiveDeviceId(settings?.deviceId ?? null);

      // Step 2: Now that we have camera permission, enumerate all devices.
      // This will return the full list with real deviceIds and labels.
      const deviceList = await enumerateAndSetDevices();

      if (cancelled) return;

      // If stored preference didn't match any enumerated device, clear it
      const storedPref = loadCameraPreference();
      if (storedPref && !deviceList.some((d) => d.deviceId === storedPref)) {
        clearCameraPreference();
      }
    }

    init();

    // Listen for device changes
    const handleDeviceChange = () => {
      enumerateAndSetDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      // Stop all tracks on the current stream
      stopStreamTracks(streamRef.current);
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateAndSetDevices, acquireStream]);

  // switchCamera: stop old stream first (required on mobile where only one
  // camera can be active at a time), then acquire new stream.
  const switchCamera = useCallback(async (deviceId: string): Promise<void> => {
    setError(null);
    try {
      // Stop old stream tracks BEFORE acquiring new stream.
      // Mobile browsers often can't open two camera streams simultaneously.
      stopStreamTracks(streamRef.current);
      streamRef.current = null;

      const newStream = await acquireStream(deviceId);
      streamRef.current = newStream;
      setStream(newStream);
      setActiveDeviceId(deviceId);
      saveCameraPreference(deviceId);
    } catch {
      // Acquiring the new camera failed. Try to re-acquire the previous camera.
      try {
        const fallbackStream = await acquireStream(null);
        streamRef.current = fallbackStream;
        setStream(fallbackStream);
        const videoTrack = fallbackStream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings();
        setActiveDeviceId(settings?.deviceId ?? null);
      } catch {
        // Can't recover — no stream available
        streamRef.current = null;
        setStream(null);
      }
      setError('Failed to switch camera. Using previous camera.');
    }
  }, [acquireStream]);

  return { devices, activeDeviceId, stream, error, switchCamera };
}
