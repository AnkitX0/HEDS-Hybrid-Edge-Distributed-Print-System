from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    APP_ENV: str = "development"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "HEDS - Hybrid Edge Distributed Print System"

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    SECRET_KEY: str = "heds-super-secret-key-change-in-production-min32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    POSTGRES_USER: str = "heds_user"
    POSTGRES_PASSWORD: str = "heds_secure_password"
    POSTGRES_DB: str = "heds_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://heds_user:heds_secure_password@localhost:5432/heds_db"
    SYNC_DATABASE_URL: str = "postgresql://heds_user:heds_secure_password@localhost:5432/heds_db"

    STORAGE_BACKEND: str = "local"  # "local", "minio", "s3"
    STORAGE_LOCAL_DIR: str = "./storage_data"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "heds-documents"
    MINIO_SECURE: bool = False

    PAYMENT_GATEWAY: str = "mock"  # "mock", "razorpay"
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Lease and timing defaults
    JOB_LEASE_DURATION_SECONDS: int = 60
    AGENT_HEARTBEAT_TIMEOUT_SECONDS: int = 45
    DOCUMENT_RETENTION_HOURS: int = 24

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
    ]


settings = Settings()
