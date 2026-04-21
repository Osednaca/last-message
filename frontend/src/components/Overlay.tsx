import type { OverlayState } from '@/types';
import { t } from '@/i18n/translations';

interface OverlayProps {
  state: OverlayState;
  objectLabel?: string;
  messageText?: string;
}

export function Overlay({ state, objectLabel, messageText }: OverlayProps) {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
      {/* Backdrop blur overlay during Playing state */}
      {state === 'playing' && (
        <div className="absolute inset-0 backdrop-blur-playing animate-fade-in" />
      )}

      {/* Pulsing gradient background during Playing state */}
      {state === 'playing' && (
        <div className="absolute inset-0 animate-pulse-gradient animate-fade-in" />
      )}

      <div key={state} className="animate-fade-in text-center px-6 relative z-10">
        {state === 'idle' && (
          <p className="text-foreground-muted text-lg">
            {t('overlay_idle')}
          </p>
        )}

        {state === 'scanning' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-primary-400 text-lg">
              {t('overlay_scanning')}
            </p>
          </div>
        )}

        {state === 'detected' && (
          <div className="flex flex-col items-center gap-2 animate-glitch">
            <p className="text-cyan-400 text-xl font-bold">
              {t('overlay_detected')}
            </p>
            {objectLabel && (
              <p className="text-foreground text-lg">{objectLabel}</p>
            )}
            <p className="text-primary-300 text-sm mt-1">
              {t('overlay_detected_message')}
            </p>
          </div>
        )}

        {state === 'playing' && (
          <div className="flex flex-col items-center gap-3 animate-pulse-glow rounded-xl p-6">
            <p className="text-cyan-300 text-lg">
              {t('overlay_playing')}
            </p>
            {messageText && (
              <p className="text-foreground text-base max-w-md leading-relaxed mt-2">
                {messageText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
