import type { AnalyzeResponse, LegacyGenerateResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

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
