"""Unit tests for the POST /analyze endpoint.

Validates: Requirements 3.1, 3.2, 3.5, 3.6
"""

import base64
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from main import app
from services.gemini_client import (
    GeminiAPIError,
    GeminiEmptyResultError,
    GeminiTimeoutError,
)

# A valid base64 string (encodes "test image data")
VALID_BASE64 = base64.b64encode(b"test image data").decode()

BASE_URL = "http://testserver"


@pytest.fixture
def async_client():
    """Create an httpx AsyncClient wired to the FastAPI app."""
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url=BASE_URL)


# ---------------------------------------------------------------------------
# Test: Valid request returns label and category
# ---------------------------------------------------------------------------

class TestAnalyzeSuccess:
    """Tests for successful /analyze requests."""

    @pytest.mark.asyncio
    async def test_valid_request_returns_label_and_category(self, async_client):
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="bottle",
        ):
            response = await async_client.post("/analyze", json={"image": VALID_BASE64})

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "bottle"
        assert body["category"] == "consumption"

    @pytest.mark.asyncio
    async def test_valid_request_with_tree_label(self, async_client):
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="tree",
        ):
            response = await async_client.post("/analyze", json={"image": VALID_BASE64})

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "tree"
        assert body["category"] == "fauna"

    @pytest.mark.asyncio
    async def test_unknown_label_defaults_to_consumption(self, async_client):
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            return_value="alien artifact",
        ):
            response = await async_client.post("/analyze", json={"image": VALID_BASE64})

        assert response.status_code == 200
        body = response.json()
        assert body["label"] == "alien artifact"
        assert body["category"] == "consumption"


# ---------------------------------------------------------------------------
# Test: Missing / empty image field returns 400
# ---------------------------------------------------------------------------

class TestAnalyzeBadRequest:
    """Tests for invalid request payloads returning 400."""

    @pytest.mark.asyncio
    async def test_empty_image_field_returns_400(self, async_client):
        response = await async_client.post("/analyze", json={"image": ""})

        assert response.status_code == 400
        body = response.json()
        assert "error" in body
        assert "image" in body["detail"].lower() or "required" in body["detail"].lower()

    @pytest.mark.asyncio
    async def test_whitespace_only_image_returns_400(self, async_client):
        response = await async_client.post("/analyze", json={"image": "   "})

        assert response.status_code == 400
        body = response.json()
        assert "error" in body

    @pytest.mark.asyncio
    async def test_invalid_base64_returns_400(self, async_client):
        response = await async_client.post("/analyze", json={"image": "not-valid-base64!!!"})

        assert response.status_code == 400
        body = response.json()
        assert "error" in body
        assert "base64" in body["detail"].lower()


# ---------------------------------------------------------------------------
# Test: Gemini API error returns 500
# ---------------------------------------------------------------------------

class TestAnalyzeGeminiErrors:
    """Tests for Gemini client errors returning 500."""

    @pytest.mark.asyncio
    async def test_gemini_api_error_returns_500(self, async_client):
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            side_effect=GeminiAPIError("Gemini API returned status 503"),
        ):
            response = await async_client.post("/analyze", json={"image": VALID_BASE64})

        assert response.status_code == 500
        body = response.json()
        assert "error" in body
        assert "detail" in body

    @pytest.mark.asyncio
    async def test_gemini_timeout_returns_500(self, async_client):
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            side_effect=GeminiTimeoutError("Gemini API did not respond in time"),
        ):
            response = await async_client.post("/analyze", json={"image": VALID_BASE64})

        assert response.status_code == 500
        body = response.json()
        assert "error" in body
        assert "timeout" in body["error"].lower()

    @pytest.mark.asyncio
    async def test_gemini_empty_result_returns_500(self, async_client):
        with patch(
            "api.routes.classify_image",
            new_callable=AsyncMock,
            side_effect=GeminiEmptyResultError("Could not identify object in image"),
        ):
            response = await async_client.post("/analyze", json={"image": VALID_BASE64})

        assert response.status_code == 500
        body = response.json()
        assert "error" in body
        assert "detail" in body
