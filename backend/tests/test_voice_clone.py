"""Unit tests for clone_voice_and_generate.

Validates: Requirements 3.2, 3.3, 3.8, 7.1, 7.2, 11.2
"""

import base64
from unittest.mock import MagicMock, patch, call

import pytest

from services.elevenlabs_client import (
    MODEL_ID,
    ElevenLabsConfigError,
    ElevenLabsTTSError,
    ElevenLabsVoiceCloneError,
    clone_voice_and_generate,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _set_api_key(monkeypatch):
    """Ensure ELEVENLABS_API_KEY is set for every test by default."""
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-api-key-12345")


@pytest.fixture
def mock_client():
    """Create a pre-configured mock ElevenLabs client."""
    client = MagicMock()
    # Default: clone succeeds and returns a voice_id
    clone_response = MagicMock()
    clone_response.voice_id = "cloned-voice-id-abc"
    client.voices.ivc.create.return_value = clone_response
    # Default: TTS succeeds and returns audio chunks
    client.text_to_speech.convert.return_value = iter([b"audio-chunk-1", b"audio-chunk-2"])
    return client


# ---------------------------------------------------------------------------
# Test: Success path
# ---------------------------------------------------------------------------

class TestCloneVoiceAndGenerateSuccess:
    """Tests for the happy path of clone_voice_and_generate."""

    def test_returns_base64_encoded_audio(self, mock_client):
        """Validates: Requirement 3.3 — returns base64-encoded audio string."""
        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            result = clone_voice_and_generate(b"sample-audio", "recording.webm", "Hello future")

        expected = base64.b64encode(b"audio-chunk-1audio-chunk-2").decode("utf-8")
        assert result == expected

    def test_calls_ivc_create_with_correct_args(self, mock_client):
        """Validates: Requirement 3.2 — calls ElevenLabs clone API with audio file."""
        audio = b"my-voice-sample"
        filename = "voice.webm"

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            clone_voice_and_generate(audio, filename, "Test text")

        mock_client.voices.ivc.create.assert_called_once_with(
            name="temp-voice-imprint",
            files=[audio],
        )

    def test_calls_tts_convert_with_cloned_voice_id(self, mock_client):
        """Validates: Requirement 3.3 — uses cloned voice_id for TTS."""
        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            clone_voice_and_generate(b"audio", "file.webm", "Speak this")

        mock_client.text_to_speech.convert.assert_called_once_with(
            voice_id="cloned-voice-id-abc",
            model_id=MODEL_ID,
            text="Speak this",
        )

    def test_deletes_voice_after_success(self, mock_client):
        """Validates: Requirement 3.8 — voice clone is deleted after TTS."""
        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            clone_voice_and_generate(b"audio", "file.webm", "text")

        mock_client.voices.delete.assert_called_once_with(voice_id="cloned-voice-id-abc")

    def test_call_sequence_clone_then_tts_then_delete(self, mock_client):
        """Validates: Requirements 3.2, 3.3, 3.8 — correct call order."""
        manager = MagicMock()
        manager.attach_mock(mock_client.voices.ivc.create, "clone")
        manager.attach_mock(mock_client.text_to_speech.convert, "tts")
        manager.attach_mock(mock_client.voices.delete, "delete")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            clone_voice_and_generate(b"audio", "file.webm", "text")

        # Verify ordering: clone → tts → delete
        assert manager.mock_calls == [
            call.clone(name="temp-voice-imprint", files=[b"audio"]),
            call.tts(voice_id="cloned-voice-id-abc", model_id=MODEL_ID, text="text"),
            call.delete(voice_id="cloned-voice-id-abc"),
        ]


# ---------------------------------------------------------------------------
# Test: Clone failure
# ---------------------------------------------------------------------------

class TestCloneVoiceFailure:
    """Tests for when voice cloning fails."""

    def test_clone_failure_raises_voice_clone_error(self, mock_client):
        """Validates: Requirement 7.1 — clone error raises ElevenLabsVoiceCloneError."""
        mock_client.voices.ivc.create.side_effect = RuntimeError("API unreachable")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsVoiceCloneError, match="Voice cloning failed"):
                clone_voice_and_generate(b"audio", "file.webm", "text")

    def test_clone_failure_does_not_call_delete(self, mock_client):
        """Validates: Requirement 3.8 — no delete when no voice_id was obtained."""
        mock_client.voices.ivc.create.side_effect = RuntimeError("Clone failed")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsVoiceCloneError):
                clone_voice_and_generate(b"audio", "file.webm", "text")

        mock_client.voices.delete.assert_not_called()

    def test_clone_failure_does_not_call_tts(self, mock_client):
        """Validates: Requirement 3.2 — TTS not attempted if clone fails."""
        mock_client.voices.ivc.create.side_effect = RuntimeError("Clone failed")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsVoiceCloneError):
                clone_voice_and_generate(b"audio", "file.webm", "text")

        mock_client.text_to_speech.convert.assert_not_called()

    def test_clone_failure_preserves_original_exception(self, mock_client):
        """Original exception should be chained as __cause__."""
        original = ConnectionError("Network down")
        mock_client.voices.ivc.create.side_effect = original

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsVoiceCloneError) as exc_info:
                clone_voice_and_generate(b"audio", "file.webm", "text")

        assert exc_info.value.__cause__ is original


