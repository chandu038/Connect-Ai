
import base64
import logging
import os

import httpx
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.permissions import require_roles
from app.database.models.user import User


load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/student/voice",
    tags=["Student Voice"],
)

SARVAM_BASE_URL = "https://api.sarvam.ai"

SUPPORTED_LANGUAGES = {"en-IN", "te-IN"}

MAX_AUDIO_BYTES = 6 * 1024 * 1024

SUPPORTED_AUDIO_TYPES = {
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/aac",
    "audio/flac",
}


class SpeakRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=2500,
    )

    language_code: str = "en-IN"


def sarvam_key() -> str:
    key = os.getenv("SARVAM_API_KEY", "").strip()

    if not key:
        raise HTTPException(
            status_code=503,
            detail="SARVAM_API_KEY is not configured",
        )

    return key


def sarvam_headers() -> dict:
    return {
        "api-subscription-key": sarvam_key(),
    }


def sarvam_error(response: httpx.Response):
    logger.error(
        "Sarvam returned status %s: %s",
        response.status_code,
        response.text[:500],
    )

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=502,
            detail="Sarvam rejected the configured API key",
        )

    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="Sarvam rate limit exceeded",
        )

    if response.status_code in (400, 413, 415, 422):
        raise HTTPException(
            status_code=422,
            detail="Sarvam rejected the request",
        )

    raise HTTPException(
        status_code=502,
        detail="Sarvam service is unavailable",
    )


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language_code: str = Query(default="unknown"),
    current_user: User = Depends(
        require_roles("applicant", "student", "parent")
    ),
):
    """
    Detect whether a student speaks English
    or Telugu, and return their spoken words.
    """

    if language_code not in {
        "unknown",
        "en-IN",
        "te-IN",
    }:
        raise HTTPException(
            status_code=422,
            detail="Unsupported language selection",
        )

    content_type = (
        (file.content_type or "")
        .split(";")[0]
        .strip()
        .lower()
    )

    if content_type not in SUPPORTED_AUDIO_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported audio format",
        )

    audio = await file.read(MAX_AUDIO_BYTES + 1)
    await file.close()

    if not audio:
        raise HTTPException(
            status_code=400,
            detail="Recording is empty",
        )

    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Audio exceeds 6 MB",
        )

    try:
        async with httpx.AsyncClient(
            timeout=60,
        ) as client:
            response = await client.post(
                f"{SARVAM_BASE_URL}/speech-to-text",
                headers=sarvam_headers(),
                data={
                    "model": "saaras:v4",
                    "mode": "transcribe",
                    "language_code": language_code,
                },
                files={
                    "file": (
                        file.filename or "question.webm",
                        audio,
                        content_type,
                    ),
                },
            )

    except httpx.RequestError as exc:
        logger.exception("Speech transcription failed")
        raise HTTPException(
            status_code=502,
            detail="Cannot connect to speech service",
        ) from exc

    if not response.is_success:
        sarvam_error(response)

    try:
        data = response.json()

        transcript = str(
            data.get("transcript") or ""
        ).strip()

        detected = data.get("language_code")

        confidence = data.get(
            "language_probability"
        )

    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Invalid transcription response",
        ) from exc

    if not transcript:
        raise HTTPException(
            status_code=422,
            detail="No speech recognized",
        )

    if detected not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=422,
            detail=(
                "This assistant currently supports "
                "English and Telugu."
            ),
        )

    return {
        "transcript": transcript,
        "language_code": detected,
        "language_probability": confidence,
    }


@router.post("/speak")
async def generate_speech(
    request: SpeakRequest,
    current_user: User = Depends(
        require_roles("applicant", "student", "parent")
    ),
):
    """
    Speak the AI answer in the language already
    generated by the chat service.
    """

    if request.language_code not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=422,
            detail="Unsupported speech language",
        )

    text = request.text.strip()

    speaker = os.getenv(
        "SARVAM_SPEAKER",
        "pooja",
    ).strip().lower()

    if speaker not in {"pooja", "kavya"}:
        raise HTTPException(
            status_code=503,
            detail="Unsupported configured speaker",
        )

    payload = {
        "text": text,
        "language_code": request.language_code,
        "model": "bulbul:v3",
        "speaker": speaker,
        "pace": 1.0,
        "output_audio_codec": "wav",
        "speech_sample_rate": 24000,
    }

    try:
        async with httpx.AsyncClient(
            timeout=60,
        ) as client:
            response = await client.post(
                f"{SARVAM_BASE_URL}/text-to-speech",
                headers={
                    **sarvam_headers(),
                    "Content-Type": "application/json",
                },
                json=payload,
            )

    except httpx.RequestError as exc:
        logger.exception("Speech generation failed")
        raise HTTPException(
            status_code=502,
            detail="Cannot connect to speech service",
        ) from exc

    if not response.is_success:
        sarvam_error(response)

    try:
        data = response.json()

        encoded = data["audios"][0]

        audio_bytes = base64.b64decode(
            encoded,
            validate=True,
        )

        if not audio_bytes:
            raise ValueError("Empty audio")

    except (
        ValueError,
        KeyError,
        IndexError,
        TypeError,
    ) as exc:
        raise HTTPException(
            status_code=502,
            detail="Invalid audio returned by Sarvam",
        ) from exc

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "Cache-Control": "no-store",
        },
    )
