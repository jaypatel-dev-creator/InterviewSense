from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Google Gemini
    google_api_key: str
    groq_api_key: str

    # ElevenLabs
    elevenlabs_api_key: str
    elevenlabs_voice_id: str

    # App
    app_env: str = "development"
    allowed_origins: list[str] = ["http://localhost:5173"]
    
    # Database
    sqlite_db_path: str = "./data/sessions/interviewsense.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()