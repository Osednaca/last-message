// Categories
export type Category = 'water' | 'air' | 'fauna' | 'consumption' | 'energy';

// Message from the future
export interface Message {
  id: string;
  text: string;
  audioPath: string;
}

// Messages organized by category
export type MessageStore = Record<Category, Message[]>;

// Collection record for a discovered message
export interface CollectionRecord {
  messageId: string;
  category: Category;
  discoveredAt: string; // ISO 8601 timestamp
}

// Legacy recording
export interface LegacyMessage {
  id: string;
  audioBlob: Blob;
  createdAt: string; // ISO 8601 timestamp
  tag: 'Human Legacy Message';
}

// Legacy TTS message (replaces LegacyMessage for TTS flow)
export interface LegacyTTSMessage {
  id: string;
  text: string;
  audioData: string;      // base64-encoded audio
  createdAt: string;      // ISO 8601 timestamp
  type: 'legacy';
}

// Legacy generate API response
export interface LegacyGenerateResponse {
  audio_base64: string;
}

// Translation store structure
export type TranslationStore = Record<string, Record<string, string>>;

// Overlay states
export type OverlayState = 'idle' | 'scanning' | 'detected' | 'playing';

// API response from /analyze
export interface AnalyzeResponse {
  label: string;
  category: Category;
}

export interface AnalyzeError {
  error: string;
  detail: string;
}
