// Feature: last-message-echoes, Property 2: Message selection returns correct category
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { messages, getRandomMessage } from '@/data/messages';
import type { Category } from '@/types';

/**
 * **Validates: Requirements 5.3**
 *
 * For any valid category, calling `getRandomMessage(category)` shall return
 * a Message object that belongs to that category's message list in the Message_Store.
 */
describe('Property 2: Message selection returns correct category', () => {
  const categoryArb = fc.constantFrom<Category>('water', 'air', 'fauna', 'consumption', 'energy');

  it('should return a message that exists in the given category message list', () => {
    fc.assert(
      fc.property(categoryArb, (category: Category) => {
        const message = getRandomMessage(category);
        expect(messages[category]).toContainEqual(message);
      }),
      { numRuns: 100 },
    );
  });

  it('should return a message with valid id, text, and audioPath fields', () => {
    fc.assert(
      fc.property(categoryArb, (category: Category) => {
        const message = getRandomMessage(category);
        expect(typeof message.id).toBe('string');
        expect(message.id.length).toBeGreaterThan(0);
        expect(typeof message.text).toBe('string');
        expect(message.text.length).toBeGreaterThan(0);
        expect(typeof message.audioPath).toBe('string');
        expect(message.audioPath.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('should always return a message whose id starts with the category name', () => {
    fc.assert(
      fc.property(categoryArb, (category: Category) => {
        const message = getRandomMessage(category);
        expect(message.id.startsWith(category)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
