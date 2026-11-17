
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

UPLOAD_DIR = (
    Path(__file__).resolve().parents[2] / "uploads"
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


async def save_pdf(file: UploadFile) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are allowed")

    filename = f"{uuid4().hex}.pdf"
    destination = UPLOAD_DIR / filename

    size = 0

    try:
        with destination.open("wb") as output:
            first_chunk = True

            while chunk := await file.read(1024 * 1024):
                size += len(chunk)

                if size > MAX_FILE_SIZE:
                    raise ValueError("PDF must be smaller than 10 MB")

                if first_chunk:
                    if not chunk.startswith(b"%PDF-"):
                        raise ValueError("Invalid PDF file")
                    first_chunk = False

                output.write(chunk)

        if size == 0:
            raise ValueError("PDF cannot be empty")

        return str(destination)

    except Exception:
        destination.unlink(missing_ok=True)
        raise

    finally:
        await file.close()
