from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://postgres:Agriva123@localhost:5432/agriva"
    )

    jwt_secret: str = "change-me"

    jwt_refresh_secret: str = "change-me-refresh"

    cors_origins: str = "http://localhost:3000"

    next_public_api_url: str = "http://localhost:8000"

    demo_mode: bool = True

    # Gemini / AGRIVA AI
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.7-flash"
    gemini_base_url: str = (
        "https://generativelanguage.googleapis.com/v1beta"
    )
    gemini_timeout_seconds: float = 45.0

    # Kept only so your old OpenAI settings do not break config loading.
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.6-luna"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_timeout_seconds: float = 45.0

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


