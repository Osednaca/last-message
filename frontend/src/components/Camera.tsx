import { forwardRef, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n/translations';
import { useCamera } from '@/hooks/useCamera';
import { CameraSelector } from './CameraSelector';

export const Camera = forwardRef<HTMLVideoElement>(function Camera(_props, ref) {
  const { devices, activeDeviceId, stream, error, switchCamera } = useCamera();
  const [announcement, setAnnouncement] = useState('');
  const prevDeviceIdRef = useRef<string | null>(null);

  // Assign stream from hook to the video element's srcObject, then explicitly
  // invoke play(). Setting srcObject alone does not reliably trigger playback
  // on iOS Safari / mobile Chrome when the element is mounted before the
  // stream arrives — autoPlay is sometimes ignored for `MediaStream` srcs
  // unless play() is called in response to the stream-ready event.
  useEffect(() => {
    if (!ref || typeof ref !== 'object' || !ref.current) return;
    const video = ref.current;
    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      // play() can reject on mobile (e.g. interrupted by autoplay policy).
      // If it fails, retry on the next user interaction so the video
      // resumes as soon as the browser allows it.
      const playResult = video.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          // Retry play() on the next user interaction (tap/click)
          const retryPlay = () => {
            video.play().catch(() => {});
            document.removeEventListener('click', retryPlay);
            document.removeEventListener('touchstart', retryPlay);
          };
          document.addEventListener('click', retryPlay, { once: true });
          document.addEventListener('touchstart', retryPlay, { once: true });
        });
      }
    } else {
      video.srcObject = null;
    }
  }, [ref, stream]);

  // Announce camera switches via aria-live region
  useEffect(() => {
    if (activeDeviceId && prevDeviceIdRef.current !== null && prevDeviceIdRef.current !== activeDeviceId) {
      const device = devices.find((d) => d.deviceId === activeDeviceId);
      if (device) {
        const message = t('camera_switched').replace('{label}', device.label);
        setAnnouncement(message);
      }
    }
    prevDeviceIdRef.current = activeDeviceId;
  }, [activeDeviceId, devices]);

  // Map hook errors to user-facing messages (DOMException handling)
  const displayError = (() => {
    if (error) {
      return error;
    }
    // When there's no stream and no error from the hook, the hook may not have
    // initialized yet — no error to show
    return null;
  })();

  const showBlockingError = Boolean(displayError && !stream);

  return (
    <>
      {!showBlockingError && (
        <>
          <CameraSelector
            devices={devices}
            activeDeviceId={activeDeviceId}
            onSelect={switchCamera}
          />
          <div aria-live="polite" className="sr-only">
            {announcement}
          </div>
          {error && stream && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-destructive/90 text-destructive-foreground text-sm">
              {error}
            </div>
          )}
        </>
      )}

      {/* The <video> element is ALWAYS mounted (even when an error is shown)
          so the forwarded ref is stable and srcObject can be attached as
          soon as the stream resolves. Mounting/unmounting the <video> based
          on stream presence caused the ref to be null on initial resolve,
          which silently dropped the stream on some mobile browsers. */}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className="fixed inset-0 w-full h-full object-cover z-0"
      />

      {showBlockingError && (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-10">
          <p className="text-destructive text-center px-6 text-lg">{displayError}</p>
        </div>
      )}
    </>
  );
});
