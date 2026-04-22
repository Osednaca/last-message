"""ElevenLabs TTS client module.

Wraps the ElevenLabs Python SDK to convert text into base64-encoded
speech audio using the text_to_speech.convert() method.
"""

import io
import os
import base64
import logging

from elevenlabs.client import ElevenLabs

logger = logging.getLogger(__name__)


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


class ElevenLabsVoiceCloneError(Exception):
    """Raised when voice cloning fails."""


def clone_voice_and_generate(audio_bytes: bytes, filename: str, text: str) -> str:
    """Clone a voice from audio, generate TTS, delete the clone, return base64 audio.

    Args:
        audio_bytes: Raw audio file bytes from the uploaded voice sample.
        filename: Original filename (used for MIME type detection).
        text: Message text to synthesize with the cloned voice.

    Returns:
        Base64-encoded audio string.

    Raises:
        ElevenLabsConfigError: If ELEVENLABS_API_KEY is not set.
        ElevenLabsVoiceCloneError: If voice cloning fails.
        ElevenLabsTTSError: If TTS generation fails after successful cloning.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise ElevenLabsConfigError("ElevenLabs API key not configured")

    client = ElevenLabs(api_key=api_key)

    # Derive MIME type from filename extension for the SDK
    mime_type = "audio/mpeg"
    if filename.lower().endswith(".webm"):
        mime_type = "audio/webm"
    elif filename.lower().endswith(".wav"):
        mime_type = "audio/wav"
    elif filename.lower().endswith(".mp3"):
        mime_type = "audio/mpeg"
    elif filename.lower().endswith(".ogg"):
        mime_type = "audio/ogg"

    # Wrap raw bytes in file-like objects (BytesIO) — the ElevenLabs SDK
    # expects file objects, not plain bytes, for the `files` parameter.
    files = [(filename, io.BytesIO(audio_bytes))]

    voice_id = None
    try:
        logger.info("Starting voice clone with %d bytes, filename=%s, mime=%s", len(audio_bytes), filename, mime_type)
        response = client.voices.add(
            name="temp-voice-imprint",
            files=files,
        )
        voice_id = response.voice_id
        logger.info("Voice clone successful, voice_id=%s", voice_id)
    except Exception as exc:
        logger.exception("Voice cloning failed with SDK error")
        raise ElevenLabsVoiceCloneError(f"Voice cloning failed: {exc}") from exc

    try:
        audio_iterator = client.text_to_speech.convert(
            voice_id=voice_id,
            model_id=MODEL_ID,
            text=text,
        )
        result_bytes = b"".join(audio_iterator)
    except Exception as exc:
        logger.exception("TTS generation failed after successful clone")
        raise ElevenLabsTTSError("Voice generation failed") from exc
    finally:
        if voice_id:
            try:
                client.voices.delete(voice_id=voice_id)
                logger.info("Deleted temporary voice %s", voice_id)
            except Exception:
                pass  # Best-effort cleanup; voice will expire on ElevenLabs side

    return base64.b64encode(result_bytes).decode("utf-8")
