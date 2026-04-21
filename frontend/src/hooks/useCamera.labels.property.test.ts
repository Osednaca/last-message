// Feature: camera-selection, Property 2: Label generation correctness
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildDeviceList } from '@/hooks/useCamera';

/**
 * Arbitrary for a MediaDeviceInfo-like object with kind fixed to 'videoinput'.
 * Labels are either a non-empty string or an empty string to exercise fallback logic.
 */
const labelArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }),
  fc.constant(''),
);

const videoDeviceArb: fc.Arbitrary<MediaDeviceInfo> = fc
  .record({
    deviceId: fc.string({ minLength: 1, maxLength: 30 }),
    groupId: fc.string({ minLength: 0, maxLength: 30 }),
    kind: fc.constant<MediaDeviceKind>('videoinput'),
    label: labelArb,
  })
  .map((d) => ({
    ...d,
    toJSON: () => d,
  }));

const videoDeviceListArb = fc.array(videoDeviceArb, { minLength: 0, maxLength: 30 });

/**
 * **Validates: Requirements 2.3, 2.4**
 *
 * For any list of video input devices, buildDeviceList shall preserve non-empty
 * device labels unchanged and shall replace empty labels with "Camera N" where
 * N is the 1-based index of that device in the list.
 */
describe('Property 2: Label generation correctness', () => {
  it('non-empty labels are preserved unchanged', () => {
    fc.assert(
      fc.property(videoDeviceListArb, (devices) => {
        const result = buildDeviceList(devices);
        for (let i = 0; i < devices.length; i++) {
          if (devices[i].label !== '') {
            expect(result[i].label).toBe(devices[i].label);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('empty labels become "Camera N" with correct 1-based index', () => {
    fc.assert(
      fc.property(videoDeviceListArb, (devices) => {
        const result = buildDeviceList(devices);
        for (let i = 0; i < devices.length; i++) {
          if (devices[i].label === '') {
            expect(result[i].label).toBe(`Camera ${i + 1}`);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('output length matches input length and deviceIds are preserved', () => {
    fc.assert(
      fc.property(videoDeviceListArb, (devices) => {
        const result = buildDeviceList(devices);
        expect(result).toHaveLength(devices.length);
        for (let i = 0; i < devices.length; i++) {
          expect(result[i].deviceId).toBe(devices[i].deviceId);
        }
      }),
      { numRuns: 100 },
    );
  });
});
