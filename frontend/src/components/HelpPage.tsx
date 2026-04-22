import { ArrowLeft } from 'lucide-react';
import { FloatingIconButton } from './FloatingIconButton';

export interface HelpPageProps {
  /** Callback to navigate back to the Home Screen */
  onBack: () => void;
}

const sections = [
  {
    title: 'What is this',
    content:
      'Last Message: Echoes from the Future is an augmented reality experience that lets you discover hidden messages left behind in the world around you. Point your camera at your surroundings and uncover echoes from another time.',
  },
  {
    title: 'How to use',
    content:
      'Tap "Start Scanning" on the home screen to activate your camera. Move your device around to scan the environment. When an echo is detected, the app will reveal the message and play its audio. You can browse all discovered messages in the Collection view.',
  },
  {
    title: 'Legacy Mode',
    content:
      'Use "Leave a Message" to record your own echo for the future. You can type a text message or use voice imprint to leave a spoken message. Your legacy will be stored and may be discovered by others.',
  },
  {
    title: 'Tips',
    content:
      'For the best experience, use the app in a well-lit environment. Move slowly and steadily when scanning. Make sure your device volume is turned up to hear the audio echoes. Try scanning different areas — echoes can be hidden anywhere.',
  },
];

/**
 * Full-screen Help page with informational content sections
 * displayed inside glass-styled cards.
 */
export function HelpPage({ onBack }: HelpPageProps) {
  return (
    <div
      data-testid="help-page"
      className="fixed inset-0 z-50 animate-fade-in"
      style={{
        backgroundColor: 'var(--color-background)',
        overflowY: 'auto',
      }}
    >
      {/* Back button */}
      <FloatingIconButton
        icon={<ArrowLeft size={22} />}
        onClick={onBack}
        position="left"
        ariaLabel="Go back"
      />

      {/* Content with top padding to clear the back button */}
      <div className="px-6 pt-24 pb-24 max-w-lg mx-auto flex flex-col gap-6">
        <h1
          className="text-2xl font-bold tracking-wider mb-2"
          style={{
            color: 'var(--color-foreground)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Help
        </h1>

        {sections.map((section) => (
          <section
            key={section.title}
            style={{
              backgroundColor: 'rgba(15, 26, 21, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '20px 24px',
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-primary-400)' }}
            >
              {section.title}
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              {section.content}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
