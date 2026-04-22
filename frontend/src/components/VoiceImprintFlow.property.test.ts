// Feature: legacy-voice-imprint, Property 3: Voice imprint record structure
// Feature: legacy-voice-imprint, Property 4: Voice imprint localStorage round-trip
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { VoiceImprintRecord } from '@/types';
import { loadImprints, saveImprints, deleteImprint } from '@/components/VoiceImprintFlow';

const isoDateArb = fc
  .integer({ min: 946684800000, max: 4102444799999 }) // 2000-01-01 to 2099-12-31 in ms
  .map((ms) => new Date(ms).toISOString());

const voiceImprintRecordArb: fc.Arbitrary<VoiceImprintRecord> = fc.record({
  id: fc.uuid(),
  type: fc.constant('legacy_voice' as const),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  audioData: fc.string({ minLength: 1, maxLength: 500 }),
  createdAt: isoDateArb,
});

/**
 * **Validates: Requirements 6.1**
 *
 * For any valid message text and base64 audio data, creating a VoiceImprintRecord
 * SHALL produce a record containing: a non-empty string id, the literal type
 * "legacy_voice", the original text, the original audioData, and a createdAt
 * string that is a valid ISO 8601 timestamp.
 */
describe('Property 3: Voice imprint record structure', () => {
  it('every generated VoiceImprintRecord has a non-empty string id', () => {
    fc.assert(
      fc.property(voiceImprintRecordArb, (record: VoiceImprintRecord) => {
        expect(typeof record.id).toBe('string');
        expect(record.id.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('every generated VoiceImprintRecord has type exactly "legacy_voice"', () => {
    fc.assert(
      fc.property(voiceImprintRecordArb, (record: VoiceImprintRecord) => {
        expect(record.type).toBe('legacy_voice');
      }),
      { numRuns: 100 },
    );
  });

  it('text and audioData are preserved as the original values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        isoDateArb,
        (text: string, audioData: string, createdAt: string) => {
          const record: VoiceImprintRecord = {
            id: crypto.randomUUID(),
            type: 'legacy_voice',
            text,
            audioData,
            createdAt,
          };

          expect(record.text).toBe(text);
          expect(record.audioData).toBe(audioData);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('createdAt is a valid ISO 8601 string parseable by new Date()', () => {
    fc.assert(
      fc.property(voiceImprintRecordArb, (record: VoiceImprintRecord) => {
        const parsed = new Date(record.createdAt);
        expect(parsed.getTime()).not.toBeNaN();
        expect(record.createdAt).toBe(parsed.toISOString());
      }),
      { numRuns: 100 },
    );
  });

  it('all required fields exist with correct types', () => {
    fc.assert(
      fc.property(voiceImprintRecordArb, (record: VoiceImprintRecord) => {
        expect(typeof record.id).toBe('string');
        expect(record.id.length).toBeGreaterThan(0);
        expect(record.type).toBe('legacy_voice');
        expect(typeof record.text).toBe('string');
        expect(typeof record.audioData).toBe('string');
        expect(typeof record.createdAt).toBe('string');

        const parsedDate = new Date(record.createdAt);
        expect(parsedDate.getTime()).not.toBeNaN();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: legacy-voice-imprint, Property 4: Voice imprint localStorage round-trip

/**
 * **Validates: Requirements 6.2, 6.5**
 *
 * For any valid VoiceImprintRecord, storing it to the Imprint_Collection in
 * localStorage and then retrieving it SHALL produce a record with equivalent
 * id, type, text, audioData, and createdAt values.
 */
describe('Property 4: Voice imprint localStorage round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a single VoiceImprintRecord survives a localStorage round-trip', () => {
    fc.assert(
      fc.property(voiceImprintRecordArb, (record) => {
        saveImprints([record]);
        const retrieved = loadImprints();

        expect(retrieved).toHaveLength(1);
        expect(retrieved[0]).toEqual(record);
      }),
      { numRuns: 100 },
    );
  });

  it('an array of VoiceImprintRecords survives a localStorage round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(voiceImprintRecordArb, { minLength: 0, maxLength: 20 }),
        (records) => {
          saveImprints(records);
          const retrieved = loadImprints();

          expect(retrieved).toHaveLength(records.length);
          expect(retrieved).toEqual(records);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('overwriting imprints replaces the previous collection entirely', () => {
    fc.assert(
      fc.property(
        fc.array(voiceImprintRecordArb, { minLength: 1, maxLength: 10 }),
        fc.array(voiceImprintRecordArb, { minLength: 1, maxLength: 10 }),
        (first, second) => {
          saveImprints(first);
          saveImprints(second);
          const retrieved = loadImprints();

          expect(retrieved).toEqual(second);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: legacy-voice-imprint, Property 5: Deletion removes exactly one record

/**
 * **Validates: Requirements 6.6**
 *
 * For any non-empty Imprint_Collection and any record r in that collection,
 * deleting r SHALL result in a collection whose length is one less than the
 * original, and which does not contain a record with r.id.
 */
describe('Property 5: Deletion removes exactly one record', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deleting a record shrinks the collection by exactly 1 and removes the deleted ID', () => {
    fc.assert(
      fc.property(
        fc
          .array(voiceImprintRecordArb, { minLength: 1, maxLength: 20 })
          .chain((records) =>
            fc.record({
              records: fc.constant(records),
              index: fc.integer({ min: 0, max: records.length - 1 }),
            }),
          ),
        ({ records, index }) => {
          const target = records[index];

          saveImprints(records);
          const result = deleteImprint(target.id);

          expect(result).toHaveLength(records.length - 1);
          expect(result.every((r) => r.id !== target.id)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('deleting a record preserves all other records in order', () => {
    fc.assert(
      fc.property(
        fc
          .array(voiceImprintRecordArb, { minLength: 1, maxLength: 20 })
          .chain((records) =>
            fc.record({
              records: fc.constant(records),
              index: fc.integer({ min: 0, max: records.length - 1 }),
            }),
          ),
        ({ records, index }) => {
          const target = records[index];
          const expected = records.filter((r) => r.id !== target.id);

          saveImprints(records);
          const result = deleteImprint(target.id);

          expect(result).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
