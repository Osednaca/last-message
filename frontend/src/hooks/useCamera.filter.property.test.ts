// Feature: camera-selection, Property 1: Device filtering preserves only video inputs
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterVideoInputs } from '@/hooks/useCamera';

const deviceKindArb = fc.constantFrom<MediaDeviceKind>('videoinput', 'audioinput', 'audiooutput');

const mediaDeviceInfoArb: fc.Arbitrary<MediaDeviceInfo> = fc
  .record({
    deviceId: fc.string({ minLength: 0, maxLength: 30 }),
    groupId: fc.string({ minLength: 0, maxLength: 30 }),
    kind: deviceKindArb,
    label: fc.string({ minLength: 0, maxLength: 50 }),
  })
  .map((d) => ({
    ...d,
    toJSON: () => d,
  }));

const deviceListArb = fc.array(mediaDeviceInfoArb, { minLength: 0, maxLength: 30 });

/**
 * **Validates: Requirements 1.2**
 *
 * For any list of MediaDeviceInfo-like objects with mixed kind values,
 * filterVideoInputs shall return exactly the devices where kind === 'videoinput',
 * preserving their order and losing no video input devices.
 */
describe('Property 1: Device filtering preserves only video inputs', () => {
  it('every returned device has kind === "videoinput"', () => {
    fc.assert(
      fc.property(deviceListArb, (devices) => {
        const result = filterVideoInputs(devices);
        for (const device of result) {
          expect(device.kind).toBe('videoinput');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no videoinput device is lost from the original list', () => {
    fc.assert(
      fc.property(deviceListArb, (devices) => {
        const result = filterVideoInputs(devices);
        const expectedCount = devices.filter((d) => d.kind === 'videoinput').length;
        expect(result).toHaveLength(expectedCount);
      }),
      { numRuns: 100 },
    );
  });

  it('preserves the relative order of videoinput devices', () => {
    fc.assert(
      fc.property(deviceListArb, (devices) => {
        const result = filterVideoInputs(devices);
        const expected = devices.filter((d) => d.kind === 'videoinput');
        expect(result).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });
});
