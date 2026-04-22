import { useEffect, useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';

export interface ContactModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * A centered overlay dialog displaying contact information.
 *
 * Features a glass-effect card with neon green border, focus trap,
 * Escape-to-close, backdrop-click-to-close, and fade+scale animation.
 */
export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsVisible(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Handle open state: trigger visibility and focus
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      // Focus the close button after render
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Keydown handler for Escape and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Focus trap: Tab / Shift+Tab cycles within modal
      if (e.key === 'Tab') {
        const modal = modalContentRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isVisible && !isOpen) return null;

  const animationStyle: React.CSSProperties = isClosing
    ? { opacity: 0, transform: 'scale(0.95)', transition: 'opacity 200ms ease, transform 200ms ease' }
    : { opacity: 1, transform: 'scale(1)', transition: 'opacity 200ms ease, transform 200ms ease' };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={modalContentRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          padding: '32px 28px 28px',
          borderRadius: 16,
          backgroundColor: 'rgba(15, 26, 21, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--color-primary-400)',
          boxShadow: 'var(--shadow-glow-md)',
          ...animationStyle,
        }}
        className="max-w-[90vw] sm:max-w-[400px]"
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            color: 'var(--color-foreground-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground-muted)';
          }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2
          id="contact-modal-title"
          style={{
            margin: '0 0 20px 0',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--color-primary-400)',
          }}
        >
          Contact
        </h2>

        {/* Contact details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              color: 'var(--color-foreground)',
              fontWeight: 500,
            }}
          >
            Oscar Navas
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--color-foreground-muted)',
            }}
          >
            Navium
          </p>
          <a
            href="mailto:on.navas@gmail.com"
            style={{
              color: 'var(--color-primary-400)',
              fontSize: 14,
              textDecoration: 'none',
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = '1';
            }}
          >
            on.navas@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}
