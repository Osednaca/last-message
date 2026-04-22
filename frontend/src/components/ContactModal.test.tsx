import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ContactModal } from './ContactModal';

// ---------------------------------------------------------------------------
// Helper — renders the modal with sensible defaults that individual tests
// can override.
// ---------------------------------------------------------------------------

function renderModal(overrides: Partial<{ isOpen: boolean; onClose: () => void }> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    ...overrides,
  };

  const result = render(<ContactModal {...props} />);
  return { ...result, onClose: props.onClose };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContactModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.innerHTML).toBe('');
  });

  it('renders when isOpen is true', () => {
    renderModal({ isOpen: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays "Contact" heading', () => {
    renderModal();
    const heading = screen.getByRole('heading', { name: 'Contact' });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2');
  });

  it('displays "Oscar Navas"', () => {
    renderModal();
    expect(screen.getByText('Oscar Navas')).toBeInTheDocument();
  });

  it('displays "Navium"', () => {
    renderModal();
    expect(screen.getByText('Navium')).toBeInTheDocument();
  });

  it('displays email as a mailto: link with correct href', () => {
    renderModal();
    const emailLink = screen.getByRole('link', { name: 'on.navas@gmail.com' });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:on.navas@gmail.com');
  });

  it('email link uses neon green color', () => {
    renderModal();
    const emailLink = screen.getByRole('link', { name: 'on.navas@gmail.com' });
    expect(emailLink.style.color).toBe('var(--color-primary-400)');
  });

  it('has role="dialog", aria-modal="true", aria-labelledby', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'contact-modal-title');
  });

  it('close button with X icon is present', () => {
    renderModal();
    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderModal();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    // handleClose uses a 200ms setTimeout before calling onClose
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const { onClose } = renderModal();

    const dialog = screen.getByRole('dialog');
    // Click directly on the backdrop (e.target === e.currentTarget)
    fireEvent.click(dialog);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(document, { key: 'Escape' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside modal content', () => {
    const { onClose } = renderModal();

    // Click on the heading text inside the modal content
    const heading = screen.getByText('Contact');
    fireEvent.click(heading);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('glass effect styling on modal container', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    // The inner glass card is the second child div (modalContentRef)
    const glassCard = dialog.firstElementChild as HTMLElement;

    expect(glassCard.style.backgroundColor).toBe('rgba(15, 26, 21, 0.9)');
    expect(glassCard.style.backdropFilter).toBe('blur(12px)');
    expect(glassCard.style.border).toBe('1px solid var(--color-primary-400)');
  });

  it('max-width constraint for responsive layout', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    const glassCard = dialog.firstElementChild as HTMLElement;

    // Inline style maxWidth
    expect(glassCard.style.maxWidth).toBe('400px');
    // Tailwind responsive classes
    expect(glassCard.className).toContain('max-w-[90vw]');
    expect(glassCard.className).toContain('sm:max-w-[400px]');
  });
});
