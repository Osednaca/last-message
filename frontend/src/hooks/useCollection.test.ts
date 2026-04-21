import { describe, it, expect, beforeEach } from 'vitest';
import type { CollectionRecord, Category } from '../types';
import { loadCollection, saveCollection, addRecord } from './useCollection';

const STORAGE_KEY = 'echoes-collection';

function makeRecord(
  messageId: string,
  category: Category = 'water',
): CollectionRecord {
  return {
    messageId,
    category,
    discoveredAt: new Date().toISOString(),
  };
}

describe('loadCollection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when localStorage has no data', () => {
    expect(loadCollection()).toEqual([]);
  });

  it('returns parsed records from localStorage', () => {
    const records = [makeRecord('msg-1'), makeRecord('msg-2', 'air')];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    expect(loadCollection()).toEqual(records);
  });

  it('returns an empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(loadCollection()).toEqual([]);
  });

  it('returns an empty array when localStorage contains a non-array value', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(loadCollection()).toEqual([]);
  });
});

describe('saveCollection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists records to localStorage', () => {
    const records = [makeRecord('msg-1')];
    saveCollection(records);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(records);
  });

  it('handles QuotaExceededError gracefully', () => {
    // Simulate QuotaExceededError by overriding setItem
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    };
    expect(() => saveCollection([makeRecord('msg-1')])).not.toThrow();
    Storage.prototype.setItem = original;
  });
});

describe('addRecord', () => {
  it('adds a new record to an empty collection', () => {
    const record = makeRecord('msg-1');
    const result = addRecord([], record);
    expect(result).toEqual([record]);
  });

  it('adds a new record to a non-empty collection', () => {
    const existing = makeRecord('msg-1');
    const newRecord = makeRecord('msg-2', 'energy');
    const result = addRecord([existing], newRecord);
    expect(result).toEqual([existing, newRecord]);
  });

  it('does not add a duplicate messageId', () => {
    const existing = makeRecord('msg-1');
    const duplicate = makeRecord('msg-1', 'fauna');
    const records = [existing];
    const result = addRecord(records, duplicate);
    expect(result).toHaveLength(1);
    expect(result).toBe(records);
  });

  it('returns the same array reference when messageId already exists', () => {
    const records = [makeRecord('msg-1')];
    const duplicate = makeRecord('msg-1', 'air');
    const result = addRecord(records, duplicate);
    expect(result).toBe(records);
  });
});
