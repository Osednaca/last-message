import { useState } from 'react';

const MAX_LENGTH = 200;

export const DEFAULT_MESSAGES = [
  'I was here. Remember my voice.',
  'This is my echo, reaching across time.',
  'To whoever finds this — I existed.',
  'My voice carries forward what words alone cannot.',
  'Let this sound outlast the silence.',
];

interface MessageStepProps {
  onConfirm: (text: string) => void;
}

export function MessageStep({ onConfirm }: MessageStepProps) {
  const [text, setText] = useState('');

  const handleConfirm = () => {
    if (text.trim()) {
      onConfirm(text.trim());
    } else {
      const randomMessage =
        DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES.length)];
      onConfirm(randomMessage);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-6">
      <h3 className="text-lg font-semibold text-primary-400 drop-shadow-[0_0_12px_rgba(0,255,200,0.3)]">
        What should your voice say?
      </h3>

      <div className="w-full max-w-md">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={4}
          placeholder="Type your message or leave empty for a default…"
          className="w-full rounded-lg bg-background-secondary border border-primary-700/30
            text-foreground placeholder:text-foreground-muted/50 p-3 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
        />

        <p className="text-foreground-muted text-xs text-right mt-1">
          {text.length}/{MAX_LENGTH}
        </p>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        className="px-8 py-3 rounded-full bg-primary-600 text-foreground font-medium text-sm
          shadow-glow-sm transition-all duration-200 hover:bg-primary-500 hover:shadow-glow-md
          active:scale-95"
      >
        Confirm
      </button>
    </div>
  );
}
