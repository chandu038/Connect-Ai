
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database.models.document import (
    AdmissionDocument,
    DocumentChunk,
)
from app.rag.document_loader import load_pdf
from app.rag.chunking import chunk_pages
from app.rag.embeddings import generate_embeddings


def ingest_document(
    db: Session,
    document_id: int,
    college_id: int,
) -> dict:
    document = db.scalar(
        select(AdmissionDocument).where(
            AdmissionDocument.id == document_id,
            AdmissionDocument.college_id == college_id,
        )
    )

    if document is None:
        raise ValueError("Document not found")

    if document.status != "draft":
        raise ValueError(
            "Only draft documents can be processed"
        )

    pages = load_pdf(document.file_path)
    chunks = chunk_pages(pages)

    if not chunks:
        raise ValueError(
            "No extractable text found in the PDF"
        )

    texts = [chunk["content"] for chunk in chunks]

    # Generate embeddings before changing database records.
    embeddings = generate_embeddings(texts)

    if len(embeddings) != len(chunks):
        raise RuntimeError("Embedding count mismatch")

    if any(len(vector) != 1536 for vector in embeddings):
        raise RuntimeError(
            "Embedding dimensions must be 1536"
        )

    try:
        # Reprocessing replaces old chunks for this document.
        db.execute(
            delete(DocumentChunk).where(
                DocumentChunk.document_id == document.id,
                DocumentChunk.college_id == college_id,
            )
        )

        for chunk, vector in zip(chunks, embeddings):
            record = DocumentChunk(
    college_id=college_id,
    document_id=document.id,
    page_number=chunk["page_number"],
    content=chunk["content"],
    embedding=vector,
)

            db.add(record)

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "document_id": document.id,
        "college_id": college_id,
        "pages_processed": len(pages),
        "chunks_stored": len(chunks),
        "status": document.status,
    }
