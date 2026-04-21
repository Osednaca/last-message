import { forwardRef, useEffect, useRef, useState } from 'react';
import { t } from '@/i18n/translations';
import { useCamera } from '@/hooks/useCamera';
import { CameraSelector } from './CameraSelector';

export const Camera = forwardRef<HTMLVideoElement>(function Camera(_props, ref) {
  const { devices, activeDeviceId, stream, error, switchCamera } = useCamera();
  const [announcement, setAnnouncement] = useState('');
  const prevDeviceIdRef = useRef<string | null>(null);

  // Assign stream from hook to the video element's srcObject
  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current && stream) {
      ref.current.srcObject = stream;
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

  if (displayError && !stream) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-0">
        <p className="text-destructive text-center px-6 text-lg">{displayError}</p>
      </div>
    );
  }

  return (
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
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className="fixed inset-0 w-full h-full object-cover z-0"
      />
    </>
  );
});
