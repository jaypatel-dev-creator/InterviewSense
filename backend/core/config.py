from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Google Gemini
    google_api_key: str
    groq_api_key: str

    # ElevenLabs
    elevenlabs_api_key: str
    # No default — Rachel (21m00Tcm4TlvDq8ikWAM) is a library voice and
    # is blocked on the ElevenLabs free tier. Set ELEVENLABS_VOICE_ID in
    # .env to your custom Voice Design voice ID. 
    elevenlabs_voice_id: str

    # App
    app_env: str = "development"

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