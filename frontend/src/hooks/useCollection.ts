import { useState, useCallback } from 'react';
import type { CollectionRecord } from '../types';

const STORAGE_KEY = 'echoes-collection';

// --- Pure utility functions (testable without React) ---

/**
 * Loads the collection from localStorage.
 * Returns an empty array if the key is missing or the data is invalid.
 */
export function loadCollection(): CollectionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CollectionRecord[];
  } catch {
    return [];
  }
}

/**
 * Saves the collection to localStorage.
 * Silently fails on QuotaExceededError or any other write error.
 */
export function saveCollection(records: CollectionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Gracefully handle QuotaExceededError and other storage errors
  }
}

/**
 * Adds a record to the collection if no record with the same messageId exists.
 * Returns the updated array (or the original array if the messageId is already present).
 */
export function addRecord(
  records: CollectionRecord[],
  record: CollectionRecord,
): CollectionRecord[] {
  if (records.some((r) => r.messageId === record.messageId)) {
    return records;
  }
  return [...records, record];
}

// --- React hook ---

export interface UseCollectionReturn {
  addToCollection: (record: CollectionRecord) => void;
  getCollection: () => CollectionRecord[];
  isDiscovered: (messageId: string) => boolean;
}

/**
 * Custom React hook for managing the discovered-messages collection.
 * Initializes from localStorage on mount and persists on every add.
 */
export function useCollection(): UseCollectionReturn {
  const [records, setRecords] = useState<CollectionRecord[]>(loadCollection);

  const addToCollection = useCallback(
    (record: CollectionRecord) => {
      setRecords((prev) => {
        const updated = addRecord(prev, record);
        if (updated !== prev) {
          saveCollection(updated);
        }
        return updated;
      });
    },
    [],
  );

  const getCollection = useCallback((): CollectionRecord[] => {
    return records;
  }, [records]);

  const isDiscovered = useCallback(
    (messageId: string): boolean => {
      return records.some((r) => r.messageId === messageId);
    },
    [records],
  );

  return { addToCollection, getCollection, isDiscovered };
}
