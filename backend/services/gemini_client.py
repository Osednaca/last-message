"""Gemini Vision Client module.

Sends base64-encoded images to the Google Gemini Vision API for
single-object identification and returns the detected object label.
"""

import os

import httpx


class GeminiAPIError(Exception):
    """Raised when the Gemini Vision API returns an error response."""


class GeminiTimeoutError(Exception):
    """Raised when the Gemini Vision API request times out."""


class GeminiEmptyResultError(Exception):
    """Raised when the Gemini Vision API returns no object label."""


_GEMINI_MODEL = "gemini-3-flash-preview"
_GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent"
)
_PROMPT = (
    "Identify the single most prominent real-world object in this image. "
    "Return ONLY the object name as a short lowercase label, nothing else. "
    "For example: bottle, tree, car, sky, river."
)
_TIMEOUT_SECONDS = 10.0


async def classify_image(image_base64: str) -> str:
    """Send a base64-encoded image to Gemini Vision API for classification.

    Args:
        image_base64: The base64-encoded image string (without data URI prefix).

    Returns:
        A lowercase object label string identified in the image.

    Raises:
        GeminiAPIError: If the API returns a non-200 status or an error payload.
        GeminiTimeoutError: If the request exceeds the timeout.
        GeminiEmptyResultError: If the API response contains no object label.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise GeminiAPIError("GEMINI_API_KEY environment variable is not set")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": _PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64,
                        }
                    },
                ]
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            response = await client.post(
                _GEMINI_API_URL,
                params={"key": api_key},
                json=payload,
            )
    except httpx.TimeoutException as exc:
        raise GeminiTimeoutError("Gemini API did not respond in time") from exc
    except httpx.HTTPError as exc:
        raise GeminiAPIError(f"HTTP error communicating with Gemini API: {exc}") from exc

    if response.status_code != 200:
        raise GeminiAPIError(
            f"Gemini API returned status {response.status_code}: {response.text}"
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise GeminiAPIError("Gemini API returned invalid JSON") from exc

    # Extract the text content from the Gemini response structure
    label = _extract_label(data)
    if not label:
        raise GeminiEmptyResultError("Could not identify object in image")

    return label


def _extract_label(data: dict) -> str:
    """Extract the object label from a Gemini API response.

    The response structure is:
    {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "bottle"}]
                }
            }
        ]
    }

    Returns:
        The extracted label string, stripped and lowercased, or empty string
        if extraction fails.
    """
    try:
        candidates = data.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return ""
        text = parts[0].get("text", "")
        return text.strip().lower()
    except (IndexError, AttributeError, TypeError):
        return ""