# ---------------------------------------------------------------------------
# Test: TTS failure (after successful clone)
# ---------------------------------------------------------------------------

class TestTTSFailure:
    """Tests for when TTS fails after a successful voice clone."""

    def test_tts_failure_raises_tts_error(self, mock_client):
        """Validates: Requirement 7.2 — TTS error raises ElevenLabsTTSError."""
        mock_client.text_to_speech.convert.side_effect = RuntimeError("TTS timeout")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsTTSError, match="Voice generation failed"):
                clone_voice_and_generate(b"audio", "file.webm", "text")

    def test_tts_failure_still_deletes_voice(self, mock_client):
        """Validates: Requirement 3.8 — cleanup happens even when TTS fails."""
        mock_client.text_to_speech.convert.side_effect = RuntimeError("TTS failed")

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsTTSError):
                clone_voice_and_generate(b"audio", "file.webm", "text")

        mock_client.voices.delete.assert_called_once_with(voice_id="cloned-voice-id-abc")

    def test_tts_failure_preserves_original_exception(self, mock_client):
        """Original exception should be chained as __cause__."""
        original = TimeoutError("Request timed out")
        mock_client.text_to_speech.convert.side_effect = original

        with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
            with pytest.raises(ElevenLabsTTSError) as exc_info:
                clone_voice_and_generate(b"audio", "file.webm", "text")

        assert exc_info.value.__cause__ is original


# ---------------------------------------------------------------------------
# Test: API key missing
# ---------------------------------------------------------------------------

class TestMissingAPIKey:
    """Tests for missing ELEVENLABS_API_KEY environment variable."""

    def test_missing_api_key_raises_config_error(self, monkeypatch):
        """Validates: Requirement 11.2 — missing key raises ElevenLabsConfigError."""
        monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)

        with pytest.raises(ElevenLabsConfigError, match="API key not configured"):
            clone_voice_and_generate(b"audio", "file.webm", "text")

    def test_empty_api_key_raises_config_error(self, monkeypatch):
        """Validates: Requirement 11.2 — empty key raises ElevenLabsConfigError."""
        monkeypatch.setenv("ELEVENLABS_API_KEY", "")

        with pytest.raises(ElevenLabsConfigError, match="API key not configured"):
            clone_voice_and_generate(b"audio", "file.webm", "text")

    def test_missing_key_does_not_call_sdk(self, monkeypatch):
        """No SDK calls should be made when the API key is missing."""
        monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)

        with patch("services.elevenlabs_client.ElevenLabs") as mock_cls:
            with pytest.raises(ElevenLabsConfigError):
                clone_voice_and_generate(b"audio", "file.webm", "text")

        mock_cls.assert_not_called()
