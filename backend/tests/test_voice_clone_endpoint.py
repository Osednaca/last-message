"""Unit tests for the POST /legacy/clone endpoint.

Validates: Requirements 3.1, 3.6, 7.1, 7.2, 10.4, 11.2
"""

from unittest.mock import patch

import httpx
import pytest

from main import app
from services.elevenlabs_client import (
    ElevenLabsConfigError,
    ElevenLabsTTSError,
    ElevenLabsVoiceCloneError,
)

BASE_URL = "http://testserver"


@pytest.fixture
def async_client():
    """Create an httpx AsyncClient wired to the FastAPI app."""
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url=BASE_URL)


# ---------------------------------------------------------------------------
# Helper to build multipart form data
# ---------------------------------------------------------------------------

def _audio_file(content: bytes = b"fake-audio-data", filename: str = "voice.webm"):
    """Return a files dict suitable for httpx multipart upload."""
    return {"audio": (filename, content, "audio/webm")}


# ---------------------------------------------------------------------------
# Test: Success path — valid audio returns 200 with audio_base64
# ---------------------------------------------------------------------------

class TestCloneEndpointSuccess:
    """Tests for successful /legacy/clone requests.

    Validates: Requirement 3.1 (endpoint accepts POST), 3.4 (returns audio_base64)
    """

    @pytest.mark.asyncio
    async def test_valid_audio_returns_200_with_audio_base64(self, async_client):
        with patch(
            "api.legacy_routes.clone_voice_and_generate",
            return_value="dGVzdCBhdWRpbyBkYXRh",
        ):
            response = await async_client.post(
                "/legacy/clone",
                files=_audio_file(),
                data={"text": "Hello future"},
            )

        assert response.status_code == 200
        body = response.json()
        assert "audio_base64" in body
        assert body["audio_base64"] == "dGVzdCBhdWRpbyBkYXRh"

    @pytest.mark.asyncio
    async def test_optional_text_defaults_to_empty(self, async_client):
        """Text field is optional and defaults to empty string."""
        with patch(
            "api.legacy_routes.clone_voice_and_generate",
            return_value="YXVkaW8=",
        ) as mock_fn:
            response = await async_client.post(
                "/legacy/clone",
                files=_audio_file(),
            )

        assert response.status_code == 200
        # Verify clone_voice_and_generate was called with empty text default
        mock_fn.assert_called_once()
        call_args = mock_fn.call_args
        assert call_args[0][2] == ""  # third positional arg is text


# ---------------------------------------------------------------------------
# Test: Empty/missing audio returns 400
# ---------------------------------------------------------------------------

class TestCloneEndpointBadRequest:
    """Tests for invalid request payloads returning 400.

    Validates: Requirement 3.6 (audio file missing or empty → 400)
    """

    @pytest.mark.asyncio
    async def test_empty_audio_file_returns_400(self, async_client):
        response = await async_client.post(
            "/legacy/clone",
            files=_audio_file(content=b""),
            data={"text": "Hello"},
        )

        assert response.status_code == 400
        body = response.json()
        assert body["error"] == "Audio file is required"


# ---------------------------------------------------------------------------
# Test: ElevenLabs errors return 500
# ---------------------------------------------------------------------------

class TestCloneEndpointServerErrors:
    """Tests for ElevenLabs service errors returning 500.

    Validates: Requirements 7.1, 7.2, 11.2
    """

    @pytest.mark.asyncio
    async def test_config_error_returns_500(self, async_client):
        """Validates: Requirement 11.2 — missing API key returns 500."""
        with patch(
            "api.legacy_routes.clone_voice_and_generate",
            side_effect=ElevenLabsConfigError("ElevenLabs API key not configured"),
        ):
            response = await async_client.post(
                "/legacy/clone",
                files=_audio_file(),
                data={"text": "Hello"},
            )

        assert response.status_code == 500
        body = response.json()
        assert body["error"] == "ElevenLabs API key not configured"

    @pytest.mark.asyncio
    async def test_clone_error_returns_500(self, async_client):
        """Validates: Requirement 7.1 — clone failure returns 500."""
        with patch(
            "api.legacy_routes.clone_voice_and_generate",
            side_effect=ElevenLabsVoiceCloneError("Voice cloning failed"),
        ):
            response = await async_client.post(
                "/legacy/clone",
                files=_audio_file(),
                data={"text": "Hello"},
            )

        assert response.status_code == 500
        body = response.json()
        assert body["error"] == "Voice cloning failed"

    @pytest.mark.asyncio
    async def test_tts_error_returns_500(self, async_client):
        """Validates: Requirement 7.2 — TTS failure returns 500."""
        with patch(
            "api.legacy_routes.clone_voice_and_generate",
            side_effect=ElevenLabsTTSError("Voice generation failed"),
        ):
            response = await async_client.post(
                "/legacy/clone",
                files=_audio_file(),
                data={"text": "Hello"},
            )

        assert response.status_code == 500
        body = response.json()
        assert body["error"] == "Voice generation failed"


# ---------------------------------------------------------------------------
# Test: Regression — /legacy/generate still works
# ---------------------------------------------------------------------------

class TestLegacyGenerateRegression:
    """Verify the existing /legacy/generate endpoint is unaffected.

    Validates: Requirement 10.4 (existing endpoint continues to function)
    """

    @pytest.mark.asyncio
    async def test_generate_endpoint_still_returns_200(self, async_client):
        with patch(
            "api.legacy_routes.generate_speech",
            return_value="cmVncmVzc2lvbg==",
        ):
            response = await async_client.post(
                "/legacy/generate",
                json={"text": "Regression test"},
            )

        assert response.status_code == 200
        body = response.json()
        assert "audio_base64" in body
        assert body["audio_base64"] == "cmVncmVzc2lvbg=="
