// Feature: last-message-echoes, Property 6: Translation lookup correctness
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { translations, t } from '@/i18n/translations';

/**
 * **Validates: Requirements 11.4**
 *
 * For any valid string key present in the Translation_Store for the current locale,
 * calling `t(key)` shall return the exact string value stored in the Translation_Store
 * for that key and locale.
 */
describe('Property 6: Translation lookup correctness', () => {
  const enKeys = Object.keys(translations.en);

  const validKeyArb = fc.constantFrom(...enKeys);

  it('should return the exact stored value for any valid "en" key', () => {
    fc.assert(
      fc.property(validKeyArb, (key: string) => {
        const result = t(key);
        expect(result).toBe(translations.en[key]);
      }),
      { numRuns: 100 },
    );
  });

  it('should return the exact stored value when locale is explicitly "en"', () => {
    fc.assert(
      fc.property(validKeyArb, (key: string) => {
        const result = t(key, 'en');
        expect(result).toBe(translations.en[key]);
      }),
      { numRuns: 100 },
    );
  });

  it('should return a non-empty string for any valid key', () => {
    fc.assert(
      fc.property(validKeyArb, (key: string) => {
        const result = t(key);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
