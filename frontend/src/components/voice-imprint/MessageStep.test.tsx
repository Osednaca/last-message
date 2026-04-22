import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageStep, DEFAULT_MESSAGES } from './MessageStep';

describe('MessageStep', () => {
  it('renders textarea and confirm button', () => {
    render(<MessageStep onConfirm={() => {}} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('displays character counter starting at 0/200', () => {
    render(<MessageStep onConfirm={() => {}} />);

    expect(screen.getByText('0/200')).toBeInTheDocument();
  });

  it('updates character counter as user types', () => {
    render(<MessageStep onConfirm={() => {}} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    expect(screen.getByText('5/200')).toBeInTheDocument();
  });

  it('enforces maxLength of 200 on the textarea', () => {
    render(<MessageStep onConfirm={() => {}} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(200);
  });

  it('calls onConfirm with trimmed text when user types a message', () => {
    const onConfirm = vi.fn();
    render(<MessageStep onConfirm={onConfirm} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '  My legacy message  ' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledWith('My legacy message');
  });

  it('calls onConfirm with a default message when textarea is empty', () => {
    const onConfirm = vi.fn();
    render(<MessageStep onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const calledWith = onConfirm.mock.calls[0][0];
    expect(DEFAULT_MESSAGES).toContain(calledWith);
  });

  it('calls onConfirm with a default message when textarea has only whitespace', () => {
    const onConfirm = vi.fn();
    render(<MessageStep onConfirm={onConfirm} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const calledWith = onConfirm.mock.calls[0][0];
    expect(DEFAULT_MESSAGES).toContain(calledWith);
  });

  it('exports DEFAULT_MESSAGES with exactly 5 legacy-themed messages', () => {
    expect(DEFAULT_MESSAGES).toHaveLength(5);
    DEFAULT_MESSAGES.forEach((msg) => {
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});
