import { t } from '@/i18n/translations';

interface EntryScreenProps {
  onStart: () => void;
}

export function EntryScreen({ onStart }: EntryScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <h2 className="text-2xl font-bold text-primary-400 mb-3 drop-shadow-[0_0_12px_rgba(0,255,200,0.3)]">
        {t('vi_title')}
      </h2>

      <p className="text-foreground-muted text-sm mb-10">
        {t('vi_subtitle')}
      </p>

      <button
        type="button"
        onClick={onStart}
        className="px-8 py-3 rounded-full bg-primary-600 text-foreground font-medium text-sm
          shadow-glow-sm transition-all duration-200 hover:bg-primary-500 hover:shadow-glow-md
          active:scale-95"
      >
        {t('vi_start_recording')}
      </button>
    </div>
  );
}
