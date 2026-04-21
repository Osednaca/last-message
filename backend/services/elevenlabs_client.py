"""ElevenLabs TTS client module.

Wraps the ElevenLabs Python SDK to convert text into base64-encoded
speech audio using the text_to_speech.convert() method.
"""

import os
import base64

from elevenlabs.client import ElevenLabs


VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"  # George voice
MODEL_ID = "eleven_flash_v2_5"


class ElevenLabsConfigError(Exception):
    """Raised when the API key is not configured."""


class ElevenLabsTTSError(Exception):
    """Raised when the TTS API call fails."""


def generate_speech(text: str) -> str:
    """Convert text to speech and return base64-encoded audio.

    Args:
        text: The text to convert (1-200 characters).

    Returns:
        Base64-encoded audio string.

    Raises:
        ElevenLabsConfigError: If ELEVENLABS_API_KEY is not set.
        ElevenLabsTTSError: If the API call fails.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise ElevenLabsConfigError("ElevenLabs API key not configured")

    try:
        client = ElevenLabs(api_key=api_key)
        audio_iterator = client.text_to_speech.convert(
            voice_id=VOICE_ID,
            model_id=MODEL_ID,
            text=text,
        )
        audio_bytes = b"".join(audio_iterator)
    except (ElevenLabsConfigError, ElevenLabsTTSError):
        raise
    except Exception as exc:
        raise ElevenLabsTTSError("Voice generation failed") from exc

    return base64.b64encode(audio_bytes).decode("utf-8")
