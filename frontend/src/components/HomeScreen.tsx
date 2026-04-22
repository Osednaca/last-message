import { useState, useEffect, useCallback } from 'react';
import { useAudio } from '@/hooks/useAudio';
import { useHomeSound } from '@/hooks/useHomeSound';

export type HomeScreenPhase = 'intro' | 'prompted' | 'activated' | 'exiting';

export interface HomeScreenProps {
  onStartScanning: () => void;
  onLeaveMessage: () => void;
}

/**
 * Interactive Home Screen — the application's entry point.
 *
 * Implements a 4-phase state machine:
 *   intro → prompted → activated → exiting
 *
 * Each phase controls what is visible and which animations play.
 */
export function HomeScreen({ onStartScanning, onLeaveMessage }: HomeScreenProps) {
  const [phase, setPhase] = useState<HomeScreenPhase>('intro');
  const [showGlitch, setShowGlitch] = useState(false);

  // Ambient sound auto-starts on mount (or on first user interaction if
  // the browser blocks autoplay) — see useHomeSound.
  const { startAmbient, stopAmbient } = useHomeSound();
  const { init } = useAudio();

  // Transition from intro → prompted after ~1.5s
  useEffect(() => {
    if (phase !== 'intro') return;
    const timer = setTimeout(() => setPhase('prompted'), 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Handle the exiting phase: the callback was already fired synchronously
  // in handleAction (required for mobile gesture context). This effect is
  // intentionally empty — the CSS transition runs visually while the parent
  // component handles the navigation.

  // User taps the prompt text → activate
  const handlePromptTap = useCallback(() => {
    if (phase !== 'prompted') return;

    init();
    startAmbient();

    // Brief glitch effect
    setShowGlitch(true);
    setTimeout(() => {
      setShowGlitch(false);
      setPhase('activated');
    }, 600);
  }, [phase, init, startAmbient]);

  // User taps an action button → begin exit
  // The callback is fired SYNCHRONOUSLY within the click handler so that
  // downstream getUserMedia / video.play() calls retain the user-gesture
  // context on mobile browsers. Deferring via setTimeout (as the exit
  // animation originally did) causes iOS Safari and mobile Chrome to treat
  // the subsequent media requests as non-user-initiated, resulting in
  // silent camera feeds and denied microphone prompts.
  const handleAction = useCallback(
    (callback: () => void) => {
      if (phase !== 'activated') return;
      stopAmbient();
      setPhase('exiting');
      // Fire immediately so the parent can mount Camera / VoiceImprintFlow
      // while the exit CSS transition plays.
      callback();
    },
    [phase, stopAmbient],
  );

  const isExiting = phase === 'exiting';

  return (
    <div
      data-testid="home-screen"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        opacity: isExiting ? 0 : 1,
        filter: isExiting ? 'blur(8px)' : 'none',
        transition: 'opacity 500ms ease, filter 500ms ease',
      }}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, var(--color-background) 0%, var(--color-primary-900) 25%, var(--color-background-dark) 50%, var(--color-teal-900) 75%, var(--color-background) 100%)',
          backgroundSize: '400% 400%',
          animation: 'homeGradientShift 12s ease-in-out infinite',
        }}
      />

      {/* Glassmorphism overlay */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center text-center px-8 py-16 rounded-2xl max-w-md w-full mx-4 ${showGlitch ? 'animate-glitch' : ''}`}
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(6, 10, 8, 0.7)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Title */}
        <h1
          className="text-4xl font-bold tracking-widest text-foreground mb-3"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          LAST MESSAGE
        </h1>

        {/* Subtitle */}
        <p className="text-foreground-muted text-sm tracking-wide mb-10">
          Echoes from the future are still around you
        </p>

        {/* Interactive prompt — visible in prompted phase and beyond */}
        <div
          data-testid="interactive-prompt"
          role="button"
          tabIndex={phase === 'prompted' ? 0 : -1}
          onClick={handlePromptTap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handlePromptTap();
          }}
          className="mb-10 cursor-pointer select-none"
          style={{
            opacity: phase === 'intro' ? 0 : 1,
            transition: 'opacity 800ms ease',
            pointerEvents: phase === 'prompted' ? 'auto' : 'none',
          }}
        >
          <span className="text-primary-400 text-sm tracking-wider animate-pulse">
            Tap to initialize connection
          </span>
        </div>

        {/* Action Panel — visible in activated phase */}
        <div
          data-testid="action-panel"
          className="flex flex-col gap-4 w-full"
          style={{
            opacity: phase === 'activated' || phase === 'exiting' ? 1 : 0,
            transform:
              phase === 'activated' || phase === 'exiting'
                ? 'translateY(0)'
                : 'translateY(12px)',
            transition: 'opacity 500ms ease, transform 500ms ease',
            pointerEvents: phase === 'activated' ? 'auto' : 'none',
          }}
        >
          <button
            type="button"
            data-testid="btn-start-scanning"
            onClick={() => handleAction(onStartScanning)}
            className="px-8 py-3 rounded-full text-sm font-semibold tracking-wider bg-primary-600 text-foreground shadow-glow-sm transition-transform duration-150 active:scale-95 hover:shadow-glow-md"
          >
            Start Scanning
          </button>
          <button
            type="button"
            data-testid="btn-leave-message"
            onClick={() => handleAction(onLeaveMessage)}
            className="px-8 py-3 rounded-full text-sm font-semibold tracking-wider bg-primary-600 text-foreground shadow-glow-sm transition-transform duration-150 active:scale-95 hover:shadow-glow-md"
          >
            Leave a Message
          </button>
        </div>
      </div>

      {/* Keyframe for the background gradient animation */}
      <style>{`
        @keyframes homeGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
