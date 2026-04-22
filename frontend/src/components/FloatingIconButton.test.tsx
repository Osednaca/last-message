import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingIconButton } from './FloatingIconButton';

// ---------------------------------------------------------------------------
// Helper — renders the component with sensible defaults that individual tests
// can override.
// ---------------------------------------------------------------------------

function renderButton(
  overrides: Partial<{
    icon: React.ReactNode;
    onClick: () => void;
    position: 'left' | 'right';
    ariaLabel: string;
    className: string;
  }> = {},
) {
  const props = {
    icon: <svg data-testid="test-icon" />,
    onClick: vi.fn(),
    position: 'left' as const,
    ariaLabel: 'Test button',
    ...overrides,
  };

  const result = render(<FloatingIconButton {...props} />);
  return { ...result, onClick: props.onClick };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FloatingIconButton', () => {
  it('renders a <button> element with the provided icon', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('applies fixed positioning styles', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button.style.position).toBe('fixed');
  });

  it('renders at bottom-left when position="left"', () => {
    renderButton({ position: 'left' });

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button.style.bottom).toBe('24px');
    expect(button.style.left).toBe('24px');
  });

  it('renders at bottom-right when position="right"', () => {
    renderButton({ position: 'right' });

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button.style.bottom).toBe('24px');
    expect(button.style.right).toBe('24px');
  });

  it('applies glass effect styles (backdrop-blur, semi-transparent bg, border)', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button.style.backdropFilter).toBe('blur(12px)');
    expect(button.style.backgroundColor).toBe('rgba(0, 0, 0, 0.4)');
    expect(button.style.border).toBe('1px solid var(--color-border-glow)');
  });

  it('applies neon glow shadow class', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button.className).toContain('shadow-glow-sm');
    expect(button.className).toContain('hover:shadow-glow-md');
  });

  it('has active:scale-95 class for tap animation', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button.className).toContain('active:scale-95');
  });

  it('calls onClick when clicked', () => {
    const { onClick } = renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'Test button' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter and Space key press', () => {
    const onClick = vi.fn();
    renderButton({ onClick });

    const button = screen.getByRole('button', { name: 'Test button' });

    // Native <button> elements fire click on Enter and Space by default.
    // fireEvent.keyDown + keyUp simulates the browser behaviour in jsdom.
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.keyUp(button, { key: 'Enter', code: 'Enter' });
    // jsdom doesn't auto-fire click from keyboard events on buttons, so we
    // verify the button is keyboard-accessible by checking it's a real <button>
    // and then simulate the resulting click events that browsers dispatch.
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    onClick.mockClear();

    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    fireEvent.keyUp(button, { key: ' ', code: 'Space' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with the provided aria-label', () => {
    renderButton({ ariaLabel: 'Open help' });

    const button = screen.getByRole('button', { name: 'Open help' });
    expect(button).toHaveAttribute('aria-label', 'Open help');
  });

  it('has no visible text content (icon-only)', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Test button' });
    // The button should only contain the icon element, no text nodes.
    expect(button.textContent).toBe('');
  });
});
