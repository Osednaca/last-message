"""Unit tests for the Gemini Vision Client module.

Validates: Requirements 3.1, 3.2, 3.6
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from services.gemini_client import (
    GeminiAPIError,
    GeminiEmptyResultError,
    GeminiTimeoutError,
    classify_image,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gemini_success_response(label: str = "bottle") -> dict:
    """Build a Gemini API JSON response containing the given label."""
    return {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": label}]
                }
            }
        ]
    }


def _make_httpx_response(status_code: int = 200, json_body: dict | None = None, text: str = "") -> httpx.Response:
    """Create a minimal httpx.Response for mocking."""
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.text = text
    if json_body is not None:
        response.json.return_value = json_body
    else:
        response.json.side_effect = ValueError("No JSON")
    return response


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _set_api_key(monkeypatch):
    """Ensure GEMINI_API_KEY is set for every test by default."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-api-key-12345")


# ---------------------------------------------------------------------------
# Test: Successful classification
# ---------------------------------------------------------------------------

class TestClassifyImageSuccess:
    """Tests for successful image classification."""

    @pytest.mark.asyncio
    async def test_returns_label_from_gemini_response(self):
        mock_response = _make_httpx_response(200, _gemini_success_response("bottle"))
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            result = await classify_image("dGVzdA==")

        assert result == "bottle"

    @pytest.mark.asyncio
    async def test_returns_trimmed_lowercase_label(self):
        mock_response = _make_httpx_response(200, _gemini_success_response("  Tree  "))
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            result = await classify_image("dGVzdA==")

        assert result == "tree"

    @pytest.mark.asyncio
    async def test_post_called_with_correct_params(self):
        mock_response = _make_httpx_response(200, _gemini_success_response("car"))
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            await classify_image("aW1hZ2VkYXRh")

        mock_client.post.assert_called_once()
        call_kwargs = mock_client.post.call_args
        assert call_kwargs.kwargs["params"] == {"key": "test-api-key-12345"}
        payload = call_kwargs.kwargs["json"]
        assert payload["contents"][0]["parts"][1]["inline_data"]["data"] == "aW1hZ2VkYXRh"


# ---------------------------------------------------------------------------
# Test: API error handling
# ---------------------------------------------------------------------------

class TestClassifyImageAPIError:
    """Tests for API error scenarios."""

    @pytest.mark.asyncio
    async def test_non_200_status_raises_gemini_api_error(self):
        mock_response = _make_httpx_response(500, text="Internal Server Error")
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiAPIError, match="status 500"):
                await classify_image("dGVzdA==")

    @pytest.mark.asyncio
    async def test_http_error_raises_gemini_api_error(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.side_effect = httpx.HTTPError("Connection refused")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiAPIError, match="HTTP error"):
                await classify_image("dGVzdA==")

    @pytest.mark.asyncio
    async def test_invalid_json_response_raises_gemini_api_error(self):
        mock_response = _make_httpx_response(200)
        # json() raises ValueError for invalid JSON
        mock_response.json.side_effect = ValueError("Invalid JSON")
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiAPIError, match="invalid JSON"):
                await classify_image("dGVzdA==")


# ---------------------------------------------------------------------------
# Test: Timeout handling
# ---------------------------------------------------------------------------

class TestClassifyImageTimeout:
    """Tests for timeout scenarios."""

    @pytest.mark.asyncio
    async def test_timeout_raises_gemini_timeout_error(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.side_effect = httpx.TimeoutException("Request timed out")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiTimeoutError, match="did not respond in time"):
                await classify_image("dGVzdA==")


# ---------------------------------------------------------------------------
# Test: Empty / null result handling
# ---------------------------------------------------------------------------

class TestClassifyImageEmptyResult:
    """Tests for empty or missing label in the API response."""

    @pytest.mark.asyncio
    async def test_empty_text_raises_empty_result_error(self):
        body = {"candidates": [{"content": {"parts": [{"text": ""}]}}]}
        mock_response = _make_httpx_response(200, body)
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiEmptyResultError, match="Could not identify"):
                await classify_image("dGVzdA==")

    @pytest.mark.asyncio
    async def test_no_candidates_raises_empty_result_error(self):
        body = {"candidates": []}
        mock_response = _make_httpx_response(200, body)
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiEmptyResultError, match="Could not identify"):
                await classify_image("dGVzdA==")

    @pytest.mark.asyncio
    async def test_no_parts_raises_empty_result_error(self):
        body = {"candidates": [{"content": {"parts": []}}]}
        mock_response = _make_httpx_response(200, body)
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiEmptyResultError, match="Could not identify"):
                await classify_image("dGVzdA==")

    @pytest.mark.asyncio
    async def test_whitespace_only_text_raises_empty_result_error(self):
        body = {"candidates": [{"content": {"parts": [{"text": "   "}]}}]}
        mock_response = _make_httpx_response(200, body)
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiEmptyResultError, match="Could not identify"):
                await classify_image("dGVzdA==")

    @pytest.mark.asyncio
    async def test_missing_candidates_key_raises_empty_result_error(self):
        body = {}
        mock_response = _make_httpx_response(200, body)
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("services.gemini_client.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(GeminiEmptyResultError, match="Could not identify"):
                await classify_image("dGVzdA==")


# ---------------------------------------------------------------------------
# Test: Missing API key
# ---------------------------------------------------------------------------

class TestClassifyImageMissingAPIKey:
    """Tests for missing GEMINI_API_KEY environment variable."""

    @pytest.mark.asyncio
    async def test_missing_api_key_raises_gemini_api_error(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)

        with pytest.raises(GeminiAPIError, match="GEMINI_API_KEY"):
            await classify_image("dGVzdA==")

    @pytest.mark.asyncio
    async def test_empty_api_key_raises_gemini_api_error(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "")

        with pytest.raises(GeminiAPIError, match="GEMINI_API_KEY"):
            await classify_image("dGVzdA==")
