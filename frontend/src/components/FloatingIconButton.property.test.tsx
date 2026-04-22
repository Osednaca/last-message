// Feature: help-contact-icons, Property 1: Aria-label passthrough
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { FloatingIconButton } from './FloatingIconButton';

afterEach(() => {
  cleanup();
});

fc.configureGlobal({ numRuns: 100 });

describe('Property 1: Aria-label passthrough', () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * For any string passed as the `ariaLabel` prop to FloatingIconButton,
   * the rendered `<button>` element's `aria-label` attribute SHALL equal
   * that exact string.
   */
  it('passes any ariaLabel string through to the button aria-label attribute', () => {
    fc.assert(
      fc.property(fc.string(), (ariaLabel: string) => {
        const { unmount } = render(
          <FloatingIconButton
            icon={<span>icon</span>}
            onClick={() => {}}
            position="left"
            ariaLabel={ariaLabel}
          />,
        );

        const button = screen.getByRole('button');
        expect(button.getAttribute('aria-label')).toBe(ariaLabel);

        unmount();
      }),
    );
  });
});
