"""Configuration management via pydantic-settings."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_name: str = "RepoMind"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "postgresql+asyncpg://repomind:repomind@localhost:5432/repomind"
    database_url_sync: str = "postgresql://repomind:repomind@localhost:5432/repomind"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM Provider
    llm_provider: Literal["gemini", "openai", "ollama", "nvidia"] = "nvidia"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    nvidia_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    # Embeddings
    embedding_provider: Literal["gemini", "openai", "ollama"] = "gemini"
    embedding_model: str = "text-embedding-004"
    embedding_dimension: int = 768

    # LLM Model
    llm_model: str = "meta/llama-3.1-70b-instruct"

    # Repository storage
    repos_dir: str = "./repos"

    # CORS
    allowed_origins: str = "http://localhost:3000"

    # Rate limiting
    rate_limit_per_minute: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
