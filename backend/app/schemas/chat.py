
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
    model_validator,
)


LanguageCode = Literal[
    "en-IN",
    "te-IN",
]

MessageRole = Literal[
    "user",
    "assistant",
]

SourceType = Literal[
    "document",
    "web",
]


class HistoryMessage(BaseModel):
    role: MessageRole

    content: str = Field(
        min_length=1,
        max_length=2000,
    )


class ChatRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000,
    )

    language_code: LanguageCode = "en-IN"

    history: list[HistoryMessage] = Field(
        default_factory=list,
        max_length=8,
    )


class ChatSource(BaseModel):
    citation: str

    # Defaults preserve compatibility
    # with existing document citations.
    source_type: SourceType = "document"

    document_id: int | str | None = None

    document_title: str = ""

    page_number: int | None = None

    url: str | None = None

    @model_validator(mode="after")
    def validate_source(self):
        if self.source_type == "web":
            if (
                not self.url
                or not self.url.startswith("https://")
            ):
                raise ValueError(
                    "Web sources require an HTTPS URL"
                )

        if self.source_type == "document":
            if self.document_id is None:
                raise ValueError(
                    "PDF sources require document_id"
                )

        return self


class ChatResponse(BaseModel):
    answer: str

    sources: list[ChatSource] = Field(
        default_factory=list,
    )

    needs_support: bool = False

    followups: list[str] = Field(
        default_factory=list,
    )

    language_code: LanguageCode = "en-IN"


class SearchRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000,
    )

    limit: int = Field(
        default=5,
        ge=1,
        le=20,
    )
