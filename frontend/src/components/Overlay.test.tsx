import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Overlay } from './Overlay';

describe('Overlay', () => {
  // Requirement 7.2: Idle state text
  it('renders "Point your camera at an object" in Idle state', () => {
    render(<Overlay state="idle" />);
    expect(
      screen.getByText('Point your camera at an object')
    ).toBeInTheDocument();
  });

  // Requirement 7.3: Scanning state text
  it('renders "Analyzing environment..." in Scanning state', () => {
    render(<Overlay state="scanning" />);
    expect(
      screen.getByText('Analyzing environment...')
    ).toBeInTheDocument();
  });

  // Requirement 7.4: Detected state text, object label, and message prompt
  it('renders "Signal detected", object label, and "Message from the future available" in Detected state', () => {
    render(
      <Overlay state="detected" objectLabel="bottle" />
    );
    expect(screen.getByText('Signal detected')).toBeInTheDocument();
    expect(screen.getByText('bottle')).toBeInTheDocument();
    expect(
      screen.getByText('Message from the future available')
    ).toBeInTheDocument();
  });

  // Requirement 7.5: Playing state text and message content
  it('renders "Transmitting message..." and message text in Playing state', () => {
    render(
      <Overlay state="playing" messageText="The rivers remember what you forgot." />
    );
    expect(
      screen.getByText('Transmitting message...')
    ).toBeInTheDocument();
    expect(
      screen.getByText('The rivers remember what you forgot.')
    ).toBeInTheDocument();
  });

  // Requirement 7.6 / 8.4: fade-in class on content wrapper
  it('applies animate-fade-in class on the content wrapper', () => {
    const { container } = render(<Overlay state="idle" />);
    const wrapper = container.querySelector('.animate-fade-in');
    expect(wrapper).toBeInTheDocument();
  });

  // Requirement 8.1: glitch effect in Detected state
  it('applies animate-glitch class in Detected state', () => {
    const { container } = render(
      <Overlay state="detected" objectLabel="tree" />
    );
    const glitchEl = container.querySelector('.animate-glitch');
    expect(glitchEl).toBeInTheDocument();
  });

  // Requirement 8.2: backdrop blur in Playing state
  it('applies backdrop-blur-playing class in Playing state', () => {
    const { container } = render(<Overlay state="playing" />);
    const blurEl = container.querySelector('.backdrop-blur-playing');
    expect(blurEl).toBeInTheDocument();
  });

  // Requirement 8.3: pulsing gradient in Playing state
  it('applies animate-pulse-gradient class in Playing state', () => {
    const { container } = render(<Overlay state="playing" />);
    const gradientEl = container.querySelector('.animate-pulse-gradient');
    expect(gradientEl).toBeInTheDocument();
  });

  // Requirement 6.2: pulsing glow in Playing state
  it('applies animate-pulse-glow class in Playing state', () => {
    const { container } = render(<Overlay state="playing" />);
    const glowEl = container.querySelector('.animate-pulse-glow');
    expect(glowEl).toBeInTheDocument();
  });
});
