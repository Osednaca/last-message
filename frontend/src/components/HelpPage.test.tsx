import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpPage } from './HelpPage';

// ---------------------------------------------------------------------------
// Helper — renders the component with sensible defaults that individual tests
// can override.
// ---------------------------------------------------------------------------

function renderHelpPage(overrides: Partial<{ onBack: () => void }> = {}) {
  const props = {
    onBack: vi.fn(),
    ...overrides,
  };

  const result = render(<HelpPage {...props} />);
  return { ...result, onBack: props.onBack };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HelpPage', () => {
  it('renders all four content sections: "What is this", "How to use", "Legacy Mode", "Tips"', () => {
    renderHelpPage();

    expect(screen.getByText('What is this')).toBeInTheDocument();
    expect(screen.getByText('How to use')).toBeInTheDocument();
    expect(screen.getByText('Legacy Mode')).toBeInTheDocument();
    expect(screen.getByText('Tips')).toBeInTheDocument();
  });

  it('each section is inside a glass-styled card', () => {
    renderHelpPage();

    const sectionTitles = ['What is this', 'How to use', 'Legacy Mode', 'Tips'];

    for (const title of sectionTitles) {
      const heading = screen.getByText(title);
      // The heading's parent <section> element is the glass card
      const card = heading.closest('section');
      expect(card).not.toBeNull();
      expect(card!.style.backdropFilter).toBe('blur(12px)');
      expect(card!.style.borderRadius).toBe('12px');
      expect(card!.style.border).toContain('1px solid');
    }
  });

  it('renders a back button with ArrowLeft icon', () => {
    renderHelpPage();

    const backButton = screen.getByRole('button', { name: 'Go back' });
    expect(backButton).toBeInTheDocument();
    // The button should contain an SVG (the ArrowLeft icon from lucide-react)
    const svg = backButton.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('calls onBack when back button is clicked', () => {
    const { onBack } = renderHelpPage();

    const backButton = screen.getByRole('button', { name: 'Go back' });
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('page container has scrollable overflow', () => {
    renderHelpPage();

    const container = screen.getByTestId('help-page');
    expect(container.style.overflowY).toBe('auto');
  });

  it('uses dark background and neon green accent colors', () => {
    renderHelpPage();

    // Container uses the dark background color
    const container = screen.getByTestId('help-page');
    expect(container.style.backgroundColor).toBe('var(--color-background)');

    // Section headings use the neon green accent color
    const heading = screen.getByText('What is this');
    expect(heading.style.color).toBe('var(--color-primary-400)');
  });
});
