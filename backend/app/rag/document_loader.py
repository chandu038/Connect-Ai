
from pathlib import Path

from pypdf import PdfReader


def load_pdf(file_path: str) -> list[dict]:
    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(
            f"PDF file not found: {file_path}"
        )

    reader = PdfReader(str(path))
    pages = []

    for page_number, page in enumerate(
        reader.pages, start=1
    ):
        text = page.extract_text() or ""
        text = text.strip()

        if not text:
            continue

        pages.append(
            {
                "page_number": page_number,
                "content": text,
            }
        )

    return pages
