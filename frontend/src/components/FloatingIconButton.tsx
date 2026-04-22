import type { ReactNode } from 'react';

export interface FloatingIconButtonProps {
  /** The lucide-react icon element to render inside the button */
  icon: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Fixed position: bottom-left or bottom-right of the viewport */
  position: 'left' | 'right';
  /** Accessible label for screen readers */
  ariaLabel: string;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * A reusable circular floating button with glass effect and neon glow.
 *
 * Renders at a fixed position in the viewport — bottom-left or bottom-right —
 * with a frosted-glass background, neon green border/shadow, and a subtle
 * scale-down animation on tap.
 */
export function FloatingIconButton({
  icon,
  onClick,
  position,
  ariaLabel,
  className = '',
}: FloatingIconButtonProps) {
  const positionStyles: React.CSSProperties =
    position === 'left'
      ? { bottom: 24, left: 24 }
      : { bottom: 24, right: 24 };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`active:scale-95 shadow-glow-sm hover:shadow-glow-md ${className}`}
      style={{
        position: 'fixed',
        ...positionStyles,
        zIndex: 90,
        width: 48,
        height: 48,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border-glow)',
        color: 'var(--color-primary-400)',
        fontSize: 22,
        cursor: 'pointer',
        padding: 0,
        transition: 'transform 150ms ease, box-shadow 150ms ease',
      }}
    >
      {icon}
    </button>
  );
}
