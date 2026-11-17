
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    APP_NAME: str = "Connect-Ai"
    DEBUG: bool = True

    DATABASE_URL: str

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4.1-mini"
    OPENAI_EMBEDDING_MODEL: str = (
        "text-embedding-3-small"
    )

    JWT_SECRET_KEY: str | None = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None

    # ======================================
    # OFFICIAL WEB SEARCH
    # ======================================

    WEB_SEARCH_ENABLED: bool = False

    TAVILY_API_KEY: str | None = None

    # Name of the college this deployment serves.
    COLLEGE_OFFICIAL_NAME: str = ""

    # Comma-separated, trusted domains.
    # Example: college.edu.in,ap.gov.in
    WEB_SEARCH_ALLOWED_DOMAINS: str = ""

    WEB_SEARCH_MAX_RESULTS: int = 5

    WEB_SEARCH_TIMEOUT_SECONDS: int = 12

    @property
    def web_allowed_domains(self) -> list[str]:
        return [
            domain.strip().lower()
            for domain in
            self.WEB_SEARCH_ALLOWED_DOMAINS.split(",")
            if domain.strip()
        ]

    @property
    def web_search_ready(self) -> bool:
        return (
            self.WEB_SEARCH_ENABLED
            and bool(self.TAVILY_API_KEY)
            and bool(self.COLLEGE_OFFICIAL_NAME.strip())
            and bool(self.web_allowed_domains)
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
