// Feature: last-message-echoes, Property 4: Collection no-duplicate invariant
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { addRecord } from '@/hooks/useCollection';
import type { CollectionRecord, Category } from '@/types';

const categoryArb = fc.constantFrom<Category>('water', 'air', 'fauna', 'consumption', 'energy');

function makeRecord(messageId: string, category: Category): CollectionRecord {
  return {
    messageId,
    category,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * **Validates: Requirements 9.5**
 *
 * For any message ID and any number of addRecord calls with that same
 * message ID, the Collection shall contain exactly one entry for that message ID.
 */
describe('Property 4: Collection no-duplicate invariant', () => {
  it('adding the same messageId multiple times results in exactly one entry', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 10 }),
        categoryArb,
        (messageId: string, repeatCount: number, category: Category) => {
          let records: CollectionRecord[] = [];
          for (let i = 0; i < repeatCount; i++) {
            records = addRecord(records, makeRecord(messageId, category));
          }
          const matching = records.filter((r) => r.messageId === messageId);
          expect(matching).toHaveLength(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('multiple different messageIds each appear exactly once', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        categoryArb,
        (messageIds: string[], repeatCount: number, category: Category) => {
          let records: CollectionRecord[] = [];
          // Add each messageId repeatCount times in interleaved order
          for (let i = 0; i < repeatCount; i++) {
            for (const id of messageIds) {
              records = addRecord(records, makeRecord(id, category));
            }
          }
          // Each messageId should appear exactly once
          for (const id of messageIds) {
            const matching = records.filter((r) => r.messageId === id);
            expect(matching).toHaveLength(1);
          }
          // Total records should equal number of unique IDs
          expect(records).toHaveLength(messageIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
