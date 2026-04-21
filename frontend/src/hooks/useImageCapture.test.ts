import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useImageCapture } from './useImageCapture';

describe('useImageCapture', () => {
  let mockCanvas: {
    width: number;
    height: number;
    getContext: ReturnType<typeof vi.fn>;
    toDataURL: ReturnType<typeof vi.fn>;
  };
  let mockCtx: { drawImage: ReturnType<typeof vi.fn> };
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    mockCtx = { drawImage: vi.fn() };
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,abc123base64data'),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty string when videoRef.current is null', () => {
    const videoRef = { current: null };
    const { result } = renderHook(() => useImageCapture(videoRef));

    expect(result.current.captureFrame()).toBe('');
  });

  it('captures a frame and returns base64 data without prefix', () => {
    const mockVideo = {
      videoWidth: 640,
      videoHeight: 480,
    } as HTMLVideoElement;
    const videoRef = { current: mockVideo };

    const { result } = renderHook(() => useImageCapture(videoRef));
    const base64 = result.current.captureFrame();

    expect(mockCanvas.width).toBe(640);
    expect(mockCanvas.height).toBe(480);
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 640, 480);
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg');
    expect(base64).toBe('abc123base64data');
  });

  it('returns empty string when canvas context is unavailable', () => {
    mockCanvas.getContext.mockReturnValue(null);

    const mockVideo = {
      videoWidth: 640,
      videoHeight: 480,
    } as HTMLVideoElement;
    const videoRef = { current: mockVideo };

    const { result } = renderHook(() => useImageCapture(videoRef));
    expect(result.current.captureFrame()).toBe('');
  });

  it('sets canvas dimensions to match video dimensions', () => {
    const mockVideo = {
      videoWidth: 1920,
      videoHeight: 1080,
    } as HTMLVideoElement;
    const videoRef = { current: mockVideo };

    const { result } = renderHook(() => useImageCapture(videoRef));
    result.current.captureFrame();

    expect(mockCanvas.width).toBe(1920);
    expect(mockCanvas.height).toBe(1080);
  });
});
