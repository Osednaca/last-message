"""Unit tests for the ElevenLabs TTS client module.

Validates: Requirements 3.2, 8.3, 8.4, 8.5
"""

import base64
import os
from unittest.mock import MagicMock, patch

import pytest

from services.elevenlabs_client import (
    VOICE_ID,
    MODEL_ID,
    ElevenLabsConfigError,
    ElevenLabsTTSError,
    generate_speech,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _set_api_key(monkeypatch):
    """Ensure ELEVENLABS_API_KEY is set for every test by default."""
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-api-key-12345")


# ---------------------------------------------------------------------------
# Test: Constants have expected values
# ---------------------------------------------------------------------------

class TestConstants:
    """Tests for module-level constants."""

    def test_voice_id_has_expected_value(self):
        """Validates: Requirement 8.4"""
        assert VOICE_ID == "JBFqnCBsd6RMkjVDRZzb"

    def test_model_id_has_expected_value(self):
        """Validates: Requirement 8.5"""
        assert MODEL_ID == "eleven_flash_v2_5"


# ---------------------------------------------------------------------------
# Test: Successful speech generation
# ---------------------------------------------------------------------------

class TestGenerateSpeechSuccess:
    """Tests for successful text-to-speech generation."""

    def test_calls_sdk_with_correct_voice_id_and_model_id(self):
        """Validates: Requirement 3.2"""
        fake_audio = b"fake-audio-bytes"
        mock_client = MagicMock()
        mock_client.text_to_speech.convert.return_value = iter([fake_audio])

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            generate_speech("Hello world")

        mock_client.text_to_speech.convert.assert_called_once_with(
            voice_id="JBFqnCBsd6RMkjVDRZzb",
            model_id="eleven_flash_v2_5",
            text="Hello world",
        )

    def test_returns_base64_encoded_audio(self):
        """Validates: Requirement 3.3"""
        fake_audio = b"fake-audio-bytes"
        mock_client = MagicMock()
        mock_client.text_to_speech.convert.return_value = iter([fake_audio])

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            result = generate_speech("Hello world")

        expected = base64.b64encode(fake_audio).decode("utf-8")
        assert result == expected

    def test_collects_multiple_audio_chunks(self):
        """Validates: Requirement 3.3 — audio stream may yield multiple chunks."""
        chunks = [b"chunk1", b"chunk2", b"chunk3"]
        mock_client = MagicMock()
        mock_client.text_to_speech.convert.return_value = iter(chunks)

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            result = generate_speech("Hello world")

        expected = base64.b64encode(b"chunk1chunk2chunk3").decode("utf-8")
        assert result == expected

    def test_creates_client_with_api_key(self):
        """Validates: Requirement 8.2 — client uses API key from env."""
        mock_client = MagicMock()
        mock_client.text_to_speech.convert.return_value = iter([b"audio"])

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client) as mock_cls:
            generate_speech("test")

        mock_cls.assert_called_once_with(api_key="test-api-key-12345")


# ---------------------------------------------------------------------------
# Test: Missing API key
# ---------------------------------------------------------------------------

class TestGenerateSpeechMissingAPIKey:
    """Tests for missing ELEVENLABS_API_KEY environment variable."""

    def test_missing_api_key_raises_config_error(self, monkeypatch):
        """Validates: Requirement 8.3"""
        monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)

        with pytest.raises(ElevenLabsConfigError, match="API key not configured"):
            generate_speech("Hello")

    def test_empty_api_key_raises_config_error(self, monkeypatch):
        """Validates: Requirement 8.3"""
        monkeypatch.setenv("ELEVENLABS_API_KEY", "")

        with pytest.raises(ElevenLabsConfigError, match="API key not configured"):
            generate_speech("Hello")


# ---------------------------------------------------------------------------
# Test: SDK exceptions wrapped as ElevenLabsTTSError
# ---------------------------------------------------------------------------

class TestGenerateSpeechSDKErrors:
    """Tests for SDK exception wrapping."""

    def test_sdk_exception_wrapped_as_tts_error(self):
        """Validates: Requirement 6.1"""
        mock_client = MagicMock()
        mock_client.text_to_speech.convert.side_effect = RuntimeError("SDK failure")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsTTSError, match="Voice generation failed"):
                generate_speech("Hello")

    def test_sdk_connection_error_wrapped_as_tts_error(self):
        """Validates: Requirement 6.1"""
        mock_client = MagicMock()
        mock_client.text_to_speech.convert.side_effect = ConnectionError("Network unreachable")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsTTSError, match="Voice generation failed"):
                generate_speech("Hello")

    def test_tts_error_preserves_original_exception(self):
        """SDK exception should be chained as __cause__."""
        original = RuntimeError("original error")
        mock_client = MagicMock()
        mock_client.text_to_speech.convert.side_effect = original

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsTTSError) as exc_info:
                generate_speech("Hello")

        assert exc_info.value.__cause__ is original

    def test_config_error_not_wrapped(self, monkeypatch):
        """ElevenLabsConfigError should propagate directly, not wrapped."""
        monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)

        with pytest.raises(ElevenLabsConfigError):
            generate_speech("Hello")
