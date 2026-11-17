
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
)


splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_pages(pages: list[dict]) -> list[dict]:
    chunks = []

    for page in pages:
        page_chunks = splitter.split_text(
            page["content"]
        )

        for chunk_index, content in enumerate(
            page_chunks, start=1
        ):
            chunks.append(
                {
                    "page_number": page["page_number"],
                    "chunk_index": chunk_index,
                    "content": content,
                }
            )

    return chunks
