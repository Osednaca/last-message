import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n/translations';

interface NarrativeOverlayProps {
  onComplete: () => void;
  showIntro?: boolean;
}

interface Step {
  key: string;
  duration: number;
  typewriter?: boolean;
}

const STEPS: Step[] = [
  { key: 'vi_narrative_signal', duration: 2000 },
  { key: 'vi_narrative_detected', duration: 2000 },
  { key: 'vi_narrative_playing', duration: 1500 },
];

const INTRO_STEP: Step = { key: 'vi_narrative_intro', duration: 3000, typewriter: true };

export function NarrativeOverlay({ onComplete, showIntro = false }: NarrativeOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState('');
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref fresh to avoid stale closures
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const allSteps = showIntro ? [INTRO_STEP, ...STEPS] : STEPS;
  const currentStep = allSteps[stepIndex] as Step | undefined;

  // Typewriter effect for intro step
  useEffect(() => {
    if (!currentStep?.typewriter) return;

    const fullText = t(currentStep.key);
    const charInterval = currentStep.duration / fullText.length;
    let charIndex = 0;

    setTypewriterText('');

    const intervalId = setInterval(() => {
      charIndex++;
      setTypewriterText(fullText.slice(0, charIndex));

      if (charIndex >= fullText.length) {
        clearInterval(intervalId);
      }
    }, charInterval);

    return () => clearInterval(intervalId);
  }, [currentStep]);

  // Advance through steps with timed transitions
  useEffect(() => {
    if (!currentStep) return;

    const timerId = setTimeout(() => {
      const nextIndex = stepIndex + 1;
      if (nextIndex < allSteps.length) {
        setStepIndex(nextIndex);
      } else {
        onCompleteRef.current();
      }
    }, currentStep.duration);

    return () => clearTimeout(timerId);
  }, [stepIndex, allSteps.length, currentStep]);

  if (!currentStep) return null;

  const displayText = currentStep.typewriter ? typewriterText : t(currentStep.key);

  return (
    <div className="flex items-center justify-center text-center px-6 py-12 min-h-[200px]">
      <p
        className="text-primary-400 text-lg font-mono animate-glitch-loop
          drop-shadow-[0_0_8px_rgba(0,255,200,0.4)]"
        role="status"
        aria-live="polite"
      >
        {displayText}
        {currentStep.typewriter && (
          <span className="inline-block w-[2px] h-[1em] bg-primary-400 ml-0.5 align-middle animate-pulse" />
        )}
      </p>
    </div>
  );
}
