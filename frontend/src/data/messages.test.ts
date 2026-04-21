import { describe, it, expect } from 'vitest';
import { messages, getRandomMessage } from './messages';
import type { Category } from '@/types';

const ALL_CATEGORIES: Category[] = ['water', 'air', 'fauna', 'consumption', 'energy'];

describe('Message Store', () => {
  it('contains all five categories', () => {
    for (const category of ALL_CATEGORIES) {
      expect(messages[category]).toBeDefined();
      expect(Array.isArray(messages[category])).toBe(true);
    }
  });

  it('has 3-5 messages per category', () => {
    for (const category of ALL_CATEGORIES) {
      const count = messages[category].length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    }
  });

  it('each message has id, text, and audioPath fields', () => {
    for (const category of ALL_CATEGORIES) {
      for (const message of messages[category]) {
        expect(typeof message.id).toBe('string');
        expect(message.id.length).toBeGreaterThan(0);
        expect(typeof message.text).toBe('string');
        expect(message.text.length).toBeGreaterThan(0);
        expect(typeof message.audioPath).toBe('string');
        expect(message.audioPath.length).toBeGreaterThan(0);
      }
    }
  });

  it('all message ids are unique', () => {
    const allIds = ALL_CATEGORIES.flatMap((cat) => messages[cat].map((m) => m.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('audio paths follow expected pattern', () => {
    for (const category of ALL_CATEGORIES) {
      for (const message of messages[category]) {
        expect(message.audioPath).toMatch(/^\/audio\/.+\.mp3$/);
      }
    }
  });
});

describe('getRandomMessage', () => {
  it('returns a message from the correct category', () => {
    for (const category of ALL_CATEGORIES) {
      const message = getRandomMessage(category);
      expect(messages[category]).toContainEqual(message);
    }
  });

  it('returns a valid Message object', () => {
    const message = getRandomMessage('water');
    expect(message).toHaveProperty('id');
    expect(message).toHaveProperty('text');
    expect(message).toHaveProperty('audioPath');
  });
});
