"""Legacy mode routes for text-to-speech generation.

Provides the POST /legacy/generate endpoint for converting text
to speech via the ElevenLabs API.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from api.models import LegacyGenerateRequest, LegacyGenerateResponse, LegacyErrorResponse
from services.elevenlabs_client import (
    generate_speech,
    ElevenLabsConfigError,
    ElevenLabsTTSError,
)

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
