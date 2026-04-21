"""API routes for the Last Message backend.

Provides the POST /analyze endpoint for image classification
and category mapping.
"""

import base64

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from api.models import AnalyzeRequest, AnalyzeResponse, AnalyzeErrorResponse
from services.gemini_client import (
    classify_image,
    GeminiAPIError,
    GeminiTimeoutError,
    GeminiEmptyResultError,
)
from services.category_mapper import map_to_category

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": AnalyzeErrorResponse},
        500: {"model": AnalyzeErrorResponse},
    },
)
async def analyze(request: AnalyzeRequest):
    """Accept a base64-encoded image, classify it, and return the label and category.

    Returns:
        AnalyzeResponse with the detected object label and its environmental category.

    Raises:
        400: If the image field is empty or contains invalid base64.
        500: If the Gemini Vision API fails, times out, or returns no result.
    """
    # Validate that the image field is not empty
    if not request.image or not request.image.strip():
        return JSONResponse(
            status_code=400,
            content=AnalyzeErrorResponse(
                error="Invalid request",
                detail="image field is required",
            ).model_dump(),
        )

    # Validate that the image is valid base64
    try:
        base64.b64decode(request.image, validate=True)
    except Exception:
        return JSONResponse(
            status_code=400,
            content=AnalyzeErrorResponse(
                error="Invalid image",
                detail="Image is not valid base64",
            ).model_dump(),
        )

    # Classify the image using Gemini Vision API
    try:
        label = await classify_image(request.image)
    except GeminiTimeoutError as exc:
        return JSONResponse(
            status_code=500,
            content=AnalyzeErrorResponse(
                error="Classification timeout",
                detail=str(exc),
            ).model_dump(),
        )
    except GeminiEmptyResultError as exc:
        return JSONResponse(
            status_code=500,
            content=AnalyzeErrorResponse(
                error="Classification failed",
                detail=str(exc),
            ).model_dump(),
        )
    except GeminiAPIError as exc:
        return JSONResponse(
            status_code=500,
            content=AnalyzeErrorResponse(
                error="Classification failed",
                detail=str(exc),
            ).model_dump(),
        )

    # Map the label to a category
    category = map_to_category(label)

    return AnalyzeResponse(label=label, category=category)
