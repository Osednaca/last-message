// Feature: last-message-echoes, Property 3: Message serialization round-trip
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Message } from '@/types';

/**
 * **Validates: Requirements 5.5**
 *
 * For any valid Message object, serializing it to JSON and then deserializing
 * the JSON string shall produce an object equivalent to the original Message
 * (with matching id, text, and audioPath fields).
 */
describe('Property 3: Message serialization round-trip', () => {
  const messageArb = fc.record({
    id: fc.string({ minLength: 1 }),
    text: fc.string({ minLength: 1 }),
    audioPath: fc.string({ minLength: 1 }),
  });

  it('should survive JSON.stringify → JSON.parse round-trip with deep equality', () => {
    fc.assert(
      fc.property(messageArb, (message: Message) => {
        const serialized = JSON.stringify(message);
        const deserialized = JSON.parse(serialized) as Message;

        expect(deserialized).toEqual(message);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve id, text, and audioPath fields individually after round-trip', () => {
    fc.assert(
      fc.property(messageArb, (message: Message) => {
        const serialized = JSON.stringify(message);
        const deserialized = JSON.parse(serialized) as Message;

        expect(deserialized.id).toBe(message.id);
        expect(deserialized.text).toBe(message.text);
        expect(deserialized.audioPath).toBe(message.audioPath);
      }),
      { numRuns: 100 },
    );
  });
});
