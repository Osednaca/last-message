import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceRecorderReturn {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  elapsedSeconds: number;
  analyserNode: AnalyserNode | null;
  error: string | null;
}

export interface UseVoiceRecorderOptions {
  maxDuration?: number; // default 10
  minDuration?: number; // default 5
  onComplete: (blob: Blob) => void;
}

/**
 * Determine the best supported MIME type for MediaRecorder.
 * Prefers 'audio/webm;codecs=opus', falls back to 'audio/webm', then 'audio/wav'.
 */
function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/wav',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  // Fallback — let the browser pick
  return '';
}

/**
 * Custom hook for recording voice audio using the MediaRecorder API.
 *
 * Creates an AudioContext + AnalyserNode for real-time frequency data (used by
 * WaveformVisualizer), manages a recording timer, and enforces min/max duration
 * constraints.
 *
 * @param options - Configuration including duration limits and completion callback
 * @returns Controls and state for voice recording
 */
export function useVoiceRecorder(
  options: UseVoiceRecorderOptions,
): UseVoiceRecorderReturn {
  const { maxDuration = 10, onComplete } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs to hold mutable objects that persist across renders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onCompleteRef = useRef(onComplete);
  const isRecordingRef = useRef(false);
  const elapsedRef = useRef(0);

  // Keep the onComplete ref in sync
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  /**
   * Stop all media tracks on the stream to release the microphone.
   */
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  /**
   * Close the AudioContext and clear the analyser node.
   */
  const cleanupAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // Best-effort cleanup
      });
      audioContextRef.current = null;
    }
    setAnalyserNode(null);
  }, []);

  /**
   * Clear the recording timer interval.
   */
  const cleanupTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Full cleanup of all recording resources.
   */
  const cleanupAll = useCallback(() => {
    cleanupTimer();
    cleanupStream();
    cleanupAudioContext();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [cleanupTimer, cleanupStream, cleanupAudioContext]);

  /**
   * Stop the current recording. Produces a blob via the MediaRecorder's
   * ondataavailable + onstop handlers.
   */
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    cleanupTimer();
    setIsRecording(false);
    isRecordingRef.current = false;
  }, [cleanupTimer]);

  /**
   * Request microphone access, set up AudioContext + AnalyserNode + MediaRecorder,
   * and begin recording.
   */
  const startRecording = useCallback(() => {
    // Reset state synchronously
    setError(null);
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    chunksRef.current = [];

    // Request microphone access. We use raw Promises rather than async/await
    // here to ensure the getUserMedia call happens as tightly bound to the
    // user gesture's synchronous stack frame as possible. Some mobile browsers
    // (and WebViews) are extremely aggressive about dropping the gesture token.
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;

        // Set up AudioContext + AnalyserNode for waveform visualization
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        setAnalyserNode(analyser);

        // Set up MediaRecorder
        const mimeType = getSupportedMimeType();
        const recorderOptions: MediaRecorderOptions = {};
        if (mimeType) {
          recorderOptions.mimeType = mimeType;
        }

        const mediaRecorder = new MediaRecorder(stream, recorderOptions);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const chunks = chunksRef.current;
          if (chunks.length > 0) {
            const blob = new Blob(chunks, {
              type: mimeType || 'audio/webm',
            });
            onCompleteRef.current(blob);
          }
          // Clean up stream and audio context after producing the blob
          cleanupStream();
          cleanupAudioContext();
        };

        // Start recording
        mediaRecorder.start();
        setIsRecording(true);
        isRecordingRef.current = true;

        // Start the elapsed-seconds timer
        timerRef.current = setInterval(() => {
          elapsedRef.current += 1;
          setElapsedSeconds(elapsedRef.current);

          // Auto-stop at maxDuration
          if (elapsedRef.current >= maxDuration) {
            stopRecording();
          }
        }, 1000);
      })
      .catch((err) => {
        console.error('[useVoiceRecorder] Error acquiring microphone:', err);

        let message = 'Failed to access microphone';
        
        // Append raw error name for debugging if available
        const rawName = err?.name || 'Unknown';
        const debugSuffix = ` (Code: ${rawName})`;

        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            message = 'Microphone access was denied. Please check your browser/app permissions.';
          } else if (err.name === 'NotFoundError') {
            message = 'No microphone was found on this device.';
          } else if (err.name === 'NotReadableError') {
            message = 'Microphone is already in use by another app or camera.';
          } else {
            message = err.message || message;
          }
        } else if (err && typeof err === 'object' && 'name' in err) {
          // Fallback check for NotAllowedError across different environments
          const name = (err as { name: string }).name;
          if (name === 'NotAllowedError') {
            message = 'Microphone access was denied. Please check your browser/app permissions.';
          } else if (name === 'NotFoundError') {
            message = 'No microphone was found on this device.';
          } else if (name === 'NotReadableError') {
            message = 'Microphone is already in use by another app or camera.';
          } else if ('message' in err && typeof err.message === 'string') {
            message = err.message;
          }
        } else if (err instanceof Error) {
          message = err.message;
        }

        setError(message + debugSuffix);
        cleanupAll();
      });
  }, [maxDuration, stopRecording, cleanupStream, cleanupAudioContext, cleanupAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop MediaRecorder if still active
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
      // Stop all tracks on the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Close AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      // Clear timer
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    elapsedSeconds,
    analyserNode,
    error,
  };
}
