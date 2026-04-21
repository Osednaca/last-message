// Feature: camera-selection, Property 3: Camera preference persistence round-trip
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  saveCameraPreference,
  loadCameraPreference,
  clearCameraPreference,
} from '@/hooks/useCamera';

/**
 * Arbitrary for non-empty device ID strings.
 * Uses printable ASCII strings to simulate realistic deviceId values.
 */
const deviceIdArb = fc.string({ minLength: 1, maxLength: 100 });

beforeEach(() => {
  localStorage.clear();
});

/**
 * **Validates: Requirements 4.1**
 *
 * For any non-empty deviceId string, saving it via saveCameraPreference and then
 * loading it back via loadCameraPreference shall return the exact same string.
 * Additionally, calling clearCameraPreference and then loadCameraPreference
 * shall return null.
 */
describe('Property 3: Camera preference persistence round-trip', () => {
  it('save then load returns the exact same deviceId', () => {
    fc.assert(
      fc.property(deviceIdArb, (deviceId) => {
        localStorage.clear();
        saveCameraPreference(deviceId);
        const loaded = loadCameraPreference();
        expect(loaded).toBe(deviceId);
      }),
      { numRuns: 100 },
    );
  });

  it('clear then load returns null', () => {
    fc.assert(
      fc.property(deviceIdArb, (deviceId) => {
        localStorage.clear();
        // First save a preference so there's something to clear
        saveCameraPreference(deviceId);
        expect(loadCameraPreference()).toBe(deviceId);

        // Now clear and verify it returns null
        clearCameraPreference();
        expect(loadCameraPreference()).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('load returns null when no preference has been saved', () => {
    fc.assert(
      fc.property(deviceIdArb, () => {
        localStorage.clear();
        expect(loadCameraPreference()).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
