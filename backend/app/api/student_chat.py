
import hashlib
import logging
import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database.connection import get_db
from app.database.models.user import User
from app.database.models.student_question import (
    StudentQuestion,
)

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
)

from app.ai.chat_service import (
    answer_question_localized,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/student",
    tags=["Student - AI Chat"],
)

STUDENT_ROLES = (
    "applicant",
    "student",
    "parent",
)

SUPPORTED_LANGUAGES = {
    "en-IN",
    "te-IN",
}


# ==========================================
# NORMALIZE QUESTION FOR ANALYTICS
# ==========================================

def normalize_question(question: str) -> str:
    normalized = question.casefold().strip()

    normalized = re.sub(
        r"[^\w\s]",
        " ",
        normalized,
    )

    normalized = " ".join(
        normalized.split()
    )

    if len(normalized) > 255:
        digest = hashlib.sha256(
            normalized.encode("utf-8")
        ).hexdigest()[:16]

        normalized = (
            normalized[:238].rstrip()
            + "-"
            + digest
        )

    return normalized


# ==========================================
# EXTRACT ANSWER
# ==========================================

def extract_answer(result):
    if isinstance(result, str):
        return result

    if isinstance(result, dict):
        for key in (
            "answer",
            "response",
            "message",
            "reply",
        ):
            value = result.get(key)

            if isinstance(value, str):
                return value

    return None


# ==========================================
# CHECK SUPPORT FLAG
# ==========================================

def needs_human_support(result) -> bool:
    if not isinstance(result, dict):
        return False

    value = result.get("needs_support")

    return (
        value
        if isinstance(value, bool)
        else False
    )


# ==========================================
# STUDENT CHAT ENDPOINT
# ==========================================

@router.post(
    "/chat",
    response_model=ChatResponse,
)
def student_chat(
    request: ChatRequest,
    current_user: User = Depends(
        require_roles(*STUDENT_ROLES)
    ),
    db: Session = Depends(get_db),
):
    """
    Student and parent admissions chat.

    The response follows the language supplied
    by the voice transcription system.

    en-IN -> English
    te-IN -> Telugu

    The result is saved for support analytics.
    """

    # ======================================
    # VALIDATE QUESTION
    # ======================================

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=422,
            detail="Question cannot be empty",
        )

    if len(question) > 2000:
        raise HTTPException(
            status_code=422,
            detail="Question must be under 2000 characters",
        )

    # ======================================
    # LANGUAGE
    # ======================================

    language_code = request.language_code

    if language_code not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=422,
            detail="Only English and Telugu are supported",
        )

    # ======================================
    # AUTHENTICATED STUDENT
    # ======================================

    college_id = current_user.college_id
    student_id = current_user.id

    if college_id is None:
        raise HTTPException(
            status_code=403,
            detail="No college is assigned to this account",
        )

    # ======================================
    # CONVERSATION HISTORY
    # ======================================

    # History is used to understand follow-up
    # questions, not as a source of college facts.
    history = [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in request.history
    ]

    # ======================================
    # GENERATE LOCALIZED RAG ANSWER
    # ======================================

    try:
        result = answer_question_localized(
            db=db,
            college_id=college_id,
            question=question,
            history=history,
            language_code=language_code,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception(
            "Connect-Ai chat failed for student_id=%s",
            student_id,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to process the question",
        ) from exc

    if not isinstance(result, dict):
        raise HTTPException(
            status_code=502,
            detail="Unexpected AI response format",
        )

    # ======================================
    # GET FINAL LOCALIZED ANSWER
    # ======================================

    ai_answer = extract_answer(result)

    if not isinstance(ai_answer, str):
        raise HTTPException(
            status_code=502,
            detail="The assistant returned no answer",
        )

    ai_answer = ai_answer.strip()

    if not ai_answer:
        raise HTTPException(
            status_code=502,
            detail="The assistant returned an empty answer",
        )

    # This flag is preserved for the support
    # dashboard and analytics.
    support_required = needs_human_support(
        result
    )

    # ======================================
    # SAVE STUDENT QUESTION
    # ======================================

    question_record = StudentQuestion(
        college_id=college_id,
        student_id=student_id,
        question=question,
        question_key=normalize_question(
            question
        ),
        answer=ai_answer,
        needs_support=support_required,
    )

    try:
        db.add(question_record)
        db.commit()
        db.refresh(question_record)

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Unable to save question for student_id=%s",
            student_id,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to save the student question",
        ) from exc

    # ======================================
    # RETURN FINAL RESPONSE
    # ======================================

    return {
        "answer": ai_answer,
        "sources": result.get("sources") or [],
        "needs_support": support_required,
        "followups": result.get("followups") or [],
        "language_code": language_code,
    }