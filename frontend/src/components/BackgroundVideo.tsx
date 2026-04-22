import { useState, useEffect, useRef } from 'react';

export interface BackgroundVideoProps {
  /** Path to the video file */
  src: string;
  /** Path to the fallback image */
  fallbackSrc: string;
  /** Video opacity (0–1). Default: 0.4 */
  opacity?: number;
  /** CSS blur in pixels applied to the video. Default: 4 */
  blurPx?: number;
  /** Dark overlay RGBA string. Default: 'rgba(0, 0, 0, 0.6)' */
  overlayColor?: string;
  /** Backdrop blur in pixels for the overlay. Default: 4 */
  overlayBlurPx?: number;
  /** Enable green/cyan tint overlay. Default: true */
  tintEnabled?: boolean;
  /** Tint overlay opacity (0–1). Default: 0.12 */
  tintOpacity?: number;
}

/**
 * Full-viewport background video with dark overlay, blur, and optional tint.
 *
 * Falls back to a static image when:
 *  - the video element fires an error, or
 *  - the user prefers reduced motion.
 *
 * All visual treatment (opacity, blur, overlays) is applied identically
 * regardless of whether the video or fallback image is displayed.
 */
export function BackgroundVideo({
  src,
  fallbackSrc,
  opacity = 0.4,
  blurPx = 4,
}: BackgroundVideoProps) {
  const [videoFailed, setVideoFailed] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Respect reduced-motion preference: pause the video so the user sees a
  // still frame instead of removing it entirely (there is no fallback image).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (mq.matches) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };
    // Apply on mount
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Cleanup: pause on unmount.
  // NOTE: We intentionally do NOT clear `video.src` here. Doing so desyncs
  // the imperative DOM state from React's virtual DOM: under StrictMode
  // (dev) the effect runs twice, and on re-mount React skips re-setting
  // the unchanged `src` attribute, leaving the video blank. Clearing the
  // src also triggers a media `error` event, which tripped `onError` and
  // swapped the video for an empty fallback image.
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
      }
    };
  }, []);

  const mediaStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity,
    filter: `blur(${blurPx}px)`,
  };

  return (
    <div
      data-testid="background-video"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Video or fallback image */}
      {videoFailed ? (
        <img
          data-testid="bg-video-media"
          src={fallbackSrc}
          alt=""
          style={mediaStyle}
        />
      ) : (
        <video
          ref={videoRef}
          data-testid="bg-video-media"
          src={src}
          {...(fallbackSrc ? { poster: fallbackSrc } : {})}
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => {
            // Ignore spurious errors when the element has no source
            // (can happen during unmount / src-reset transitions).
            const target = e.currentTarget;
            if (!target.currentSrc && !target.src) return;
            setVideoFailed(true);
          }}
          style={mediaStyle}
        />
      )}

    </div>
  );
}
