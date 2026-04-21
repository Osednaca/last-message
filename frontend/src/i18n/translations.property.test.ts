// Feature: last-message-echoes, Property 7: Translation store serialization round-trip
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { TranslationStore } from '@/types';

/**
 * **Validates: Requirements 11.5**
 *
 * For any valid TranslationStore object, serializing it to JSON and then
 * deserializing the JSON string shall produce an object deeply equal to
 * the original TranslationStore.
 */
describe('Property 7: Translation store serialization round-trip', () => {
  // Arbitrary for a single locale: a dictionary of string keys to string values
  const localeArb = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.string({ maxLength: 100 }),
  );

  // Arbitrary for a TranslationStore: a dictionary of locale keys to locale dictionaries
  const translationStoreArb: fc.Arbitrary<TranslationStore> = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    localeArb,
  );

  it('should survive JSON.stringify → JSON.parse round-trip for any TranslationStore', () => {
    fc.assert(
      fc.property(translationStoreArb, (store: TranslationStore) => {
        const serialized = JSON.stringify(store);
        const deserialized = JSON.parse(serialized) as TranslationStore;
        expect(deserialized).toEqual(store);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve all locale keys through serialization', () => {
    fc.assert(
      fc.property(translationStoreArb, (store: TranslationStore) => {
        const serialized = JSON.stringify(store);
        const deserialized = JSON.parse(serialized) as TranslationStore;
        expect(Object.keys(deserialized).sort()).toEqual(Object.keys(store).sort());
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve all translation keys within each locale through serialization', () => {
    fc.assert(
      fc.property(translationStoreArb, (store: TranslationStore) => {
        const serialized = JSON.stringify(store);
        const deserialized = JSON.parse(serialized) as TranslationStore;
        for (const locale of Object.keys(store)) {
          expect(Object.keys(deserialized[locale]).sort()).toEqual(
            Object.keys(store[locale]).sort(),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
