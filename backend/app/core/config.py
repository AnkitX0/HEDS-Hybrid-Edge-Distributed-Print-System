from typing import List, Union, Optional
import json
import re
from pydantic import AnyHttpUrl, field_validator, model_validator
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

    # Storage Engine (local, minio, s3, r2)
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "./storage_data"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "heds-documents"
    MINIO_SECURE: bool = False

    # S3 / Cloudflare R2 specific aliases
    S3_ENDPOINT: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION: str = "auto"
    S3_SECURE: bool = True

    # Payments
    PAYMENT_GATEWAY: str = "mock"  # "mock", "razorpay"
    ALLOW_MOCK_PAYMENTS: bool = False  # Enabled in dev/test/demo, blocked in pure prod
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Mock Print Worker (Isolated cloud demonstration worker)
    ENABLE_MOCK_PRINT_WORKER: bool = False
    MOCK_WORKER_INTERVAL_SECONDS: float = 3.0

    # Lease and timing defaults
    JOB_LEASE_DURATION_SECONDS: int = 60
    AGENT_HEARTBEAT_TIMEOUT_SECONDS: int = 45
    DOCUMENT_RETENTION_HOURS: int = 24

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str:
                return []
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    parsed = json.loads(v_str)
                    return [str(item).rstrip("/") for item in parsed if item]
                except Exception:
                    pass
            return [i.strip().rstrip("/") for i in v_str.split(",") if i.strip()]
        if isinstance(v, list):
            return [str(item).rstrip("/") for item in v if item]
        return v

    @model_validator(mode="after")
    def validate_and_normalize(self):
        # 1. Normalize environment
        env_lower = (self.ENVIRONMENT or self.APP_ENV or "development").lower()
        is_demo_or_dev = env_lower in ("development", "dev", "test", "demo")

        # Allow mock payments automatically in non-production environments
        if is_demo_or_dev:
            self.ALLOW_MOCK_PAYMENTS = True

        # 2. Database URL normalization (supports Neon, Supabase, standard PG)
        # Normalize DATABASE_URL for asyncpg
        db_url = self.DATABASE_URL
        if db_url.startswith("postgres://"):
            db_url = "postgresql+asyncpg://" + db_url[len("postgres://"):]
        elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
            db_url = "postgresql+asyncpg://" + db_url[len("postgresql://"):]
        self.DATABASE_URL = db_url

        # Normalize or derive SYNC_DATABASE_URL
        # If SYNC_DATABASE_URL is still pointing to default localhost but DATABASE_URL was overridden
        sync_url = self.SYNC_DATABASE_URL
        if (
            "localhost:5432/heds_db" in sync_url
            and "localhost:5432/heds_db" not in db_url
        ):
            # Derive sync URL from DATABASE_URL
            derived_sync = re.sub(r"^postgresql\+[a-zA-Z0-9_]+://", "postgresql://", db_url)
            self.SYNC_DATABASE_URL = derived_sync
        elif sync_url.startswith("postgres://"):
            self.SYNC_DATABASE_URL = "postgresql://" + sync_url[len("postgres://"):]
        elif "+asyncpg" in sync_url:
            self.SYNC_DATABASE_URL = sync_url.replace("+asyncpg", "")

        # 3. S3 / R2 aliases fallback
        if self.S3_ENDPOINT:
            endpoint = self.S3_ENDPOINT
            if endpoint.startswith("https://"):
                endpoint = endpoint[len("https://"):]
                self.MINIO_SECURE = True
            elif endpoint.startswith("http://"):
                endpoint = endpoint[len("http://"):]
                self.MINIO_SECURE = False
            self.MINIO_ENDPOINT = endpoint.rstrip("/")

        if self.S3_ACCESS_KEY_ID:
            self.MINIO_ACCESS_KEY = self.S3_ACCESS_KEY_ID
        if self.S3_SECRET_ACCESS_KEY:
            self.MINIO_SECRET_KEY = self.S3_SECRET_ACCESS_KEY
        if self.S3_BUCKET_NAME:
            self.MINIO_BUCKET_NAME = self.S3_BUCKET_NAME
        if self.S3_SECURE is not None and self.S3_ENDPOINT:
            self.MINIO_SECURE = self.S3_SECURE

        # 4. Storage backend normalization
        backend = (self.STORAGE_BACKEND or "local").lower()
        if backend in ("r2", "cloudflare_r2", "s3"):
            self.STORAGE_BACKEND = "s3"

        return self


settings = Settings()

