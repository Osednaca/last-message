import type { AnalyzeResponse, LegacyCloneResponse, LegacyGenerateResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'last-message-api.fly.dev';

/**
 * Analyze a base64-encoded image by POSTing to the backend /analyze endpoint.
 * Uses an AbortSignal for timeout support.
 */
export async function analyzeImage(
  base64Image: string,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail ?? body?.error ?? 'Unknown error';
    throw new Error(detail);
  }

  return (await response.json()) as AnalyzeResponse;
}

/**
 * Generate text-to-speech audio by POSTing to the backend /legacy/generate endpoint.
 * Uses an AbortSignal for timeout support.
 */
export async function generateLegacySpeech(
  text: string,
  signal?: AbortSignal,
): Promise<LegacyGenerateResponse> {
  const response = await fetch(`${API_URL}/legacy/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.error ?? 'Unknown error';
    throw new Error(detail);
  }

  return (await response.json()) as LegacyGenerateResponse;
}

/**
 * Clone a voice from an audio sample and generate TTS audio.
 * Sends multipart/form-data POST to /legacy/clone.
 * Uses an AbortSignal for timeout support.
 */
export async function cloneVoice(
  audioBlob: Blob,
  text: string,
  signal?: AbortSignal,
): Promise<LegacyCloneResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice-sample.webm');
  formData.append('text', text);

  const response = await fetch(`${API_URL}/legacy/clone`, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'Clone failed');
  }

  return (await response.json()) as LegacyCloneResponse;
}
