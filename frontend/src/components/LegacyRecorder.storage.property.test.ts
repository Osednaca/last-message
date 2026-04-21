// Feature: legacy-elevenlabs-tts, Property 5: Legacy message localStorage round-trip
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { LegacyTTSMessage } from '@/types';

const STORAGE_KEY = 'echoes-legacy-messages';

const isoDateArb = fc
  .integer({ min: 946684800000, max: 4102444799999 }) // 2000-01-01 to 2099-12-31 in ms
  .map((ms) => new Date(ms).toISOString());

const legacyTTSMessageArb: fc.Arbitrary<LegacyTTSMessage> = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  audioData: fc.string({ minLength: 1, maxLength: 500 }),
  createdAt: isoDateArb,
  type: fc.constant('legacy' as const),
});

/**
 * **Validates: Requirements 5.1, 5.2, 5.5**
 *
 * For any valid LegacyTTSMessage (containing a non-empty id, text of 1-200 characters,
 * non-empty audioData string, a valid ISO 8601 createdAt timestamp, and type "legacy"),
 * serializing the message to JSON, storing it in localStorage, retrieving it, and
 * deserializing SHALL produce a record deeply equal to the original message.
 */
describe('Property 5: Legacy message localStorage round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a single LegacyTTSMessage survives JSON → localStorage → parse round-trip', () => {
    fc.assert(
      fc.property(legacyTTSMessageArb, (message: LegacyTTSMessage) => {
        localStorage.clear();

        const messages = [message];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));

        const raw = localStorage.getItem(STORAGE_KEY);
        expect(raw).not.toBeNull();

        const parsed = JSON.parse(raw!) as LegacyTTSMessage[];
        expect(parsed).toHaveLength(1);
        expect(parsed[0]).toEqual(message);
      }),
      { numRuns: 100 },
    );
  });

  it('an array of LegacyTTSMessages survives localStorage round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(legacyTTSMessageArb, { minLength: 0, maxLength: 20 }),
        (messages: LegacyTTSMessage[]) => {
          localStorage.clear();

          localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));

          const raw = localStorage.getItem(STORAGE_KEY);
          expect(raw).not.toBeNull();

          const parsed = JSON.parse(raw!) as LegacyTTSMessage[];
          expect(parsed).toEqual(messages);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('preserves all individual fields after round-trip', () => {
    fc.assert(
      fc.property(legacyTTSMessageArb, (message: LegacyTTSMessage) => {
        localStorage.clear();

        localStorage.setItem(STORAGE_KEY, JSON.stringify([message]));

        const parsed = JSON.parse(
          localStorage.getItem(STORAGE_KEY)!,
        ) as LegacyTTSMessage[];
        const restored = parsed[0];

        expect(restored.id).toBe(message.id);
        expect(restored.text).toBe(message.text);
        expect(restored.audioData).toBe(message.audioData);
        expect(restored.createdAt).toBe(message.createdAt);
        expect(restored.type).toBe('legacy');
      }),
      { numRuns: 100 },
    );
  });
});
