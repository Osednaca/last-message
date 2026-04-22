import { t } from '@/i18n/translations';
import { WaveformVisualizer } from './WaveformVisualizer';
import { useRef } from 'react';

interface VoiceRecorderStepProps {
  isRecording: boolean;
  elapsedSeconds: number;
  analyserNode: AnalyserNode | null;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  minDuration: number;
  maxDuration: number;
  onFallbackFile?: (file: File) => void;
}

/**
 * Presentational component for the recording step.
 *
 * The `useVoiceRecorder` hook is owned by the parent (`VoiceImprintFlow`)
 * so `startRecording()` — and therefore the underlying
 * `navigator.mediaDevices.getUserMedia()` call — can be fired synchronously
 * from the EntryScreen button's click handler. Mobile browsers (notably
 * iOS Safari) only display the microphone permission prompt when the
 * request originates from a live user gesture.
 *
 * As a belt-and-suspenders fallback we also render a "Tap to begin"
 * button here whenever recording has not started yet (no elapsed time
 * and not currently recording). Clicking it re-invokes `startRecording`
 * from a fresh user gesture — recovering gracefully in the (rare) cases
 * where the first attempt was dropped or an earlier permission dialog
 * was dismissed without granting access.
 */
export function VoiceRecorderStep({
  isRecording,
  elapsedSeconds,
  analyserNode,
  error,
  startRecording,
  stopRecording,
  minDuration,
  maxDuration,
  onFallbackFile,
}: VoiceRecorderStepProps) {
  const stopDisabled = elapsedSeconds < minDuration;
  const notYetStarted = !isRecording && elapsedSeconds === 0;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFallbackFile) {
      onFallbackFile(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-6 w-full max-w-sm mx-auto">
      <WaveformVisualizer analyserNode={analyserNode} isActive={isRecording} />

      <p className="text-foreground text-lg font-mono tabular-nums">
        {elapsedSeconds} / {maxDuration}s
      </p>

      {notYetStarted ? (
        <button
          type="button"
          onClick={startRecording}
          className="px-8 py-3 rounded-full font-medium text-sm transition-all duration-200
            active:scale-95 bg-primary-600 text-foreground shadow-glow-sm
            hover:bg-primary-500 hover:shadow-glow-md"
        >
          {t('vi_start_recording')}
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          disabled={stopDisabled}
          className="px-8 py-3 rounded-full font-medium text-sm transition-all duration-200
            active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
            bg-red-600 text-foreground shadow-glow-sm
            hover:bg-red-500 hover:shadow-glow-md
            disabled:hover:bg-red-600 disabled:hover:shadow-glow-sm"
        >
          {t('vi_stop_recording')}
        </button>
      )}

      {error && (
        <div className="flex flex-col gap-4 mt-4 animate-fade-in w-full">
          <p className="text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50" role="alert">
            {error}
            <span className="block mt-2 text-red-300/80 text-xs">
              If you're using an in-app browser (like Instagram or WhatsApp), try opening this link in Chrome or Safari.
            </span>
          </p>

          {/* Native OS recorder fallback for Android WebViews that block getUserMedia */}
          {onFallbackFile && (
            <div className="mt-2">
              <input
                type="file"
                accept="audio/*"
                capture="user"
                id="native-audio-recorder"
                className="sr-only"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200
                  active:scale-95 bg-background-card border border-primary-500/30 text-primary-400 shadow-glow-sm
                  hover:bg-background-card/80 hover:shadow-glow-md flex flex-col items-center justify-center gap-1"
              >
                <span>Record via System App</span>
                <span className="text-xs text-primary-400/60 font-normal">Alternative method if browser blocked</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
