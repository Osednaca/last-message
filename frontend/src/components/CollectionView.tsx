import { useCollection } from '@/hooks/useCollection';
import { messages } from '@/data/messages';
import { t } from '@/i18n/translations';
import type { Category, Message } from '@/types';

/** Simple emoji icons per category. */
const categoryIcons: Record<Category, string> = {
  water: '💧',
  air: '🌬️',
  fauna: '🦁',
  consumption: '🛒',
  energy: '⚡',
};

/** All messages flattened with their category attached. */
function getAllMessages(): Array<{ message: Message; category: Category }> {
  const categories = Object.keys(messages) as Category[];
  return categories.flatMap((category) =>
    messages[category].map((message) => ({ message, category })),
  );
}

/** Format an ISO timestamp into a short readable date string. */
function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function CollectionView() {
  const { isDiscovered, getCollection } = useCollection();
  const collection = getCollection();
  const allMessages = getAllMessages();

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-primary-400 mb-6 text-center">
        {t('collection_title')}
      </h2>

      <p className="text-foreground-muted text-sm text-center mb-6">
        {collection.length} / {allMessages.length}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {allMessages.map(({ message, category }) => {
          const discovered = isDiscovered(message.id);
          const record = discovered
            ? collection.find((r) => r.messageId === message.id)
            : undefined;

          return discovered ? (
            <div
              key={message.id}
              data-testid="discovered-card"
              className="bg-background-card border border-border rounded-xl p-4 flex flex-col gap-2 shadow-glow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" role="img" aria-label={category}>
                  {categoryIcons[category]}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">
                  {category}
                </span>
              </div>
              <p className="text-foreground text-sm line-clamp-3 leading-relaxed">
                {message.text}
              </p>
              {record && (
                <span className="text-foreground-dim text-xs mt-auto">
                  {formatTimestamp(record.discoveredAt)}
                </span>
              )}
            </div>
          ) : (
            <div
              key={message.id}
              data-testid="locked-card"
              className="bg-background-card/50 border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 opacity-60"
            >
              <span className="text-2xl" role="img" aria-label="locked">
                🔒
              </span>
              <span className="text-foreground-muted text-sm font-medium">
                {t('collection_locked')}
              </span>
              <span className="text-foreground-dim text-xs uppercase tracking-wider">
                {category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
