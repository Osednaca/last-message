"""Legacy mode routes for text-to-speech generation and voice cloning.

Provides the POST /legacy/generate endpoint for converting text
to speech via the ElevenLabs API, and the POST /legacy/clone endpoint
for voice cloning with text-to-speech generation.
"""

import logging

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

from api.models import (
    LegacyGenerateRequest,
    LegacyGenerateResponse,
    LegacyCloneResponse,
    LegacyErrorResponse,
)
from services.elevenlabs_client import (
    generate_speech,
    clone_voice_and_generate,
    ElevenLabsConfigError,
    ElevenLabsTTSError,
    ElevenLabsVoiceCloneError,
)

logger = logging.getLogger(__name__)

legacy_router = APIRouter(prefix="/legacy", tags=["legacy"])


@legacy_router.post(
    "/generate",
    response_model=LegacyGenerateResponse,
    responses={
        400: {"model": LegacyErrorResponse},
        500: {"model": LegacyErrorResponse},
    },
)
async def generate_legacy_speech(request: LegacyGenerateRequest):
    """Accept text and return base64-encoded TTS audio.

    Returns:
        LegacyGenerateResponse with the base64-encoded audio data.

    Raises:
        400: If the text field is empty or exceeds 200 characters.
        500: If the ElevenLabs API key is missing or the API call fails.
    """
    # Validate that text is not empty or whitespace-only
    if not request.text or not request.text.strip():
        return JSONResponse(
            status_code=400,
            content=LegacyErrorResponse(error="Text field is required").model_dump(),
        )

    # Validate text length
    if len(request.text) > 200:
        return JSONResponse(
            status_code=400,
            content=LegacyErrorResponse(error="Text exceeds 200 character limit").model_dump(),
        )

    # Generate speech via ElevenLabs
    try:
        audio_base64 = generate_speech(request.text)
    except ElevenLabsConfigError:
        return JSONResponse(
            status_code=500,
            content=LegacyErrorResponse(error="ElevenLabs API key not configured").model_dump(),
        )
    except ElevenLabsTTSError:
        return JSONResponse(
            status_code=500,
            content=LegacyErrorResponse(error="Voice generation failed").model_dump(),
        )

    return LegacyGenerateResponse(audio_base64=audio_base64)


@legacy_router.post(
    "/clone",
    response_model=LegacyCloneResponse,
    responses={
        400: {"model": LegacyErrorResponse},
        500: {"model": LegacyErrorResponse},
    },
)
async def clone_voice(audio: UploadFile = File(...), text: str = Form("")):
    """Accept a voice sample and optional text, return base64-encoded TTS audio from a cloned voice.

    Request: multipart/form-data
        - audio: Audio file (WAV or WebM), required
        - text: Message text (optional, defaults to empty string)

    Returns:
        LegacyCloneResponse with the base64-encoded audio data.

    Raises:
        400: If the audio file is missing or empty.
        500: If the ElevenLabs API key is missing, cloning fails, or TTS fails.
    """
    # Validate that audio file is present and non-empty
    audio_bytes = await audio.read()
    if not audio_bytes:
        return JSONResponse(
            status_code=400,
            content=LegacyErrorResponse(error="Audio file is required").model_dump(),
        )

    filename = audio.filename or "voice-sample.webm"

    try:
        audio_base64 = clone_voice_and_generate(audio_bytes, filename, text)
    except ElevenLabsConfigError as exc:
        logger.error("Clone endpoint: API key not configured: %s", exc)
        return JSONResponse(
            status_code=500,
            content=LegacyErrorResponse(error="ElevenLabs API key not configured").model_dump(),
        )
    except ElevenLabsVoiceCloneError as exc:
        logger.error("Clone endpoint: Voice cloning failed: %s", exc)
        return JSONResponse(
            status_code=500,
            content=LegacyErrorResponse(error="Voice cloning failed").model_dump(),
        )
    except ElevenLabsTTSError as exc:
        logger.error("Clone endpoint: TTS generation failed: %s", exc)
        return JSONResponse(
            status_code=500,
            content=LegacyErrorResponse(error="Voice generation failed").model_dump(),
        )

    return LegacyCloneResponse(audio_base64=audio_base64)
