from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "AutoAppSec"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "changethisdevsecret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # DATABASE
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/autoappsec"

    # REDIS / CELERY
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(i).rstrip("/") for i in parsed]
            except Exception:
                pass
            return [i.strip().rstrip("/") for i in v.split(",")]
        return [str(i).rstrip("/") for i in v]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
