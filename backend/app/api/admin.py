
import logging

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database.connection import get_db
from app.database.models.user import User

from app.database.models.document import (
    AdmissionDocument,
    DocumentChunk,
)

from app.storage.local_storage import save_pdf
from app.rag.ingestion import ingest_document
from app.rag.retriever import search_documents

from app.schemas.chat import (
    ChatRequest,
    SearchRequest,
)

from app.ai.chat_service import answer_question


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin - Knowledge Base"],
)


# ==========================================
# REQUEST MODELS
# ==========================================

class RenameDocumentRequest(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=255,
    )


# ==========================================
# GET DOCUMENT FOR CURRENT COLLEGE
# ==========================================

def get_document_or_404(
    db: Session,
    document_id: int,
    college_id: int,
) -> AdmissionDocument:

    document = db.scalar(
        select(AdmissionDocument).where(
            AdmissionDocument.id == document_id,
            AdmissionDocument.college_id == college_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return document


# ==========================================
# DOCUMENT RESPONSE / STATISTICS
# ==========================================

def document_response(
    db: Session,
    document: AdmissionDocument,
    college_id: int,
) -> dict:

    total_chunks = db.scalar(
        select(
            func.count(DocumentChunk.id)
        ).where(
            DocumentChunk.document_id == document.id,
            DocumentChunk.college_id == college_id,
        )
    ) or 0

    total_embeddings = db.scalar(
        select(
            func.count(DocumentChunk.id)
        ).where(
            DocumentChunk.document_id == document.id,
            DocumentChunk.college_id == college_id,
            DocumentChunk.embedding.is_not(None),
        )
    ) or 0

    return {
        "id": document.id,
        "document_id": document.id,
        "title": document.title,
        "status": document.status,
        "uploaded_at": document.uploaded_at,
        "created_at": document.uploaded_at,
        "total_chunks": total_chunks,
        "total_embeddings": total_embeddings,
    }


# ==========================================
# ADMIN PROFILE
# ==========================================

@router.get("/me")
def admin_profile(
    current_user: User = Depends(
        require_roles("admin")
    ),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "college_id": current_user.college_id,
    }


# ==========================================
# LIST ALL COLLEGE DOCUMENTS
# ==========================================

@router.get("/documents")
def list_documents(
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    documents = db.scalars(
        select(AdmissionDocument)
        .where(
            AdmissionDocument.college_id ==
            current_user.college_id
        )
        .order_by(
            AdmissionDocument.id.desc()
        )
    ).all()

    return [
        document_response(
            db=db,
            document=document,
            college_id=current_user.college_id,
        )
        for document in documents
    ]


# ==========================================
# UPLOAD DOCUMENT
# ==========================================

@router.post(
    "/documents/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_admission_document(
    file: UploadFile = File(...),
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    filename = file.filename or ""

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF documents are supported",
        )

    try:
        saved_path = await save_pdf(file)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    document = AdmissionDocument(
        college_id=current_user.college_id,
        title=filename,
        file_path=str(saved_path),
        status="draft",
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to save uploaded document"
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to save document",
        )

    return {
        "message": "PDF uploaded successfully",
        **document_response(
            db,
            document,
            current_user.college_id,
        ),
    }


# ==========================================
# PROCESS DOCUMENT / CREATE EMBEDDINGS
# ==========================================

@router.post("/documents/{document_id}/process")
def process_document(
    document_id: int,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(
        db,
        document_id,
        current_user.college_id,
    )

    if document.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Only draft documents can be processed",
        )

    try:
        result = ingest_document(
            db=db,
            document_id=document.id,
            college_id=current_user.college_id,
        )

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception:
        db.rollback()
        logger.exception(
            "Document processing failed: %s",
            document_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to process document",
        )

    db.refresh(document)

    return {
        "message": "Document processed successfully",
        **document_response(
            db,
            document,
            current_user.college_id,
        ),
        "processing_result": result,
    }


# ==========================================
# DOCUMENT STATUS
# ==========================================

@router.get("/documents/{document_id}/status")
def get_document_status(
    document_id: int,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(
        db,
        document_id,
        current_user.college_id,
    )

    return document_response(
        db,
        document,
        current_user.college_id,
    )


# ==========================================
# RENAME DOCUMENT
# ==========================================

@router.patch("/documents/{document_id}")
def rename_document(
    document_id: int,
    payload: RenameDocumentRequest,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(
        db,
        document_id,
        current_user.college_id,
    )

    new_title = payload.title.strip()

    if not new_title:
        raise HTTPException(
            status_code=422,
            detail="Document name cannot be empty",
        )

    if new_title == document.title:
        return {
            "message": "Document name is unchanged",
            **document_response(
                db,
                document,
                current_user.college_id,
            ),
        }

    document.title = new_title

    try:
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to rename document %s",
            document_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to rename document",
        )

    return {
        "message": "Document renamed successfully",
        **document_response(
            db,
            document,
            current_user.college_id,
        ),
    }


# ==========================================
# PUBLISH DOCUMENT
# ==========================================

@router.post("/documents/{document_id}/publish")
def publish_document(
    document_id: int,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(
        db,
        document_id,
        current_user.college_id,
    )

    if document.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Only draft documents can be published",
        )

    total_embeddings = db.scalar(
        select(
            func.count(DocumentChunk.id)
        ).where(
            DocumentChunk.document_id == document.id,
            DocumentChunk.college_id ==
            current_user.college_id,
            DocumentChunk.embedding.is_not(None),
        )
    ) or 0

    if total_embeddings == 0:
        raise HTTPException(
            status_code=400,
            detail="Process the PDF before publishing",
        )

    document.status = "published"

    try:
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to publish document %s",
            document_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to publish document",
        )

    return {
        "message": "Document published successfully",
        **document_response(
            db,
            document,
            current_user.college_id,
        ),
    }


# ==========================================
# ARCHIVE DOCUMENT
# ==========================================

@router.post("/documents/{document_id}/archive")
def archive_document(
    document_id: int,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(
        db,
        document_id,
        current_user.college_id,
    )

    if document.status != "published":
        raise HTTPException(
            status_code=400,
            detail="Only published documents can be archived",
        )

    document.status = "archived"

    try:
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to archive document %s",
            document_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to archive document",
        )

    return {
        "message": "Document archived successfully",
        **document_response(
            db,
            document,
            current_user.college_id,
        ),
    }


# ==========================================
# DELETE DOCUMENT AND ITS CHUNKS
# ==========================================

@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(
        db,
        document_id,
        current_user.college_id,
    )

    try:
        # Embeddings are stored on DocumentChunk.
        # Delete the chunks before the parent row.
        db.execute(
            delete(DocumentChunk).where(
                DocumentChunk.document_id ==
                document.id,
                DocumentChunk.college_id ==
                current_user.college_id,
            )
        )

        db.delete(document)
        db.commit()

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to delete document %s",
            document_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to delete document",
        )

    # The PDF file itself is intentionally left
    # untouched. Safe file cleanup can be added
    # after reviewing the storage implementation.
    return {
        "message": (
            "Document and indexed chunks deleted. "
            "The stored PDF file was retained."
        ),
        "document_id": document_id,
    }


# ==========================================
# TEST RAG DOCUMENT SEARCH
# ==========================================

@router.post("/documents/search")
def search_admission_documents(
    request: SearchRequest,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    results = search_documents(
        db=db,
        college_id=current_user.college_id,
        question=request.question,
        limit=request.limit,
    )

    return {
        "question": request.question,
        "total_results": len(results),
        "results": results,
    }


# ==========================================
# ADMIN AI TEST
# ==========================================

@router.post("/ai/ask")
def ask_ai(
    request: ChatRequest,
    current_user: User = Depends(
        require_roles("admin")
    ),
    db: Session = Depends(get_db),
):
    return answer_question(
        db=db,
        college_id=current_user.college_id,
        question=request.question,
        history=[
            message.model_dump()
            for message in request.history
        ],
    )
