
from sqlalchemy import select

from app.database.connection import SessionLocal
from app.database.models.document import AdmissionDocument
from app.rag.document_loader import load_pdf
from app.rag.chunking import chunk_pages


def test_pdf_processing():
    with SessionLocal() as db:
        document = db.scalar(
            select(AdmissionDocument)
            .order_by(AdmissionDocument.id.desc())
        )

        if document is None:
            print("No uploaded documents found.")
            return

        print("Document ID:", document.id)
        print("College ID:", document.college_id)
        print("Title:", document.title)

        pages = load_pdf(document.file_path)
        chunks = chunk_pages(pages)

        print("Pages with extractable text:", len(pages))
        print("Total chunks:", len(chunks))

        for chunk in chunks[:3]:
            print("\n-----------------------")
            print("Page:", chunk["page_number"])
            print("Chunk:", chunk["chunk_index"])
            print("Content:")
            print(chunk["content"][:500])


if __name__ == "__main__":
    test_pdf_processing()
