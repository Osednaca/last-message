import { useState, useCallback, useRef, useEffect } from 'react';
import type { OverlayState, Category } from '@/types';
import { analyzeImage } from '@/api/client';
import { useImageCapture } from '@/hooks/useImageCapture';
import { useCollection } from '@/hooks/useCollection';
import { useScanSound } from '@/hooks/useScanSound';
import { getRandomMessage } from '@/data/messages';
import { Overlay } from '@/components/Overlay';
import { t } from '@/i18n/translations';

const TIMEOUT_MS = 15_000;

interface ScanOrchestratorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Play an audio file and return a promise that resolves when playback ends,
 * or rejects if the audio fails to load/play.
 */
function playAudio(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src);
    audio.addEventListener('ended', () => resolve());
    audio.addEventListener('error', () => {
      const message = audio.error?.message ?? 'Audio playback failed';
      reject(new Error(message));
    });
    audio.play().catch(reject);
  });
}

export function ScanOrchestrator({ videoRef }: ScanOrchestratorProps) {
  const { captureFrame } = useImageCapture(videoRef);
  const { addToCollection } = useCollection();
  const { playScan, startAnalyzing, stopAnalyzing, playReveal } = useScanSound();

  const [overlayState, setOverlayState] = useState<OverlayState>('idle');
  const [objectLabel, setObjectLabel] = useState<string | undefined>();
  const [messageText, setMessageText] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  // Keep a ref to the active AbortController so we can abort on unmount
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Abort any in-flight request when the component unmounts (e.g. user
  // navigates back to Home while a scan is running).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const handleScan = useCallback(async () => {
    if (isProcessing) return;

    // Abort any lingering previous request (defensive — shouldn't happen
    // because isProcessing guards against it, but just in case).
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setIsProcessing(true);
    setOverlayState('scanning');
    playScan();
    setObjectLabel(undefined);
    setMessageText(undefined);

    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // 1. Capture frame
      const base64Image = captureFrame();
      if (!base64Image) {
        throw new Error(t('error_generic'));
      }

      // 2. POST to /analyze
      startAnalyzing();
      const result = await analyzeImage(base64Image, controller.signal);
      clearTimeout(timeoutId);
      stopAnalyzing();

      // If aborted while awaiting, bail out silently
      if (!mountedRef.current) return;

      // 3. Transition to detected
      setOverlayState('detected');
      playReveal();
      setObjectLabel(result.label);

      // 4. Select random message for the category
      const message = getRandomMessage(result.category as Category);
      setMessageText(message.text);

      // Brief pause on detected state so user can see it
      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (!mountedRef.current) return;

      // 5. Transition to playing
      setOverlayState('playing');

      // 6. Play audio and wait for completion
      try {
        await playAudio(message.audioPath);

        // 7. On audio end: add to collection, return to idle
        addToCollection({
          messageId: message.id,
          category: result.category as Category,
          discoveredAt: new Date().toISOString(),
        });
        setOverlayState('idle');
      } catch {
        // Audio failed — fall back to displaying message text
        addToCollection({
          messageId: message.id,
          category: result.category as Category,
          discoveredAt: new Date().toISOString(),
        });
        setOverlayState('idle');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      stopAnalyzing();

      // If aborted due to unmount, don't try to update state
      if (!mountedRef.current) return;

      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessageText(t('error_timeout'));
      } else if (err instanceof Error) {
        setMessageText(err.message);
      } else {
        setMessageText(t('error_generic'));
      }

      setOverlayState('idle');
    } finally {
      setIsProcessing(false);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [isProcessing, captureFrame, addToCollection, playScan, startAnalyzing, stopAnalyzing, playReveal]);

  return (
    <>
      <Overlay
        state={overlayState}
        objectLabel={objectLabel}
        messageText={messageText}
      />

      <button
        type="button"
        onClick={handleScan}
        disabled={isProcessing}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 px-8 py-3 rounded-full
          bg-primary-600 text-foreground font-semibold text-lg
          shadow-glow-md hover:bg-primary-500 hover:shadow-glow-lg
          transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-600 disabled:hover:shadow-glow-md
          pointer-events-auto"
      >
        {t('scan_button')}
      </button>
    </>
  );
}
