
from app.ai.basic_response import get_basic_response
from app.ai.followup_generator import generate_followups


def get_local_response(question: str) -> dict | None:
    answer = get_basic_response(question)

    if answer is None:
        return None

    return {
        "answer": answer,
        "sources": [],
        "needs_support": False,
        "followups": [],
    }


async def build_rag_response(
    *,
    question: str,
    answer: str,
    sources: list,
    retrieved_context: str,
    needs_support: bool = False,
    previous_questions: list[str] | None = None,
) -> dict:

    followups = []

    if not needs_support and sources:
        followups = await generate_followups(
            question=question,
            answer=answer,
            retrieved_context=retrieved_context,
            previous_questions=previous_questions,
        )

    return {
        "answer": answer,
        "sources": sources,
        "needs_support": needs_support,
        "followups": followups,
    }
