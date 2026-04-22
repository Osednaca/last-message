/**
 * Integration tests for the Last Message frontend.
 *
 * - localStorage persistence: add records, unmount, re-mount, verify records survive
 * - API client module: verify correct export and function signature
 *
 * Validates: Requirements 2.2, 3.5, 9.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollection } from '../hooks/useCollection';
import { analyzeImage } from '../api/client';
import type { CollectionRecord, Category } from '../types';

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

// ---------------------------------------------------------------------------
// localStorage persistence survives component re-mount
// ---------------------------------------------------------------------------

describe('useCollection localStorage persistence (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records survive unmount and re-mount', () => {
    // First mount: add records
    const { result, unmount } = renderHook(() => useCollection());

    act(() => {
      result.current.addToCollection(makeRecord('msg-1', 'water'));
    });
    act(() => {
      result.current.addToCollection(makeRecord('msg-2', 'air'));
    });

    expect(result.current.getCollection()).toHaveLength(2);

    // Unmount the hook (simulates component teardown)
    unmount();

    // Re-mount: a fresh hook instance should load from localStorage
    const { result: result2 } = renderHook(() => useCollection());

    const collection = result2.current.getCollection();
    expect(collection).toHaveLength(2);
    expect(collection[0].messageId).toBe('msg-1');
    expect(collection[0].category).toBe('water');
    expect(collection[1].messageId).toBe('msg-2');
    expect(collection[1].category).toBe('air');
  });

  it('isDiscovered returns true for persisted records after re-mount', () => {
    const { result, unmount } = renderHook(() => useCollection());

    act(() => {
      result.current.addToCollection(makeRecord('msg-persist', 'fauna'));
    });

    expect(result.current.isDiscovered('msg-persist')).toBe(true);

    unmount();

    const { result: result2 } = renderHook(() => useCollection());
    expect(result2.current.isDiscovered('msg-persist')).toBe(true);
  });

  it('empty collection persists correctly across re-mount', () => {
    const { unmount } = renderHook(() => useCollection());
    unmount();

    const { result } = renderHook(() => useCollection());
    expect(result.current.getCollection()).toHaveLength(0);
  });

  it('duplicate records are still prevented after re-mount', () => {
    const { result, unmount } = renderHook(() => useCollection());

    act(() => {
      result.current.addToCollection(makeRecord('msg-dup', 'energy'));
    });

    unmount();

    const { result: result2 } = renderHook(() => useCollection());

    // Try adding the same messageId again after re-mount
    act(() => {
      result2.current.addToCollection(makeRecord('msg-dup', 'consumption'));
    });

    expect(result2.current.getCollection()).toHaveLength(1);
    expect(result2.current.getCollection()[0].category).toBe('energy');
  });
});

// ---------------------------------------------------------------------------
// API client module integration
// ---------------------------------------------------------------------------

describe('API client module (integration)', () => {
  it('analyzeImage is exported as a function', () => {
    expect(typeof analyzeImage).toBe('function');
  });

  it('analyzeImage accepts a base64 string and optional AbortSignal', () => {
    // The function should accept (base64Image: string, signal?: AbortSignal)
    // Verify the function length (number of required parameters)
    // TypeScript compiled functions may report 1 or 2 depending on optional params
    expect(analyzeImage.length).toBeGreaterThanOrEqual(1);
    expect(analyzeImage.length).toBeLessThanOrEqual(2);
  });
});


// ---------------------------------------------------------------------------
// Legacy TTS integration tests
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// --- Mock generateLegacySpeech ---
const mockGenerateLegacySpeech = vi.fn();

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client');
  return {
    ...actual,
    generateLegacySpeech: (...args: unknown[]) => mockGenerateLegacySpeech(...args),
  };
});

// --- Mock useAudioPlayer ---
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: (_options?: { onEnd?: () => void }) => {
    return {
      play: mockPlay,
      stop: mockStop,
      isPlaying: false,
      error: null,
    };
  },
}));

const LEGACY_STORAGE_KEY = 'echoes-legacy-messages';

describe('Legacy TTS full flow (integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockGenerateLegacySpeech.mockReset();
    mockPlay.mockReset().mockResolvedValue(undefined);
    mockStop.mockReset();

    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: vi.fn().mockReturnValue('integration-uuid-001'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('full TTS flow: type text → submit → receive audio → playback → localStorage save', async () => {
    // Dynamically import LegacyRecorder after mocks are set up
    const { LegacyRecorder } = await import('@/components/LegacyRecorder');

    mockGenerateLegacySpeech.mockResolvedValue({ audio_base64: 'dGVzdA==' });

    render(<LegacyRecorder />);

    // Step 1: Type text in textarea
    const textarea = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(textarea, { target: { value: 'Hello from integration test' } });

    // Verify character counter updates
    expect(screen.getByTestId('char-counter')).toHaveTextContent('27 / 200');

    // Step 2: Submit
    const submitButton = screen.getByText('Send message to the future');
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    // Step 3: Verify success state after receiving audio
    await waitFor(() => {
      expect(screen.getByText('Message received by the future')).toBeInTheDocument();
    });

    // Verify generateLegacySpeech was called with the correct text
    expect(mockGenerateLegacySpeech).toHaveBeenCalledTimes(1);
    expect(mockGenerateLegacySpeech).toHaveBeenCalledWith(
      'Hello from integration test',
      expect.any(AbortSignal),
    );

    // Step 4: Verify play() was called with correct data URL
    expect(mockPlay).toHaveBeenCalledWith('data:audio/mpeg;base64,dGVzdA==');

    // Step 5: Verify localStorage was updated with the new message
    const stored = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: 'integration-uuid-001',
      text: 'Hello from integration test',
      audioData: 'data:audio/mpeg;base64,dGVzdA==',
      type: 'legacy',
    });
    expect(stored[0].createdAt).toBeDefined();
  });
});

describe('Legacy TTS localStorage persistence (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('pre-populated messages display on mount, survive unmount, and re-display on re-mount', async () => {
    const { LegacyRecorder } = await import('@/components/LegacyRecorder');

    // Pre-populate localStorage with a saved message
    const savedMessages = [
      {
        id: 'persist-msg-1',
        text: 'A message that persists',
        audioData: 'data:audio/mpeg;base64,cGVyc2lzdA==',
        createdAt: '2025-07-15T12:00:00.000Z',
        type: 'legacy',
      },
    ];
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(savedMessages));

    // First mount: verify the message text appears
    const { unmount } = render(<LegacyRecorder />);
    expect(screen.getByText('A message that persists')).toBeInTheDocument();

    // Unmount the component
    unmount();

    // Re-render: verify the message still appears from localStorage
    render(<LegacyRecorder />);
    expect(screen.getByText('A message that persists')).toBeInTheDocument();
  });
});
