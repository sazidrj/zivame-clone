"""
app/core/config.py
------------------
Centralised settings using Pydantic-Settings.
All values can be overridden via environment variables or .env file.

Zero-spend defaults:
  - SMS OTP  → printed to console (no Twilio needed)
  - Email OTP → sent via local SMTP / printed to console (no SendGrid needed)
  - Images   → stored on local disk (no AWS S3 needed)
  - AI       → disabled gracefully (no Claude/OpenAI needed)

To enable paid services, fill in the corresponding keys in .env.
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "Zivame Clone API"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str

    # ── JWT ───────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── OTP ───────────────────────────────────────────────────
    OTP_EXPIRE_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 3
    OTP_LENGTH: int = 6

    # ── Twilio (SMS OTP) ──────────────────────────────────────
    # Leave blank → OTP is printed to server console (dev mode)
    # Fill in → real SMS sent via Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # ── Email OTP provider ────────────────────────────────────
    # Priority: SendGrid (if key set) → SMTP (if host set) → console log
    # SendGrid (paid, 100/day free tier)
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@zivame-clone.com"
    SENDGRID_FROM_NAME: str = "Zivame Clone"
    # Free SMTP fallback (use Gmail, Mailtrap, etc.)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True

    # ── Image Storage ─────────────────────────────────────────
    # Leave AWS keys blank → images stored in LOCAL_STORAGE_PATH
    # Fill in → images uploaded to AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "zivame-products"
    AWS_S3_REGION: str = "ap-south-1"
    # Local fallback (zero-spend): served via /static/uploads
    LOCAL_STORAGE_PATH: str = "/app/static/uploads"
    LOCAL_STORAGE_URL: str = "http://localhost:8000/static/uploads"

    # ── Razorpay (optional — COD works without this) ──────────────────────────
    # Get keys free at razorpay.com → Settings → API Keys
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # ── AI APIs (all optional — graceful no-op when blank) ────
    # Claude (Anthropic) — fill in to enable AI assistant
    ANTHROPIC_API_KEY: str = ""
    # OpenAI — fallback if Claude key not set
    OPENAI_API_KEY: str = ""

    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v

    # ── Convenience helpers ───────────────────────────────────
    @property
    def use_s3(self) -> bool:
        return bool(self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY)

    @property
    def use_twilio(self) -> bool:
        return bool(self.TWILIO_ACCOUNT_SID and self.TWILIO_AUTH_TOKEN)

    @property
    def use_sendgrid(self) -> bool:
        return bool(self.SENDGRID_API_KEY)

    @property
    def use_smtp(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER)

    @property
    def ai_enabled(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY or self.OPENAI_API_KEY)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
