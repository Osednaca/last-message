# Feature: legacy-elevenlabs-tts, Property 3: Backend text validation rejects invalid input
"""Property-based tests for the POST /legacy/generate endpoint text validation.

**Validates: Requirements 3.5, 3.6**

Uses hypothesis to verify that:
- Empty or whitespace-only text returns 400 "Text field is required"
- Text exceeding 200 characters returns 400 "Text exceeds 200 character limit"
"""

import asyncio
from unittest.mock import patch

import httpx
import pytest
from hypothesis import given, settings, strategies as st

from main import app

BASE_URL = "http://testserver"


def run_async(coro):
    """Run an async coroutine synchronously."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _post_generate(text: str) -> httpx.Response:
    """POST to /legacy/generate with the given text and return the response."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url=BASE_URL) as client:
        return await client.post("/legacy/generate", json={"text": text})


# Strategy: generate empty strings (just the literal empty string)
empty_strings = st.just("")

# Strategy: generate whitespace-only strings (spaces, tabs, newlines, etc.)
whitespace_only = st.text(
    alphabet=st.sampled_from([" ", "\t", "\n", "\r", "\x0b", "\x0c"]),
    min_size=1,
    max_size=50,
)

# Strategy: combine empty and whitespace-only strings
empty_or_whitespace = st.one_of(empty_strings, whitespace_only)

# Strategy: generate strings that exceed the 200-character limit
too_long_strings = st.text(min_size=201, max_size=1000)


class TestBackendTextValidationProperty:
    """Property 3: Backend text validation rejects invalid input."""

    @settings(max_examples=100)
    @given(text=empty_or_whitespace)
    def test_empty_or_whitespace_text_returns_400_text_required(self, text: str) -> None:
        """For any empty or whitespace-only string, the endpoint returns 400
        with error 'Text field is required'."""
        with patch("api.legacy_routes.generate_speech", return_value="dGVzdA=="):
            response = run_async(_post_generate(text))

        assert response.status_code == 400, (
            f"Expected 400 for text={text!r}, got {response.status_code}"
        )
        body = response.json()
        assert body["error"] == "Text field is required", (
            f"Expected 'Text field is required' for text={text!r}, got {body['error']!r}"
        )

    @settings(max_examples=100)
    @given(text=too_long_strings)
    def test_text_exceeding_200_chars_returns_400_limit_exceeded(self, text: str) -> None:
        """For any string longer than 200 characters, the endpoint returns 400
        with error 'Text exceeds 200 character limit'."""
        with patch("api.legacy_routes.generate_speech", return_value="dGVzdA=="):
            response = run_async(_post_generate(text))

        assert response.status_code == 400, (
            f"Expected 400 for text of length {len(text)}, got {response.status_code}"
        )
        body = response.json()
        assert body["error"] == "Text exceeds 200 character limit", (
            f"Expected 'Text exceeds 200 character limit' for text of length {len(text)}, "
            f"got {body['error']!r}"
        )
