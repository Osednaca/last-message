import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterVideoInputs,
  buildDeviceList,
  loadCameraPreference,
  saveCameraPreference,
  clearCameraPreference,
} from '@/hooks/useCamera';

/**
 * Helper to create a MediaDeviceInfo-like object.
 */
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

// --- filterVideoInputs ---

describe('filterVideoInputs', () => {
  it('returns only videoinput devices from a mixed list', () => {
    const devices = [
      makeDevice('videoinput', 'cam1', 'Front Camera'),
      makeDevice('audioinput', 'mic1', 'Microphone'),
      makeDevice('videoinput', 'cam2', 'Back Camera'),
      makeDevice('audiooutput', 'spk1', 'Speaker'),
    ];
    const result = filterVideoInputs(devices);
    expect(result).toHaveLength(2);
    expect(result[0].deviceId).toBe('cam1');
    expect(result[1].deviceId).toBe('cam2');
  });

  it('returns an empty array when given an empty list', () => {
    const result = filterVideoInputs([]);
    expect(result).toEqual([]);
  });

  it('returns all devices when every device is videoinput', () => {
    const devices = [
      makeDevice('videoinput', 'cam1', 'Camera 1'),
      makeDevice('videoinput', 'cam2', 'Camera 2'),
      makeDevice('videoinput', 'cam3', 'Camera 3'),
    ];
    const result = filterVideoInputs(devices);
    expect(result).toHaveLength(3);
    expect(result).toEqual(devices);
  });

  it('returns empty array when no videoinput devices exist', () => {
    const devices = [
      makeDevice('audioinput', 'mic1', 'Mic'),
      makeDevice('audiooutput', 'spk1', 'Speaker'),
    ];
    const result = filterVideoInputs(devices);
    expect(result).toEqual([]);
  });
});

// --- buildDeviceList ---

describe('buildDeviceList', () => {
  it('preserves labels when all devices have labels', () => {
    const devices = [
      makeDevice('videoinput', 'cam1', 'Front Camera'),
      makeDevice('videoinput', 'cam2', 'Back Camera'),
    ];
    const result = buildDeviceList(devices);
    expect(result).toEqual([
      { deviceId: 'cam1', label: 'Front Camera' },
      { deviceId: 'cam2', label: 'Back Camera' },
    ]);
  });

  it('generates fallback labels for devices with empty labels', () => {
    const devices = [
      makeDevice('videoinput', 'cam1', 'Front Camera'),
      makeDevice('videoinput', 'cam2', ''),
      makeDevice('videoinput', 'cam3', ''),
    ];
    const result = buildDeviceList(devices);
    expect(result).toEqual([
      { deviceId: 'cam1', label: 'Front Camera' },
      { deviceId: 'cam2', label: 'Camera 2' },
      { deviceId: 'cam3', label: 'Camera 3' },
    ]);
  });

  it('generates fallback labels for all devices when all labels are empty', () => {
    const devices = [
      makeDevice('videoinput', 'cam1', ''),
      makeDevice('videoinput', 'cam2', ''),
    ];
    const result = buildDeviceList(devices);
    expect(result).toEqual([
      { deviceId: 'cam1', label: 'Camera 1' },
      { deviceId: 'cam2', label: 'Camera 2' },
    ]);
  });

  it('returns an empty array for an empty device list', () => {
    const result = buildDeviceList([]);
    expect(result).toEqual([]);
  });
});

// --- localStorage preference utilities ---

describe('loadCameraPreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no preference is stored', () => {
    expect(loadCameraPreference()).toBeNull();
  });

  it('returns the stored value when a preference exists', () => {
    localStorage.setItem('echoes-camera-preference', 'cam-abc-123');
    expect(loadCameraPreference()).toBe('cam-abc-123');
  });
});

describe('saveCameraPreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes the deviceId to localStorage', () => {
    saveCameraPreference('cam-xyz-789');
    expect(localStorage.getItem('echoes-camera-preference')).toBe('cam-xyz-789');
  });

  it('overwrites a previously stored preference', () => {
    saveCameraPreference('cam-old');
    saveCameraPreference('cam-new');
    expect(localStorage.getItem('echoes-camera-preference')).toBe('cam-new');
  });
});

describe('clearCameraPreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the preference from localStorage', () => {
    saveCameraPreference('cam-to-remove');
    expect(localStorage.getItem('echoes-camera-preference')).toBe('cam-to-remove');

    clearCameraPreference();
    expect(localStorage.getItem('echoes-camera-preference')).toBeNull();
  });

  it('does not throw when no preference exists', () => {
    expect(() => clearCameraPreference()).not.toThrow();
  });
});
