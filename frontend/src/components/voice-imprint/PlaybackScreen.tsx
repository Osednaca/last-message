import { useState, useCallback } from 'react';
import { t } from '@/i18n/translations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { NarrativeOverlay } from './NarrativeOverlay';

type Phase = 'narrative' | 'playing' | 'done';

interface PlaybackScreenProps {
  audioData: string;
  messageText: string;
  onReplay: () => void;
  onSave: () => void;
  onRetry: () => void;
  showSave: boolean;
}

export function PlaybackScreen({
  audioData,
  messageText,
  onReplay,
  onSave,
  onRetry,
  showSave,
}: PlaybackScreenProps) {
  const [phase, setPhase] = useState<Phase>('narrative');

  const audioPlayer = useAudioPlayer({
    onEnd: () => setPhase('done'),
  });

  const handleNarrativeComplete = useCallback(() => {
    setPhase('playing');
    audioPlayer.play(audioData);
  }, [audioPlayer, audioData]);

  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 min-h-[300px]
        bg-background-overlay rounded-xl
        ${phase === 'playing' ? 'shadow-[0_0_40px_rgba(0,255,200,0.15)] animate-pulse-glow' : ''}`}
    >
      {/* Narrative overlay phase */}
      {phase === 'narrative' && (
        <NarrativeOverlay onComplete={handleNarrativeComplete} />
      )}

      {/* Playing phase */}
      {phase === 'playing' && !audioPlayer.error && (
        <p
          className="text-primary-400 text-lg font-mono animate-pulse
            drop-shadow-[0_0_8px_rgba(0,255,200,0.4)]"
          role="status"
          aria-live="polite"
        >
          {t('vi_narrative_playing')}
        </p>
      )}

      {/* Audio error fallback — show message text */}
      {audioPlayer.error && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-foreground text-base max-w-xs leading-relaxed">
            {messageText}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="px-6 py-2 rounded-full bg-primary-600 text-foreground font-medium text-sm
              shadow-glow-sm transition-all duration-200 hover:bg-primary-500 hover:shadow-glow-md
              active:scale-95"
          >
            {t('vi_retry')}
          </button>
        </div>
      )}

      {/* Done phase — show action buttons */}
      {phase === 'done' && !audioPlayer.error && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onReplay}
            className="px-8 py-3 rounded-full bg-primary-600 text-foreground font-medium text-sm
              shadow-glow-sm transition-all duration-200 hover:bg-primary-500 hover:shadow-glow-md
              active:scale-95"
          >
            {t('vi_replay')}
          </button>

          {showSave && (
            <button
              type="button"
              onClick={onSave}
              className="px-8 py-3 rounded-full bg-cyan-600 text-foreground font-medium text-sm
                shadow-glow-sm transition-all duration-200 hover:bg-cyan-500 hover:shadow-glow-md
                active:scale-95"
            >
              {t('vi_save_imprint')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
