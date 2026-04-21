"""Unit tests for the POST /legacy/generate endpoint.

Validates: Requirements 3.1, 3.5, 3.6, 6.1, 8.3
"""

from unittest.mock import patch

import httpx
import pytest

from main import app
from services.elevenlabs_client import ElevenLabsConfigError, ElevenLabsTTSError

BASE_URL = "http://testserver"


@pytest.fixture
def async_client():
    """Create an httpx AsyncClient wired to the FastAPI app."""
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url=BASE_URL)


# ---------------------------------------------------------------------------
# Test: Valid request returns 200 with audio_base64
# ---------------------------------------------------------------------------

class TestLegacyGenerateSuccess:
    """Tests for successful /legacy/generate requests."""

    @pytest.mark.asyncio
    async def test_valid_text_returns_200_with_audio_base64(self, async_client):
        with patch(
            "api.legacy_routes.generate_speech",
            return_value="dGVzdCBhdWRpbyBkYXRh",
        ):
            response = await async_client.post(
                "/legacy/generate", json={"text": "Hello future"}
            )

        assert response.status_code == 200
        body = response.json()
        assert "audio_base64" in body
        assert body["audio_base64"] == "dGVzdCBhdWRpbyBkYXRh"


# ---------------------------------------------------------------------------
# Test: Invalid text returns 400
# ---------------------------------------------------------------------------

class TestLegacyGenerateBadRequest:
    """Tests for invalid request payloads returning 400."""

    @pytest.mark.asyncio
    async def test_empty_text_returns_400(self, async_client):
        response = await async_client.post(
            "/legacy/generate", json={"text": ""}
        )

        assert response.status_code == 400
        body = response.json()
        assert body["error"] == "Text field is required"

    @pytest.mark.asyncio
    async def test_text_exceeds_200_chars_returns_400(self, async_client):
        long_text = "a" * 201
        response = await async_client.post(
            "/legacy/generate", json={"text": long_text}
        )

        assert response.status_code == 400
        body = response.json()
        assert body["error"] == "Text exceeds 200 character limit"


# ---------------------------------------------------------------------------
# Test: ElevenLabs errors return 500
# ---------------------------------------------------------------------------

class TestLegacyGenerateServerErrors:
    """Tests for ElevenLabs service errors returning 500."""

    @pytest.mark.asyncio
    async def test_config_error_returns_500(self, async_client):
        with patch(
            "api.legacy_routes.generate_speech",
            side_effect=ElevenLabsConfigError("ElevenLabs API key not configured"),
        ):
            response = await async_client.post(
                "/legacy/generate", json={"text": "Hello future"}
            )

        assert response.status_code == 500
        body = response.json()
        assert body["error"] == "ElevenLabs API key not configured"

    @pytest.mark.asyncio
    async def test_tts_error_returns_500(self, async_client):
        with patch(
            "api.legacy_routes.generate_speech",
            side_effect=ElevenLabsTTSError("Voice generation failed"),
        ):
            response = await async_client.post(
                "/legacy/generate", json={"text": "Hello future"}
            )

        assert response.status_code == 500
        body = response.json()
        assert body["error"] == "Voice generation failed"
