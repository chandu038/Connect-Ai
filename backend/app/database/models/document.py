
"""College admission PDF documents and pgvector chunks."""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)

from pgvector.sqlalchemy import Vector

from app.database.base import Base


class AdmissionDocument(Base):
    __tablename__ = "admission_documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    college_id = Column(
        Integer,
        ForeignKey("colleges.id"),
        nullable=False,
        index=True,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    file_path = Column(
        String(500),
        nullable=False,
    )

    status = Column(
        String(30),
        nullable=False,
        default="draft",
    )

    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    college_id = Column(
        Integer,
        ForeignKey("colleges.id"),
        nullable=False,
        index=True,
    )

    document_id = Column(
        Integer,
        ForeignKey("admission_documents.id"),
        nullable=False,
        index=True,
    )

    page_number = Column(
        Integer,
        nullable=True,
    )

    content = Column(
        Text,
        nullable=False,
    )

    embedding = Column(
        Vector(1536),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
