import { useCallback } from 'react';

export interface UseImageCaptureReturn {
  captureFrame: () => string;
}

/**
 * Custom hook that captures a single frame from a video element as a base64-encoded JPEG string.
 *
 * @param videoRef - A React ref pointing to the HTMLVideoElement (camera preview)
 * @returns An object with a `captureFrame` function that returns the base64 image data
 */
export function useImageCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
): UseImageCaptureReturn {
  const captureFrame = useCallback((): string => {
    const video = videoRef.current;
    if (!video) {
      return '';
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    // Strip the "data:image/jpeg;base64," prefix to return just the base64 data
    const prefix = 'data:image/jpeg;base64,';
    if (dataUrl.startsWith(prefix)) {
      return dataUrl.slice(prefix.length);
    }

    return dataUrl;
  }, [videoRef]);

  return { captureFrame };
}
