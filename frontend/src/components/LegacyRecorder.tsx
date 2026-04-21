import { useState, useCallback, useEffect } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { t } from '@/i18n/translations';
import { generateLegacySpeech } from '@/api/client';

const STORAGE_KEY = 'echoes-legacy-messages';

/** Shape stored in localStorage for TTS legacy messages. */
export interface StoredLegacyMessage {
  id: string;
  text: string;
  audioData: string; // base64 encoded audio (with data: prefix)
  createdAt: string; // ISO 8601
  type: 'legacy';
}

type ComponentState = 'idle' | 'loading' | 'success' | 'error';

/** Read saved legacy messages from localStorage. */
function loadLegacyMessages(): StoredLegacyMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredLegacyMessage[];
  } catch {
    return [];
  }
}

/** Persist legacy messages to localStorage. */
function saveLegacyMessages(msgs: StoredLegacyMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // QuotaExceededError or other storage error — silently degrade
  }
}

/** Format an ISO timestamp for display. */
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

export function LegacyRecorder() {
  const [messages, setMessages] = useState<StoredLegacyMessage[]>(loadLegacyMessages);
  const [text, setText] = useState('');
  const [state, setState] = useState<ComponentState>('idle');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const { play, stop, isPlaying, error: audioError } = useAudioPlayer({
    onEnd: () => setPlayingId(null),
  });

  // Sync playingId when audio stops externally
  useEffect(() => {
    if (!isPlaying) {
      setPlayingId(null);
    }
  }, [isPlaying]);

  // Track audio playback errors for fallback display
  useEffect(() => {
    if (audioError && playingId) {
      setPlaybackError(playingId);
    }
  }, [audioError, playingId]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || state === 'loading') return;

    setState('loading');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await generateLegacySpeech(text, controller.signal);
      clearTimeout(timeoutId);

      const audioData = `data:audio/mpeg;base64,${response.audio_base64}`;

      setState('success');

      // Auto-play the generated audio
      play(audioData);

      // Create and save the legacy message
      const newMessage: StoredLegacyMessage = {
        id: crypto.randomUUID(),
        text,
        audioData,
        createdAt: new Date().toISOString(),
        type: 'legacy',
      };

      setMessages((prev) => {
        const updated = [newMessage, ...prev];
        saveLegacyMessages(updated);
        return updated;
      });

      // Reset text for next message
      setText('');
    } catch {
      clearTimeout(timeoutId);
      setState('error');
    }
  }, [text, state, play]);

  const handlePlayback = useCallback(
    (msg: StoredLegacyMessage) => {
      setPlaybackError(null);
      if (playingId === msg.id) {
        stop();
        setPlayingId(null);
      } else {
        setPlayingId(msg.id);
        play(msg.audioData);
      }
    },
    [play, stop, playingId],
  );

  const handleDelete = useCallback((id: string) => {
    setMessages((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      saveLegacyMessages(updated);
      return updated;
    });
  }, []);

  const isSubmitDisabled = text.length === 0 || state === 'loading';

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-primary-400 mb-6 text-center">
        {t('legacy_tts_title')}
      </h2>

      {/* Text input area */}
      <div className="mb-4">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (state === 'error' || state === 'success') {
              setState('idle');
            }
          }}
          maxLength={200}
          readOnly={state === 'loading'}
          placeholder={t('legacy_tts_placeholder')}
          className="w-full p-3 rounded-lg bg-background-card border border-border text-foreground
            placeholder:text-foreground-muted resize-none focus:outline-none focus:ring-2
            focus:ring-primary-500 transition-all duration-200"
          rows={3}
        />
        <p data-testid="char-counter" className="text-foreground-muted text-xs text-right mt-1">
          {text.length} / 200
        </p>
      </div>

      {/* Submit button */}
      <div className="flex justify-center mb-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="px-8 py-3 rounded-full bg-primary-600 text-foreground font-medium text-sm
            shadow-glow-sm transition-all duration-200 hover:bg-primary-500 hover:shadow-glow-md
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600
            disabled:hover:shadow-glow-sm"
        >
          {t('legacy_tts_submit')}
        </button>
      </div>

      {/* Status messages */}
      {state === 'loading' && (
        <p className="text-foreground-muted text-sm text-center mb-4 animate-pulse">
          {t('legacy_tts_loading')}
        </p>
      )}

      {state === 'success' && (
        <p className="text-primary-400 text-sm text-center mb-4">
          {t('legacy_tts_success')}
        </p>
      )}

      {state === 'error' && (
        <p role="alert" className="text-destructive text-sm text-center mb-4">
          {t('legacy_tts_error')}
        </p>
      )}

      {/* Saved legacy messages */}
      {messages.length > 0 && (
        <div className="space-y-3 mt-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-background-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-glow-sm"
            >
              <button
                type="button"
                onClick={() => handlePlayback(msg)}
                aria-label={playingId === msg.id ? 'Stop playback' : 'Play recording'}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-200
                  ${playingId === msg.id
                    ? 'bg-cyan-600 text-foreground animate-pulse-glow'
                    : 'bg-primary-700 text-foreground hover:bg-primary-600'
                  }`}
              >
                {playingId === msg.id ? '⏹' : '▶'}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {playbackError === msg.id ? msg.text : msg.text}
                </p>
                <p className="text-foreground-dim text-xs mt-1">
                  {formatTimestamp(msg.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(msg.id)}
                aria-label="Delete recording"
                className="flex-shrink-0 text-foreground-dim hover:text-destructive transition-colors duration-200 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && (
        <p className="text-foreground-muted text-sm text-center mt-6">
          {t('legacy_tts_empty')}
        </p>
      )}
    </div>
  );
}
