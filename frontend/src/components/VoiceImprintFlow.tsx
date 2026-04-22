import { useState, useCallback, useEffect } from 'react';
import { t } from '@/i18n/translations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { cloneVoice, generateLegacySpeech } from '@/api/client';
import type { VoiceImprintRecord } from '@/types';
import { EntryScreen } from './voice-imprint/EntryScreen';
import { VoiceRecorderStep } from './voice-imprint/VoiceRecorderStep';
import { MessageStep } from './voice-imprint/MessageStep';
import { PlaybackScreen } from './voice-imprint/PlaybackScreen';

const RECORDING_MIN_DURATION = 5;
const RECORDING_MAX_DURATION = 10;

type FlowStep = 'entry' | 'recording' | 'message' | 'processing' | 'playback';

const STORAGE_KEY = 'echoes-voice-imprints';

// --- localStorage helpers (exported for testing) ---

export function loadImprints(): VoiceImprintRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveImprints(records: VoiceImprintRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function deleteImprint(id: string): VoiceImprintRecord[] {
  const records = loadImprints().filter((r) => r.id !== id);
  saveImprints(records);
  return records;
}

// --- Timestamp formatter ---

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

// --- Component ---

export function VoiceImprintFlow() {
  const [step, setStep] = useState<FlowStep>('entry');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [messageText, setMessageText] = useState('');
  const [generatedAudio, setGeneratedAudio] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [savedImprints, setSavedImprints] = useState<VoiceImprintRecord[]>(loadImprints);
  const [hasSaved, setHasSaved] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const { play, stop, isPlaying } = useAudioPlayer({
    onEnd: () => setPlayingId(null),
  });

  // Sync playingId when audio stops externally
  useEffect(() => {
    if (!isPlaying) {
      setPlayingId(null);
    }
  }, [isPlaying]);

  // --- Voice recorder (lifted to this component so getUserMedia() is called
  // synchronously from within the EntryScreen button click. Mobile browsers
  // (iOS Safari in particular) reject mic permission requests that don't
  // originate directly from a user gesture — calling startRecording from a
  // useEffect in the child would not qualify.) ---
  const handleRecordingComplete = useCallback((blob: Blob) => {
    setAudioBlob(blob);
    setStep('message');
  }, []);

  const {
    startRecording,
    stopRecording,
    isRecording,
    elapsedSeconds,
    analyserNode,
    error: recorderError,
  } = useVoiceRecorder({
    minDuration: RECORDING_MIN_DURATION,
    maxDuration: RECORDING_MAX_DURATION,
    onComplete: handleRecordingComplete,
  });

  // --- Processing step: call cloneVoice API ---
  const processVoiceClone = useCallback(
    async (blob: Blob, text: string, currentRetryCount: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);

      try {
        const response = await cloneVoice(blob, text, controller.signal);
        clearTimeout(timeoutId);
        setGeneratedAudio(`data:audio/mpeg;base64,${response.audio_base64}`);
        setStep('playback');
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('[VoiceImprint] Clone failed:', err);
        if (currentRetryCount > 0) {
          // Fallback to default voice
          try {
            console.warn('[VoiceImprint] Falling back to default voice');
            const fallback = await generateLegacySpeech(text);
            setGeneratedAudio(`data:audio/mpeg;base64,${fallback.audio_base64}`);
            setStep('playback');
          } catch {
            // Even fallback failed — go back to recording
            setStep('recording');
          }
        } else {
          setRetryCount(1);
          setStep('recording');
        }
      }
    },
    [],
  );

  // Trigger processing when step changes to 'processing'
  useEffect(() => {
    if (step === 'processing' && audioBlob && messageText) {
      processVoiceClone(audioBlob, messageText, retryCount);
    }
  }, [step, audioBlob, messageText, retryCount, processVoiceClone]);

  // --- Step handlers ---

  const handleStart = useCallback(() => {
    // Kick off mic acquisition SYNCHRONOUSLY within the click handler so the
    // browser treats it as user-initiated and shows the permission prompt.
    // Do not await — getUserMedia is invoked synchronously inside
    // startRecording and the subsequent await does not affect gesture status.
    void startRecording();
    setStep('recording');
  }, [startRecording]);

  const handleMessageConfirm = useCallback((text: string) => {
    setMessageText(text);
    setStep('processing');
  }, []);

  const handleReplay = useCallback(() => {
    // Reset playback phase so NarrativeOverlay replays
    setStep('processing');
    // Immediately go to playback since we already have the audio
    setTimeout(() => setStep('playback'), 0);
  }, []);

  const handleSave = useCallback(() => {
    setStorageError(null);
    const record: VoiceImprintRecord = {
      id: crypto.randomUUID(),
      type: 'legacy_voice',
      text: messageText,
      audioData: generatedAudio,
      createdAt: new Date().toISOString(),
    };
    try {
      const updated = [...savedImprints, record];
      saveImprints(updated);
      setSavedImprints(updated);
      setHasSaved(true);
    } catch {
      // QuotaExceededError
      setStorageError(t('vi_storage_full'));
    }
  }, [messageText, generatedAudio, savedImprints]);

  const handleRetry = useCallback(() => {
    // Same rationale as handleStart: retrigger mic within the user gesture.
    void startRecording();
    setStep('recording');
  }, [startRecording]);

  // --- Saved imprints management ---

  const handlePlaySaved = useCallback(
    (record: VoiceImprintRecord) => {
      if (playingId === record.id) {
        stop();
        setPlayingId(null);
      } else {
        setPlayingId(record.id);
        play(record.audioData);
      }
    },
    [play, stop, playingId],
  );

  const handleDeleteSaved = useCallback((id: string) => {
    const updated = deleteImprint(id);
    setSavedImprints(updated);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Flow steps with fade transitions */}
      <div className="animate-fade-in" key={step}>
        {step === 'entry' && <EntryScreen onStart={handleStart} />}

        {step === 'recording' && (
          <VoiceRecorderStep
            isRecording={isRecording}
            elapsedSeconds={elapsedSeconds}
            analyserNode={analyserNode}
            error={recorderError}
            startRecording={() => void startRecording()}
            stopRecording={stopRecording}
            minDuration={RECORDING_MIN_DURATION}
            maxDuration={RECORDING_MAX_DURATION}
            onFallbackFile={(file) => handleRecordingComplete(file)}
          />
        )}

        {step === 'message' && <MessageStep onConfirm={handleMessageConfirm} />}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center text-center px-6 py-12 min-h-[200px]">
            <p className="text-primary-400 text-lg font-mono animate-pulse drop-shadow-[0_0_8px_rgba(0,255,200,0.4)]">
              {t('vi_processing')}
            </p>
          </div>
        )}

        {step === 'playback' && (
          <PlaybackScreen
            audioData={generatedAudio}
            messageText={messageText}
            onReplay={handleReplay}
            onSave={handleSave}
            onRetry={handleRetry}
            showSave={!hasSaved}
          />
        )}
      </div>

      {/* Storage error message */}
      {storageError && (
        <p className="text-yellow-400 text-sm text-center mt-4" role="alert">
          {storageError}
        </p>
      )}

      {/* Saved imprints list */}
      {savedImprints.length > 0 && (
        <div className="space-y-3 mt-8">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
            Saved Imprints
          </h3>
          {savedImprints.map((record) => (
            <div
              key={record.id}
              className="bg-background-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-glow-sm"
            >
              <button
                type="button"
                onClick={() => handlePlaySaved(record)}
                aria-label={playingId === record.id ? 'Stop playback' : 'Play recording'}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-200
                  ${
                    playingId === record.id
                      ? 'bg-cyan-600 text-foreground animate-pulse-glow'
                      : 'bg-primary-700 text-foreground hover:bg-primary-600'
                  }`}
              >
                {playingId === record.id ? '⏹' : '▶'}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{record.text}</p>
                <p className="text-foreground-dim text-xs mt-1">
                  {formatTimestamp(record.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteSaved(record.id)}
                aria-label="Delete recording"
                className="flex-shrink-0 text-foreground-dim hover:text-destructive transition-colors duration-200 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
