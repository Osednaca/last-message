// Feature: last-message-echoes, Property 5: Collection record round-trip
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { saveCollection, loadCollection } from '@/hooks/useCollection';
import type { CollectionRecord, Category } from '@/types';

const categoryArb = fc.constantFrom<Category>('water', 'air', 'fauna', 'consumption', 'energy');

const isoDateArb = fc
  .integer({ min: 946684800000, max: 4102444799999 }) // 2000-01-01 to 2099-12-31 in ms
  .map((ms) => new Date(ms).toISOString());

const collectionRecordArb: fc.Arbitrary<CollectionRecord> = fc.record({
  messageId: fc.string({ minLength: 1, maxLength: 50 }),
  category: categoryArb,
  discoveredAt: isoDateArb,
});

/**
 * **Validates: Requirements 9.6**
 *
 * For any valid CollectionRecord (containing messageId, category, and discoveredAt),
 * storing it to localStorage and then retrieving it shall produce a record
 * equivalent to the original.
 */
describe('Property 5: Collection record round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a single CollectionRecord survives save → load round-trip', () => {
    fc.assert(
      fc.property(collectionRecordArb, (record: CollectionRecord) => {
        localStorage.clear();
        saveCollection([record]);
        const loaded = loadCollection();
        expect(loaded).toHaveLength(1);
        expect(loaded[0]).toEqual(record);
      }),
      { numRuns: 100 },
    );
  });

  it('an array of CollectionRecords survives save → load round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(collectionRecordArb, { minLength: 0, maxLength: 20 }),
        (records: CollectionRecord[]) => {
          localStorage.clear();
          saveCollection(records);
          const loaded = loadCollection();
          expect(loaded).toEqual(records);
        },
      ),
      { numRuns: 100 },
    );
  });
});
