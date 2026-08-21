from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://agriva:agriva@localhost:5432/agriva"
    )

    jwt_secret: str = "change-me"

    jwt_refresh_secret: str = "change-me-refresh"

    cors_origins: str = "http://localhost:3000"

    next_public_api_url: str = "http://localhost:8000"

    demo_mode: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
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