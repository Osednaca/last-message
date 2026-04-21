"""Integration tests for the POST /analyze endpoint.

Tests the full end-to-end flow with a mocked Gemini client,
verifying that the route, category mapper, and response models
work together correctly.

Validates: Requirements 2.2, 3.5, 9.2
"""

import base64
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from main import app

# A small valid JPEG-like payload encoded as base64.
# (A real JPEG starts with FF D8 FF; we use a minimal valid base64 string.)
_RAW_IMAGE_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 20
VALID_BASE64_IMAGE = base64.b64encode(_RAW_IMAGE_BYTES).decode()

BASE_URL = "http://testserver"


@pytest.fixture
def async_client():
    """Create an httpx AsyncClient wired to the FastAPI ASGI app."""
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url=BASE_URL)


# ---------------------------------------------------------------------------
# End-to-end: POST /analyze with mocked Gemini client
# ---------------------------------------------------------------------------


class TestAnalyzeIntegration:
    """Full POST /analyze flow with mocked Gemini Vision client."""

    @pytest.mark.asyncio
    async def test_e2e_bottle_returns_consumption(self, async_client):
        """Send a real base64 image, mock Gemini to return 'bottle',
        verify the response contains the correct label and category."""
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="bottle",
        ):
            response = await async_client.post(
                "/analyze",
                json={"image": VALID_BASE64_IMAGE},
            )

        assert response.status_code == 200
        body = response.json()
        assert "label" in body
        assert "category" in body
        assert body["label"] == "bottle"
        assert body["category"] == "consumption"

    @pytest.mark.asyncio
    async def test_e2e_river_returns_water(self, async_client):
        """Verify the category mapper correctly maps 'river' → 'water'
        through the full endpoint flow."""
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="river",
        ):
            response = await async_client.post(
                "/analyze",
                json={"image": VALID_BASE64_IMAGE},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "river"
        assert body["category"] == "water"

    @pytest.mark.asyncio
    async def test_e2e_car_returns_energy(self, async_client):
        """Verify the category mapper correctly maps 'car' → 'energy'."""
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="car",
        ):
            response = await async_client.post(
                "/analyze",
                json={"image": VALID_BASE64_IMAGE},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "car"
        assert body["category"] == "energy"

    @pytest.mark.asyncio
    async def test_e2e_sky_returns_air(self, async_client):
        """Verify the category mapper correctly maps 'sky' → 'air'."""
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="sky",
        ):
            response = await async_client.post(
                "/analyze",
                json={"image": VALID_BASE64_IMAGE},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "sky"
        assert body["category"] == "air"

    @pytest.mark.asyncio
    async def test_e2e_tree_returns_fauna(self, async_client):
        """Verify the category mapper correctly maps 'tree' → 'fauna'."""
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="tree",
        ):
            response = await async_client.post(
                "/analyze",
                json={"image": VALID_BASE64_IMAGE},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "tree"
        assert body["category"] == "fauna"

    @pytest.mark.asyncio
    async def test_e2e_unknown_label_defaults_to_consumption(self, async_client):
        """Unknown labels should be mapped to 'consumption' by the category mapper."""
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="spaceship",
        ):
            response = await async_client.post(
                "/analyze",
                json={"image": VALID_BASE64_IMAGE},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "spaceship"
        assert body["category"] == "consumption"

    @pytest.mark.asyncio
    async def test_e2e_response_schema(self, async_client):
        """Verify the response body matches the AnalyzeResponse schema exactly."""
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="bottle",
        ):
            response = await async_client.post(
                "/analyze",
                json={"image": VALID_BASE64_IMAGE},
            )

        body = response.json()
        # Should contain exactly label and category, no extra fields
        assert set(body.keys()) == {"label", "category"}
        assert isinstance(body["label"], str)
        assert isinstance(body["category"], str)



# ---------------------------------------------------------------------------
# End-to-end: POST /legacy/generate with mocked ElevenLabs SDK
# ---------------------------------------------------------------------------


class TestLegacyGenerateIntegration:
    """Full POST /legacy/generate flow with mocked ElevenLabs generate_speech."""

    @pytest.mark.asyncio
    async def test_e2e_valid_text_returns_audio_base64(self, async_client):
        """Send valid text, mock generate_speech to return base64 audio,
        verify full response flow with 200 status and audio_base64 field."""
        mock_base64 = base64.b64encode(b"fake-audio-bytes").decode("utf-8")

        with patch(
            "api.legacy_routes.generate_speech",
            return_value=mock_base64,
        ):
            response = await async_client.post(
                "/legacy/generate",
                json={"text": "Hello from the future"},
            )

        assert response.status_code == 200
        body = response.json()
        assert "audio_base64" in body
        assert body["audio_base64"] == mock_base64

    @pytest.mark.asyncio
    async def test_e2e_response_schema(self, async_client):
        """Verify the response body matches the LegacyGenerateResponse schema."""
        mock_base64 = base64.b64encode(b"test-audio").decode("utf-8")

        with patch(
            "api.legacy_routes.generate_speech",
            return_value=mock_base64,
        ):
            response = await async_client.post(
                "/legacy/generate",
                json={"text": "Schema test"},
            )

        body = response.json()
        assert set(body.keys()) == {"audio_base64"}
        assert isinstance(body["audio_base64"], str)

    @pytest.mark.asyncio
    async def test_e2e_empty_text_returns_400(self, async_client):
        """Verify empty text returns 400 with correct error message."""
        response = await async_client.post(
            "/legacy/generate",
            json={"text": ""},
        )

        assert response.status_code == 400
        body = response.json()
        assert body["error"] == "Text field is required"

    @pytest.mark.asyncio
    async def test_e2e_long_text_returns_400(self, async_client):
        """Verify text exceeding 200 chars returns 400."""
        response = await async_client.post(
            "/legacy/generate",
            json={"text": "x" * 201},
        )

        assert response.status_code == 400
        body = response.json()
        assert body["error"] == "Text exceeds 200 character limit"
