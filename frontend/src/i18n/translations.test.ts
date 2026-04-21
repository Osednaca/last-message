import { describe, it, expect } from 'vitest';
import { translations, t } from './translations';

describe('Translation Store', () => {
  it('should have an "en" locale', () => {
    expect(translations).toHaveProperty('en');
    expect(typeof translations.en).toBe('object');
  });

  it('should contain all required keys in the "en" locale', () => {
    const requiredKeys = [
      'scan_button',
      'overlay_idle',
      'overlay_scanning',
      'overlay_detected',
      'overlay_detected_message',
      'overlay_playing',
      'error_camera_permission',
      'error_no_camera',
      'error_timeout',
      'error_generic',
      'error_mic_permission',
      'collection_title',
      'collection_locked',
      'legacy_title',
      'legacy_record',
      'legacy_stop',
      'legacy_tag',
    ];

    for (const key of requiredKeys) {
      expect(translations.en).toHaveProperty(key);
      expect(typeof translations.en[key]).toBe('string');
      expect(translations.en[key].length).toBeGreaterThan(0);
    }
  });

  it('should store correct overlay state texts', () => {
    expect(translations.en.overlay_idle).toBe('Point your camera at an object');
    expect(translations.en.overlay_scanning).toBe('Analyzing environment...');
    expect(translations.en.overlay_detected).toBe('Signal detected');
    expect(translations.en.overlay_playing).toBe('Transmitting message...');
  });

  it('should store correct error messages', () => {
    expect(translations.en.error_camera_permission).toBe('Camera access is required to scan objects');
    expect(translations.en.error_no_camera).toBe('A camera-equipped device is required');
    expect(translations.en.error_mic_permission).toBe('Microphone access is required for recording');
  });
});

describe('t() helper function', () => {
  it('should return the correct value for a known key', () => {
    expect(t('scan_button')).toBe('Scan');
    expect(t('overlay_idle')).toBe('Point your camera at an object');
  });

  it('should default to "en" locale when no locale is specified', () => {
    expect(t('scan_button')).toBe(t('scan_button', 'en'));
  });

  it('should return the key itself when the key is not found', () => {
    expect(t('nonexistent_key')).toBe('nonexistent_key');
  });

  it('should return the key itself when the locale is not found', () => {
    expect(t('scan_button', 'fr')).toBe('scan_button');
  });

  it('should return the key for unknown locale and unknown key', () => {
    expect(t('unknown_key', 'zz')).toBe('unknown_key');
  });
});
