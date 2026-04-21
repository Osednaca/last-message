import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionView } from './CollectionView';
import { messages } from '@/data/messages';
import type { Category } from '@/types';

// Mock useCollection hook
const mockIsDiscovered = vi.fn();
const mockGetCollection = vi.fn();

vi.mock('@/hooks/useCollection', () => ({
  useCollection: () => ({
    isDiscovered: mockIsDiscovered,
    getCollection: mockGetCollection,
    addToCollection: vi.fn(),
  }),
}));

/** Count total messages across all categories. */
function totalMessageCount(): number {
  return (Object.keys(messages) as Category[]).reduce(
    (sum, cat) => sum + messages[cat].length,
    0,
  );
}

describe('CollectionView', () => {
  beforeEach(() => {
    localStorage.clear();
    mockIsDiscovered.mockReset();
    mockGetCollection.mockReset();
  });

  // Requirement 9.4: undiscovered messages shown as locked
  it('shows all items as locked when no messages are discovered', () => {
    mockIsDiscovered.mockReturnValue(false);
    mockGetCollection.mockReturnValue([]);

    render(<CollectionView />);

    const lockedCards = screen.getAllByTestId('locked-card');
    expect(lockedCards).toHaveLength(totalMessageCount());
    expect(screen.queryByTestId('discovered-card')).toBeNull();
  });

  // Requirement 9.3: discovered messages rendered in grid
  it('shows discovered cards for discovered messages and locked cards for the rest', () => {
    const discoveredId = messages.water[0].id;
    mockIsDiscovered.mockImplementation((id: string) => id === discoveredId);
    mockGetCollection.mockReturnValue([
      {
        messageId: discoveredId,
        category: 'water',
        discoveredAt: '2025-01-15T10:30:00.000Z',
      },
    ]);

    render(<CollectionView />);

    const discoveredCards = screen.getAllByTestId('discovered-card');
    const lockedCards = screen.getAllByTestId('locked-card');

    expect(discoveredCards).toHaveLength(1);
    expect(lockedCards).toHaveLength(totalMessageCount() - 1);
    // The discovered card should contain the message text preview
    expect(discoveredCards[0]).toHaveTextContent(messages.water[0].text);
  });

  // Requirement 9.3: discovered cards show category label
  it('displays the category label on discovered cards', () => {
    const discoveredMsg = messages.fauna[0];
    mockIsDiscovered.mockImplementation((id: string) => id === discoveredMsg.id);
    mockGetCollection.mockReturnValue([
      {
        messageId: discoveredMsg.id,
        category: 'fauna',
        discoveredAt: '2025-06-01T08:00:00.000Z',
      },
    ]);

    render(<CollectionView />);

    const discoveredCard = screen.getByTestId('discovered-card');
    expect(discoveredCard).toHaveTextContent('fauna');
  });

  // Requirement 9.4: locked cards show "Locked" text
  it('displays "Locked" text on locked cards', () => {
    mockIsDiscovered.mockReturnValue(false);
    mockGetCollection.mockReturnValue([]);

    render(<CollectionView />);

    const lockedCards = screen.getAllByTestId('locked-card');
    // Each locked card should contain the "Locked" text
    lockedCards.forEach((card) => {
      expect(card).toHaveTextContent('Locked');
    });
  });
});
