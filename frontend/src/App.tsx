import { useRef, useState } from 'react';
import { Camera } from '@/components/Camera';
import { CollectionView } from '@/components/CollectionView';
import { HomeScreen } from '@/components/HomeScreen';
import { LegacyRecorder } from '@/components/LegacyRecorder';
import { VoiceImprintFlow } from '@/components/VoiceImprintFlow';
import { ScanOrchestrator } from '@/components/ScanOrchestrator';
import { t } from '@/i18n/translations';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showHome, setShowHome] = useState(true);
  const [showCollection, setShowCollection] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [legacyTab, setLegacyTab] = useState<'text' | 'voice'>('text');

  if (showHome) {
    return (
      <HomeScreen
        onStartScanning={() => setShowHome(false)}
        onLeaveMessage={() => {
          setShowHome(false);
          setShowLegacy(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Fullscreen camera background */}
      <Camera ref={videoRef} />

      {/* Scan orchestrator (overlay + scan button) */}
      <ScanOrchestrator videoRef={videoRef} />

      {/* Navigation controls at top of screen */}
      <div className="fixed top-4 left-0 right-0 z-30 flex justify-center gap-4 px-4">
        <button
          type="button"
          onClick={() => {
            setShowHome(true);
            setShowCollection(false);
            setShowLegacy(false);
          }}
          className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-background-card/80 text-foreground-muted border border-border hover:bg-background-card hover:text-foreground hover:shadow-glow-sm"
        >
          {t('nav_home')}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowCollection((prev) => !prev);
            setShowLegacy(false);
          }}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
            ${showCollection
              ? 'bg-primary-600 text-foreground shadow-glow-sm'
              : 'bg-background-card/80 text-foreground-muted border border-border hover:bg-background-card hover:text-foreground hover:shadow-glow-sm'
            }`}
        >
          {t('nav_collection')}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowLegacy((prev) => !prev);
            setShowCollection(false);
          }}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
            ${showLegacy
              ? 'bg-primary-600 text-foreground shadow-glow-sm'
              : 'bg-background-card/80 text-foreground-muted border border-border hover:bg-background-card hover:text-foreground hover:shadow-glow-sm'
            }`}
        >
          {t('nav_legacy')}
        </button>
      </div>

      {/* Collection overlay */}
      {showCollection && (
        <div className="fixed inset-0 z-25 bg-background-overlay animate-fade-in flex flex-col items-center pt-20 px-6 overflow-y-auto pb-10">
          <CollectionView />
        </div>
      )}

      {/* Legacy Mode overlay */}
      {showLegacy && (
        <div className="fixed inset-0 z-25 bg-background-overlay animate-fade-in flex flex-col items-center pt-20 px-6 overflow-y-auto pb-10">
          {/* Legacy tab switcher */}
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setLegacyTab('text')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${legacyTab === 'text'
                  ? 'bg-primary-600 text-foreground shadow-glow-sm'
                  : 'bg-background-card/80 text-foreground-muted border border-border hover:bg-background-card hover:text-foreground hover:shadow-glow-sm'
                }`}
            >
              {t('vi_tab_text')}
            </button>
            <button
              type="button"
              onClick={() => setLegacyTab('voice')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${legacyTab === 'voice'
                  ? 'bg-primary-600 text-foreground shadow-glow-sm'
                  : 'bg-background-card/80 text-foreground-muted border border-border hover:bg-background-card hover:text-foreground hover:shadow-glow-sm'
                }`}
            >
              {t('vi_tab_voice')}
            </button>
          </div>

          {legacyTab === 'text' ? <LegacyRecorder /> : <VoiceImprintFlow />}
        </div>
      )}
    </div>
  );
}

export default App;
