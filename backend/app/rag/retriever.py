
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models.document import (
    AdmissionDocument,
    DocumentChunk,
)
from app.rag.embeddings import get_embedding_model


def search_documents(
    db: Session,
    college_id: int,
    question: str,
    limit: int = 5,
) -> list[dict]:
    if not question.strip():
        raise ValueError("Question cannot be empty")

    embedding_model = get_embedding_model()
    question_vector = embedding_model.embed_query(question)

    distance = DocumentChunk.embedding.cosine_distance(
        question_vector
    )

    statement = (
        select(
            DocumentChunk,
            AdmissionDocument.title,
            distance.label("distance"),
        )
        .join(
            AdmissionDocument,
            DocumentChunk.document_id == AdmissionDocument.id,
        )
        .where(
            DocumentChunk.college_id == college_id,
            AdmissionDocument.college_id == college_id,
            AdmissionDocument.status == "published",
            DocumentChunk.embedding.is_not(None),
        )
        .order_by(distance)
        .limit(max(1, min(limit, 10)))
    )

    rows = db.execute(statement).all()

    return [
        {
            "document_id": chunk.document_id,
            "document_title": title,
            "page_number": chunk.page_number,
            "content": chunk.content,
            "similarity": round(
                max(0.0, 1.0 - float(distance_value)),
                4,
            ),
        }
        for chunk, title, distance_value in rows
    ]
