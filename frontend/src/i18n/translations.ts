import type { TranslationStore } from '@/types';

export const translations: TranslationStore = {
  en: {
    // Scan button
    scan_button: 'Scan',

    // Overlay states
    overlay_idle: 'Point your camera at an object',
    overlay_scanning: 'Analyzing environment...',
    overlay_detected: 'Signal detected',
    overlay_detected_message: 'Message from the future available',
    overlay_playing: 'Transmitting message...',

    // Error messages
    error_camera_permission: 'Camera access is required to scan objects',
    error_no_camera: 'A camera-equipped device is required',
    error_timeout: 'Request timed out. Please try again.',
    error_generic: 'Something went wrong. Please try again.',
    error_mic_permission: 'Microphone access is required for recording',

    // Navigation
    nav_collection: 'Collection',
    nav_legacy: 'Legacy Mode',

    // Collection
    collection_title: 'Collection',
    collection_locked: 'Locked',

    // Legacy mode
    legacy_title: 'Legacy Mode',
    legacy_record: 'Record',
    legacy_stop: 'Stop',
    legacy_tag: 'Human Legacy Message',

    // Legacy TTS mode
    legacy_tts_title: 'Leave a message for the future',
    legacy_tts_placeholder: 'Type your message...',
    legacy_tts_submit: 'Send message to the future',
    legacy_tts_loading: '📡 Transmitting to the future…',
    legacy_tts_success: 'Message received by the future',
    legacy_tts_error: 'Transmission failed… try again',
    legacy_tts_empty: 'Write your first message to leave your mark on the future.',

    // Camera selector
    camera_select_label: 'Select camera',
    camera_switch_error: 'Failed to switch camera. Using previous camera.',
    camera_switched: 'Switched to {label}',
  },
};

/**
 * Look up a translated string by key and optional locale.
 * Returns the key itself if the locale or key is not found.
 */
export function t(key: string, locale: string = 'en'): string {
  const localeStrings = translations[locale];
  if (!localeStrings) {
    return key;
  }
  return localeStrings[key] ?? key;
}
